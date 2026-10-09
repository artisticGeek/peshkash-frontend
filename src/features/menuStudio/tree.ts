// Pure tree helpers for the Menu Studio. No Vue, no network — unit tested in tests/menu-studio.test.ts.
import type { DropTarget, StudioItem, TreeNode } from './types';

export type ReorderEntry = { id: number; parentId: number | null; sortOrder: number };

const parentKey = (item: Pick<StudioItem, 'parentId'>) => item.parentId || null;

const bySortOrder = (a: StudioItem, b: StudioItem) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** A slug for `name` that doesn't collide with `taken` (slugs are unique per menu). */
export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name) || 'item';
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Sections are typed as categories, or anything that already has children. */
export function isSectionItem(item: StudioItem, all: StudioItem[]): boolean {
  return item.type === 'category' || all.some((other) => parentKey(other) === item.id);
}

export function childrenOf(items: StudioItem[], parentId: number | null): StudioItem[] {
  return items.filter((item) => parentKey(item) === parentId).sort(bySortOrder);
}

export function buildTree(items: StudioItem[]): TreeNode[] {
  const ids = new Set(items.map((item) => item.id));
  const build = (parentId: number | null, depth: number): TreeNode[] =>
    items
      .filter((item) => {
        const parent = parentKey(item);
        // Items whose parent no longer exists are shown at the top level.
        return parentId === null ? parent === null || !ids.has(parent) : parent === parentId;
      })
      .sort(bySortOrder)
      .map((item) => ({ item, section: isSectionItem(item, items), depth, children: build(item.id, depth + 1) }));
  return build(null, 0);
}

export function descendantIds(items: StudioItem[], rootId: number): number[] {
  const result: number[] = [];
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const item of items) {
      if (parentKey(item) === current) {
        result.push(item.id);
        stack.push(item.id);
      }
    }
  }
  return result;
}

export function countLeaves(node: TreeNode): number {
  return node.children.reduce((sum, child) => sum + (child.section ? countLeaves(child) : 1), 0);
}

/** Path of section names from the top down to (not including) the item. */
export function ancestry(items: StudioItem[], id: number): StudioItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const path: StudioItem[] = [];
  let cursor = byId.get(id)?.parentId ?? null;
  const seen = new Set<number>();
  while (cursor && byId.has(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    const parent = byId.get(cursor)!;
    path.unshift(parent);
    cursor = parent.parentId ?? null;
  }
  return path;
}

const numbered = (ids: number[], parentId: number | null): ReorderEntry[] =>
  ids.map((id, sortOrder) => ({ id, parentId, sortOrder }));

/**
 * Sibling order after inserting `newIds` at `index` under `parentId`.
 * Returns entries for every sibling so sort orders are dense (0..n).
 */
export function orderWithInsert(items: StudioItem[], target: DropTarget, newIds: number[]): ReorderEntry[] {
  const siblings = childrenOf(items, target.parentId).map((item) => item.id).filter((id) => !newIds.includes(id));
  const index = Math.max(0, Math.min(target.index, siblings.length));
  siblings.splice(index, 0, ...newIds);
  return numbered(siblings, target.parentId);
}

/**
 * Plans moving item `id` to `target`. `target.index` is a position in the target
 * list as currently rendered (i.e. still containing the moving item when it's the
 * same parent). Returns null when the move is impossible (into itself/descendant)
 * or changes nothing.
 */
export function planMove(items: StudioItem[], id: number, target: DropTarget): ReorderEntry[] | null {
  const moving = items.find((item) => item.id === id);
  if (!moving) return null;
  if (target.parentId === id || (target.parentId !== null && descendantIds(items, id).includes(target.parentId))) return null;

  const fromParent = parentKey(moving);
  const fromSiblings = childrenOf(items, fromParent).map((item) => item.id);
  const fromIndex = fromSiblings.indexOf(id);
  let index = target.index;
  if (fromParent === target.parentId && fromIndex !== -1 && fromIndex < index) index -= 1;
  if (fromParent === target.parentId && index === fromIndex) return null;

  const entries = orderWithInsert(items, { parentId: target.parentId, index }, [id]);
  if (fromParent !== target.parentId) {
    entries.push(...numbered(fromSiblings.filter((sibling) => sibling !== id), fromParent));
  }
  return entries;
}

/** Applies reorder entries to a local copy of the items. */
export function applyOrder(items: StudioItem[], entries: ReorderEntry[]): StudioItem[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return items.map((item) => {
    const entry = byId.get(item.id);
    return entry ? { ...item, parentId: entry.parentId, sortOrder: entry.sortOrder } : item;
  });
}

/** Orders a subtree so every parent comes before its children. */
export function parentsFirst<T extends StudioItem>(nodes: T[], rootParentId: number | null = null): T[] {
  const ids = new Set(nodes.map((node) => node.id));
  const ordered: T[] = [];
  const visit = (parentId: number | null) => {
    nodes
      .filter((node) => (parentId === rootParentId ? !node.parentId || !ids.has(node.parentId) : node.parentId === parentId))
      .sort(bySortOrder)
      .forEach((node) => {
        ordered.push(node);
        visit(node.id);
      });
  };
  visit(rootParentId);
  return ordered;
}

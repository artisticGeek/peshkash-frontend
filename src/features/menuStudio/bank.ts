// Item bank: one entry per unique item across all of a vendor's menus.
import { descendantIds, isSectionItem } from './tree.js';
import type { BankEntry, PoolItem, SectionTemplate, StudioItem } from './types';

/** "Dal  Makhani!" and "dal makhani" are the same bank entry. */
export function bankKey(name: string): string {
  return name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
}

const richness = (item: StudioItem) =>
  (item.image ? 4 : 0) + (item.description ? 2 : 0) + (item.price ? 1 : 0);

function groupByMenu(pool: PoolItem[]): Map<number, PoolItem[]> {
  const byMenu = new Map<number, PoolItem[]>();
  for (const item of pool) {
    const list = byMenu.get(item.menuId) ?? [];
    list.push(item);
    byMenu.set(item.menuId, list);
  }
  return byMenu;
}

/**
 * Collapses the pool into unique items. The representative copy is the most
 * complete one (photo, description, price), newest on ties.
 * `currentItems` is the live state of the menu being edited, so "in this menu"
 * stays correct even before the pool is refetched.
 */
export function buildBank(pool: PoolItem[], currentMenuId: number, currentItems: StudioItem[]): BankEntry[] {
  const entries = new Map<string, BankEntry>();
  for (const [menuId, menuItems] of groupByMenu(pool)) {
    if (menuId === currentMenuId) continue;
    for (const item of menuItems) {
      if (isSectionItem(item, menuItems)) continue;
      const key = bankKey(item.displayName || item.name);
      if (!key) continue;
      const existing = entries.get(key);
      if (!existing) {
        entries.set(key, { key, item, menuIds: [menuId], inCurrentMenu: false });
        continue;
      }
      if (!existing.menuIds.includes(menuId)) existing.menuIds.push(menuId);
      if (richness(item) > richness(existing.item) || (richness(item) === richness(existing.item) && item.id > existing.item.id)) {
        existing.item = item;
      }
    }
  }
  // Items that only exist in the current menu still belong in the bank.
  for (const item of currentItems) {
    if (isSectionItem(item, currentItems)) continue;
    const key = bankKey(item.displayName || item.name);
    if (key && !entries.has(key)) entries.set(key, { key, item: item as PoolItem, menuIds: [], inCurrentMenu: true });
  }
  const inMenu = new Set(currentItems.filter((item) => !isSectionItem(item, currentItems)).map((item) => bankKey(item.displayName || item.name)));
  return [...entries.values()]
    .map((entry) => ({ ...entry, inCurrentMenu: inMenu.has(entry.key) }))
    .sort((a, b) => (a.item.displayName || a.item.name).localeCompare(b.item.displayName || b.item.name));
}

/** Top-level sections of other menus, each with its whole subtree. */
export function buildSectionTemplates(pool: PoolItem[], currentMenuId: number): SectionTemplate[] {
  const templates: SectionTemplate[] = [];
  for (const [menuId, menuItems] of groupByMenu(pool)) {
    if (menuId === currentMenuId) continue;
    for (const item of menuItems) {
      if (item.parentId || !isSectionItem(item, menuItems)) continue;
      const ids = new Set(descendantIds(menuItems, item.id));
      const subtree = menuItems.filter((candidate) => ids.has(candidate.id));
      templates.push({
        item,
        menuDisplayName: item.menuDisplayName || item.menuName || 'Another menu',
        itemCount: subtree.filter((candidate) => !isSectionItem(candidate, menuItems)).length,
        subtree,
      });
    }
  }
  return templates;
}

export function matchesSearch(item: StudioItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.displayName, item.name, item.price, item.enumType, ...(item.tags ?? [])]
    .some((value) => value?.toLowerCase().includes(q));
}

/** Fields copied when an item from another menu is added to this one. */
export function copyableFields(item: StudioItem) {
  return {
    displayName: item.displayName || item.name,
    description: item.description ?? '',
    ingredients: item.ingredients ?? '',
    image: item.image ?? '',
    type: item.type || 'item',
    enumType: item.enumType ?? '',
    isActive: true,
    price: item.price ?? '',
    tags: item.tags ?? [],
    allergens: item.allergens ?? [],
    isVeg: item.isVeg ?? null,
    spiceLevel: item.spiceLevel ?? null,
  };
}

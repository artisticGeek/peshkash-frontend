// State and actions for one menu open in the studio.
//
// The studio edits a local working copy. Nothing reaches guests until "Save":
//   - Save draft  stores the working copy privately on the server (guests still see the live menu)
//   - Save        makes the working copy live and clears the draft
// New entries get negative temporary ids until they are saved.
import { computed, reactive, ref } from 'vue';
import { buildBank, buildSectionTemplates, copyableFields } from './bank';
import { errorMessage, menuStudioApi, type ItemPayload, type WorkingCopy } from './api';
import { applyOrder, buildTree, childrenOf, descendantIds, orderWithInsert, parentsFirst, planMove, uniqueSlug } from './tree';
import type { DraftMenuSettings, DragPayload, DropTarget, PoolItem, SaveStatus, Selection, StudioItem, StudioMenu } from './types';

type Notify = (type: 'success' | 'error', text: string) => void;

export function toItemPayload(item: StudioItem): ItemPayload {
  return {
    id: item.id,
    name: item.name,
    displayName: item.displayName,
    description: item.description ?? '',
    ingredients: item.ingredients ?? '',
    image: item.image ?? '',
    type: item.type || 'item',
    enumType: item.enumType ?? '',
    isActive: item.isActive,
    sortOrder: item.sortOrder ?? 0,
    price: item.price ?? '',
    tags: item.tags ?? [],
    allergens: item.allergens ?? [],
    isVeg: item.isVeg ?? null,
    spiceLevel: item.spiceLevel ?? null,
    ctaConfig: item.ctaConfig ?? null,
    parentId: item.parentId || null,
  };
}

function menuSettings(menu: StudioMenu): DraftMenuSettings {
  return {
    displayName: menu.displayName,
    description: menu.description ?? '',
    itemStoryHeading: menu.itemStoryHeading,
    itemMaterialHeading: menu.itemMaterialHeading,
    elaborateDescriptions: Boolean(menu.elaborateDescriptions),
    ctaConfig: menu.ctaConfig,
  };
}

/** A stable fingerprint of a working copy, used to tell whether anything changed. */
export function copySignature(menu: StudioMenu | null, items: StudioItem[]): string {
  if (!menu) return '';
  const rows = [...items].sort((a, b) => a.id - b.id).map(toItemPayload);
  return JSON.stringify({ menu: menuSettings(menu), items: rows });
}

export function useMenuStudio(notify: Notify) {
  const menu = ref<StudioMenu | null>(null);
  const items = ref<StudioItem[]>([]);
  const pool = ref<PoolItem[]>([]);
  const loading = ref(false);
  const busy = ref<'draft' | 'publish' | 'discard' | null>(null);
  const selection = ref<Selection>({ kind: 'menu' });
  const drag = ref<DragPayload | null>(null);
  /** An inline "type a name" row shown on the canvas before a new item/section is added. */
  const pendingNew = ref<{ target: DropTarget; section: boolean } | null>(null);
  const collapsed = reactive(new Set<number>());

  /** When the stored draft was saved; null when the server has no draft for this menu. */
  const draftSavedAt = ref<string | null>(null);
  /** Fingerprint of the last version stored anywhere (the draft if there is one, else live). */
  const savedSignature = ref('');
  let nextTempId = -1;

  const tree = computed(() => buildTree(items.value));
  const bank = computed(() => (menu.value ? buildBank(pool.value, menu.value.id, items.value) : []));
  const templates = computed(() => (menu.value ? buildSectionTemplates(pool.value, menu.value.id) : []));
  const selectedItem = computed(() => {
    const current = selection.value;
    return current.kind === 'item' ? items.value.find((item) => item.id === current.id) ?? null : null;
  });
  const dirty = computed(() => Boolean(menu.value) && copySignature(menu.value, items.value) !== savedSignature.value);
  const status = computed<SaveStatus>(() => (busy.value ? 'saving' : dirty.value ? 'unsaved' : draftSavedAt.value ? 'draft' : 'live'));

  function resetUi() {
    selection.value = { kind: 'menu' };
    pendingNew.value = null;
    collapsed.clear();
  }

  async function load(target: StudioMenu) {
    menu.value = target;
    resetUi();
    loading.value = true;
    try {
      const [liveItems, draft, vendorPool] = await Promise.all([
        menuStudioApi.listItems(target.id),
        menuStudioApi.getDraft(target.id).catch(() => null),
        menuStudioApi.itemPool(target.vendorId).catch(() => [] as PoolItem[]),
      ]);
      pool.value = vendorPool;
      if (draft) {
        menu.value = { ...target, ...draft.menu };
        items.value = draft.items;
        draftSavedAt.value = draft.savedAt;
      } else {
        items.value = liveItems;
        draftSavedAt.value = null;
      }
      nextTempId = Math.min(-1, ...items.value.map((item) => item.id - 1));
      savedSignature.value = copySignature(menu.value, items.value);
    } catch (err) {
      notify('error', `Couldn't open this menu: ${errorMessage(err)}`);
    } finally {
      loading.value = false;
    }
  }

  const takenSlugs = () => items.value.map((item) => item.name);

  function createAt(target: DropTarget, fields: Partial<StudioItem> & { displayName: string }): StudioItem | undefined {
    if (!menu.value) return undefined;
    const created: StudioItem = {
      type: 'item',
      isActive: true,
      ctaConfig: null,
      ...fields,
      id: nextTempId--,
      name: uniqueSlug(fields.displayName, takenSlugs()),
      menuId: menu.value.id,
      parentId: target.parentId,
      sortOrder: target.index,
    };
    items.value = applyOrder([...items.value, created], orderWithInsert([...items.value, created], target, [created.id]));
    if (target.parentId) collapsed.delete(target.parentId);
    return created;
  }

  function addFromBank(key: string, target: DropTarget) {
    const entry = bank.value.find((candidate) => candidate.key === key);
    if (!entry) return;
    const created = createAt(target, copyableFields(entry.item));
    if (created) selection.value = { kind: 'item', id: created.id };
  }

  /** Copies a whole section (with everything inside it) from another menu. */
  function addTemplate(sectionId: number, target: DropTarget) {
    const template = templates.value.find((candidate) => candidate.item.id === sectionId);
    if (!template || !menu.value) return;
    const root = createAt(target, { ...copyableFields(template.item), type: 'category' });
    if (!root) return;
    const idMap = new Map<number, number>([[template.item.id, root.id]]);
    const copies: StudioItem[] = [];
    for (const source of parentsFirst(template.subtree)) {
      const copy: StudioItem = {
        ...copyableFields(source),
        isActive: source.isActive,
        ctaConfig: null,
        id: nextTempId--,
        name: uniqueSlug(source.displayName || source.name, [...takenSlugs(), ...copies.map((item) => item.name)]),
        menuId: menu.value.id,
        parentId: idMap.get(source.parentId ?? -Infinity) ?? root.id,
        sortOrder: source.sortOrder ?? 0,
      };
      idMap.set(source.id, copy.id);
      copies.push(copy);
    }
    items.value = [...items.value, ...copies];
    selection.value = { kind: 'item', id: root.id };
    notify('success', `Added ${template.item.displayName} with ${template.itemCount} items`);
  }

  function startNew(section: boolean, target: DropTarget) {
    pendingNew.value = { section, target };
  }

  function commitNew(name: string) {
    const pending = pendingNew.value;
    pendingNew.value = null;
    const displayName = name.trim();
    if (!pending || !displayName) return;
    const created = createAt(pending.target, { displayName, type: pending.section ? 'category' : 'item' });
    if (created) selection.value = { kind: 'item', id: created.id };
  }

  function move(id: number, target: DropTarget) {
    const entries = planMove(items.value, id, target);
    if (entries) items.value = applyOrder(items.value, entries);
  }

  function drop(target: DropTarget) {
    const payload = drag.value;
    drag.value = null;
    if (!payload) return;
    if (payload.kind === 'node') return move(payload.id, target);
    if (payload.kind === 'bank') return addFromBank(payload.key, target);
    if (payload.kind === 'template') return addTemplate(payload.id, target);
    startNew(payload.section, target);
  }

  function updateItem(id: number, patch: Partial<StudioItem>) {
    items.value = items.value.map((item) => (item.id === id ? { ...item, ...patch } : item));
  }

  function duplicate(id: number) {
    const source = items.value.find((item) => item.id === id);
    if (!source) return;
    const parentId = source.parentId || null;
    const index = childrenOf(items.value, parentId).findIndex((item) => item.id === id) + 1;
    const created = createAt({ parentId, index }, {
      ...copyableFields(source),
      displayName: `${source.displayName} (copy)`,
      isActive: source.isActive,
      ctaConfig: source.ctaConfig ?? null,
    });
    if (created) selection.value = { kind: 'item', id: created.id };
  }

  function remove(id: number) {
    const target = items.value.find((item) => item.id === id);
    if (!target) return;
    const removed = new Set([id, ...descendantIds(items.value, id)]);
    items.value = items.value.filter((item) => !removed.has(item.id));
    if (selection.value.kind === 'item' && removed.has(selection.value.id)) selection.value = { kind: 'menu' };
    notify('success', removed.size > 1
      ? `Removed ${target.displayName} and ${removed.size - 1} item${removed.size > 2 ? 's' : ''} inside it`
      : `Removed ${target.displayName}`);
  }

  function updateMenu(patch: Partial<StudioMenu>) {
    if (menu.value) menu.value = { ...menu.value, ...patch };
  }

  function workingCopy(): WorkingCopy | null {
    if (!menu.value) return null;
    if (!menu.value.displayName.trim()) {
      notify('error', 'Give the menu a name before saving');
      return null;
    }
    const unnamed = items.value.find((item) => !item.displayName.trim());
    if (unnamed) {
      selection.value = { kind: 'item', id: unnamed.id };
      notify('error', 'Every item and section needs a name before saving');
      return null;
    }
    return { menu: menuSettings(menu.value), items: items.value.map(toItemPayload) };
  }

  /** Stores the working copy privately. Guests keep seeing the last saved menu. */
  async function saveDraft(): Promise<boolean> {
    const copy = workingCopy();
    if (!copy || !menu.value || busy.value) return false;
    const signature = copySignature(menu.value, items.value);
    busy.value = 'draft';
    try {
      const { savedAt } = await menuStudioApi.saveDraft(menu.value.id, copy);
      draftSavedAt.value = savedAt;
      menu.value = { ...menu.value, draftSavedAt: savedAt };
      savedSignature.value = signature;
      notify('success', 'Draft saved. Guests still see the last saved menu.');
      return true;
    } catch (err) {
      notify('error', `Couldn't save the draft: ${errorMessage(err)}`);
      return false;
    } finally {
      busy.value = null;
    }
  }

  /** Saves the working copy and makes it live. */
  async function publish(): Promise<boolean> {
    const copy = workingCopy();
    if (!copy || !menu.value || busy.value) return false;
    busy.value = 'publish';
    try {
      const result = await menuStudioApi.publish(menu.value.id, copy);
      const realId = (id: number) => (id < 0 ? result.idMap[String(id)] ?? id : id);
      if (selection.value.kind === 'item') selection.value = { kind: 'item', id: realId(selection.value.id) };
      const wasCollapsed = [...collapsed];
      collapsed.clear();
      wasCollapsed.forEach((id) => collapsed.add(realId(id)));
      menu.value = result.menu;
      items.value = result.items;
      draftSavedAt.value = null;
      savedSignature.value = copySignature(menu.value, items.value);
      notify('success', 'Saved. Guests now see these changes.');
      return true;
    } catch (err) {
      notify('error', `Couldn't save: ${errorMessage(err)}`);
      return false;
    } finally {
      busy.value = null;
    }
  }

  /** Throws away the stored draft and any unsaved edits, and reopens the live menu. */
  async function discardDraft() {
    if (!menu.value || busy.value) return;
    const current = menu.value;
    busy.value = 'discard';
    try {
      if (draftSavedAt.value) await menuStudioApi.discardDraft(current.id);
      const live = (await menuStudioApi.listMenus()).find((row) => row.id === current.id) ?? { ...current, draftSavedAt: null };
      busy.value = null;
      await load(live);
      notify('success', 'Changes discarded. You are looking at the live menu.');
    } catch (err) {
      notify('error', `Couldn't discard the draft: ${errorMessage(err)}`);
    } finally {
      busy.value = null;
    }
  }

  function toggleCollapsed(id: number) {
    if (collapsed.has(id)) collapsed.delete(id);
    else collapsed.add(id);
  }

  return {
    menu, items, pool, loading, busy, selection, drag, pendingNew, collapsed,
    tree, bank, templates, selectedItem, dirty, status, draftSavedAt,
    load, addFromBank, addTemplate, startNew, commitNew, move, drop,
    updateItem, duplicate, remove, updateMenu, saveDraft, publish, discardDraft, toggleCollapsed,
  };
}

export type MenuStudioState = ReturnType<typeof useMenuStudio>;

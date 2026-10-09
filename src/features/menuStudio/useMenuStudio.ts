// State and actions for one menu open in the studio. Every change is saved as it happens.
import { computed, reactive, ref } from 'vue';
import { buildBank, buildSectionTemplates, copyableFields } from './bank';
import { errorMessage, menuStudioApi, type ItemPayload, type MenuPayload } from './api';
import { applyOrder, buildTree, childrenOf, descendantIds, orderWithInsert, parentsFirst, planMove, uniqueSlug } from './tree';
import type { DragPayload, DropTarget, PoolItem, Selection, StudioItem, StudioMenu } from './types';

type Notify = (type: 'success' | 'error', text: string) => void;

const SAVE_DELAY_MS = 600;

export function toItemPayload(item: StudioItem): ItemPayload {
  return {
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
    // Always explicit: the API treats a missing parentId as "move to top level".
    parentId: item.parentId || null,
  };
}

export function useMenuStudio(notify: Notify) {
  const menu = ref<StudioMenu | null>(null);
  const items = ref<StudioItem[]>([]);
  const pool = ref<PoolItem[]>([]);
  const loading = ref(false);
  const inFlight = ref(0);
  const failed = ref(false);
  const selection = ref<Selection>({ kind: 'menu' });
  const drag = ref<DragPayload | null>(null);
  /** An inline "type a name" row shown on the canvas before a new item/section is created. */
  const pendingNew = ref<{ target: DropTarget; section: boolean } | null>(null);
  const collapsed = reactive(new Set<number>());

  const itemTimers = new Map<number, ReturnType<typeof setTimeout>>();
  let menuTimer: ReturnType<typeof setTimeout> | null = null;
  const pendingSaves = ref(0);
  const failedItemIds = new Set<number>();
  let menuSaveFailed = false;

  const tree = computed(() => buildTree(items.value));
  const bank = computed(() => (menu.value ? buildBank(pool.value, menu.value.id, items.value) : []));
  const templates = computed(() => (menu.value ? buildSectionTemplates(pool.value, menu.value.id) : []));
  const selectedItem = computed(() => {
    const current = selection.value;
    return current.kind === 'item' ? items.value.find((item) => item.id === current.id) ?? null : null;
  });
  const saveState = computed<'saving' | 'saved' | 'error'>(() =>
    failed.value ? 'error' : inFlight.value > 0 || pendingSaves.value > 0 ? 'saving' : 'saved');

  async function run<T>(task: () => Promise<T>, failure: string): Promise<T | undefined> {
    inFlight.value++;
    try {
      const result = await task();
      failed.value = false;
      return result;
    } catch (err) {
      failed.value = true;
      notify('error', `${failure}: ${errorMessage(err)}`);
      return undefined;
    } finally {
      inFlight.value--;
    }
  }

  async function load(target: StudioMenu) {
    flush();
    menu.value = target;
    selection.value = { kind: 'menu' };
    pendingNew.value = null;
    collapsed.clear();
    loading.value = true;
    try {
      const [menuItems, vendorPool] = await Promise.all([
        menuStudioApi.listItems(target.id),
        menuStudioApi.itemPool(target.vendorId).catch(() => [] as PoolItem[]),
      ]);
      items.value = menuItems;
      pool.value = vendorPool;
    } catch (err) {
      notify('error', `Couldn't open this menu: ${errorMessage(err)}`);
    } finally {
      loading.value = false;
    }
  }

  const takenSlugs = () => items.value.map((item) => item.name);

  async function persistOrder(entries: ReturnType<typeof orderWithInsert>) {
    if (!menu.value || !entries.length) return;
    const menuId = menu.value.id;
    items.value = applyOrder(items.value, entries);
    await run(() => menuStudioApi.reorder(menuId, entries), "Couldn't save the new order");
  }

  async function createAt(target: DropTarget, fields: Omit<ItemPayload, 'parentId'> & { displayName: string }): Promise<StudioItem | undefined> {
    if (!menu.value) return undefined;
    const menuId = menu.value.id;
    const created = await run(
      () => menuStudioApi.createItem({ ...fields, menuId, name: uniqueSlug(fields.displayName, takenSlugs()), parentId: target.parentId, sortOrder: target.index }),
      `Couldn't add ${fields.displayName}`,
    );
    if (!created) return undefined;
    items.value = [...items.value, created];
    if (target.parentId) collapsed.delete(target.parentId);
    await persistOrder(orderWithInsert(items.value, target, [created.id]));
    return created;
  }

  async function addFromBank(key: string, target: DropTarget) {
    const entry = bank.value.find((candidate) => candidate.key === key);
    if (!entry) return;
    const created = await createAt(target, copyableFields(entry.item));
    if (created) selection.value = { kind: 'item', id: created.id };
  }

  /** Copies a whole section (with everything inside it) from another menu. */
  async function addTemplate(sectionId: number, target: DropTarget) {
    const template = templates.value.find((candidate) => candidate.item.id === sectionId);
    if (!template) return;
    const root = await createAt(target, { ...copyableFields(template.item), type: 'category' });
    if (!root || !menu.value) return;
    const menuId = menu.value.id;
    const idMap = new Map<number, number>([[template.item.id, root.id]]);
    for (const source of parentsFirst(template.subtree)) {
      const parentId = idMap.get(source.parentId ?? -1) ?? root.id;
      const created = await run(
        () => menuStudioApi.createItem({
          ...copyableFields(source),
          isActive: source.isActive,
          menuId,
          name: uniqueSlug(source.displayName || source.name, takenSlugs()),
          parentId,
          sortOrder: source.sortOrder ?? 0,
        }),
        `Couldn't copy ${source.displayName}`,
      );
      if (!created) break;
      items.value = [...items.value, created];
      idMap.set(source.id, created.id);
    }
    notify('success', `Added ${template.item.displayName} with ${template.itemCount} items`);
  }

  function startNew(section: boolean, target: DropTarget) {
    pendingNew.value = { section, target };
  }

  async function commitNew(name: string) {
    const pending = pendingNew.value;
    pendingNew.value = null;
    const displayName = name.trim();
    if (!pending || !displayName) return;
    const created = await createAt(pending.target, {
      displayName,
      type: pending.section ? 'category' : 'item',
      isActive: true,
      ctaConfig: null,
    });
    if (created) selection.value = { kind: 'item', id: created.id };
  }

  async function move(id: number, target: DropTarget) {
    const entries = planMove(items.value, id, target);
    if (!entries) return;
    await persistOrder(entries);
  }

  async function drop(target: DropTarget) {
    const payload = drag.value;
    drag.value = null;
    if (!payload) return;
    if (payload.kind === 'node') return move(payload.id, target);
    if (payload.kind === 'bank') return addFromBank(payload.key, target);
    if (payload.kind === 'template') return addTemplate(payload.id, target);
    startNew(payload.section, target);
  }

  function scheduleItemSave(id: number) {
    const existing = itemTimers.get(id);
    if (existing) clearTimeout(existing);
    else pendingSaves.value++;
    itemTimers.set(id, setTimeout(() => saveItemNow(id), SAVE_DELAY_MS));
  }

  async function saveItemNow(id: number) {
    const timer = itemTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      itemTimers.delete(id);
      pendingSaves.value--;
    }
    const item = items.value.find((row) => row.id === id);
    if (!item || !item.displayName.trim()) return;
    const saved = await run(() => menuStudioApi.updateItem(id, toItemPayload(item)), `Couldn't save ${item.displayName}`);
    if (saved) failedItemIds.delete(id);
    else failedItemIds.add(id);
  }

  function updateItem(id: number, patch: Partial<StudioItem>) {
    items.value = items.value.map((item) => (item.id === id ? { ...item, ...patch } : item));
    scheduleItemSave(id);
  }

  async function duplicate(id: number) {
    const source = items.value.find((item) => item.id === id);
    if (!source) return;
    const parentId = source.parentId || null;
    const index = childrenOf(items.value, parentId).findIndex((item) => item.id === id) + 1;
    const created = await createAt({ parentId, index }, {
      ...copyableFields(source),
      displayName: `${source.displayName} (copy)`,
      isActive: source.isActive,
      ctaConfig: source.ctaConfig ?? null,
    });
    if (created) selection.value = { kind: 'item', id: created.id };
  }

  async function remove(id: number) {
    const target = items.value.find((item) => item.id === id);
    if (!target) return;
    const removed = new Set([id, ...descendantIds(items.value, id)]);
    for (const removedId of removed) {
      const timer = itemTimers.get(removedId);
      if (timer) {
        clearTimeout(timer);
        itemTimers.delete(removedId);
        pendingSaves.value--;
      }
    }
    const ok = await run(() => menuStudioApi.deleteItem(id, removed.size > 1).then(() => true), `Couldn't remove ${target.displayName}`);
    if (!ok) return;
    items.value = items.value.filter((item) => !removed.has(item.id));
    if (selection.value.kind === 'item' && removed.has(selection.value.id)) selection.value = { kind: 'menu' };
    notify('success', removed.size > 1
      ? `Removed ${target.displayName} and ${removed.size - 1} item${removed.size > 2 ? 's' : ''} inside it`
      : `Removed ${target.displayName} from this menu`);
  }

  function updateMenu(patch: MenuPayload) {
    if (!menu.value) return;
    menu.value = { ...menu.value, ...patch } as StudioMenu;
    if (menuTimer) clearTimeout(menuTimer);
    else pendingSaves.value++;
    menuTimer = setTimeout(saveMenuNow, SAVE_DELAY_MS);
  }

  async function saveMenuNow() {
    if (menuTimer) {
      clearTimeout(menuTimer);
      menuTimer = null;
      pendingSaves.value--;
    }
    const current = menu.value;
    if (!current || !current.displayName.trim()) return;
    const saved = await run(() => menuStudioApi.updateMenu(current.id, {
      displayName: current.displayName,
      description: current.description ?? '',
      itemStoryHeading: current.itemStoryHeading,
      itemMaterialHeading: current.itemMaterialHeading,
      elaborateDescriptions: current.elaborateDescriptions,
      ctaConfig: current.ctaConfig,
    }), "Couldn't save menu settings");
    menuSaveFailed = !saved;
    return saved;
  }

  /** Runs any debounced saves immediately (before switching menus or leaving). */
  function flush() {
    for (const id of [...itemTimers.keys()]) void saveItemNow(id);
    if (menuTimer) void saveMenuNow();
  }

  /** Saves again whatever failed last time. */
  function retry() {
    failed.value = false;
    for (const id of failedItemIds) if (items.value.some((item) => item.id === id)) scheduleItemSave(id);
    failedItemIds.clear();
    if (menuSaveFailed && menu.value) updateMenu({});
  }

  function toggleCollapsed(id: number) {
    if (collapsed.has(id)) collapsed.delete(id);
    else collapsed.add(id);
  }

  return {
    menu, items, pool, loading, selection, drag, pendingNew, collapsed,
    tree, bank, templates, selectedItem, saveState,
    load, addFromBank, addTemplate, startNew, commitNew, move, drop,
    updateItem, duplicate, remove, updateMenu, flush, retry, toggleCollapsed,
  };
}

export type MenuStudioState = ReturnType<typeof useMenuStudio>;

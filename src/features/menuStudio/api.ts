// Menu Studio API calls. Auth headers come from the global axios defaults set by the auth store.
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import type { ReorderEntry } from './tree';
import type { CtaConfig, DraftMenuSettings, MenuDraft, PoolItem, StudioItem, StudioMenu } from './types';

const admin = (path: string) => `${API_BASE_URL}/admin${path}`;

// Postgres BIGINT ids arrive as strings; the studio compares ids as numbers everywhere.
const toId = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Number(value));

export function normalizeMenu(raw: any): StudioMenu {
  return { ...raw, id: Number(raw.id), vendorId: Number(raw.vendorId), sourceMenuId: toId(raw.sourceMenuId), draftSavedAt: raw.draftSavedAt ?? null };
}

export function normalizeItem<T extends StudioItem>(raw: any): T {
  return {
    ...raw,
    id: Number(raw.id),
    menuId: Number(raw.menuId),
    parentId: toId(raw.parentId),
    sortOrder: Number(raw.sortOrder ?? 0),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    allergens: Array.isArray(raw.allergens) ? raw.allergens : [],
    isVeg: typeof raw.isVeg === 'boolean' ? raw.isVeg : null,
    spiceLevel: raw.spiceLevel == null ? null : Number(raw.spiceLevel),
    ctaConfig: raw.ctaConfig ?? null,
  } as T;
}

export type ItemPayload = {
  /** Present in working copies; negative for entries that don't exist on the server yet. */
  id?: number;
  menuId?: number;
  name?: string;
  displayName: string;
  description?: string | null;
  ingredients?: string | null;
  image?: string | null;
  type?: string | null;
  enumType?: string | null;
  isActive?: boolean;
  sortOrder?: number;
  price?: string | null;
  tags?: string[];
  allergens?: string[];
  isVeg?: boolean | null;
  spiceLevel?: number | null;
  ctaConfig?: CtaConfig | null;
  parentId: number | null;
};

export type MenuPayload = Partial<Pick<StudioMenu,
  'displayName' | 'description' | 'itemStoryHeading' | 'itemMaterialHeading' | 'elaborateDescriptions' | 'ctaConfig' | 'isActive'
>> & { name?: string; type?: string; vendorId?: number };

export type CloneOptions = {
  name: string;
  displayName: string;
  type?: string;
  include: { items: boolean; hidden: boolean; ctas: boolean };
};

/** What the Studio sends for a draft or a save: menu settings plus every entry. */
export type WorkingCopy = { menu: DraftMenuSettings; items: ItemPayload[] };

export const menuStudioApi = {
  async listMenus(): Promise<StudioMenu[]> {
    return (await axios.get<unknown[]>(admin('/menus'))).data.map(normalizeMenu);
  },
  async listItems(menuId: number): Promise<StudioItem[]> {
    return (await axios.get<unknown[]>(admin('/items'), { params: { menuId } })).data.map((row) => normalizeItem<StudioItem>(row));
  },
  async itemPool(vendorId: number): Promise<PoolItem[]> {
    return (await axios.get<unknown[]>(admin(`/vendors/${vendorId}/item-pool`))).data.map((row) => normalizeItem<PoolItem>(row));
  },
  async createMenu(payload: MenuPayload & { name: string; displayName: string; vendorId: number }): Promise<StudioMenu> {
    return normalizeMenu((await axios.post(admin('/menus'), payload)).data);
  },
  async updateMenu(menuId: number, payload: MenuPayload): Promise<StudioMenu> {
    return normalizeMenu((await axios.put(admin(`/menus/${menuId}`), payload)).data);
  },
  async cloneMenu(sourceMenuId: number, options: CloneOptions): Promise<StudioMenu> {
    return normalizeMenu((await axios.post(admin(`/menus/${sourceMenuId}/copy`), options)).data);
  },
  async deleteMenu(menuId: number): Promise<void> {
    await axios.delete(admin(`/menus/${menuId}`));
  },
  async createItem(payload: ItemPayload & { menuId: number; name: string }): Promise<StudioItem> {
    return normalizeItem<StudioItem>((await axios.post(admin('/items'), payload)).data);
  },
  async updateItem(itemId: number, payload: ItemPayload): Promise<StudioItem> {
    return normalizeItem<StudioItem>((await axios.put(admin(`/items/${itemId}`), payload)).data);
  },
  async deleteItem(itemId: number, withChildren: boolean): Promise<void> {
    await axios.delete(admin(`/items/${itemId}`), { params: withChildren ? { withChildren: 'true' } : undefined });
  },
  async reorder(menuId: number, items: ReorderEntry[]): Promise<StudioItem[]> {
    return (await axios.patch<unknown[]>(admin(`/menus/${menuId}/order`), { items })).data.map((row) => normalizeItem<StudioItem>(row));
  },
  async getDraft(menuId: number): Promise<MenuDraft | null> {
    const { data } = await axios.get(admin(`/menus/${menuId}/draft`));
    if (!data || !Array.isArray(data.items)) return null;
    return { menu: data.menu, savedAt: data.savedAt, items: data.items.map((row: unknown) => normalizeItem<StudioItem>({ ...(row as object), menuId })) };
  },
  async saveDraft(menuId: number, copy: WorkingCopy): Promise<{ savedAt: string }> {
    return (await axios.put<{ savedAt: string }>(admin(`/menus/${menuId}/draft`), copy)).data;
  },
  async discardDraft(menuId: number): Promise<void> {
    await axios.delete(admin(`/menus/${menuId}/draft`));
  },
  /** Saves a working copy and makes it live. */
  async publish(menuId: number, copy: WorkingCopy): Promise<{ menu: StudioMenu; items: StudioItem[]; idMap: Record<string, number> }> {
    const { data } = await axios.post(admin(`/menus/${menuId}/publish`), copy);
    return { menu: normalizeMenu(data.menu), items: data.items.map((row: unknown) => normalizeItem<StudioItem>(row)), idMap: data.idMap ?? {} };
  },
  async uploadImage(vendorSlug: string, file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const { data } = await axios.post<{ url: string }>(`${API_BASE_URL}/onboard/${vendorSlug}/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.url;
  },
};

/** Readable message from an axios/API error. */
export function errorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
  return anyErr?.response?.data?.message || anyErr?.message || 'Something went wrong';
}

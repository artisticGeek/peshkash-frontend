// Menu Studio API calls. Auth headers come from the global axios defaults set by the auth store.
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import type { ReorderEntry } from './tree';
import type { CtaConfig, PoolItem, StudioItem, StudioMenu } from './types';

const admin = (path: string) => `${API_BASE_URL}/admin${path}`;

// Postgres BIGINT ids arrive as strings; the studio compares ids as numbers everywhere.
const toId = (value: unknown): number | null => (value === null || value === undefined || value === '' ? null : Number(value));

export function normalizeMenu(raw: any): StudioMenu {
  return { ...raw, id: Number(raw.id), vendorId: Number(raw.vendorId), sourceMenuId: toId(raw.sourceMenuId) };
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

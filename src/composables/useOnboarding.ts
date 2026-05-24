import { reactive, readonly } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MenuSummary {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface FlatLineItem {
  id: number;
  name: string;
  displayName?: string;
  description?: string;
  ingredients?: string;
  image?: string;
  type?: string;
  enumType?: string;
  isActive: boolean;
  parentId?: number;
  menuId: number;
}

export interface EventSummary {
  id: number;
  name: string;
  displayName: string;
  eventDescription?: string;
  startTime?: string;
  endTime?: string;
  status: string;
  amountPaid?: number;
}

export interface PricingConfig {
  id: number;
  modelType: string;
  amount?: number;
  currency: string;
  notes?: string;
}

export interface CreateLineItemPayload {
  tempId?: string;
  parentTempId?: string;
  parentId?: number;
  name: string;
  displayName?: string;
  description?: string;
  ingredients?: string;
  image?: string;
  type: 'category' | 'dish';
  enumType?: 'veg' | 'non-veg' | 'egg';
  isActive?: boolean;
}

// ─── State ───────────────────────────────────────────────────────────────────

const state = reactive({
  menus: [] as MenuSummary[],
  events: [] as EventSummary[],
  items: [] as FlatLineItem[],
  pricingConfig: null as PricingConfig | null,
  selectedMenuId: null as number | null,
  selectedEventId: null as number | null,
  loading: false,
  error: null as string | null,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function base(vendorName: string) {
  return `${API_BASE_URL}/onboard/${vendorName}`;
}

async function call<T>(fn: () => Promise<T>): Promise<T> {
  state.loading = true;
  state.error = null;
  try {
    return await fn();
  } catch (err: any) {
    state.error = err.response?.data?.message ?? err.message ?? 'Something went wrong';
    throw err;
  } finally {
    state.loading = false;
  }
}

// ─── Composable ───────────────────────────────────────────────────────────────

export function useOnboarding(vendorName: string) {

  // ── Menus ────────────────────────────────────────────────────────────────

  async function fetchMenus() {
    const { data } = await call(() => axios.get<MenuSummary[]>(`${base(vendorName)}/menus`));
    state.menus = data;
  }

  async function createMenu(payload: { name: string; displayName: string; description?: string }) {
    const { data } = await call(() => axios.post<MenuSummary>(`${base(vendorName)}/menus`, payload));
    state.menus.push(data);
    return data;
  }

  // ── Line Items ───────────────────────────────────────────────────────────

  // Items are managed in-memory during the wizard session.
  // On fresh load (e.g. browser refresh on step 2), they reset — acceptable for MVP.
  function clearItems() {
    state.items = [];
  }

  async function createItems(menuId: number, items: CreateLineItemPayload[]) {
    const { data } = await call(() =>
      axios.post<FlatLineItem[]>(`${base(vendorName)}/menus/${menuId}/items`, items)
    );
    state.items.push(...data);
    return data;
  }

  async function updateItem(menuId: number, itemId: number, payload: Partial<CreateLineItemPayload>) {
    await call(() => axios.put(`${base(vendorName)}/menus/${menuId}/items/${itemId}`, payload));
    // Update the in-memory list to reflect the change
    const idx = state.items.findIndex(i => i.id === itemId);
    if (idx !== -1) Object.assign(state.items[idx], payload);
  }

  async function deleteItems(menuId: number, itemIds: number[]) {
    await call(() => axios.delete(`${base(vendorName)}/menus/${menuId}/items`, { data: { itemIds } }));
    state.items = state.items.filter(i => !itemIds.includes(i.id));
  }

  // ── Events ───────────────────────────────────────────────────────────────

  async function fetchEvents() {
    const { data } = await call(() => axios.get<EventSummary[]>(`${base(vendorName)}/events`));
    state.events = data;
  }

  async function createEvent(payload: { name: string; displayName: string; eventDescription?: string }) {
    const { data } = await call(() => axios.post<EventSummary>(`${base(vendorName)}/events`, payload));
    state.events.push(data);
    return data;
  }

  async function updateEventTimings(eventId: number, payload: { startTime: string; endTime: string }) {
    await call(() => axios.put(`${base(vendorName)}/events/${eventId}`, payload));
  }

  // ── Event-Menu Mapping ───────────────────────────────────────────────────

  async function linkMenuToEvent(eventId: number, menuId: number) {
    await call(() => axios.post(`${base(vendorName)}/events/${eventId}/menus/${menuId}`));
  }

  async function unlinkMenuFromEvent(eventId: number, menuId: number) {
    await call(() => axios.delete(`${base(vendorName)}/events/${eventId}/menus/${menuId}`));
  }

  // ── Pricing ──────────────────────────────────────────────────────────────

  async function fetchPricingConfig() {
    const { data } = await call(() => axios.get<PricingConfig | null>(`${base(vendorName)}/pricing`));
    state.pricingConfig = data;
  }

  // ── Payment ──────────────────────────────────────────────────────────────

  async function initiatePayment(eventId: number, payload: { pricingConfigId: number; startTime: string; durationHours: number }) {
    const { data } = await call(() =>
      axios.post(`${base(vendorName)}/events/${eventId}/payment/initiate`, payload)
    );
    return data as { orderId: string; amount: number; currency: string; keyId: string };
  }

  async function verifyPayment(eventId: number, payload: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    const { data } = await call(() =>
      axios.post(`${base(vendorName)}/events/${eventId}/payment/verify`, payload)
    );
    return data as { success: boolean; eventId: number };
  }

  // ── Image Upload ─────────────────────────────────────────────────────────

  async function uploadImage(file: File): Promise<string> {
    const form = new FormData();
    form.append('image', file);
    const { data } = await call(() =>
      axios.post<{ url: string }>(`${base(vendorName)}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );
    return data.url;
  }

  return {
    state: readonly(state),
    fetchMenus,
    createMenu,
    clearItems,
    createItems,
    updateItem,
    deleteItems,
    fetchEvents,
    createEvent,
    updateEventTimings,
    linkMenuToEvent,
    unlinkMenuFromEvent,
    fetchPricingConfig,
    initiatePayment,
    verifyPayment,
    uploadImage,
  };
}

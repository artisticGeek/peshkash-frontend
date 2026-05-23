import { reactive, readonly } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../config';
// ─── State ───────────────────────────────────────────────────────────────────
const state = reactive({
    menus: [],
    events: [],
    items: [],
    pricingConfig: null,
    selectedMenuId: null,
    selectedEventId: null,
    loading: false,
    error: null,
});
// ─── Helpers ─────────────────────────────────────────────────────────────────
function base(vendorName) {
    return `${API_BASE_URL}/onboard/${vendorName}`;
}
async function call(fn) {
    state.loading = true;
    state.error = null;
    try {
        return await fn();
    }
    catch (err) {
        state.error = err.response?.data?.message ?? err.message ?? 'Something went wrong';
        throw err;
    }
    finally {
        state.loading = false;
    }
}
// ─── Composable ───────────────────────────────────────────────────────────────
export function useOnboarding(vendorName) {
    // ── Menus ────────────────────────────────────────────────────────────────
    async function fetchMenus() {
        const { data } = await call(() => axios.get(`${base(vendorName)}/menus`));
        state.menus = data;
    }
    async function createMenu(payload) {
        const { data } = await call(() => axios.post(`${base(vendorName)}/menus`, payload));
        state.menus.push(data);
        return data;
    }
    // ── Line Items ───────────────────────────────────────────────────────────
    // Items are managed in-memory during the wizard session.
    // On fresh load (e.g. browser refresh on step 2), they reset — acceptable for MVP.
    function clearItems() {
        state.items = [];
    }
    async function createItems(menuId, items) {
        const { data } = await call(() => axios.post(`${base(vendorName)}/menus/${menuId}/items`, items));
        state.items.push(...data);
        return data;
    }
    async function updateItem(menuId, itemId, payload) {
        await call(() => axios.put(`${base(vendorName)}/menus/${menuId}/items/${itemId}`, payload));
        // Update the in-memory list to reflect the change
        const idx = state.items.findIndex(i => i.id === itemId);
        if (idx !== -1)
            Object.assign(state.items[idx], payload);
    }
    async function deleteItems(menuId, itemIds) {
        await call(() => axios.delete(`${base(vendorName)}/menus/${menuId}/items`, { data: { itemIds } }));
        state.items = state.items.filter(i => !itemIds.includes(i.id));
    }
    // ── Events ───────────────────────────────────────────────────────────────
    async function fetchEvents() {
        const { data } = await call(() => axios.get(`${base(vendorName)}/events`));
        state.events = data;
    }
    async function createEvent(payload) {
        const { data } = await call(() => axios.post(`${base(vendorName)}/events`, payload));
        state.events.push(data);
        return data;
    }
    async function updateEventTimings(eventId, payload) {
        await call(() => axios.put(`${base(vendorName)}/events/${eventId}`, payload));
    }
    // ── Event-Menu Mapping ───────────────────────────────────────────────────
    async function linkMenuToEvent(eventId, menuId) {
        await call(() => axios.post(`${base(vendorName)}/events/${eventId}/menus/${menuId}`));
    }
    async function unlinkMenuFromEvent(eventId, menuId) {
        await call(() => axios.delete(`${base(vendorName)}/events/${eventId}/menus/${menuId}`));
    }
    // ── Pricing ──────────────────────────────────────────────────────────────
    async function fetchPricingConfig() {
        const { data } = await call(() => axios.get(`${base(vendorName)}/pricing`));
        state.pricingConfig = data;
    }
    // ── Payment ──────────────────────────────────────────────────────────────
    async function initiatePayment(eventId, payload) {
        const { data } = await call(() => axios.post(`${base(vendorName)}/events/${eventId}/payment/initiate`, payload));
        return data;
    }
    async function verifyPayment(eventId, payload) {
        const { data } = await call(() => axios.post(`${base(vendorName)}/events/${eventId}/payment/verify`, payload));
        return data;
    }
    // ── Image Upload ─────────────────────────────────────────────────────────
    async function uploadImage(file) {
        const form = new FormData();
        form.append('image', file);
        const { data } = await call(() => axios.post(`${base(vendorName)}/upload`, form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }));
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
//# sourceMappingURL=useOnboarding.js.map
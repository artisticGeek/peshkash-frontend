<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div>
        <p class="eyebrow">Peshkash Admin</p>
        <h1>Setup Dashboard</h1>
      </div>
      <nav>
        <button
          v-for="section in sections"
          :key="section.key"
          class="nav-button"
          :class="{ active: activeSection === section.key }"
          @click="activeSection = section.key"
        >
          <i :class="section.icon"></i>
          <span>{{ section.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="admin-main">
      <div class="topbar">
        <div>
          <h2>{{ activeTitle }}</h2>
          <p>{{ activeSubtitle }}</p>
        </div>
        <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadAll">
          <i class="bi bi-arrow-clockwise"></i>
          Refresh
        </button>
      </div>

      <div v-if="message" class="alert alert-success py-2">{{ message }}</div>
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

      <section v-if="activeSection === 'home'" class="dashboard-grid">
        <article class="metric-card">
          <span>Vendors</span>
          <strong>{{ vendors.length }}</strong>
        </article>
        <article class="metric-card">
          <span>Events</span>
          <strong>{{ events.length }}</strong>
        </article>
        <article class="metric-card">
          <span>Menus</span>
          <strong>{{ menus.length }}</strong>
        </article>
        <article class="metric-card">
          <span>Items</span>
          <strong>{{ items.length }}</strong>
        </article>
        <article class="metric-card">
          <span>QR Mappings</span>
          <strong>{{ qrMappings.length }}</strong>
        </article>
      </section>

      <section v-if="activeSection === 'vendors'" class="two-column">
        <form class="panel" @submit.prevent="saveVendor">
          <h3>{{ vendorForm.id ? 'Edit Vendor' : 'Create Vendor' }}</h3>
          <div class="form-grid">
            <label>Slug<input v-model.trim="vendorForm.name" class="form-control" placeholder="maharaja-caterers" /></label>
            <label>Display Name<input v-model.trim="vendorForm.displayName" class="form-control" placeholder="Maharaja Caterers" /></label>
            <label class="wide">Description<textarea v-model.trim="vendorForm.description" class="form-control" rows="2"></textarea></label>
            <label class="wide">Contact Lines<input v-model.trim="vendorContactText" class="form-control" placeholder="Phone, email, website" /></label>
            <label class="wide">Address<input v-model.trim="vendorForm.address" class="form-control" /></label>
            <label class="check"><input v-model="vendorForm.hasContactPage" type="checkbox" /> Enable contact page</label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="loading">Save Vendor</button>
            <button class="btn btn-outline-secondary" type="button" @click="resetVendor">Clear</button>
          </div>
        </form>

        <div class="panel">
          <h3>Vendors</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>Name</th><th>Slug</th><th>Contact Page</th><th></th></tr></thead>
              <tbody>
                <tr v-for="vendor in vendors" :key="vendor.id">
                  <td>{{ vendor.displayName }}</td>
                  <td><code>{{ vendor.name }}</code></td>
                  <td>{{ vendor.hasContactPage ? 'Yes' : 'No' }}</td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="editVendor(vendor)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'events'" class="two-column">
        <form class="panel" @submit.prevent="saveEvent">
          <h3>{{ eventForm.id ? 'Edit Event' : 'Create Event' }}</h3>
          <div class="form-grid">
            <label>Vendor<select v-model.number="eventForm.vendorId" class="form-select"><option :value="0">Select vendor</option><option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">{{ vendor.displayName }}</option></select></label>
            <label>Status<select v-model="eventForm.status" class="form-select"><option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label>Slug<input v-model.trim="eventForm.name" class="form-control" placeholder="agam-sanya-wedding" /></label>
            <label>Display Name<input v-model.trim="eventForm.displayName" class="form-control" /></label>
            <label>Start Time<input v-model="eventForm.startTime" type="datetime-local" class="form-control" /></label>
            <label>End Time<input v-model="eventForm.endTime" type="datetime-local" class="form-control" /></label>
            <label class="wide">Description<textarea v-model.trim="eventForm.eventDescription" rows="2" class="form-control"></textarea></label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="loading">Save Event</button>
            <button class="btn btn-outline-secondary" type="button" @click="resetEvent">Clear</button>
          </div>
        </form>

        <div class="panel">
          <h3>Events</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>Event</th><th>Vendor</th><th>Status</th><th>Menus</th><th></th></tr></thead>
              <tbody>
                <tr v-for="event in events" :key="event.id">
                  <td><strong>{{ event.displayName }}</strong><br /><code>{{ event.name }}</code></td>
                  <td>{{ event.vendor?.displayName }}</td>
                  <td><span class="badge text-bg-light">{{ event.status }}</span></td>
                  <td>{{ eventMenus(event.id).length }}</td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="editEvent(event)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'menus'" class="two-column">
        <form class="panel" @submit.prevent="saveMenu">
          <h3>{{ menuForm.id ? 'Edit Menu' : 'Create Menu' }}</h3>
          <div class="form-grid">
            <label>Vendor<select v-model.number="menuForm.vendorId" class="form-select"><option :value="0">Select vendor</option><option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">{{ vendor.displayName }}</option></select></label>
            <label>Slug<input v-model.trim="menuForm.name" class="form-control" placeholder="maharaja-menu" /></label>
            <label>Display Name<input v-model.trim="menuForm.displayName" class="form-control" /></label>
            <label class="check"><input v-model="menuForm.isActive" type="checkbox" /> Active</label>
            <label class="wide">Description<textarea v-model.trim="menuForm.description" rows="2" class="form-control"></textarea></label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="loading">Save Menu</button>
            <button class="btn btn-outline-secondary" type="button" @click="resetMenu">Clear</button>
          </div>
        </form>

        <div class="panel">
          <h3>Link Menu To Event</h3>
          <div class="form-grid">
            <label>Event<select v-model.number="linkForm.eventId" class="form-select"><option :value="0">Select event</option><option v-for="event in events" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label>Menu<select v-model.number="linkForm.menuId" class="form-select"><option :value="0">Select menu</option><option v-for="menu in menusForEventVendor" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" :disabled="!linkForm.eventId || !linkForm.menuId || loading" @click="linkMenu">Link</button>
            <button class="btn btn-outline-secondary" :disabled="!linkForm.eventId || !linkForm.menuId || loading" @click="unlinkMenu">Unlink</button>
          </div>
          <div v-if="selectedEventMenuLinks.length" class="linked-list">
            <span v-for="menu in selectedEventMenuLinks" :key="menu.id">{{ menu.displayName }}</span>
          </div>
        </div>

        <div class="panel wide-panel">
          <h3>Menus</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>Menu</th><th>Vendor</th><th>Active</th><th>Preview</th><th></th></tr></thead>
              <tbody>
                <tr v-for="menu in menus" :key="menu.id">
                  <td><strong>{{ menu.displayName }}</strong><br /><code>{{ menu.name }}</code></td>
                  <td>{{ menu.vendor?.displayName }}</td>
                  <td>{{ menu.isActive ? 'Yes' : 'No' }}</td>
                  <td>
                    <a v-for="preview in menuPreviews(menu.id)" :key="preview.publicUrl" :href="preview.publicUrl" target="_blank" rel="noreferrer">{{ preview.eventName }}</a>
                  </td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="editMenu(menu)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'items'" class="two-column">
        <form class="panel" @submit.prevent="saveItem">
          <h3>{{ itemForm.id ? 'Edit Item' : 'Add Item' }}</h3>
          <div class="form-grid">
            <label>Menu<select v-model.number="itemForm.menuId" class="form-select"><option :value="0">Select menu</option><option v-for="menu in menus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
            <label>Parent<select v-model.number="itemForm.parentId" class="form-select"><option :value="0">No parent</option><option v-for="item in parentCandidates" :key="item.id" :value="item.id">{{ item.displayName }}</option></select></label>
            <label>Slug<input v-model.trim="itemForm.name" class="form-control" placeholder="paneer-tikka" /></label>
            <label>Display Name<input v-model.trim="itemForm.displayName" class="form-control" /></label>
            <label>Type<input v-model.trim="itemForm.type" class="form-control" placeholder="item, category, dish" /></label>
            <label>Tag<input v-model.trim="itemForm.enumType" class="form-control" placeholder="veg, non-veg, premium" /></label>
            <label class="wide">Description<textarea v-model.trim="itemForm.description" rows="2" class="form-control"></textarea></label>
            <label class="wide">Metadata / Ingredients<textarea v-model.trim="itemForm.ingredients" rows="2" class="form-control"></textarea></label>
            <label class="wide">Image URL<input v-model.trim="itemForm.image" class="form-control" /></label>
            <label class="check"><input v-model="itemForm.isActive" type="checkbox" /> Active</label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="loading">Save Item</button>
            <button class="btn btn-outline-secondary" type="button" @click="resetItem">Clear</button>
          </div>
        </form>

        <div class="panel">
          <h3>Items</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>Item</th><th>Menu</th><th>Active</th><th>Preview</th><th></th></tr></thead>
              <tbody>
                <tr v-for="item in items" :key="item.id">
                  <td><strong>{{ item.displayName }}</strong><br /><code>{{ item.name }}</code></td>
                  <td>{{ menuName(item.menuId) }}</td>
                  <td>{{ item.isActive ? 'Yes' : 'No' }}</td>
                  <td>
                    <a v-for="preview in itemPreviews(item.id)" :key="preview.publicUrl" :href="preview.publicUrl" target="_blank" rel="noreferrer">{{ preview.eventName }}</a>
                  </td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="editItem(item)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'qr'" class="two-column">
        <form class="panel" @submit.prevent="saveQr">
          <h3>Create Or Remap QR</h3>
          <div class="form-grid">
            <label>QR Hash<input v-model.trim="qrForm.qrHash" class="form-control" placeholder="abc123" /></label>
            <label>Destination Type<select v-model="qrTargetType" class="form-select"><option value="menu">Menu</option><option value="item">Item</option><option value="custom">Custom Path</option></select></label>
            <label v-if="qrTargetType !== 'custom'">Event<select v-model.number="qrForm.eventId" class="form-select"><option :value="0">Select event</option><option v-for="event in events" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label v-if="qrTargetType === 'menu'">Menu<select v-model.number="qrForm.menuId" class="form-select"><option :value="0">Select menu</option><option v-for="menu in menusForQrEvent" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
            <label v-if="qrTargetType === 'item'">Item<select v-model.number="qrForm.itemId" class="form-select"><option :value="0">Select item</option><option v-for="item in itemsForQrEvent" :key="item.id" :value="item.id">{{ item.displayName }}</option></select></label>
            <label class="wide">Destination URL<input v-model.trim="qrForm.url" class="form-control" placeholder="/event/.../menu/..." /></label>
            <label class="check"><input v-model="qrForm.isActive" type="checkbox" /> Active</label>
          </div>
          <div class="preview-box" v-if="qrPreview.shortQrUrl || qrPreview.finalPublicUrl">
            <div><span>Short QR URL</span><a v-if="qrPreview.shortQrUrl" :href="qrPreview.shortQrUrl" target="_blank" rel="noreferrer">{{ qrPreview.shortQrUrl }}</a></div>
            <div><span>Final URL</span><a v-if="qrPreview.finalPublicUrl" :href="qrPreview.finalPublicUrl" target="_blank" rel="noreferrer">{{ qrPreview.finalPublicUrl }}</a></div>
          </div>
          <div class="actions">
            <button class="btn btn-outline-secondary" type="button" :disabled="loading" @click="buildQrDestination">Generate Destination</button>
            <button class="btn btn-primary" type="submit" :disabled="loading">Save Mapping</button>
          </div>
        </form>

        <div class="panel">
          <h3>QR Mappings</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>QR</th><th>Destination</th><th>Active</th><th>Links</th><th></th></tr></thead>
              <tbody>
                <tr v-for="mapping in qrMappings" :key="mapping.id">
                  <td><code>{{ mapping.qrHash }}</code></td>
                  <td><code>{{ mapping.url }}</code></td>
                  <td>{{ mapping.isActive ? 'Yes' : 'No' }}</td>
                  <td><a :href="mapping.shortQrUrl" target="_blank" rel="noreferrer">QR</a> <a :href="mapping.finalPublicUrl" target="_blank" rel="noreferrer">Final</a></td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="editQr(mapping)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import axios from 'axios';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { API_BASE_URL } from '../config';

type SectionKey = 'home' | 'vendors' | 'events' | 'menus' | 'items' | 'qr';
type Vendor = { id: number; name: string; displayName: string; description?: string; contact: string[]; address?: string; hasContactPage: boolean };
type EventRow = { id: number; name: string; displayName: string; eventDescription?: string; startTime?: string; endTime?: string; status: string; vendorId: number; vendor?: Vendor };
type MenuRow = { id: number; name: string; displayName: string; description?: string; isActive: boolean; vendorId: number; vendor?: Vendor };
type ItemRow = { id: number; name: string; displayName: string; description?: string; ingredients?: string; image?: string; type?: string; enumType?: string; isActive: boolean; menuId: number; parentId?: number };
type QrMapping = { id: number; qrHash: string; url: string; isActive: boolean; shortQrUrl: string; finalPublicUrl: string };
type Preview = { eventId: number; menuId: number; itemId?: number; eventName: string; menuName: string; itemName?: string; publicPath: string; publicUrl: string };

const sections = [
  { key: 'home', label: 'Dashboard Home', icon: 'bi bi-grid-1x2' },
  { key: 'vendors', label: 'Vendors', icon: 'bi bi-shop' },
  { key: 'events', label: 'Events', icon: 'bi bi-calendar-event' },
  { key: 'menus', label: 'Menus', icon: 'bi bi-card-list' },
  { key: 'items', label: 'Items', icon: 'bi bi-tags' },
  { key: 'qr', label: 'QR Mappings', icon: 'bi bi-qr-code' },
] as const;

const activeSection = ref<SectionKey>('home');
const loading = ref(false);
const error = ref('');
const message = ref('');
const vendors = ref<Vendor[]>([]);
const events = ref<EventRow[]>([]);
const menus = ref<MenuRow[]>([]);
const items = ref<ItemRow[]>([]);
const qrMappings = ref<QrMapping[]>([]);
const previews = reactive<{ menus: Preview[]; items: Preview[] }>({ menus: [], items: [] });
const eventMenuMap = ref<Record<number, MenuRow[]>>({});

const vendorContactText = ref('');
const qrTargetType = ref<'menu' | 'item' | 'custom'>('menu');
const qrPreview = reactive({ shortQrUrl: '', finalPublicUrl: '' });

const vendorForm = reactive<any>({ id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
const eventForm = reactive<any>({ id: null, vendorId: 0, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
const menuForm = reactive<any>({ id: null, vendorId: 0, name: '', displayName: '', description: '', isActive: true });
const itemForm = reactive<any>({ id: null, menuId: 0, parentId: 0, name: '', displayName: '', description: '', ingredients: '', image: '', type: 'item', enumType: '', isActive: true });
const linkForm = reactive({ eventId: 0, menuId: 0 });
const qrForm = reactive<any>({ qrHash: '', url: '', isActive: true, eventId: 0, menuId: 0, itemId: 0 });

const activeTitle = computed(() => sections.find((section) => section.key === activeSection.value)?.label ?? 'Admin');
const activeSubtitle = computed(() => {
  const copy: Record<SectionKey, string> = {
    home: 'A quick snapshot of the setup data in Peshkash.',
    vendors: 'Create and reuse vendor records for events and menus.',
    events: 'Manage event identity, ownership, and activation windows.',
    menus: 'Create menus and link them to events for public previews.',
    items: 'Manage generic menu entries without baking in food-only assumptions.',
    qr: 'Create, remap, and verify reusable QR hashes.',
  };
  return copy[activeSection.value];
});

const menusForEventVendor = computed(() => {
  const event = events.value.find((row) => row.id === linkForm.eventId);
  return event ? menus.value.filter((menu) => menu.vendorId === event.vendorId) : menus.value;
});

const selectedEventMenuLinks = computed(() => eventMenuMap.value[linkForm.eventId] ?? []);
const parentCandidates = computed(() => items.value.filter((item) => item.menuId === itemForm.menuId && item.id !== itemForm.id));
const menusForQrEvent = computed(() => eventMenuMap.value[qrForm.eventId] ?? []);
const itemsForQrEvent = computed(() => {
  const menuIds = menusForQrEvent.value.map((menu) => menu.id);
  return items.value.filter((item) => menuIds.includes(item.menuId));
});

function adminUrl(path: string) {
  return `${API_BASE_URL}/admin${path}`;
}

function setNotice(text: string) {
  message.value = text;
  error.value = '';
}

function setError(err: any) {
  error.value = err.response?.data?.message ?? err.message ?? 'Something went wrong';
  message.value = '';
}

function validateSlug(value: string, label: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label} must use lowercase letters, numbers, and hyphens`);
  }
}

async function loadAll() {
  loading.value = true;
  try {
    const [vendorRes, eventRes, menuRes, itemRes, qrRes, previewRes] = await Promise.all([
      axios.get<Vendor[]>(adminUrl('/vendors')),
      axios.get<EventRow[]>(adminUrl('/events')),
      axios.get<MenuRow[]>(adminUrl('/menus')),
      axios.get<ItemRow[]>(adminUrl('/items')),
      axios.get<QrMapping[]>(adminUrl('/qr-mappings')),
      axios.get<{ menus: Preview[]; items: Preview[] }>(adminUrl('/previews')),
    ]);
    vendors.value = vendorRes.data;
    events.value = eventRes.data;
    menus.value = menuRes.data;
    items.value = itemRes.data;
    qrMappings.value = qrRes.data;
    previews.menus = previewRes.data.menus;
    previews.items = previewRes.data.items;
    await loadEventMenuLinks();
  } catch (err) {
    setError(err);
  } finally {
    loading.value = false;
  }
}

async function loadEventMenuLinks() {
  const entries = await Promise.all(events.value.map(async (event) => {
    const { data } = await axios.get<MenuRow[]>(adminUrl(`/events/${event.id}/menus`));
    return [event.id, data] as const;
  }));
  eventMenuMap.value = Object.fromEntries(entries);
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function resetVendor() {
  Object.assign(vendorForm, { id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
  vendorContactText.value = '';
}

function editVendor(vendor: Vendor) {
  Object.assign(vendorForm, vendor);
  vendorContactText.value = vendor.contact?.join(', ') ?? '';
}

async function saveVendor() {
  try {
    validateSlug(vendorForm.name, 'Vendor slug');
    const payload = { ...vendorForm, contact: vendorContactText.value.split(',').map((value) => value.trim()).filter(Boolean) };
    if (vendorForm.id) await axios.put(adminUrl(`/vendors/${vendorForm.id}`), payload);
    else await axios.post(adminUrl('/vendors'), payload);
    resetVendor();
    await loadAll();
    setNotice('Vendor saved');
  } catch (err) {
    setError(err);
  }
}

function resetEvent() {
  Object.assign(eventForm, { id: null, vendorId: 0, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
}

function editEvent(event: EventRow) {
  Object.assign(eventForm, { ...event, startTime: toDateTimeLocal(event.startTime), endTime: toDateTimeLocal(event.endTime) });
}

async function saveEvent() {
  try {
    validateSlug(eventForm.name, 'Event slug');
    if (!eventForm.vendorId) throw new Error('Select a vendor');
    if (eventForm.id) await axios.put(adminUrl(`/events/${eventForm.id}`), eventForm);
    else await axios.post(adminUrl('/events'), eventForm);
    resetEvent();
    await loadAll();
    setNotice('Event saved');
  } catch (err) {
    setError(err);
  }
}

function resetMenu() {
  Object.assign(menuForm, { id: null, vendorId: 0, name: '', displayName: '', description: '', isActive: true });
}

function editMenu(menu: MenuRow) {
  Object.assign(menuForm, menu);
}

async function saveMenu() {
  try {
    validateSlug(menuForm.name, 'Menu slug');
    if (!menuForm.vendorId) throw new Error('Select a vendor');
    if (menuForm.id) await axios.put(adminUrl(`/menus/${menuForm.id}`), menuForm);
    else await axios.post(adminUrl('/menus'), menuForm);
    resetMenu();
    await loadAll();
    setNotice('Menu saved');
  } catch (err) {
    setError(err);
  }
}

async function linkMenu() {
  try {
    await axios.post(adminUrl(`/events/${linkForm.eventId}/menus/${linkForm.menuId}`));
    await loadAll();
    setNotice('Menu linked to event');
  } catch (err) {
    setError(err);
  }
}

async function unlinkMenu() {
  try {
    await axios.delete(adminUrl(`/events/${linkForm.eventId}/menus/${linkForm.menuId}`));
    await loadAll();
    setNotice('Menu unlinked from event');
  } catch (err) {
    setError(err);
  }
}

function resetItem() {
  Object.assign(itemForm, { id: null, menuId: 0, parentId: 0, name: '', displayName: '', description: '', ingredients: '', image: '', type: 'item', enumType: '', isActive: true });
}

function editItem(item: ItemRow) {
  Object.assign(itemForm, { ...item, parentId: item.parentId ?? 0 });
}

async function saveItem() {
  try {
    validateSlug(itemForm.name, 'Item slug');
    if (!itemForm.menuId) throw new Error('Select a menu');
    const payload = { ...itemForm, parentId: itemForm.parentId || null };
    if (itemForm.id) await axios.put(adminUrl(`/items/${itemForm.id}`), payload);
    else await axios.post(adminUrl('/items'), payload);
    resetItem();
    await loadAll();
    setNotice('Item saved');
  } catch (err) {
    setError(err);
  }
}

function eventMenus(eventId: number) {
  return eventMenuMap.value[eventId] ?? [];
}

function menuName(menuId: number) {
  return menus.value.find((menu) => menu.id === menuId)?.displayName ?? 'Unknown menu';
}

function menuPreviews(menuId: number) {
  return previews.menus.filter((preview) => preview.menuId === menuId);
}

function itemPreviews(itemId: number) {
  return previews.items.filter((preview) => preview.itemId === itemId);
}

async function buildQrDestination() {
  try {
    if (qrTargetType.value === 'custom') {
      if (!qrForm.url.startsWith('/')) throw new Error('Custom destination must start with /');
    } else if (qrTargetType.value === 'menu') {
      const { data } = await axios.get<{ path: string; publicUrl: string }>(adminUrl('/preview/menu'), { params: { eventId: qrForm.eventId, menuId: qrForm.menuId } });
      qrForm.url = data.path;
      qrPreview.finalPublicUrl = data.publicUrl;
    } else {
      const { data } = await axios.get<{ path: string; publicUrl: string }>(adminUrl('/preview/item'), { params: { eventId: qrForm.eventId, itemId: qrForm.itemId } });
      qrForm.url = data.path;
      qrPreview.finalPublicUrl = data.publicUrl;
    }
    qrPreview.shortQrUrl = qrForm.qrHash ? `${window.location.origin}/${qrForm.qrHash}` : '';
  } catch (err) {
    setError(err);
  }
}

function editQr(mapping: QrMapping) {
  Object.assign(qrForm, { qrHash: mapping.qrHash, url: mapping.url, isActive: mapping.isActive, eventId: 0, menuId: 0, itemId: 0 });
  qrPreview.shortQrUrl = mapping.shortQrUrl;
  qrPreview.finalPublicUrl = mapping.finalPublicUrl;
  qrTargetType.value = 'custom';
}

async function saveQr() {
  try {
    validateSlug(qrForm.qrHash, 'QR hash');
    if (!qrForm.url) await buildQrDestination();
    const { data } = await axios.post<QrMapping>(adminUrl('/qr-mappings'), { qrHash: qrForm.qrHash, url: qrForm.url, isActive: qrForm.isActive });
    qrPreview.shortQrUrl = data.shortQrUrl;
    qrPreview.finalPublicUrl = data.finalPublicUrl;
    await loadAll();
    setNotice('QR mapping saved');
  } catch (err) {
    setError(err);
  }
}

watch(() => qrForm.qrHash, () => {
  qrPreview.shortQrUrl = qrForm.qrHash ? `${window.location.origin}/${qrForm.qrHash}` : '';
});

onMounted(loadAll);
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: #f6f3ee;
  color: #15191e;
}

.admin-sidebar {
  background: #15191e;
  color: #fff;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.eyebrow {
  margin: 0 0 6px;
  color: #bd945a;
  text-transform: uppercase;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.admin-sidebar h1,
.topbar h2,
.panel h3 {
  font-family: 'Urbanist', sans-serif;
  margin: 0;
}

.admin-sidebar h1 {
  font-size: 1.5rem;
}

.admin-sidebar nav {
  display: grid;
  gap: 8px;
}

.nav-button {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.74);
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
  padding: 10px 12px;
  border-radius: 8px;
}

.nav-button.active,
.nav-button:hover {
  background: rgba(189,148,90,0.18);
  color: #fff;
}

.admin-main {
  padding: 24px;
  overflow: auto;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.topbar p {
  margin: 4px 0 0;
  color: #6b7280;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
}

.metric-card,
.panel {
  background: #fff;
  border: 1px solid #e6dfd4;
  border-radius: 8px;
  padding: 16px;
}

.metric-card span {
  display: block;
  color: #6b7280;
  font-size: 0.9rem;
}

.metric-card strong {
  font-size: 2rem;
}

.two-column {
  display: grid;
  grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.wide-panel {
  grid-column: 1 / -1;
}

.panel h3 {
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.82rem;
  color: #374151;
  font-weight: 700;
}

.wide {
  grid-column: 1 / -1;
}

.check {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding-top: 28px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.table-wrap {
  overflow: auto;
}

code {
  color: #853f19;
}

td a {
  display: inline-block;
  margin-right: 10px;
}

.linked-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.linked-list span {
  background: #f4f1ed;
  border: 1px solid #e6dfd4;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.82rem;
}

.preview-box {
  margin-top: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.preview-box div {
  display: grid;
  gap: 2px;
}

.preview-box span {
  font-size: 0.76rem;
  color: #6b7280;
  font-weight: 800;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }
  .admin-sidebar {
    position: static;
  }
  .admin-sidebar nav {
    grid-template-columns: repeat(2, 1fr);
  }
  .two-column {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .admin-main,
  .admin-sidebar {
    padding: 16px;
  }
  .form-grid,
  .admin-sidebar nav {
    grid-template-columns: 1fr;
  }
}
</style>

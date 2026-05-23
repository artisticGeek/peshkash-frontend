<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div>
        <p class="eyebrow">Peshkash Admin</p>
        <h1>Vendor Workspace</h1>
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
      <header class="workspace-header">
        <div>
          <h2>{{ activeTitle }}</h2>
          <p>{{ activeSubtitle }}</p>
        </div>
        <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadAll">
          <i class="bi bi-arrow-clockwise"></i>
          Refresh
        </button>
      </header>

      <section v-if="activeSection !== 'vendors'" class="vendor-context">
        <div>
          <label>Working Vendor</label>
          <select v-model.number="selectedVendorId" class="form-select">
            <option :value="0">Select vendor</option>
            <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
              {{ vendor.displayName }} ({{ vendor.name }})
            </option>
          </select>
        </div>
        <div v-if="selectedVendor" class="context-summary">
          <strong>{{ selectedVendor.displayName }}</strong>
          <span>{{ selectedVendor.hasContactPage ? 'Contact card active' : 'Contact card inactive' }}</span>
          <a v-if="selectedVendor.hasContactPage" :href="vendorPublicUrl(selectedVendor)" target="_blank" rel="noreferrer">Open vendor page</a>
        </div>
        <div v-else class="context-summary muted">
          Select or create a vendor first. Events, menus, items, and QR mappings will use this vendor.
        </div>
      </section>

      <div v-if="message" class="alert alert-success py-2">{{ message }}</div>
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

      <section v-if="activeSection === 'home'" class="dashboard-grid">
        <article class="metric-card"><span>Vendors</span><strong>{{ vendors.length }}</strong></article>
        <article class="metric-card"><span>Vendor Events</span><strong>{{ vendorEvents.length }}</strong></article>
        <article class="metric-card"><span>Vendor Menus</span><strong>{{ vendorMenus.length }}</strong></article>
        <article class="metric-card"><span>Vendor Items</span><strong>{{ vendorItems.length }}</strong></article>
        <article class="metric-card"><span>QR Mappings</span><strong>{{ qrMappings.length }}</strong></article>
      </section>

      <section v-if="activeSection === 'vendors'" class="two-column">
        <form class="panel" @submit.prevent="saveVendor">
          <h3>{{ vendorForm.id ? 'Edit Vendor' : 'Create Vendor' }}</h3>
          <div class="form-grid">
            <label>Vendor Name<input v-model.trim="vendorForm.displayName" class="form-control" placeholder="Radisson Gurgaon" @blur="fillVendorSlug" /></label>
            <label>Slug<input v-model.trim="vendorForm.name" class="form-control" placeholder="radisson-gurgaon" /></label>
            <p class="hint wide">Use a URL-safe unique slug. If a vendor already exists, add city, branch, year, or a short suffix like <code>radisson-gurgaon-02</code>.</p>
            <label class="wide">Contact Lines<input v-model.trim="vendorContactText" class="form-control" placeholder="Phone, email, website" /></label>
            <label class="wide">Address<input v-model.trim="vendorForm.address" class="form-control" /></label>
            <label class="wide">Description<textarea v-model.trim="vendorForm.description" class="form-control" rows="2"></textarea></label>
            <label class="check"><input v-model="vendorForm.hasContactPage" type="checkbox" /> Contact card active</label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="loading">Save Vendor</button>
            <button class="btn btn-outline-secondary" type="button" @click="resetVendor">Clear</button>
            <button class="btn btn-outline-primary" type="button" :disabled="!vendorForm.id && !selectedVendor" @click="prepareVendorQr">Prepare Vendor QR</button>
          </div>
          <div v-if="vendorQrDraft.url" class="preview-box">
            <div><span>Destination</span><code>{{ vendorQrDraft.url }}</code></div>
            <div><span>QR Hash</span><input v-model.trim="vendorQrDraft.qrHash" class="form-control" placeholder="radisson-gurgaon-card" /></div>
            <button class="btn btn-primary btn-sm" type="button" @click="saveVendorQr">Save Vendor QR</button>
          </div>
        </form>

        <div class="panel">
          <h3>Vendors</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>Vendor</th><th>Slug</th><th>Card</th><th></th></tr></thead>
              <tbody>
                <tr v-for="vendor in vendors" :key="vendor.id">
                  <td>{{ vendor.displayName }}</td>
                  <td><code>{{ vendor.name }}</code></td>
                  <td>{{ vendor.hasContactPage ? 'Active' : 'Inactive' }}</td>
                  <td>
                    <button class="btn btn-outline-secondary btn-sm" @click="selectVendor(vendor)">Use</button>
                    <button class="btn btn-outline-primary btn-sm" @click="editVendor(vendor)">Edit</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'events'" class="two-column">
        <form class="panel" @submit.prevent="saveEvent">
          <h3>{{ eventForm.id ? 'Edit Event' : 'Create Event' }}</h3>
          <p class="hint">Events belong to the selected vendor. They do not need their own QR unless you later add an event landing page.</p>
          <div class="form-grid">
            <label>Event Name<input v-model.trim="eventForm.displayName" class="form-control" placeholder="Sangeet Night" @blur="fillEventSlug" /></label>
            <label>Slug<input v-model.trim="eventForm.name" class="form-control" placeholder="sangeet-night-2026" /></label>
            <label>Status<select v-model="eventForm.status" class="form-select"><option value="draft">Draft</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label>Start<input v-model="eventForm.startTime" type="datetime-local" class="form-control" /></label>
            <label>End<input v-model="eventForm.endTime" type="datetime-local" class="form-control" /></label>
            <label class="wide">Description<textarea v-model.trim="eventForm.eventDescription" rows="2" class="form-control"></textarea></label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="!selectedVendor || loading">Save Event</button>
            <button class="btn btn-outline-secondary" type="button" @click="resetEvent">Clear</button>
          </div>
        </form>

        <div class="panel">
          <h3>Events For {{ selectedVendor?.displayName || 'Vendor' }}</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>Event</th><th>Status</th><th>Linked Menus</th><th></th></tr></thead>
              <tbody>
                <tr v-for="event in vendorEvents" :key="event.id">
                  <td><strong>{{ event.displayName }}</strong><br /><code>{{ event.name }}</code></td>
                  <td><span class="badge text-bg-light">{{ event.status }}</span></td>
                  <td>{{ eventMenus(event.id).map((menu) => menu.displayName).join(', ') || 'None' }}</td>
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
          <p class="hint">Menus can exist independently. Link one or more menus to an event when you are ready to preview.</p>
          <div class="form-grid">
            <label>Menu Name<input v-model.trim="menuForm.displayName" class="form-control" placeholder="Maharaja Menu" @blur="fillMenuSlug" /></label>
            <label>Slug<input v-model.trim="menuForm.name" class="form-control" placeholder="maharaja-menu" /></label>
            <label class="check"><input v-model="menuForm.isActive" type="checkbox" /> Active</label>
            <label class="wide">Description<textarea v-model.trim="menuForm.description" rows="2" class="form-control"></textarea></label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="!selectedVendor || loading">Save Menu</button>
            <button class="btn btn-outline-secondary" type="button" @click="resetMenu">Clear</button>
            <button class="btn btn-outline-primary" type="button" :disabled="!selectedVendor" @click="() => ensureMiscMenu()">Create/Find Misc Menu</button>
          </div>
        </form>

        <div class="panel">
          <h3>Map Menu To Event</h3>
          <div class="form-grid">
            <label>Event<select v-model.number="linkForm.eventId" class="form-select"><option :value="0">Select event</option><option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label>Menu<select v-model.number="linkForm.menuId" class="form-select"><option :value="0">Select menu</option><option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
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
          <h3>Menus For {{ selectedVendor?.displayName || 'Vendor' }}</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>Menu</th><th>Active</th><th>Preview</th><th></th></tr></thead>
              <tbody>
                <tr v-for="menu in vendorMenus" :key="menu.id">
                  <td><strong>{{ menu.displayName }}</strong><br /><code>{{ menu.name }}</code></td>
                  <td>{{ menu.isActive ? 'Yes' : 'No' }}</td>
                  <td><a v-for="preview in menuPreviews(menu.id)" :key="preview.publicUrl" :href="preview.publicUrl" target="_blank" rel="noreferrer">{{ preview.eventName }}</a></td>
                  <td><button class="btn btn-outline-primary btn-sm" @click="editMenu(menu)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'items'" class="panel">
        <div class="panel-heading">
          <div>
            <h3>Items</h3>
            <p class="hint">Add items in rows. Choose a parent item to create a category/subcategory structure.</p>
          </div>
          <div class="item-toolbar">
            <div class="item-context">
              <span>Event</span>
              <strong>{{ selectedEventForItems?.displayName || 'No event selected' }}</strong>
            </div>
            <div class="item-context">
              <span>Source menu</span>
              <strong>{{ selectedMenuForItems?.displayName || 'No source menu selected' }}</strong>
            </div>
            <button class="btn btn-outline-secondary" @click="showItemContextPicker = !showItemContextPicker">
              {{ showItemContextPicker ? 'Hide Context' : 'Change Context' }}
            </button>
            <button class="btn btn-outline-primary" :disabled="!selectedMenuIdForItems" @click="() => addDraftItemRow()">Add Row</button>
            <button class="btn btn-primary" :disabled="!dirtyItemRows.length" @click="saveDirtyItemRows">Save Changed Rows</button>
          </div>
        </div>

        <div v-if="showItemContextPicker || !selectedEventIdForItems || !selectedMenuIdForItems" class="context-picker">
          <label>Event
            <select v-model.number="selectedEventIdForItems" class="form-select">
              <option :value="0">Select event</option>
              <option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option>
            </select>
          </label>
          <label>Source Menu
            <select v-model.number="selectedMenuIdForItems" class="form-select">
              <option :value="0">Select menu</option>
              <option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option>
            </select>
          </label>
        </div>

        <div class="table-wrap">
          <table class="table table-sm align-middle editable-table">
            <thead><tr><th>Name</th><th>Slug</th><th>Parent</th><th>Type</th><th>Tag</th><th>Active</th><th></th></tr></thead>
            <tbody>
              <tr v-for="row in itemRows" :key="row.clientId">
                <td><input v-model.trim="row.displayName" class="form-control" placeholder="Paneer Tikka" @input="markItemDirty(row)" @blur="fillRowSlug(row)" /></td>
                <td><input v-model.trim="row.name" class="form-control" placeholder="paneer-tikka" @input="markItemDirty(row)" /></td>
                <td>
                  <select v-model.number="row.parentId" class="form-select" @change="markItemDirty(row)">
                    <option :value="0">No parent</option>
                    <option v-for="item in parentOptions(row)" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option>
                  </select>
                </td>
                <td><input v-model.trim="row.type" class="form-control" placeholder="item" @input="markItemDirty(row)" /></td>
                <td><input v-model.trim="row.enumType" class="form-control" placeholder="veg" @input="markItemDirty(row)" /></td>
                <td><input v-model="row.isActive" type="checkbox" @change="markItemDirty(row)" /></td>
                <td>
                  <button v-if="row.isDirty || row.isNew" class="btn btn-primary btn-sm" @click="saveItemRow(row)">Save</button>
                  <span v-else class="saved-state">Saved</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="adhoc-box">
          <h4>Adhoc Items</h4>
          <p class="hint">Adhoc items use the selected event and selected menu above. Save into a misc/custom menu for temporary additions, or also copy into the selected source menu.</p>
          <div class="form-grid">
            <div class="context-pill"><span>Event</span><strong>{{ selectedEventForItems?.displayName || 'Select event above' }}</strong></div>
            <div class="context-pill"><span>Source Menu</span><strong>{{ selectedMenuForItems?.displayName || 'Select menu above' }}</strong></div>
            <label>Custom Menu Name<input v-model.trim="adhocForm.customMenuDisplayName" class="form-control" placeholder="Supreme Custom for Sanya" /></label>
            <label>Item Name<input v-model.trim="adhocForm.displayName" class="form-control" placeholder="Chef Special Counter" @blur="fillAdhocSlug" /></label>
            <label>Slug<input v-model.trim="adhocForm.name" class="form-control" /></label>
            <label>Parent In Misc Menu<select v-model.number="adhocForm.parentId" class="form-select"><option :value="0">No parent</option><option v-for="item in miscMenuItems" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option></select></label>
            <label class="check"><input v-model="adhocForm.addToSourceMenu" type="checkbox" /> Copy into selected source menu</label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" :disabled="!selectedVendor || !selectedEventIdForItems || !adhocForm.name" @click="saveAdhocItem">Save Adhoc Item</button>
          </div>
        </div>

        <div class="adhoc-box">
          <h4>Import From Existing Menu</h4>
          <p class="hint">Pull an item from any menu, then save it into the selected source menu or into an adhoc/custom menu for the selected event.</p>
          <div class="form-grid">
            <label>Import From Menu<select v-model.number="importForm.menuId" class="form-select"><option :value="0">Select menu</option><option v-for="menu in menus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
            <label>Item<select v-model.number="importForm.itemId" class="form-select"><option :value="0">Select item</option><option v-for="item in importMenuItems" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option></select></label>
            <label>Custom Menu Name<input v-model.trim="importForm.customMenuDisplayName" class="form-control" placeholder="Supreme Custom for Sanya" /></label>
            <label>Destination<select v-model="importForm.destination" class="form-select"><option value="source">Selected source menu</option><option value="adhoc">Adhoc/custom menu</option><option value="both">Both</option></select></label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" :disabled="!selectedEventIdForItems || !importForm.itemId" @click="saveImportedItem">Import Item</button>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'qr'" class="two-column">
        <form class="panel" @submit.prevent="saveQr">
          <h3>Create Or Remap QR</h3>
          <div class="form-grid">
            <label>QR Hash<input v-model.trim="qrForm.qrHash" class="form-control" placeholder="radisson-gurgaon-card" /></label>
            <label>Destination<select v-model="qrTargetType" class="form-select"><option value="vendor">Vendor Contact Card</option><option value="menu">Event Menu</option><option value="item">Event Item</option><option value="custom">Custom Path</option></select></label>
            <label v-if="qrTargetType !== 'vendor' && qrTargetType !== 'custom'">Event<select v-model.number="qrForm.eventId" class="form-select"><option :value="0">Select event</option><option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label v-if="qrTargetType === 'menu'">Menu<select v-model.number="qrForm.menuId" class="form-select"><option :value="0">Select menu</option><option v-for="menu in menusForQrEvent" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
            <label v-if="qrTargetType === 'item'">Item<select v-model.number="qrForm.itemId" class="form-select"><option :value="0">Select item</option><option v-for="item in itemsForQrEvent" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option></select></label>
            <label class="wide">Destination URL<input v-model.trim="qrForm.url" class="form-control" placeholder="/vendor/radisson-gurgaon" /></label>
            <label class="check"><input v-model="qrForm.isActive" type="checkbox" /> Active</label>
          </div>
          <div class="preview-box" v-if="qrPreview.shortQrUrl || qrPreview.finalPublicUrl">
            <div><span>Short QR URL</span><a :href="qrPreview.shortQrUrl" target="_blank" rel="noreferrer">{{ qrPreview.shortQrUrl }}</a></div>
            <div><span>Final URL</span><a :href="qrPreview.finalPublicUrl" target="_blank" rel="noreferrer">{{ qrPreview.finalPublicUrl }}</a></div>
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
type DraftItem = { clientId: string; id?: number; menuId: number; parentId: number; name: string; displayName: string; type: string; enumType: string; description: string; ingredients: string; image: string; isActive: boolean; isDirty: boolean; isNew: boolean };

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
const selectedVendorId = ref(Number(localStorage.getItem('peshkash-admin-vendor-id') || 0));
const selectedMenuIdForItems = ref(0);
const selectedEventIdForItems = ref(0);
const showItemContextPicker = ref(false);

const vendors = ref<Vendor[]>([]);
const events = ref<EventRow[]>([]);
const menus = ref<MenuRow[]>([]);
const items = ref<ItemRow[]>([]);
const qrMappings = ref<QrMapping[]>([]);
const previews = reactive<{ menus: Preview[]; items: Preview[] }>({ menus: [], items: [] });
const eventMenuMap = ref<Record<number, MenuRow[]>>({});

const vendorContactText = ref('');
const qrTargetType = ref<'vendor' | 'menu' | 'item' | 'custom'>('vendor');
const qrPreview = reactive({ shortQrUrl: '', finalPublicUrl: '' });
const itemRows = ref<DraftItem[]>([]);

const vendorForm = reactive<any>({ id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
const eventForm = reactive<any>({ id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
const menuForm = reactive<any>({ id: null, name: '', displayName: '', description: '', isActive: true });
const linkForm = reactive({ eventId: 0, menuId: 0 });
const qrForm = reactive<any>({ qrHash: '', url: '', isActive: true, eventId: 0, menuId: 0, itemId: 0 });
const vendorQrDraft = reactive({ qrHash: '', url: '' });
const adhocForm = reactive({ parentId: 0, name: '', displayName: '', customMenuDisplayName: '', addToSourceMenu: false });
const importForm = reactive({ menuId: 0, itemId: 0, customMenuDisplayName: '', destination: 'source' as 'source' | 'adhoc' | 'both' });

const selectedVendor = computed(() => vendors.value.find((vendor) => vendor.id === selectedVendorId.value));
const vendorEvents = computed(() => events.value.filter((event) => event.vendorId === selectedVendorId.value));
const vendorMenus = computed(() => menus.value.filter((menu) => menu.vendorId === selectedVendorId.value));
const vendorMenuIds = computed(() => vendorMenus.value.map((menu) => menu.id));
const vendorItems = computed(() => items.value.filter((item) => vendorMenuIds.value.includes(item.menuId)));
const selectedMenuItems = computed(() => items.value.filter((item) => item.menuId === selectedMenuIdForItems.value));
const selectedMenuForItems = computed(() => vendorMenus.value.find((menu) => menu.id === selectedMenuIdForItems.value));
const selectedEventForItems = computed(() => vendorEvents.value.find((event) => event.id === selectedEventIdForItems.value));
const dirtyItemRows = computed(() => itemRows.value.filter((row) => row.isDirty || row.isNew));
const miscMenu = computed(() => vendorMenus.value.find((menu) => menu.name === miscMenuSlug.value));
const miscMenuSlug = computed(() => selectedVendor.value ? `${selectedVendor.value.name}-misc` : '');
const miscMenuItems = computed(() => miscMenu.value ? items.value.filter((item) => item.menuId === miscMenu.value!.id) : []);
const importMenuItems = computed(() => items.value.filter((item) => item.menuId === importForm.menuId));

const activeTitle = computed(() => sections.find((section) => section.key === activeSection.value)?.label ?? 'Admin');
const activeSubtitle = computed(() => {
  const copy: Record<SectionKey, string> = {
    home: 'Work from a selected vendor and move through setup without losing context.',
    vendors: 'Create vendors, activate contact cards, and generate vendor QR mappings.',
    events: 'Create events under the selected vendor. Events do not need standalone QR codes.',
    menus: 'Create source menus independently, then map them to events when needed.',
    items: 'Add source or adhoc items quickly in a table-first workflow.',
    qr: 'Create and remap reusable QR hashes for vendor cards, menus, or items.',
  };
  return copy[activeSection.value];
});

const selectedEventMenuLinks = computed(() => eventMenuMap.value[linkForm.eventId] ?? []);
const menusForQrEvent = computed(() => eventMenuMap.value[qrForm.eventId] ?? []);
const itemsForQrEvent = computed(() => {
  const menuIds = menusForQrEvent.value.map((menu) => menu.id);
  return items.value.filter((item) => menuIds.includes(item.menuId));
});

function adminUrl(path: string) {
  return `${API_BASE_URL}/admin${path}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function setNotice(text: string) {
  message.value = text;
  error.value = '';
}

function setError(err: any) {
  const raw = err.response?.data?.message ?? err.message ?? 'Something went wrong';
  error.value = raw.includes('already exists')
    ? `${raw} Try a more specific slug or add a short suffix.`
    : raw;
  message.value = '';
}

function requireSlug(value: string, label: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label} must use lowercase letters, numbers, and hyphens. Try ${slugify(value || label)}.`);
  }
}

function normalizeVendor(vendor: any): Vendor {
  return { ...vendor, id: Number(vendor.id), contact: vendor.contact ?? [] };
}

function normalizeEvent(event: any): EventRow {
  return {
    ...event,
    id: Number(event.id),
    vendorId: Number(event.vendorId),
    vendor: event.vendor ? normalizeVendor(event.vendor) : undefined,
  };
}

function normalizeMenu(menu: any): MenuRow {
  return {
    ...menu,
    id: Number(menu.id),
    vendorId: Number(menu.vendorId),
    vendor: menu.vendor ? normalizeVendor(menu.vendor) : undefined,
  };
}

function normalizeItem(item: any): ItemRow {
  return {
    ...item,
    id: Number(item.id),
    menuId: Number(item.menuId),
    parentId: item.parentId ? Number(item.parentId) : undefined,
  };
}

function toItemRow(item: ItemRow): DraftItem {
  return {
    clientId: `item-${item.id}`,
    id: item.id,
    menuId: item.menuId,
    parentId: item.parentId ?? 0,
    name: item.name,
    displayName: item.displayName || item.name,
    type: item.type || 'item',
    enumType: item.enumType || '',
    description: item.description || '',
    ingredients: item.ingredients || '',
    image: item.image || '',
    isActive: item.isActive,
    isDirty: false,
    isNew: false,
  };
}

function syncItemRows() {
  const newRows = itemRows.value.filter((row) => row.isNew);
  const existingRows = selectedMenuItems.value.map(toItemRow);
  itemRows.value = [...newRows, ...existingRows];
}

function normalizePreview(preview: any): Preview {
  return {
    ...preview,
    eventId: Number(preview.eventId),
    menuId: Number(preview.menuId),
    itemId: preview.itemId ? Number(preview.itemId) : undefined,
  };
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
    vendors.value = vendorRes.data.map(normalizeVendor);
    events.value = eventRes.data.map(normalizeEvent);
    menus.value = menuRes.data.map(normalizeMenu);
    items.value = itemRes.data.map(normalizeItem);
    qrMappings.value = qrRes.data;
    previews.menus = previewRes.data.menus.map(normalizePreview);
    previews.items = previewRes.data.items.map(normalizePreview);
    if (!selectedVendor.value && vendors.value.length) selectedVendorId.value = vendors.value[0].id;
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
    return [event.id, data.map(normalizeMenu)] as const;
  }));
  eventMenuMap.value = Object.fromEntries(entries);
}

function toDateTimeLocal(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function vendorPublicUrl(vendor: Vendor) {
  return `${window.location.origin}/vendor/${vendor.name}`;
}

function fillVendorSlug() {
  if (!vendorForm.name) vendorForm.name = slugify(vendorForm.displayName);
}

function fillEventSlug() {
  if (!eventForm.name) eventForm.name = slugify(eventForm.displayName);
}

function fillMenuSlug() {
  if (!menuForm.name) menuForm.name = slugify(menuForm.displayName);
}

function fillRowSlug(row: DraftItem) {
  if (!row.name) row.name = slugify(row.displayName);
}

function fillAdhocSlug() {
  if (!adhocForm.name) adhocForm.name = slugify(adhocForm.displayName);
}

function selectVendor(vendor: Vendor) {
  selectedVendorId.value = vendor.id;
  setNotice(`Working vendor set to ${vendor.displayName}`);
}

function resetVendor() {
  Object.assign(vendorForm, { id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
  vendorContactText.value = '';
  vendorQrDraft.qrHash = '';
  vendorQrDraft.url = '';
}

function editVendor(vendor: Vendor) {
  Object.assign(vendorForm, vendor);
  vendorContactText.value = vendor.contact?.join(', ') ?? '';
  selectedVendorId.value = vendor.id;
  activeSection.value = 'vendors';
}

async function saveVendor() {
  try {
    fillVendorSlug();
    requireSlug(vendorForm.name, 'Vendor slug');
    const payload = { ...vendorForm, contact: vendorContactText.value.split(',').map((value) => value.trim()).filter(Boolean) };
    const { data } = vendorForm.id
      ? await axios.put<Vendor>(adminUrl(`/vendors/${vendorForm.id}`), payload)
      : await axios.post<Vendor>(adminUrl('/vendors'), payload);
    selectedVendorId.value = data.id;
    await loadAll();
    editVendor(data);
    setNotice('Vendor saved. You can now create a vendor QR on this page.');
  } catch (err) {
    setError(err);
  }
}

function prepareVendorQr() {
  const vendor = selectedVendor.value || vendors.value.find((row) => row.id === vendorForm.id);
  if (!vendor) return setError(new Error('Select or save a vendor first'));
  vendorQrDraft.url = `/vendor/${vendor.name}`;
  vendorQrDraft.qrHash = vendorQrDraft.qrHash || `${vendor.name}-card`;
}

async function saveVendorQr() {
  try {
    requireSlug(vendorQrDraft.qrHash, 'QR hash');
    await axios.post(adminUrl('/qr-mappings'), { qrHash: vendorQrDraft.qrHash, url: vendorQrDraft.url, isActive: true });
    await loadAll();
    setNotice('Vendor QR mapping saved');
  } catch (err) {
    setError(err);
  }
}

function resetEvent() {
  Object.assign(eventForm, { id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
}

function editEvent(event: EventRow) {
  Object.assign(eventForm, { ...event, startTime: toDateTimeLocal(event.startTime), endTime: toDateTimeLocal(event.endTime) });
}

async function saveEvent() {
  try {
    if (!selectedVendor.value) throw new Error('Select or create a vendor before creating an event');
    fillEventSlug();
    requireSlug(eventForm.name, 'Event slug');
    const payload = { ...eventForm, vendorId: selectedVendorId.value };
    if (eventForm.id) await axios.put(adminUrl(`/events/${eventForm.id}`), payload);
    else await axios.post(adminUrl('/events'), payload);
    resetEvent();
    await loadAll();
    setNotice('Event saved');
  } catch (err) {
    setError(err);
  }
}

function resetMenu() {
  Object.assign(menuForm, { id: null, name: '', displayName: '', description: '', isActive: true });
}

function editMenu(menu: MenuRow) {
  Object.assign(menuForm, menu);
}

async function saveMenu() {
  try {
    if (!selectedVendor.value) throw new Error('Select or create a vendor before creating a menu');
    fillMenuSlug();
    requireSlug(menuForm.name, 'Menu slug');
    const payload = { ...menuForm, vendorId: selectedVendorId.value };
    if (menuForm.id) await axios.put(adminUrl(`/menus/${menuForm.id}`), payload);
    else await axios.post(adminUrl('/menus'), payload);
    resetMenu();
    await loadAll();
    setNotice('Menu saved');
  } catch (err) {
    setError(err);
  }
}

async function ensureMiscMenu() {
  if (!selectedVendor.value) throw new Error('Select a vendor first');
  const existing = miscMenu.value;
  if (existing) {
    selectedMenuIdForItems.value = existing.id;
    return existing;
  }
  const { data } = await axios.post<MenuRow>(adminUrl('/menus'), {
    vendorId: selectedVendorId.value,
    name: miscMenuSlug.value,
    displayName: 'Miscellaneous / Adhoc Items',
    description: 'Default temporary additions menu for event-specific adhoc items.',
    isActive: true,
  });
  await loadAll();
  selectedMenuIdForItems.value = data.id;
  return data;
}

async function ensureAdhocMenu() {
  if (!adhocForm.customMenuDisplayName.trim()) return ensureMiscMenu();
  if (!selectedVendor.value) throw new Error('Select a vendor first');
  const name = slugify(adhocForm.customMenuDisplayName);
  const existing = vendorMenus.value.find((menu) => menu.name === name);
  if (existing) return existing;
  const { data } = await axios.post<MenuRow>(adminUrl('/menus'), {
    vendorId: selectedVendorId.value,
    name,
    displayName: adhocForm.customMenuDisplayName.trim(),
    description: 'Custom event menu assembled from adhoc/imported items.',
    isActive: true,
  });
  await loadAll();
  return normalizeMenu(data);
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

function addDraftItemRow(menuId = selectedMenuIdForItems.value) {
  itemRows.value.unshift({
    clientId: crypto.randomUUID(),
    menuId,
    parentId: 0,
    name: '',
    displayName: '',
    type: 'item',
    enumType: '',
    description: '',
    ingredients: '',
    image: '',
    isActive: true,
    isDirty: true,
    isNew: true,
  });
}

function markItemDirty(row: DraftItem) {
  row.isDirty = true;
}

function parentOptions(row: DraftItem) {
  return selectedMenuItems.value.filter((item) => item.id !== row.id);
}

async function saveItemRow(row: DraftItem) {
  try {
    fillRowSlug(row);
    requireSlug(row.name, 'Item slug');
    const payload = { ...row, parentId: row.parentId || null };
    if (row.id) await axios.put(adminUrl(`/items/${row.id}`), payload);
    else await axios.post(adminUrl('/items'), payload);
    await loadAll();
    syncItemRows();
    setNotice('Item saved');
  } catch (err) {
    setError(err);
  }
}

async function saveDirtyItemRows() {
  for (const row of dirtyItemRows.value) {
    await saveItemRow(row);
  }
}

async function saveAdhocItem() {
  try {
    if (!selectedEventIdForItems.value) throw new Error('Select an event in the item toolbar first');
    const adhocMenu = await ensureAdhocMenu();
    fillAdhocSlug();
    requireSlug(adhocForm.name, 'Adhoc item slug');
    const payload = {
      menuId: adhocMenu.id,
      name: adhocForm.name,
      displayName: adhocForm.displayName,
      type: 'item',
      parentId: adhocForm.parentId || null,
      isActive: true,
    };
    await axios.post(adminUrl('/items'), payload);
    await axios.post(adminUrl(`/events/${selectedEventIdForItems.value}/menus/${adhocMenu.id}`), {
      displayName: adhocForm.customMenuDisplayName || adhocMenu.displayName,
    });
    if (adhocForm.addToSourceMenu && selectedMenuIdForItems.value) {
      await axios.post(adminUrl('/items'), { ...payload, menuId: selectedMenuIdForItems.value, parentId: null });
    }
    Object.assign(adhocForm, { parentId: 0, name: '', displayName: '', addToSourceMenu: false });
    await loadAll();
    syncItemRows();
    setNotice('Adhoc item saved and menu linked to event');
  } catch (err) {
    setError(err);
  }
}

function cloneItemPayload(item: ItemRow, menuId: number) {
  return {
    menuId,
    name: item.name,
    displayName: itemLabel(item),
    description: item.description,
    ingredients: item.ingredients,
    image: item.image,
    type: item.type || 'item',
    enumType: item.enumType,
    isActive: item.isActive,
    parentId: null,
  };
}

async function saveImportedItem() {
  try {
    if (!selectedEventIdForItems.value) throw new Error('Select an event in the item toolbar first');
    const item = items.value.find((row) => row.id === importForm.itemId);
    if (!item) throw new Error('Select an item to import');
    const shouldUseSource = importForm.destination === 'source' || importForm.destination === 'both';
    const shouldUseAdhoc = importForm.destination === 'adhoc' || importForm.destination === 'both';
    if (shouldUseSource) {
      if (!selectedMenuIdForItems.value) throw new Error('Select a source menu in the item toolbar first');
      await axios.post(adminUrl('/items'), cloneItemPayload(item, selectedMenuIdForItems.value));
    }
    if (shouldUseAdhoc) {
      const displayName = importForm.customMenuDisplayName.trim();
      const previousCustomName = adhocForm.customMenuDisplayName;
      adhocForm.customMenuDisplayName = displayName;
      const adhocMenu = await ensureAdhocMenu();
      adhocForm.customMenuDisplayName = previousCustomName;
      await axios.post(adminUrl('/items'), cloneItemPayload(item, adhocMenu.id));
      await axios.post(adminUrl(`/events/${selectedEventIdForItems.value}/menus/${adhocMenu.id}`), {
        displayName: displayName || adhocMenu.displayName,
      });
    }
    Object.assign(importForm, { menuId: 0, itemId: 0, customMenuDisplayName: '', destination: 'source' });
    await loadAll();
    syncItemRows();
    setNotice('Item imported');
  } catch (err) {
    setError(err);
  }
}

function eventMenus(eventId: number) {
  return eventMenuMap.value[eventId] ?? [];
}

function parentName(parentId?: number) {
  const parent = parentId ? items.value.find((item) => item.id === parentId) : undefined;
  return parent ? itemLabel(parent) : 'No parent';
}

function itemLabel(item: ItemRow) {
  return item.displayName?.trim() || item.name;
}

function menuPreviews(menuId: number) {
  return previews.menus.filter((preview) => preview.menuId === menuId);
}

function buildAbsolute(path: string) {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${withSlash}`;
}

async function buildQrDestination() {
  try {
    if (qrTargetType.value === 'vendor') {
      if (!selectedVendor.value) throw new Error('Select a vendor first');
      qrForm.url = `/vendor/${selectedVendor.value.name}`;
    } else if (qrTargetType.value === 'custom') {
      if (!qrForm.url.startsWith('/')) throw new Error('Custom destination must start with /');
    } else if (qrTargetType.value === 'menu') {
      const { data } = await axios.get<{ path: string; publicUrl: string }>(adminUrl('/preview/menu'), { params: { eventId: qrForm.eventId, menuId: qrForm.menuId } });
      qrForm.url = data.path;
    } else {
      const { data } = await axios.get<{ path: string; publicUrl: string }>(adminUrl('/preview/item'), { params: { eventId: qrForm.eventId, itemId: qrForm.itemId } });
      qrForm.url = data.path;
    }
    qrPreview.shortQrUrl = qrForm.qrHash ? `${window.location.origin}/${qrForm.qrHash}` : '';
    qrPreview.finalPublicUrl = qrForm.url ? buildAbsolute(qrForm.url) : '';
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
    requireSlug(qrForm.qrHash, 'QR hash');
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

watch(selectedVendorId, (vendorId) => {
  localStorage.setItem('peshkash-admin-vendor-id', String(vendorId || ''));
  resetEvent();
  resetMenu();
  linkForm.eventId = 0;
  linkForm.menuId = 0;
  selectedMenuIdForItems.value = vendorMenus.value[0]?.id ?? 0;
  selectedEventIdForItems.value = vendorEvents.value[0]?.id ?? 0;
  syncItemRows();
});

watch([selectedMenuIdForItems, items], syncItemRows);

watch(() => qrForm.qrHash, () => {
  qrPreview.shortQrUrl = qrForm.qrHash ? `${window.location.origin}/${qrForm.qrHash}` : '';
});

onMounted(async () => {
  await loadAll();
  selectedMenuIdForItems.value = vendorMenus.value[0]?.id ?? 0;
  selectedEventIdForItems.value = vendorEvents.value[0]?.id ?? 0;
  syncItemRows();
});
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
.workspace-header h2,
.panel h3,
.adhoc-box h4 {
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

.workspace-header,
.vendor-context,
.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.workspace-header p,
.hint {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 0.88rem;
}

.vendor-context,
.metric-card,
.panel,
.adhoc-box {
  background: #fff;
  border: 1px solid #e6dfd4;
  border-radius: 8px;
  padding: 16px;
}

.vendor-context {
  position: sticky;
  top: 0;
  z-index: 3;
}

.vendor-context > div:first-child {
  min-width: 320px;
}

.vendor-context label,
label {
  display: grid;
  gap: 6px;
  font-size: 0.82rem;
  color: #374151;
  font-weight: 700;
}

.context-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.muted {
  color: #6b7280;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
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
  grid-template-columns: minmax(320px, 460px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.wide-panel {
  grid-column: 1 / -1;
}

.panel h3 {
  font-size: 1rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
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

.actions,
.item-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 14px;
}

.item-toolbar {
  margin-top: 0;
  min-width: 360px;
  align-items: center;
}

.item-context,
.context-picker label {
  display: grid;
  gap: 2px;
  color: #5c6472;
  font-size: 12px;
}

.item-context strong {
  color: #111827;
  font-size: 14px;
}

.context-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}

.table-wrap {
  overflow: auto;
}

.editable-table {
  min-width: 980px;
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

.adhoc-box {
  margin-top: 18px;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }
  .admin-sidebar nav {
    grid-template-columns: repeat(2, 1fr);
  }
  .two-column,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .vendor-context,
  .workspace-header,
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .item-toolbar,
  .vendor-context > div:first-child {
    min-width: 0;
  }
}
</style>

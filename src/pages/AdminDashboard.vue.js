import axios from 'axios';
import QRCode from 'qrcode';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import MenuTree from '../components/MenuTree.vue';
import { API_BASE_URL } from '../config';
const sections = [
    { key: 'home', label: 'Dashboard Home', icon: 'bi bi-grid-1x2' },
    { key: 'vendors', label: 'Vendors', icon: 'bi bi-shop' },
    { key: 'inventory', label: 'Item Library', icon: 'bi bi-box-seam' },
    { key: 'designer', label: 'Menu Designer', icon: 'bi bi-layout-three-columns' },
    { key: 'preview', label: 'Menu Preview', icon: 'bi bi-phone' },
    { key: 'publish', label: 'Event Publish', icon: 'bi bi-send-check' },
    { key: 'qr', label: 'QR Mappings', icon: 'bi bi-qr-code' },
];
const route = useRoute();
const router = useRouter();
const dashboardRouteBySection = {
    home: '/dashboard/home',
    vendors: '/dashboard/vendors',
    inventory: '/dashboard/items',
    analytics: '/dashboard/items',
    designer: '/dashboard/menus/designer',
    preview: '/dashboard/menus/preview',
    publish: '/dashboard/events/publish',
    qr: '/dashboard/qr',
    events: '/dashboard/events/publish',
    menus: '/dashboard/menus/designer',
    items: '/dashboard/items',
};
function sectionFromPath(path) {
    if (path.startsWith('/dashboard/vendors'))
        return 'vendors';
    if (path.startsWith('/dashboard/items/'))
        return 'analytics';
    if (path.startsWith('/dashboard/items'))
        return 'inventory';
    if (path.startsWith('/dashboard/menus/preview'))
        return 'preview';
    if (path.startsWith('/dashboard/menus/designer'))
        return 'designer';
    if (path.startsWith('/dashboard/events/publish'))
        return 'publish';
    if (path.startsWith('/dashboard/qr'))
        return 'qr';
    return 'home';
}
const activeSection = computed({
    get: () => sectionFromPath(route.path),
    set: (section) => router.push(dashboardRouteBySection[section]),
});
const loading = ref(false);
const error = ref('');
const message = ref('');
const selectedVendorId = ref(Number(localStorage.getItem('peshkash-admin-vendor-id') || 0));
const selectedMenuIdForItems = ref(0);
const selectedEventIdForItems = ref(0);
const showItemContextPicker = ref(false);
const showVendorEditor = ref(false);
const designerMenuName = ref('');
const designerFullMenuQr = ref(false);
const designerNotes = reactive({});
const designerSearch = ref('');
const itemSearch = ref('');
const itemMenuFilter = ref(0);
const itemTypeFilter = ref('');
const selectedAnalyticsItemId = ref(null);
const draggedLibraryItemId = ref(null);
const draggedDesignedItemId = ref(null);
let alertTimer;
const vendors = ref([]);
const events = ref([]);
const menus = ref([]);
const items = ref([]);
const qrMappings = ref([]);
const previews = reactive({ menus: [], items: [] });
const eventMenuMap = ref({});
const vendorContactText = ref('');
const qrTargetType = ref('vendor');
const qrPreview = reactive({ shortQrUrl: '', finalPublicUrl: '' });
const qrCodeDataUrl = ref('');
const vendorQrCodeDataUrl = ref('');
const itemRows = ref([]);
const vendorForm = reactive({ id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
const eventForm = reactive({ id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
const menuForm = reactive({ id: null, name: '', displayName: '', description: '', isActive: true });
const linkForm = reactive({ eventId: 0, menuId: 0 });
const qrForm = reactive({ qrHash: '', url: '', isActive: true, eventId: 0, menuId: 0, itemId: 0 });
const vendorQrDraft = reactive({ qrHash: '', url: '' });
const adhocForm = reactive({ parentId: 0, name: '', displayName: '', customMenuDisplayName: '', addToSourceMenu: false });
const importForm = reactive({ menuId: 0, itemId: 0, customMenuDisplayName: '', destination: 'source' });
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
const miscMenuItems = computed(() => miscMenu.value ? items.value.filter((item) => item.menuId === miscMenu.value.id) : []);
const importMenuItems = computed(() => items.value.filter((item) => item.menuId === importForm.menuId));
const itemTypeOptions = computed(() => Array.from(new Set(vendorItems.value.map((item) => item.type || 'item'))).sort());
const inventoryRows = computed(() => itemRows.value.filter((row) => {
    const query = itemSearch.value.toLowerCase();
    const matchesSearch = !query || [row.displayName, row.name, row.type, row.enumType].some((value) => value?.toLowerCase().includes(query));
    const matchesMenu = !itemMenuFilter.value || row.menuId === itemMenuFilter.value;
    const matchesType = !itemTypeFilter.value || row.type === itemTypeFilter.value;
    return matchesSearch && matchesMenu && matchesType;
}));
const availableDesignerItems = computed(() => vendorItems.value.filter((item) => {
    const query = designerSearch.value.toLowerCase();
    const notInMenu = item.menuId !== selectedMenuIdForItems.value;
    const matchesSearch = !query || [item.displayName, item.name, item.type, item.enumType].some((value) => value?.toLowerCase().includes(query));
    return notInMenu && matchesSearch;
}));
const selectedMenuTree = computed(() => buildItemTree(selectedMenuItems.value));
const selectedAnalyticsItem = computed(() => selectedAnalyticsItemId.value ? items.value.find((item) => item.id === selectedAnalyticsItemId.value) : undefined);
const selectedAnalyticsUsage = computed(() => {
    if (!selectedAnalyticsItem.value)
        return [];
    return events.value.flatMap((event) => eventMenus(event.id)
        .filter((menu) => menu.id === selectedAnalyticsItem.value.menuId)
        .map((menu) => ({ event, menu })));
});
const menuPreviewUrl = computed(() => selectedEventForItems.value && selectedMenuForItems.value
    ? `${window.location.origin}/event/${selectedEventForItems.value.name}/menu/${selectedMenuForItems.value.name}`
    : '');
const selectedEventMenus = computed(() => selectedEventIdForItems.value ? eventMenus(selectedEventIdForItems.value) : []);
const selectedEventMenuIds = computed(() => selectedEventMenus.value.map((menu) => menu.id));
const selectedEventItems = computed(() => items.value.filter((item) => selectedEventMenuIds.value.includes(item.menuId)));
const publishChecklist = computed(() => [
    { label: 'Vendor selected', done: Boolean(selectedVendor.value) },
    { label: 'Event selected or saved', done: Boolean(selectedEventForItems.value || eventForm.id) },
    { label: 'Event has active dates', done: Boolean((selectedEventForItems.value?.startTime || eventForm.startTime) && (selectedEventForItems.value?.endTime || eventForm.endTime)) },
    { label: 'At least one menu linked', done: selectedEventMenus.value.length > 0 },
    { label: 'Linked menus contain items', done: selectedEventItems.value.length > 0 },
]);
const canPublish = computed(() => publishChecklist.value.every((item) => item.done));
const activeTitle = computed(() => sections.find((section) => section.key === activeSection.value)?.label ?? 'Admin');
const activeSubtitle = computed(() => {
    const copy = {
        home: 'Work from a selected vendor and move through setup without losing context.',
        vendors: 'Create vendors, activate contact cards, and generate vendor QR mappings.',
        inventory: 'Manage reusable vendor items before they are assembled into menus.',
        analytics: 'Inspect where an item is used and leave space for scans, ratings, and first-added history.',
        designer: 'Assemble event-ready menus from existing items, adhoc items, and custom menu copies.',
        preview: 'Review the menu as guests will see it before QR mapping or publish.',
        publish: 'Validate event setup and keep the future payment checkpoint in one place.',
        events: 'Create events under the selected vendor. Events do not need standalone QR codes.',
        menus: 'Create source menus independently, then map them to events when needed.',
        items: 'Add source or adhoc items quickly in a table-first workflow.',
        qr: 'Create and remap reusable QR hashes for vendor cards, menus, or items.',
    };
    return copy[activeSection.value];
});
const dashboardSteps = computed(() => [
    { key: 'vendors', label: 'Vendor Setup', description: 'Create or reuse a vendor and generate contact QR codes.', status: `${vendors.value.length} vendors` },
    { key: 'inventory', label: 'Item Library', description: 'Maintain the exhaustive reusable item list with filters and analytics.', status: `${vendorItems.value.length} items` },
    { key: 'designer', label: 'Menu Designer', description: 'Build nested menus visually from reusable items.', status: `${vendorMenus.value.length} menus` },
    { key: 'preview', label: 'Preview', description: 'Use the same recursive menu renderer guests see.', status: selectedMenuForItems.value?.displayName || 'Select menu' },
    { key: 'publish', label: 'Publish', description: 'Validate event setup. Future payment gate lives here.', status: canPublish.value ? 'Ready' : 'Needs checks' },
    { key: 'qr', label: 'QR Mapping', description: 'Create reusable mappings and render actual QR codes.', status: `${qrMappings.value.length} mappings` },
]);
const selectedEventMenuLinks = computed(() => eventMenuMap.value[linkForm.eventId] ?? []);
const menusForQrEvent = computed(() => eventMenuMap.value[qrForm.eventId] ?? []);
const itemsForQrEvent = computed(() => {
    const menuIds = menusForQrEvent.value.map((menu) => menu.id);
    return items.value.filter((item) => menuIds.includes(item.menuId));
});
function adminUrl(path) {
    return `${API_BASE_URL}/admin${path}`;
}
function slugify(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .replace(/-{2,}/g, '-');
}
function setNotice(text) {
    message.value = text;
    error.value = '';
    window.clearTimeout(alertTimer);
    alertTimer = window.setTimeout(() => { message.value = ''; }, 4000);
}
function setError(err) {
    const raw = err.response?.data?.message ?? err.message ?? 'Something went wrong';
    error.value = raw.includes('already exists')
        ? `${raw} Try a more specific slug or add a short suffix.`
        : raw;
    message.value = '';
    window.clearTimeout(alertTimer);
    alertTimer = window.setTimeout(() => { error.value = ''; }, 7000);
}
function requireSlug(value, label) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
        throw new Error(`${label} must use lowercase letters, numbers, and hyphens. Try ${slugify(value || label)}.`);
    }
}
function normalizeVendor(vendor) {
    return { ...vendor, id: Number(vendor.id), contact: vendor.contact ?? [] };
}
function normalizeEvent(event) {
    return {
        ...event,
        id: Number(event.id),
        vendorId: Number(event.vendorId),
        vendor: event.vendor ? normalizeVendor(event.vendor) : undefined,
    };
}
function normalizeMenu(menu) {
    return {
        ...menu,
        id: Number(menu.id),
        vendorId: Number(menu.vendorId),
        vendor: menu.vendor ? normalizeVendor(menu.vendor) : undefined,
    };
}
function normalizeItem(item) {
    return {
        ...item,
        id: Number(item.id),
        menuId: Number(item.menuId),
        parentId: item.parentId ? Number(item.parentId) : undefined,
    };
}
function toItemRow(item) {
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
    const existingRows = vendorItems.value.map(toItemRow);
    itemRows.value = [...newRows, ...existingRows];
}
function normalizePreview(preview) {
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
            axios.get(adminUrl('/vendors')),
            axios.get(adminUrl('/events')),
            axios.get(adminUrl('/menus')),
            axios.get(adminUrl('/items')),
            axios.get(adminUrl('/qr-mappings')),
            axios.get(adminUrl('/previews')),
        ]);
        vendors.value = vendorRes.data.map(normalizeVendor);
        events.value = eventRes.data.map(normalizeEvent);
        menus.value = menuRes.data.map(normalizeMenu);
        items.value = itemRes.data.map(normalizeItem);
        qrMappings.value = qrRes.data;
        previews.menus = previewRes.data.menus.map(normalizePreview);
        previews.items = previewRes.data.items.map(normalizePreview);
        if (!selectedVendor.value && vendors.value.length)
            selectedVendorId.value = vendors.value[0].id;
        await loadEventMenuLinks();
    }
    catch (err) {
        setError(err);
    }
    finally {
        loading.value = false;
    }
}
async function loadEventMenuLinks() {
    const entries = await Promise.all(events.value.map(async (event) => {
        const { data } = await axios.get(adminUrl(`/events/${event.id}/menus`));
        return [event.id, data.map(normalizeMenu)];
    }));
    eventMenuMap.value = Object.fromEntries(entries);
}
function toDateTimeLocal(value) {
    if (!value)
        return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function vendorPublicUrl(vendor) {
    return `${window.location.origin}/vendor/${vendor.name}`;
}
function fillVendorSlug() {
    if (!vendorForm.name)
        vendorForm.name = slugify(vendorForm.displayName);
}
function fillEventSlug() {
    if (!eventForm.name)
        eventForm.name = slugify(eventForm.displayName);
}
function fillMenuSlug() {
    if (!menuForm.name)
        menuForm.name = slugify(menuForm.displayName);
}
function fillRowSlug(row) {
    if (!row.name)
        row.name = slugify(row.displayName);
}
function fillAdhocSlug() {
    if (!adhocForm.name)
        adhocForm.name = slugify(adhocForm.displayName);
}
function selectVendor(vendor) {
    selectedVendorId.value = vendor.id;
    setNotice(`Working vendor set to ${vendor.displayName}`);
}
function openVendorEditor(vendor) {
    if (vendor) {
        editVendor(vendor);
    }
    else {
        resetVendor();
        showVendorEditor.value = true;
    }
}
function closeVendorEditor() {
    showVendorEditor.value = false;
    resetVendor();
}
function resetVendor() {
    Object.assign(vendorForm, { id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
    vendorContactText.value = '';
    vendorQrDraft.qrHash = '';
    vendorQrDraft.url = '';
    vendorQrCodeDataUrl.value = '';
}
function editVendor(vendor) {
    Object.assign(vendorForm, vendor);
    vendorContactText.value = vendor.contact?.join(', ') ?? '';
    selectedVendorId.value = vendor.id;
    showVendorEditor.value = true;
    activeSection.value = 'vendors';
}
async function saveVendor() {
    try {
        fillVendorSlug();
        requireSlug(vendorForm.name, 'Vendor slug');
        const payload = { ...vendorForm, contact: vendorContactText.value.split(',').map((value) => value.trim()).filter(Boolean) };
        const { data } = vendorForm.id
            ? await axios.put(adminUrl(`/vendors/${vendorForm.id}`), payload)
            : await axios.post(adminUrl('/vendors'), payload);
        selectedVendorId.value = data.id;
        await loadAll();
        editVendor(data);
        setNotice('Vendor saved. You can now create a vendor QR on this page.');
    }
    catch (err) {
        setError(err);
    }
}
async function prepareVendorQr(vendorArg) {
    const vendor = vendorArg || vendors.value.find((row) => row.id === vendorForm.id) || selectedVendor.value;
    if (!vendor)
        return setError(new Error('Select or save a vendor first'));
    Object.assign(vendorForm, vendor);
    vendorContactText.value = vendor.contact?.join(', ') ?? '';
    showVendorEditor.value = true;
    selectedVendorId.value = vendor.id;
    vendorQrDraft.url = `/vendor/${vendor.name}`;
    vendorQrDraft.qrHash = vendorQrDraft.qrHash || `${vendor.name}-card`;
    vendorQrCodeDataUrl.value = await QRCode.toDataURL(`${window.location.origin}/${vendorQrDraft.qrHash}`, { margin: 1, width: 180 });
}
async function saveVendorQr() {
    try {
        requireSlug(vendorQrDraft.qrHash, 'QR hash');
        await axios.post(adminUrl('/qr-mappings'), { qrHash: vendorQrDraft.qrHash, url: vendorQrDraft.url, isActive: true });
        await loadAll();
        setNotice('Vendor QR mapping saved');
    }
    catch (err) {
        setError(err);
    }
}
function resetEvent() {
    Object.assign(eventForm, { id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
}
function editEvent(event) {
    Object.assign(eventForm, { ...event, startTime: toDateTimeLocal(event.startTime), endTime: toDateTimeLocal(event.endTime) });
}
async function saveEvent() {
    try {
        if (!selectedVendor.value)
            throw new Error('Select or create a vendor before creating an event');
        fillEventSlug();
        requireSlug(eventForm.name, 'Event slug');
        const payload = { ...eventForm, vendorId: selectedVendorId.value };
        if (eventForm.id)
            await axios.put(adminUrl(`/events/${eventForm.id}`), payload);
        else
            await axios.post(adminUrl('/events'), payload);
        resetEvent();
        await loadAll();
        setNotice('Event saved');
    }
    catch (err) {
        setError(err);
    }
}
function resetMenu() {
    Object.assign(menuForm, { id: null, name: '', displayName: '', description: '', isActive: true });
}
function editMenu(menu) {
    Object.assign(menuForm, menu);
}
async function saveMenu() {
    try {
        if (!selectedVendor.value)
            throw new Error('Select or create a vendor before creating a menu');
        fillMenuSlug();
        requireSlug(menuForm.name, 'Menu slug');
        const payload = { ...menuForm, vendorId: selectedVendorId.value };
        if (menuForm.id)
            await axios.put(adminUrl(`/menus/${menuForm.id}`), payload);
        else
            await axios.post(adminUrl('/menus'), payload);
        resetMenu();
        await loadAll();
        setNotice('Menu saved');
    }
    catch (err) {
        setError(err);
    }
}
async function ensureMiscMenu() {
    if (!selectedVendor.value)
        throw new Error('Select a vendor first');
    const existing = miscMenu.value;
    if (existing) {
        selectedMenuIdForItems.value = existing.id;
        return existing;
    }
    const { data } = await axios.post(adminUrl('/menus'), {
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
    if (!adhocForm.customMenuDisplayName.trim())
        return ensureMiscMenu();
    if (!selectedVendor.value)
        throw new Error('Select a vendor first');
    const name = slugify(adhocForm.customMenuDisplayName);
    const existing = vendorMenus.value.find((menu) => menu.name === name);
    if (existing)
        return existing;
    const { data } = await axios.post(adminUrl('/menus'), {
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
    }
    catch (err) {
        setError(err);
    }
}
async function unlinkMenu() {
    try {
        await axios.delete(adminUrl(`/events/${linkForm.eventId}/menus/${linkForm.menuId}`));
        await loadAll();
        setNotice('Menu unlinked from event');
    }
    catch (err) {
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
function markItemDirty(row) {
    row.isDirty = true;
}
function parentOptions(row) {
    return items.value.filter((item) => item.menuId === row.menuId && item.id !== row.id);
}
async function saveItemRow(row) {
    try {
        fillRowSlug(row);
        requireSlug(row.name, 'Item slug');
        const payload = { ...row, parentId: row.parentId || null };
        if (row.id)
            await axios.put(adminUrl(`/items/${row.id}`), payload);
        else
            await axios.post(adminUrl('/items'), payload);
        await loadAll();
        syncItemRows();
        setNotice('Item saved');
    }
    catch (err) {
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
        if (!selectedEventIdForItems.value)
            throw new Error('Select an event in the item toolbar first');
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
    }
    catch (err) {
        setError(err);
    }
}
function cloneItemPayload(item, menuId) {
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
        if (!selectedEventIdForItems.value)
            throw new Error('Select an event in the item toolbar first');
        const item = items.value.find((row) => row.id === importForm.itemId);
        if (!item)
            throw new Error('Select an item to import');
        const shouldUseSource = importForm.destination === 'source' || importForm.destination === 'both';
        const shouldUseAdhoc = importForm.destination === 'adhoc' || importForm.destination === 'both';
        if (shouldUseSource) {
            if (!selectedMenuIdForItems.value)
                throw new Error('Select a source menu in the item toolbar first');
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
    }
    catch (err) {
        setError(err);
    }
}
function eventMenus(eventId) {
    return eventMenuMap.value[eventId] ?? [];
}
function parentName(parentId) {
    const parent = parentId ? items.value.find((item) => item.id === parentId) : undefined;
    return parent ? itemLabel(parent) : 'No parent';
}
function itemLabel(item) {
    return item.displayName?.trim() || item.name;
}
function menuName(menuId) {
    return menus.value.find((menu) => menu.id === menuId)?.displayName || 'Unknown menu';
}
function itemUsage(itemId) {
    if (!itemId)
        return { menus: 0, events: 0 };
    const item = items.value.find((row) => row.id === itemId);
    if (!item)
        return { menus: 0, events: 0 };
    const eventsUsed = Object.values(eventMenuMap.value).filter((linkedMenus) => linkedMenus.some((menu) => menu.id === item.menuId)).length;
    return { menus: 1, events: eventsUsed };
}
function itemUsageTitle(itemId) {
    if (!itemId)
        return 'Save the item before analytics are available';
    const item = items.value.find((row) => row.id === itemId);
    if (!item)
        return 'Item not found';
    const eventNames = events.value
        .filter((event) => eventMenus(event.id).some((menu) => menu.id === item.menuId))
        .map((event) => event.displayName);
    return eventNames.length ? `Used in ${menuName(item.menuId)} for ${eventNames.join(', ')}` : `Part of ${menuName(item.menuId)}. Not linked to an event yet.`;
}
function openItemAnalytics(itemId) {
    if (!itemId)
        return;
    selectedAnalyticsItemId.value = itemId;
    router.push(`/dashboard/items/${itemId}`);
}
function buildItemTree(flatItems) {
    const map = new Map();
    flatItems.forEach((item) => map.set(item.id, { ...item, itemType: item.type, subCategoryLineItems: [] }));
    const roots = [];
    flatItems.forEach((item) => {
        const node = map.get(item.id);
        if (item.parentId && map.has(item.parentId))
            map.get(item.parentId).subCategoryLineItems.push(node);
        else
            roots.push(node);
    });
    return roots;
}
function childCount(item) {
    return item.subCategoryLineItems?.length ?? 0;
}
function dragLibraryItem(item) {
    draggedLibraryItemId.value = item.id;
    draggedDesignedItemId.value = null;
}
function dragDesignedItem(item) {
    draggedDesignedItemId.value = item.id;
    draggedLibraryItemId.value = null;
}
async function dropOnMenuRoot() {
    if (draggedLibraryItemId.value) {
        const item = items.value.find((row) => row.id === draggedLibraryItemId.value);
        if (item)
            await copyItemToDesignedMenu(item);
    }
    else if (draggedDesignedItemId.value) {
        const item = items.value.find((row) => row.id === draggedDesignedItemId.value);
        if (item)
            await setItemParent(item, null);
    }
    draggedLibraryItemId.value = null;
    draggedDesignedItemId.value = null;
}
async function dropOnDesignedItem(target) {
    if (draggedLibraryItemId.value) {
        const item = items.value.find((row) => row.id === draggedLibraryItemId.value);
        if (item) {
            await copyItemToDesignedMenu(item, target.id);
        }
    }
    else if (draggedDesignedItemId.value && draggedDesignedItemId.value !== target.id) {
        const item = items.value.find((row) => row.id === draggedDesignedItemId.value);
        if (item)
            await setItemParent(item, target.id);
    }
    draggedLibraryItemId.value = null;
    draggedDesignedItemId.value = null;
}
async function setItemParent(item, parentId) {
    try {
        if (parentId === item.id)
            throw new Error('An item cannot be its own parent');
        await axios.put(adminUrl(`/items/${item.id}`), { ...item, parentId });
        await loadAll();
        syncItemRows();
        setNotice('Menu nesting updated');
    }
    catch (err) {
        setError(err);
    }
}
async function createDesignerMenu() {
    try {
        if (!selectedVendor.value)
            throw new Error('Select a vendor before creating a menu');
        const name = slugify(designerMenuName.value);
        requireSlug(name, 'Menu slug');
        const { data } = await axios.post(adminUrl('/menus'), {
            vendorId: selectedVendorId.value,
            name,
            displayName: designerMenuName.value.trim(),
            description: 'Custom menu designed in admin.',
            isActive: true,
        });
        await loadAll();
        selectedMenuIdForItems.value = Number(data.id);
        designerMenuName.value = '';
        setNotice('Custom menu created. Add items from the library next.');
    }
    catch (err) {
        setError(err);
    }
}
async function linkSelectedMenuToEvent() {
    try {
        if (!selectedEventIdForItems.value || !selectedMenuIdForItems.value)
            throw new Error('Select an event and menu first');
        await axios.post(adminUrl(`/events/${selectedEventIdForItems.value}/menus/${selectedMenuIdForItems.value}`), {
            displayName: selectedMenuForItems.value?.displayName,
        });
        if (designerFullMenuQr.value) {
            qrForm.qrHash = `${selectedEventForItems.value?.name}-${selectedMenuForItems.value?.name}`.toLowerCase();
            qrTargetType.value = 'menu';
            qrForm.eventId = selectedEventIdForItems.value;
            qrForm.menuId = selectedMenuIdForItems.value;
            await buildQrDestination();
        }
        await loadAll();
        setNotice('Menu linked to event');
    }
    catch (err) {
        setError(err);
    }
}
async function copyItemToDesignedMenu(item, parentId = null) {
    try {
        if (!selectedMenuIdForItems.value)
            throw new Error('Select a working menu first');
        await axios.post(adminUrl('/items'), { ...cloneItemPayload(item, selectedMenuIdForItems.value), parentId });
        await loadAll();
        syncItemRows();
        setNotice(`${itemLabel(item)} added to ${selectedMenuForItems.value?.displayName || 'menu'}`);
    }
    catch (err) {
        setError(err);
    }
}
function loadEventIntoForm(event) {
    selectedEventIdForItems.value = event.id;
    editEvent(event);
}
async function publishSelectedEvent() {
    try {
        const event = selectedEventForItems.value;
        if (!event)
            throw new Error('Select an event to publish');
        await axios.put(adminUrl(`/events/${event.id}`), { ...event, status: 'active' });
        await loadAll();
        setNotice('Event published. Payment gate will be inserted here before activation later.');
    }
    catch (err) {
        setError(err);
    }
}
function menuPathFor(event, menu) {
    if (!event || !menu)
        return '';
    return `/event/${event.name}/menu/${menu.name}`;
}
function itemPathFor(event, item) {
    if (!event)
        return '';
    const menu = menus.value.find((row) => row.id === item.menuId);
    return menu ? `/event/${event.name}/menu/${menu.name}/item/${item.name}` : '';
}
function eventTimerLabel(event) {
    if (!event?.startTime || !event?.endTime)
        return 'Timer available after dates are set';
    const now = Date.now();
    const start = new Date(event.startTime).getTime();
    const end = new Date(event.endTime).getTime();
    if (now < start)
        return 'Starts later';
    if (now > end)
        return 'Ended';
    return 'Live now';
}
function menuPreviews(menuId) {
    return previews.menus.filter((preview) => preview.menuId === menuId);
}
function buildAbsolute(path) {
    const withSlash = path.startsWith('/') ? path : `/${path}`;
    return `${window.location.origin}${withSlash}`;
}
async function buildQrDestination() {
    try {
        if (qrTargetType.value === 'vendor') {
            if (!selectedVendor.value)
                throw new Error('Select a vendor first');
            qrForm.url = `/vendor/${selectedVendor.value.name}`;
        }
        else if (qrTargetType.value === 'custom') {
            if (!qrForm.url.startsWith('/'))
                throw new Error('Custom destination must start with /');
        }
        else if (qrTargetType.value === 'menu') {
            const { data } = await axios.get(adminUrl('/preview/menu'), { params: { eventId: qrForm.eventId, menuId: qrForm.menuId } });
            qrForm.url = data.path;
        }
        else {
            const { data } = await axios.get(adminUrl('/preview/item'), { params: { eventId: qrForm.eventId, itemId: qrForm.itemId } });
            qrForm.url = data.path;
        }
        qrPreview.shortQrUrl = qrForm.qrHash ? `${window.location.origin}/${qrForm.qrHash}` : '';
        qrPreview.finalPublicUrl = qrForm.url ? buildAbsolute(qrForm.url) : '';
        qrCodeDataUrl.value = qrPreview.shortQrUrl ? await QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }) : '';
    }
    catch (err) {
        setError(err);
    }
}
function editQr(mapping) {
    Object.assign(qrForm, { qrHash: mapping.qrHash, url: mapping.url, isActive: mapping.isActive, eventId: 0, menuId: 0, itemId: 0 });
    qrPreview.shortQrUrl = mapping.shortQrUrl;
    qrPreview.finalPublicUrl = mapping.finalPublicUrl;
    QRCode.toDataURL(mapping.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
    qrTargetType.value = 'custom';
}
async function saveQr() {
    try {
        requireSlug(qrForm.qrHash, 'QR hash');
        if (!qrForm.url)
            await buildQrDestination();
        const { data } = await axios.post(adminUrl('/qr-mappings'), { qrHash: qrForm.qrHash, url: qrForm.url, isActive: qrForm.isActive });
        qrPreview.shortQrUrl = data.shortQrUrl;
        qrPreview.finalPublicUrl = data.finalPublicUrl;
        qrCodeDataUrl.value = await QRCode.toDataURL(data.shortQrUrl, { margin: 1, width: 180 });
        await loadAll();
        setNotice('QR mapping saved');
    }
    catch (err) {
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
    if (qrPreview.shortQrUrl)
        QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
});
watch(() => route.params.itemId, (itemId) => {
    selectedAnalyticsItemId.value = itemId ? Number(itemId) : null;
});
onMounted(async () => {
    await loadAll();
    if (route.params.itemId)
        selectedAnalyticsItemId.value = Number(route.params.itemId);
    selectedMenuIdForItems.value = vendorMenus.value[0]?.id ?? 0;
    selectedEventIdForItems.value = vendorEvents.value[0]?.id ?? 0;
    syncItemRows();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-button']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-button']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-context']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['adhoc-box']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-context']} */ ;
/** @type {__VLS_StyleScopedClasses['slim-context']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-context']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-context']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-card']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['item-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['item-context']} */ ;
/** @type {__VLS_StyleScopedClasses['context-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['linked-list']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-box']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-box']} */ ;
/** @type {__VLS_StyleScopedClasses['adhoc-box']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-gate']} */ ;
/** @type {__VLS_StyleScopedClasses['library-row']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-group']} */ ;
/** @type {__VLS_StyleScopedClasses['public-group']} */ ;
/** @type {__VLS_StyleScopedClasses['designed-item']} */ ;
/** @type {__VLS_StyleScopedClasses['public-item']} */ ;
/** @type {__VLS_StyleScopedClasses['designed-item']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['phone-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['checklist']} */ ;
/** @type {__VLS_StyleScopedClasses['checklist']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['two-column']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-context']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['item-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-context']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "admin-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "admin-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "eyebrow" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({});
for (const [section] of __VLS_getVForSourceType((__VLS_ctx.sections))) {
    const __VLS_0 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        key: (section.key),
        to: (__VLS_ctx.dashboardRouteBySection[section.key]),
        ...{ class: "nav-button" },
        ...{ class: ({ active: __VLS_ctx.activeSection === section.key || (__VLS_ctx.activeSection === 'analytics' && section.key === 'inventory') }) },
    }));
    const __VLS_2 = __VLS_1({
        key: (section.key),
        to: (__VLS_ctx.dashboardRouteBySection[section.key]),
        ...{ class: "nav-button" },
        ...{ class: ({ active: __VLS_ctx.activeSection === section.key || (__VLS_ctx.activeSection === 'analytics' && section.key === 'inventory') }) },
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    __VLS_3.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: (section.icon) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (section.label);
    var __VLS_3;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "admin-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "workspace-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.activeTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.activeSubtitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadAll) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "bi bi-arrow-clockwise" },
});
if (__VLS_ctx.activeSection !== 'vendors') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "vendor-context slim-context" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedVendorId),
        ...{ class: "form-select form-select-sm" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [vendor] of __VLS_getVForSourceType((__VLS_ctx.vendors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (vendor.id),
            value: (vendor.id),
        });
        (vendor.displayName);
    }
    if (__VLS_ctx.selectedVendor) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "context-chip" },
        });
        (__VLS_ctx.selectedVendor.name);
    }
    if (__VLS_ctx.selectedVendor?.hasContactPage) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.vendorPublicUrl(__VLS_ctx.selectedVendor)),
            target: "_blank",
            rel: "noreferrer",
        });
    }
    if (!__VLS_ctx.selectedVendor) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
    }
}
if (__VLS_ctx.message) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-success py-2" },
    });
    (__VLS_ctx.message);
}
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "alert alert-danger py-2" },
    });
    (__VLS_ctx.error);
}
if (__VLS_ctx.activeSection === 'home') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "home-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle action-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [step] of __VLS_getVForSourceType((__VLS_ctx.dashboardSteps))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'home'))
                        return;
                    __VLS_ctx.activeSection = step.key;
                } },
            key: (step.key),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (step.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (step.description);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (step.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "btn btn-outline-primary btn-sm" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'home'))
                    return;
                __VLS_ctx.activeSection = 'vendors';
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "number-cell" },
    });
    (__VLS_ctx.vendors.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'home'))
                    return;
                __VLS_ctx.activeSection = 'publish';
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "number-cell" },
    });
    (__VLS_ctx.vendorEvents.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'home'))
                    return;
                __VLS_ctx.activeSection = 'designer';
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "number-cell" },
    });
    (__VLS_ctx.vendorMenus.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'home'))
                    return;
                __VLS_ctx.activeSection = 'inventory';
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "number-cell" },
    });
    (__VLS_ctx.vendorItems.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'home'))
                    return;
                __VLS_ctx.activeSection = 'qr';
            } },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
        ...{ class: "number-cell" },
    });
    (__VLS_ctx.qrMappings.length);
}
if (__VLS_ctx.activeSection === 'vendors') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "stack-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'vendors'))
                    return;
                __VLS_ctx.openVendorEditor();
            } },
        ...{ class: "btn btn-primary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle action-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [vendor] of __VLS_getVForSourceType((__VLS_ctx.vendors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'vendors'))
                        return;
                    __VLS_ctx.selectVendor(vendor);
                } },
            key: (vendor.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (vendor.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (vendor.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (vendor.hasContactPage ? 'Active' : 'Inactive');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'vendors'))
                        return;
                    __VLS_ctx.prepareVendorQr(vendor);
                } },
            ...{ class: "btn btn-outline-primary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'vendors'))
                        return;
                    __VLS_ctx.openVendorEditor(vendor);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
    }
    if (__VLS_ctx.showVendorEditor) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveVendor) },
            ...{ class: "panel compact-editor" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.vendorForm.id ? 'Edit Vendor' : 'Create Vendor');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onBlur: (__VLS_ctx.fillVendorSlug) },
            ...{ class: "form-control" },
            placeholder: "Radisson Gurgaon",
        });
        (__VLS_ctx.vendorForm.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "radisson-gurgaon",
        });
        (__VLS_ctx.vendorForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint wide" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "wide" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "Phone, email, website",
        });
        (__VLS_ctx.vendorContactText);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "wide" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
        });
        (__VLS_ctx.vendorForm.address);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "wide" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.vendorForm.description),
            ...{ class: "form-control" },
            rows: "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "checkbox",
        });
        (__VLS_ctx.vendorForm.hasContactPage);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "btn btn-primary" },
            type: "submit",
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeVendorEditor) },
            ...{ class: "btn btn-outline-secondary" },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'vendors'))
                        return;
                    if (!(__VLS_ctx.showVendorEditor))
                        return;
                    __VLS_ctx.prepareVendorQr();
                } },
            ...{ class: "btn btn-outline-primary" },
            type: "button",
            disabled: (!__VLS_ctx.vendorForm.id),
        });
        if (__VLS_ctx.vendorQrDraft.url) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "preview-box" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
            (__VLS_ctx.vendorQrDraft.url);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ class: "form-control" },
                placeholder: "radisson-gurgaon-card",
            });
            (__VLS_ctx.vendorQrDraft.qrHash);
            if (__VLS_ctx.vendorQrCodeDataUrl) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                    ...{ class: "qr-image" },
                    src: (__VLS_ctx.vendorQrCodeDataUrl),
                    alt: "Vendor QR code",
                });
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.saveVendorQr) },
                ...{ class: "btn btn-primary btn-sm" },
                type: "button",
            });
        }
    }
}
if (__VLS_ctx.activeSection === 'events') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "two-column" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveEvent) },
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.eventForm.id ? 'Edit Event' : 'Create Event');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onBlur: (__VLS_ctx.fillEventSlug) },
        ...{ class: "form-control" },
        placeholder: "Sangeet Night",
    });
    (__VLS_ctx.eventForm.displayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "sangeet-night-2026",
    });
    (__VLS_ctx.eventForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.eventForm.status),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "draft",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "active",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "inactive",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "datetime-local",
        ...{ class: "form-control" },
    });
    (__VLS_ctx.eventForm.startTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "datetime-local",
        ...{ class: "form-control" },
    });
    (__VLS_ctx.eventForm.endTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "wide" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.eventForm.eventDescription),
        rows: "2",
        ...{ class: "form-control" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "btn btn-primary" },
        type: "submit",
        disabled: (!__VLS_ctx.selectedVendor || __VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetEvent) },
        ...{ class: "btn btn-outline-secondary" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedVendor?.displayName || 'Vendor');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.vendorEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (event.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (event.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (event.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge text-bg-light" },
        });
        (event.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.eventMenus(event.id).map((menu) => menu.displayName).join(', ') || 'None');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'events'))
                        return;
                    __VLS_ctx.editEvent(event);
                } },
            ...{ class: "btn btn-outline-primary btn-sm" },
        });
    }
}
if (__VLS_ctx.activeSection === 'menus') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "two-column" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveMenu) },
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.menuForm.id ? 'Edit Menu' : 'Create Menu');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onBlur: (__VLS_ctx.fillMenuSlug) },
        ...{ class: "form-control" },
        placeholder: "Maharaja Menu",
    });
    (__VLS_ctx.menuForm.displayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "maharaja-menu",
    });
    (__VLS_ctx.menuForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.menuForm.isActive);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "wide" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.menuForm.description),
        rows: "2",
        ...{ class: "form-control" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "btn btn-primary" },
        type: "submit",
        disabled: (!__VLS_ctx.selectedVendor || __VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetMenu) },
        ...{ class: "btn btn-outline-secondary" },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (() => __VLS_ctx.ensureMiscMenu()) },
        ...{ class: "btn btn-outline-primary" },
        type: "button",
        disabled: (!__VLS_ctx.selectedVendor),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.linkForm.eventId),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.vendorEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (event.id),
            value: (event.id),
        });
        (event.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.linkForm.menuId),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.vendorMenus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (menu.id),
            value: (menu.id),
        });
        (menu.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.linkMenu) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.linkForm.eventId || !__VLS_ctx.linkForm.menuId || __VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.unlinkMenu) },
        ...{ class: "btn btn-outline-secondary" },
        disabled: (!__VLS_ctx.linkForm.eventId || !__VLS_ctx.linkForm.menuId || __VLS_ctx.loading),
    });
    if (__VLS_ctx.selectedEventMenuLinks.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "linked-list" },
        });
        for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.selectedEventMenuLinks))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (menu.id),
            });
            (menu.displayName);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel wide-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedVendor?.displayName || 'Vendor');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.vendorMenus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (menu.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (menu.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (menu.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (menu.isActive ? 'Yes' : 'No');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        for (const [preview] of __VLS_getVForSourceType((__VLS_ctx.menuPreviews(menu.id)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                key: (preview.publicUrl),
                href: (preview.publicUrl),
                target: "_blank",
                rel: "noreferrer",
            });
            (preview.eventName);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'menus'))
                        return;
                    __VLS_ctx.editMenu(menu);
                } },
            ...{ class: "btn btn-outline-primary btn-sm" },
        });
    }
}
if (__VLS_ctx.activeSection === 'inventory') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "item-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (() => __VLS_ctx.addDraftItemRow()) },
        ...{ class: "btn btn-outline-primary" },
        disabled: (!__VLS_ctx.selectedMenuIdForItems),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveDirtyItemRows) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.dirtyItemRows.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-filters" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "Search name, slug, type, tag",
    });
    (__VLS_ctx.itemSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.itemMenuFilter),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.vendorMenus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (menu.id),
            value: (menu.id),
        });
        (menu.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.itemTypeFilter),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "",
    });
    for (const [type] of __VLS_getVForSourceType((__VLS_ctx.itemTypeOptions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (type),
            value: (type),
        });
        (type);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle editable-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.inventoryRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (row.clientId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ onBlur: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    __VLS_ctx.fillRowSlug(row);
                } },
            ...{ class: "form-control" },
            placeholder: "Paneer Tikka",
        });
        (row.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ class: "form-control" },
            placeholder: "paneer-tikka",
        });
        (row.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.menuName(row.menuId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            value: (row.parentId),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.parentOptions(row)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (item.id),
                value: (item.id),
            });
            (__VLS_ctx.itemLabel(item));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ class: "form-control" },
            placeholder: "item",
        });
        (row.type);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ class: "form-control" },
            placeholder: "veg",
        });
        (row.enumType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    __VLS_ctx.openItemAnalytics(row.id);
                } },
            ...{ class: "link-button" },
            title: (__VLS_ctx.itemUsageTitle(row.id)),
        });
        (__VLS_ctx.itemUsage(row.id).menus);
        (__VLS_ctx.itemUsage(row.id).events);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (row.isDirty || row.isNew) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'inventory'))
                            return;
                        if (!(row.isDirty || row.isNew))
                            return;
                        __VLS_ctx.saveItemRow(row);
                    } },
                ...{ class: "btn btn-primary btn-sm" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "saved-state" },
            });
        }
    }
    if (!__VLS_ctx.inventoryRows.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "9",
            ...{ class: "muted" },
        });
    }
}
if (__VLS_ctx.activeSection === 'analytics') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "stack-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'analytics'))
                    return;
                __VLS_ctx.activeSection = 'inventory';
            } },
        ...{ class: "btn btn-outline-secondary btn-sm mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedAnalyticsItem ? __VLS_ctx.itemLabel(__VLS_ctx.selectedAnalyticsItem) : 'Item Analytics');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    if (__VLS_ctx.selectedAnalyticsItem) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
            ...{ class: "table table-sm align-middle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.selectedAnalyticsItem.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.menuName(__VLS_ctx.selectedAnalyticsItem.menuId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.parentName(__VLS_ctx.selectedAnalyticsItem.parentId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.selectedAnalyticsItem.type || 'item');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [usage] of __VLS_getVForSourceType((__VLS_ctx.selectedAnalyticsUsage))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (`${usage.event.id}-${usage.menu.id}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (usage.event.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (usage.menu.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.itemPathFor(usage.event, __VLS_ctx.selectedAnalyticsItem)),
            target: "_blank",
            rel: "noreferrer",
        });
    }
    if (!__VLS_ctx.selectedAnalyticsUsage.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "3",
            ...{ class: "muted" },
        });
    }
}
if (__VLS_ctx.activeSection === 'designer') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "designer-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel designer-controls" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedEventIdForItems),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.vendorEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (event.id),
            value: (event.id),
        });
        (event.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedMenuIdForItems),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.vendorMenus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (menu.id),
            value: (menu.id),
        });
        (menu.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "Supreme Custom for Sanya",
    });
    (__VLS_ctx.designerMenuName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.designerFullMenuQr);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createDesignerMenu) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.designerMenuName || !__VLS_ctx.selectedVendor),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.linkSelectedMenuToEvent) },
        ...{ class: "btn btn-outline-primary" },
        disabled: (!__VLS_ctx.selectedEventIdForItems || !__VLS_ctx.selectedMenuIdForItems),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "payment-note" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control mb-2" },
        placeholder: "Search items to add",
    });
    (__VLS_ctx.designerSearch);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "library-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.availableDesignerItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onDragstart: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    __VLS_ctx.dragLibraryItem(item);
                } },
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    __VLS_ctx.copyItemToDesignedMenu(item);
                } },
            key: (item.id),
            ...{ class: "library-row" },
            draggable: "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.itemLabel(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (__VLS_ctx.menuName(item.menuId));
        (item.type || 'item');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-plus-lg" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDragover: () => { } },
        ...{ onDrop: (__VLS_ctx.dropOnMenuRoot) },
        ...{ class: "panel menu-render" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedMenuForItems?.displayName || 'Select a menu');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'designer'))
                    return;
                __VLS_ctx.activeSection = 'preview';
            } },
        ...{ class: "btn btn-outline-secondary btn-sm" },
        disabled: (!__VLS_ctx.selectedMenuForItems),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "admin-tree" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedMenuTree))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "tree-root" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onDragstart: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    __VLS_ctx.dragDesignedItem(item);
                } },
            ...{ onDragover: () => { } },
            ...{ onDrop: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    __VLS_ctx.dropOnDesignedItem(item);
                } },
            ...{ class: "admin-tree-row" },
            draggable: "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-grip-vertical" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.itemLabel(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (item.type || 'item');
        (__VLS_ctx.childCount(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    __VLS_ctx.setItemParent(item, null);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
            value: (__VLS_ctx.designerNotes[item.id]),
            ...{ class: "form-control admin-note" },
            rows: "1",
            placeholder: "Private admin/vendor note",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tree-children-admin" },
        });
        for (const [child] of __VLS_getVForSourceType((item.subCategoryLineItems))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'designer'))
                            return;
                        __VLS_ctx.dragDesignedItem(child);
                    } },
                ...{ onDragover: () => { } },
                ...{ onDrop: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'designer'))
                            return;
                        __VLS_ctx.dropOnDesignedItem(child);
                    } },
                key: (child.id),
                ...{ class: "admin-tree-row child" },
                draggable: "true",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "bi bi-grip-vertical" },
            });
            (__VLS_ctx.itemLabel(child));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (child.enumType || child.type);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'designer'))
                            return;
                        __VLS_ctx.setItemParent(child, item.id);
                    } },
                ...{ class: "btn btn-outline-secondary btn-sm" },
            });
        }
    }
    if (!__VLS_ctx.selectedMenuItems.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted" },
        });
    }
}
if (__VLS_ctx.activeSection === 'preview') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "preview-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedEventIdForItems),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.vendorEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (event.id),
            value: (event.id),
        });
        (event.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.selectedMenuIdForItems),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.vendorMenus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (menu.id),
            value: (menu.id),
        });
        (menu.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    if (__VLS_ctx.selectedEventForItems && __VLS_ctx.selectedMenuForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            ...{ class: "btn btn-outline-primary" },
            href: (__VLS_ctx.menuPreviewUrl),
            target: "_blank",
            rel: "noreferrer",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'preview'))
                    return;
                __VLS_ctx.activeSection = 'publish';
            } },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.selectedEventForItems || !__VLS_ctx.selectedMenuForItems),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "phone-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "phone-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    (__VLS_ctx.selectedEventForItems?.displayName || 'Event');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedMenuForItems?.displayName || 'Menu Preview');
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedMenuTree))) {
        /** @type {[typeof MenuTree, ]} */ ;
        // @ts-ignore
        const __VLS_4 = __VLS_asFunctionalComponent(MenuTree, new MenuTree({
            key: (item.id),
            item: (item),
            level: (0),
            eventName: (__VLS_ctx.selectedEventForItems?.name || ''),
            menuName: (__VLS_ctx.selectedMenuForItems?.name || ''),
        }));
        const __VLS_5 = __VLS_4({
            key: (item.id),
            item: (item),
            level: (0),
            eventName: (__VLS_ctx.selectedEventForItems?.name || ''),
            menuName: (__VLS_ctx.selectedMenuForItems?.name || ''),
        }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    }
}
if (__VLS_ctx.activeSection === 'publish') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "publish-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveEvent) },
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onBlur: (__VLS_ctx.fillEventSlug) },
        ...{ class: "form-control" },
        placeholder: "Sanya Reception",
    });
    (__VLS_ctx.eventForm.displayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "sanya-reception",
    });
    (__VLS_ctx.eventForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "datetime-local",
        ...{ class: "form-control" },
    });
    (__VLS_ctx.eventForm.startTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "datetime-local",
        ...{ class: "form-control" },
    });
    (__VLS_ctx.eventForm.endTime);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "wide" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.eventForm.eventDescription),
        rows: "2",
        ...{ class: "form-control" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "btn btn-primary" },
        type: "submit",
        disabled: (!__VLS_ctx.selectedVendor),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
        ...{ class: "checklist" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.publishChecklist))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
            key: (item.label),
            ...{ class: ({ done: item.done }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: (item.done ? 'bi bi-check-circle-fill' : 'bi bi-circle') },
        });
        (item.label);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "payment-gate" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'publish'))
                    return;
                __VLS_ctx.loadEventIntoForm(__VLS_ctx.selectedEventForItems);
            } },
        ...{ class: "btn btn-outline-secondary" },
        disabled: (!__VLS_ctx.selectedEventForItems),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.publishSelectedEvent) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.canPublish),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel wide-panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qr-sheet" },
    });
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.selectedEventMenus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (menu.id),
            ...{ class: "qr-tile" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (menu.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.menuPathFor(__VLS_ctx.selectedEventForItems, menu));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.eventTimerLabel(__VLS_ctx.selectedEventForItems));
    }
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedEventItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            key: (item.id),
            ...{ class: "qr-tile" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.itemLabel(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.itemPathFor(__VLS_ctx.selectedEventForItems, item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.eventTimerLabel(__VLS_ctx.selectedEventForItems));
    }
}
if (__VLS_ctx.activeSection === 'items') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "item-toolbar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "item-context" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedEventForItems?.displayName || 'No event selected');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "item-context" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedMenuForItems?.displayName || 'No source menu selected');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'items'))
                    return;
                __VLS_ctx.showItemContextPicker = !__VLS_ctx.showItemContextPicker;
            } },
        ...{ class: "btn btn-outline-secondary" },
    });
    (__VLS_ctx.showItemContextPicker ? 'Hide Context' : 'Change Context');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (() => __VLS_ctx.addDraftItemRow()) },
        ...{ class: "btn btn-outline-primary" },
        disabled: (!__VLS_ctx.selectedMenuIdForItems),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveDirtyItemRows) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.dirtyItemRows.length),
    });
    if (__VLS_ctx.showItemContextPicker || !__VLS_ctx.selectedEventIdForItems || !__VLS_ctx.selectedMenuIdForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "context-picker" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.selectedEventIdForItems),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [event] of __VLS_getVForSourceType((__VLS_ctx.vendorEvents))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (event.id),
                value: (event.id),
            });
            (event.displayName);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.selectedMenuIdForItems),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.vendorMenus))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (menu.id),
                value: (menu.id),
            });
            (menu.displayName);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle editable-table" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [row] of __VLS_getVForSourceType((__VLS_ctx.itemRows))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (row.clientId),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'items'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ onBlur: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'items'))
                        return;
                    __VLS_ctx.fillRowSlug(row);
                } },
            ...{ class: "form-control" },
            placeholder: "Paneer Tikka",
        });
        (row.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'items'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ class: "form-control" },
            placeholder: "paneer-tikka",
        });
        (row.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'items'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            value: (row.parentId),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.parentOptions(row)))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (item.id),
                value: (item.id),
            });
            (__VLS_ctx.itemLabel(item));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'items'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ class: "form-control" },
            placeholder: "item",
        });
        (row.type);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'items'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            ...{ class: "form-control" },
            placeholder: "veg",
        });
        (row.enumType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'items'))
                        return;
                    __VLS_ctx.markItemDirty(row);
                } },
            type: "checkbox",
        });
        (row.isActive);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        if (row.isDirty || row.isNew) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'items'))
                            return;
                        if (!(row.isDirty || row.isNew))
                            return;
                        __VLS_ctx.saveItemRow(row);
                    } },
                ...{ class: "btn btn-primary btn-sm" },
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "saved-state" },
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "adhoc-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-pill" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedEventForItems?.displayName || 'Select event above');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "context-pill" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.selectedMenuForItems?.displayName || 'Select menu above');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "Supreme Custom for Sanya",
    });
    (__VLS_ctx.adhocForm.customMenuDisplayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onBlur: (__VLS_ctx.fillAdhocSlug) },
        ...{ class: "form-control" },
        placeholder: "Chef Special Counter",
    });
    (__VLS_ctx.adhocForm.displayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
    });
    (__VLS_ctx.adhocForm.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.adhocForm.parentId),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.miscMenuItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (item.id),
            value: (item.id),
        });
        (__VLS_ctx.itemLabel(item));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.adhocForm.addToSourceMenu);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveAdhocItem) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.selectedVendor || !__VLS_ctx.selectedEventIdForItems || !__VLS_ctx.adhocForm.name),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "adhoc-box" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.importForm.menuId),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.menus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (menu.id),
            value: (menu.id),
        });
        (menu.displayName);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.importForm.itemId),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: (0),
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.importMenuItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            key: (item.id),
            value: (item.id),
        });
        (__VLS_ctx.itemLabel(item));
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "Supreme Custom for Sanya",
    });
    (__VLS_ctx.importForm.customMenuDisplayName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.importForm.destination),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "source",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "adhoc",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "both",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveImportedItem) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.selectedEventIdForItems || !__VLS_ctx.importForm.itemId),
    });
}
if (__VLS_ctx.activeSection === 'qr') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "two-column" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.saveQr) },
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-grid" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "radisson-gurgaon-card",
    });
    (__VLS_ctx.qrForm.qrHash);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
        value: (__VLS_ctx.qrTargetType),
        ...{ class: "form-select" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "vendor",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "menu",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "item",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        value: "custom",
    });
    if (__VLS_ctx.qrTargetType !== 'vendor' && __VLS_ctx.qrTargetType !== 'custom') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.qrForm.eventId),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [event] of __VLS_getVForSourceType((__VLS_ctx.vendorEvents))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (event.id),
                value: (event.id),
            });
            (event.displayName);
        }
    }
    if (__VLS_ctx.qrTargetType === 'menu') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.qrForm.menuId),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.menusForQrEvent))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (menu.id),
                value: (menu.id),
            });
            (menu.displayName);
        }
    }
    if (__VLS_ctx.qrTargetType === 'item') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.qrForm.itemId),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.itemsForQrEvent))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (item.id),
                value: (item.id),
            });
            (__VLS_ctx.itemLabel(item));
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "wide" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "/vendor/radisson-gurgaon",
    });
    (__VLS_ctx.qrForm.url);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "check" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "checkbox",
    });
    (__VLS_ctx.qrForm.isActive);
    if (__VLS_ctx.qrPreview.shortQrUrl || __VLS_ctx.qrPreview.finalPublicUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.qrPreview.shortQrUrl),
            target: "_blank",
            rel: "noreferrer",
        });
        (__VLS_ctx.qrPreview.shortQrUrl);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.qrPreview.finalPublicUrl),
            target: "_blank",
            rel: "noreferrer",
        });
        (__VLS_ctx.qrPreview.finalPublicUrl);
        if (__VLS_ctx.qrCodeDataUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                ...{ class: "qr-image" },
                src: (__VLS_ctx.qrCodeDataUrl),
                alt: "QR code",
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.buildQrDestination) },
        ...{ class: "btn btn-outline-secondary" },
        type: "button",
        disabled: (__VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ class: "btn btn-primary" },
        type: "submit",
        disabled: (__VLS_ctx.loading),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-wrap" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.table, __VLS_intrinsicElements.table)({
        ...{ class: "table table-sm align-middle" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.thead, __VLS_intrinsicElements.thead)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [mapping] of __VLS_getVForSourceType((__VLS_ctx.qrMappings))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (mapping.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (mapping.qrHash);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (mapping.url);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (mapping.isActive ? 'Yes' : 'No');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (mapping.shortQrUrl),
            target: "_blank",
            rel: "noreferrer",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (mapping.finalPublicUrl),
            target: "_blank",
            rel: "noreferrer",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'qr'))
                        return;
                    __VLS_ctx.editQr(mapping);
                } },
            ...{ class: "btn btn-outline-primary btn-sm" },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['admin-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-main']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-clockwise']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-context']} */ ;
/** @type {__VLS_StyleScopedClasses['slim-context']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['context-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['home-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['action-table']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['number-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['number-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['number-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['number-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['number-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['action-table']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['check']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-box']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-image']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['two-column']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['two-column']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['check']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['linked-list']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['item-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['table-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['editable-table']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['link-button']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['saved-state']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['check']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['library-list']} */ ;
/** @type {__VLS_StyleScopedClasses['library-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-plus-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-render']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-root']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-grip-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-note']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children-admin']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree-row']} */ ;
/** @type {__VLS_StyleScopedClasses['child']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-grip-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['phone-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['phone-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['checklist']} */ ;
/** @type {__VLS_StyleScopedClasses['done']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-gate']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-sheet']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['item-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['item-context']} */ ;
/** @type {__VLS_StyleScopedClasses['item-context']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['context-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['editable-table']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['saved-state']} */ ;
/** @type {__VLS_StyleScopedClasses['adhoc-box']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['context-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['context-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['check']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['adhoc-box']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['two-column']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['check']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-box']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-image']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            MenuTree: MenuTree,
            sections: sections,
            dashboardRouteBySection: dashboardRouteBySection,
            activeSection: activeSection,
            loading: loading,
            error: error,
            message: message,
            selectedVendorId: selectedVendorId,
            selectedMenuIdForItems: selectedMenuIdForItems,
            selectedEventIdForItems: selectedEventIdForItems,
            showItemContextPicker: showItemContextPicker,
            showVendorEditor: showVendorEditor,
            designerMenuName: designerMenuName,
            designerFullMenuQr: designerFullMenuQr,
            designerNotes: designerNotes,
            designerSearch: designerSearch,
            itemSearch: itemSearch,
            itemMenuFilter: itemMenuFilter,
            itemTypeFilter: itemTypeFilter,
            vendors: vendors,
            menus: menus,
            qrMappings: qrMappings,
            vendorContactText: vendorContactText,
            qrTargetType: qrTargetType,
            qrPreview: qrPreview,
            qrCodeDataUrl: qrCodeDataUrl,
            vendorQrCodeDataUrl: vendorQrCodeDataUrl,
            itemRows: itemRows,
            vendorForm: vendorForm,
            eventForm: eventForm,
            menuForm: menuForm,
            linkForm: linkForm,
            qrForm: qrForm,
            vendorQrDraft: vendorQrDraft,
            adhocForm: adhocForm,
            importForm: importForm,
            selectedVendor: selectedVendor,
            vendorEvents: vendorEvents,
            vendorMenus: vendorMenus,
            vendorItems: vendorItems,
            selectedMenuItems: selectedMenuItems,
            selectedMenuForItems: selectedMenuForItems,
            selectedEventForItems: selectedEventForItems,
            dirtyItemRows: dirtyItemRows,
            miscMenuItems: miscMenuItems,
            importMenuItems: importMenuItems,
            itemTypeOptions: itemTypeOptions,
            inventoryRows: inventoryRows,
            availableDesignerItems: availableDesignerItems,
            selectedMenuTree: selectedMenuTree,
            selectedAnalyticsItem: selectedAnalyticsItem,
            selectedAnalyticsUsage: selectedAnalyticsUsage,
            menuPreviewUrl: menuPreviewUrl,
            selectedEventMenus: selectedEventMenus,
            selectedEventItems: selectedEventItems,
            publishChecklist: publishChecklist,
            canPublish: canPublish,
            activeTitle: activeTitle,
            activeSubtitle: activeSubtitle,
            dashboardSteps: dashboardSteps,
            selectedEventMenuLinks: selectedEventMenuLinks,
            menusForQrEvent: menusForQrEvent,
            itemsForQrEvent: itemsForQrEvent,
            loadAll: loadAll,
            vendorPublicUrl: vendorPublicUrl,
            fillVendorSlug: fillVendorSlug,
            fillEventSlug: fillEventSlug,
            fillMenuSlug: fillMenuSlug,
            fillRowSlug: fillRowSlug,
            fillAdhocSlug: fillAdhocSlug,
            selectVendor: selectVendor,
            openVendorEditor: openVendorEditor,
            closeVendorEditor: closeVendorEditor,
            saveVendor: saveVendor,
            prepareVendorQr: prepareVendorQr,
            saveVendorQr: saveVendorQr,
            resetEvent: resetEvent,
            editEvent: editEvent,
            saveEvent: saveEvent,
            resetMenu: resetMenu,
            editMenu: editMenu,
            saveMenu: saveMenu,
            ensureMiscMenu: ensureMiscMenu,
            linkMenu: linkMenu,
            unlinkMenu: unlinkMenu,
            addDraftItemRow: addDraftItemRow,
            markItemDirty: markItemDirty,
            parentOptions: parentOptions,
            saveItemRow: saveItemRow,
            saveDirtyItemRows: saveDirtyItemRows,
            saveAdhocItem: saveAdhocItem,
            saveImportedItem: saveImportedItem,
            eventMenus: eventMenus,
            parentName: parentName,
            itemLabel: itemLabel,
            menuName: menuName,
            itemUsage: itemUsage,
            itemUsageTitle: itemUsageTitle,
            openItemAnalytics: openItemAnalytics,
            childCount: childCount,
            dragLibraryItem: dragLibraryItem,
            dragDesignedItem: dragDesignedItem,
            dropOnMenuRoot: dropOnMenuRoot,
            dropOnDesignedItem: dropOnDesignedItem,
            setItemParent: setItemParent,
            createDesignerMenu: createDesignerMenu,
            linkSelectedMenuToEvent: linkSelectedMenuToEvent,
            copyItemToDesignedMenu: copyItemToDesignedMenu,
            loadEventIntoForm: loadEventIntoForm,
            publishSelectedEvent: publishSelectedEvent,
            menuPathFor: menuPathFor,
            itemPathFor: itemPathFor,
            eventTimerLabel: eventTimerLabel,
            menuPreviews: menuPreviews,
            buildQrDestination: buildQrDestination,
            editQr: editQr,
            saveQr: saveQr,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
//# sourceMappingURL=AdminDashboard.vue.js.map
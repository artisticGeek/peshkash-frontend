import axios from 'axios';
import QRCode from 'qrcode';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import QrTargetPreview from '../components/admin/QrTargetPreview.vue';
import WorkspaceSwitcher from '../components/admin/WorkspaceSwitcher.vue';
import MenuTree from '../components/MenuTree.vue';
import { API_BASE_URL } from '../config';
const sections = [
    { key: 'home', label: 'Dashboard Home', icon: 'bi bi-grid-1x2' },
    { key: 'vendors', label: 'Vendors', icon: 'bi bi-shop' },
    { key: 'events', label: 'Events', icon: 'bi bi-calendar-event' },
    { key: 'inventory', label: 'Item Library', icon: 'bi bi-box-seam' },
    { key: 'designer', label: 'Menu Studio', icon: 'bi bi-layout-three-columns' },
    { key: 'qr', label: 'QR Bank', icon: 'bi bi-qr-code' },
];
const route = useRoute();
const router = useRouter();
const dashboardRouteBySection = {
    home: '/dashboard/home',
    vendors: '/dashboard/vendors',
    vendorWorkspace: '/dashboard/vendors',
    events: '/dashboard/events',
    eventWorkspace: '/dashboard/events',
    qrSheet: '/dashboard/events',
    inventory: '/dashboard/items',
    analytics: '/dashboard/items',
    designer: '/dashboard/menus/studio',
    preview: '/dashboard/menus/preview',
    publish: '/dashboard/events/publish',
    qr: '/dashboard/qr',
    menus: '/dashboard/menus/studio',
    items: '/dashboard/items',
};
function sectionFromPath(path) {
    if (/^\/dashboard\/vendors\/\d+/.test(path))
        return 'vendorWorkspace';
    if (path.startsWith('/dashboard/vendors'))
        return 'vendors';
    if (/^\/dashboard\/events\/\d+\/qr-sheet/.test(path))
        return 'qrSheet';
    if (/^\/dashboard\/events\/\d+\/publish/.test(path))
        return 'eventWorkspace';
    if (/^\/dashboard\/events\/\d+/.test(path))
        return 'eventWorkspace';
    if (path === '/dashboard/events')
        return 'events';
    if (path.startsWith('/dashboard/items/'))
        return 'analytics';
    if (path.startsWith('/dashboard/items'))
        return 'inventory';
    if (/^\/dashboard\/menus\/\d+\/preview/.test(path))
        return 'preview';
    if (path.startsWith('/dashboard/menus/preview'))
        return 'preview';
    if (path.startsWith('/dashboard/menus'))
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
const showEventEditor = ref(false);
const showQuickMenuItem = ref(false);
const showArrangeDrawer = ref(false);
const showQrEditor = ref(false);
const showPublishDrawer = ref(false);
const designerMenuName = ref('');
const designerFullMenuQr = ref(false);
const designerNotes = reactive({});
const designerSearch = ref('');
const designerDraftItems = ref([]);
const designerOriginalParents = ref({});
const designerTempId = ref(-1);
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
const selectedQrMapping = ref(null);
const previews = reactive({ menus: [], items: [] });
const eventMenuMap = ref({});
const vendorContactText = ref('');
const vendorPhone = ref('');
const vendorEmail = ref('');
const vendorWebsite = ref('');
const vendorMapUrl = ref('');
const vendorBusinessDays = ref('');
const vendorBusinessHours = ref('');
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
const productSelections = reactive({
    contactCard: false,
    fullMenuQr: false,
    itemQrSheet: true,
    menuPreview: true,
});
const adhocForm = reactive({ parentId: 0, name: '', displayName: '', customMenuDisplayName: '', addToSourceMenu: false });
const importForm = reactive({ menuId: 0, itemId: 0, customMenuDisplayName: '', destination: 'source' });
const quickItem = reactive({ parentId: 0, name: '', displayName: '', type: 'item', enumType: '' });
const selectedVendor = computed(() => vendors.value.find((vendor) => vendor.id === selectedVendorId.value));
const vendorEvents = computed(() => events.value.filter((event) => event.vendorId === selectedVendorId.value));
const vendorMenus = computed(() => menus.value.filter((menu) => menu.vendorId === selectedVendorId.value));
const vendorMenuIds = computed(() => vendorMenus.value.map((menu) => menu.id));
const vendorItems = computed(() => items.value.filter((item) => vendorMenuIds.value.includes(item.menuId)));
const selectedMenuItems = computed(() => items.value.filter((item) => item.menuId === selectedMenuIdForItems.value));
const selectedMenuForItems = computed(() => vendorMenus.value.find((menu) => menu.id === selectedMenuIdForItems.value));
const selectedEventForItems = computed(() => vendorEvents.value.find((event) => event.id === selectedEventIdForItems.value));
const selectedDesignerItems = computed(() => designerDraftItems.value);
const selectedDesignerTree = computed(() => buildItemTree(selectedDesignerItems.value));
const designerDirty = computed(() => {
    const hasNewItems = designerDraftItems.value.some((item) => item.id < 0);
    const hasParentChanges = designerDraftItems.value.some((item) => item.id > 0 && (item.parentId || undefined) !== designerOriginalParents.value[item.id]);
    return hasNewItems || hasParentChanges;
});
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
const originUrl = computed(() => window.location.origin);
const vendorQrIsActive = computed(() => Boolean(vendorForm.id
    && vendorForm.hasContactPage
    && vendorQrDraft.qrHash
    && qrMappings.value.some((mapping) => mapping.qrHash === vendorQrDraft.qrHash && mapping.url === vendorQrDraft.url && mapping.isActive)));
const publishProducts = computed(() => [
    {
        key: 'contactCard',
        label: 'Vendor contact card',
        description: selectedVendor.value?.hasContactPage ? 'Reusable vendor-card QR is active.' : 'Enable from Vendor management when needed.',
        icon: 'bi bi-person-vcard',
        selected: Boolean(productSelections.contactCard || selectedVendor.value?.hasContactPage),
    },
    {
        key: 'fullMenuQr',
        label: 'Full menu QR',
        description: selectedMenuForItems.value ? `Create one QR for ${selectedMenuForItems.value.displayName}.` : 'Select a menu to add a menu-level QR.',
        icon: 'bi bi-qr-code',
        selected: Boolean(productSelections.fullMenuQr || designerFullMenuQr.value),
    },
    {
        key: 'itemQrSheet',
        label: 'Item QR sheet',
        description: 'Printable item-level targets for dish/counter QR plates.',
        icon: 'bi bi-file-earmark-spreadsheet',
        selected: Boolean(productSelections.itemQrSheet),
    },
    {
        key: 'menuPreview',
        label: 'Public preview',
        description: 'Previewable menu before publish and QR printing.',
        icon: 'bi bi-phone',
        selected: Boolean(productSelections.menuPreview),
    },
]);
const eventProducts = computed(() => publishProducts.value.filter((product) => product.key !== 'contactCard' || selectedVendor.value?.hasContactPage));
const activeTitle = computed(() => {
    const contextual = {
        vendorWorkspace: selectedVendor.value?.displayName || 'Vendor Workspace',
        eventWorkspace: selectedEventForItems.value?.displayName || 'Event Workspace',
        qrSheet: 'Event QR Sheet',
        analytics: selectedAnalyticsItem.value ? itemLabel(selectedAnalyticsItem.value) : 'Item Analytics',
        preview: selectedMenuForItems.value ? `${selectedMenuForItems.value.displayName} Preview` : 'Menu Preview',
    };
    return contextual[activeSection.value] || sections.find((section) => section.key === activeSection.value)?.label || 'Admin';
});
const activeSubtitle = computed(() => {
    const copy = {
        home: 'Work from a selected vendor and move through setup without losing context.',
        vendors: 'Create vendors, activate contact cards, and generate vendor QR mappings.',
        vendorWorkspace: 'Manage vendor details, contact-card product, and reusable ownership context.',
        inventory: 'Manage reusable vendor items before they are assembled into menus.',
        analytics: 'Inspect where an item is used and leave space for scans, ratings, and first-added history.',
        designer: 'Assemble event-ready menus from existing items, adhoc items, and custom menu copies.',
        preview: 'Review the menu as guests will see it before QR mapping or publish.',
        publish: 'Review event setup and activate when the menu and QR targets are ready.',
        events: 'Create events under the selected vendor. Events do not need standalone QR codes.',
        eventWorkspace: 'Operate one event: menus, assets, QR readiness, previews, and publish state.',
        qrSheet: 'Printable and testable menu/item QR target sheet for one event.',
        menus: 'Create source menus independently, then map them to events when needed.',
        items: 'Add source or adhoc items quickly in a table-first workflow.',
        qr: 'Browse reusable QR assets, inspect current mappings, and remap when needed.',
    };
    return copy[activeSection.value];
});
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
function resetDesignerDraft() {
    designerDraftItems.value = selectedMenuItems.value.map((item) => ({ ...item }));
    designerOriginalParents.value = Object.fromEntries(selectedMenuItems.value.map((item) => [item.id, item.parentId]));
    designerTempId.value = -1;
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
        hydrateRouteContext();
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
function formatDate(value) {
    if (!value)
        return 'Not set';
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
function eventWindow(event) {
    if (!event.startTime && !event.endTime)
        return 'Dates not set';
    return `${formatDate(event.startTime)} - ${formatDate(event.endTime)}`;
}
function vendorEventCount(vendorId) {
    return events.value.filter((event) => event.vendorId === vendorId).length;
}
function clearItemFilters() {
    itemSearch.value = '';
    itemMenuFilter.value = 0;
    itemTypeFilter.value = '';
}
function isNavActive(section) {
    if (activeSection.value === section)
        return true;
    if (activeSection.value === 'analytics' && section === 'inventory')
        return true;
    if ((activeSection.value === 'eventWorkspace' || activeSection.value === 'qrSheet') && section === 'events')
        return true;
    if (activeSection.value === 'vendorWorkspace' && section === 'vendors')
        return true;
    return false;
}
function goBack() {
    if (activeSection.value === 'eventWorkspace' || activeSection.value === 'qrSheet' || activeSection.value === 'publish')
        router.push('/dashboard/events');
    else if (activeSection.value === 'analytics')
        router.push('/dashboard/items');
    else if (activeSection.value === 'vendorWorkspace')
        router.push('/dashboard/vendors');
    else
        router.push('/dashboard/home');
}
function adminEventRoute(event) {
    return `/dashboard/events/${event.id}`;
}
function adminPublishRoute(event) {
    return `/dashboard/events/${event.id}/publish`;
}
function adminQrSheetRoute(event) {
    return `/dashboard/events/${event.id}/qr-sheet`;
}
function adminMenuStudioRoute(menu) {
    return `/dashboard/menus/${menu.id}/studio`;
}
function adminMenuPreviewRoute(menu) {
    return `/dashboard/menus/${menu.id}/preview`;
}
function menuItems(menuId) {
    return items.value.filter((item) => item.menuId === menuId);
}
function defaultItemMenuId() {
    return itemMenuFilter.value || selectedMenuIdForItems.value || vendorMenus.value[0]?.id || 0;
}
function eventChecklist(event) {
    const linkedMenus = eventMenus(event.id);
    const linkedMenuIds = linkedMenus.map((menu) => menu.id);
    const linkedItems = items.value.filter((item) => linkedMenuIds.includes(item.menuId));
    return [
        { label: 'Vendor selected', done: Boolean(selectedVendor.value) },
        { label: 'Event has active dates', done: Boolean(event.startTime && event.endTime) },
        { label: 'At least one menu linked', done: linkedMenus.length > 0 },
        { label: 'Linked menus contain items', done: linkedItems.length > 0 },
        { label: 'QR sheet has targets', done: linkedMenus.length + linkedItems.length > 0 },
    ];
}
function eventQrTargets(event) {
    const menusForEvent = eventMenus(event.id);
    return [
        ...menusForEvent.map((menu) => ({
            key: `menu-${menu.id}`,
            label: menu.displayName,
            context: 'Full menu',
            type: 'Menu',
            path: menuPathFor(event, menu),
        })),
        ...menusForEvent.flatMap((menu) => menuItems(menu.id).map((item) => ({
            key: `item-${item.id}`,
            label: itemLabel(item),
            context: menu.displayName,
            type: item.type || 'Item',
            path: itemPathFor(event, item),
        }))),
    ];
}
function hydrateRouteContext() {
    if (route.path === '/admin') {
        router.replace('/dashboard/home');
        return;
    }
    const vendorId = Number(route.params.vendorId || 0);
    const eventId = Number(route.params.eventId || 0);
    const menuId = Number(route.params.menuId || 0);
    const itemId = Number(route.params.itemId || 0);
    if (vendorId && vendors.value.some((vendor) => vendor.id === vendorId)) {
        selectedVendorId.value = vendorId;
    }
    if (eventId) {
        const event = events.value.find((row) => row.id === eventId);
        if (event) {
            selectedVendorId.value = event.vendorId;
            selectedEventIdForItems.value = event.id;
            editEvent(event);
            if (route.path.endsWith('/publish'))
                showPublishDrawer.value = true;
        }
    }
    if (menuId) {
        const menu = menus.value.find((row) => row.id === menuId);
        if (menu) {
            selectedVendorId.value = menu.vendorId;
            selectedMenuIdForItems.value = menu.id;
            const linkedEvent = events.value.find((event) => eventMenus(event.id).some((linkedMenu) => linkedMenu.id === menu.id));
            if (linkedEvent)
                selectedEventIdForItems.value = linkedEvent.id;
        }
    }
    selectedAnalyticsItemId.value = itemId || null;
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
        syncVendorQrDraft();
    }
}
function closeVendorEditor() {
    showVendorEditor.value = false;
    resetVendor();
}
function resetVendor() {
    Object.assign(vendorForm, { id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
    vendorContactText.value = '';
    vendorPhone.value = '';
    vendorEmail.value = '';
    vendorWebsite.value = '';
    vendorMapUrl.value = '';
    vendorBusinessDays.value = '';
    vendorBusinessHours.value = '';
    vendorQrDraft.qrHash = '';
    vendorQrDraft.url = '';
    vendorQrCodeDataUrl.value = '';
}
function editVendor(vendor) {
    Object.assign(vendorForm, vendor);
    vendorContactText.value = vendor.contact?.join(', ') ?? '';
    hydrateVendorContactFields(vendor.contact ?? []);
    hydrateVendorContactFields(vendor.contact ?? []);
    selectedVendorId.value = vendor.id;
    showVendorEditor.value = true;
    activeSection.value = 'vendors';
    syncVendorQrDraft();
}
function hydrateVendorContactFields(contact) {
    const find = (label) => contact.find((line) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`))?.split(':').slice(1).join(':').trim() || '';
    vendorPhone.value = find('Phone');
    vendorEmail.value = find('Email');
    vendorWebsite.value = find('Website');
    vendorMapUrl.value = find('Google Maps');
    vendorBusinessDays.value = find('Business Days');
    vendorBusinessHours.value = find('Business Hours');
    if (!vendorPhone.value && !vendorEmail.value && contact.length)
        vendorPhone.value = contact[0] || '';
}
function vendorContactPayload() {
    return [
        ['Phone', vendorPhone.value],
        ['Email', vendorEmail.value],
        ['Website', vendorWebsite.value],
        ['Google Maps', vendorMapUrl.value],
        ['Business Days', vendorBusinessDays.value],
        ['Business Hours', vendorBusinessHours.value],
    ].filter(([, value]) => String(value).trim()).map(([label, value]) => `${label}: ${String(value).trim()}`);
}
async function renderVendorQr() {
    vendorQrCodeDataUrl.value = vendorQrDraft.qrHash
        ? await QRCode.toDataURL(`${window.location.origin}/${vendorQrDraft.qrHash}`, { margin: 1, width: 180 })
        : '';
}
async function syncVendorQrDraft() {
    if (!vendorForm.name) {
        vendorQrDraft.url = '';
        vendorQrDraft.qrHash = '';
        vendorQrCodeDataUrl.value = '';
        return;
    }
    vendorQrDraft.url = `/vendor/${vendorForm.name}`;
    if (!vendorQrDraft.qrHash || vendorQrDraft.qrHash.endsWith('-card')) {
        vendorQrDraft.qrHash = `${vendorForm.name}-card`;
    }
    await renderVendorQr();
}
async function saveVendor() {
    try {
        fillVendorSlug();
        requireSlug(vendorForm.name, 'Vendor slug');
        const payload = { ...vendorForm, contact: vendorContactPayload() };
        const { data } = vendorForm.id
            ? await axios.put(adminUrl(`/vendors/${vendorForm.id}`), payload)
            : await axios.post(adminUrl('/vendors'), payload);
        selectedVendorId.value = data.id;
        Object.assign(vendorForm, normalizeVendor(data));
        await syncVendorQrDraft();
        if (vendorForm.hasContactPage) {
            await saveVendorQrMapping();
        }
        await loadAll();
        editVendor(data);
        setNotice(vendorForm.hasContactPage ? 'Vendor and contact-card QR saved' : 'Vendor saved');
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
    await syncVendorQrDraft();
}
async function saveVendorQr() {
    try {
        await saveVendorQrMapping();
        await loadAll();
        setNotice('Vendor QR mapping saved');
    }
    catch (err) {
        setError(err);
    }
}
async function saveVendorQrMapping() {
    if (!vendorForm.id)
        throw new Error('Save the vendor before activating the QR');
    if (!vendorForm.hasContactPage)
        throw new Error('Add the contact card product before activating this QR');
    await syncVendorQrDraft();
    requireSlug(vendorQrDraft.qrHash, 'QR hash');
    await axios.post(adminUrl('/qr-mappings'), { qrHash: vendorQrDraft.qrHash, url: vendorQrDraft.url, isActive: true });
}
function resetEvent() {
    Object.assign(eventForm, { id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
}
function editEvent(event) {
    Object.assign(eventForm, { ...event, startTime: toDateTimeLocal(event.startTime), endTime: toDateTimeLocal(event.endTime) });
}
function startNewEvent() {
    resetEvent();
    showEventEditor.value = true;
}
function editEventInline(event) {
    editEvent(event);
    showEventEditor.value = true;
}
function openPublishDrawer(event) {
    selectedEventIdForItems.value = event.id;
    editEvent(event);
    showPublishDrawer.value = true;
}
function closeEventEditor() {
    showEventEditor.value = false;
    resetEvent();
}
async function saveEvent() {
    try {
        if (!selectedVendor.value)
            throw new Error('Select or create a vendor before creating an event');
        fillEventSlug();
        requireSlug(eventForm.name, 'Event slug');
        const payload = { ...eventForm, vendorId: selectedVendorId.value };
        const { data } = eventForm.id
            ? await axios.put(adminUrl(`/events/${eventForm.id}`), payload)
            : await axios.post(adminUrl('/events'), payload);
        resetEvent();
        await loadAll();
        const savedEvent = data ? normalizeEvent(data) : events.value.find((event) => event.name === payload.name && event.vendorId === selectedVendorId.value);
        showEventEditor.value = false;
        if (savedEvent && activeSection.value !== 'events') {
            selectedEventIdForItems.value = savedEvent.id;
            router.push(adminEventRoute(savedEvent));
        }
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
        name: slugify(item.name || itemLabel(item)),
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
function uniqueDraftSlug(base) {
    const clean = slugify(base || 'item');
    const existing = new Set([...items.value, ...designerDraftItems.value].map((item) => item.name));
    if (!existing.has(clean))
        return clean;
    let index = 2;
    while (existing.has(`${clean}-${index}`))
        index += 1;
    return `${clean}-${index}`;
}
async function createQuickMenuItem() {
    try {
        if (!selectedMenuIdForItems.value)
            throw new Error('Select a working menu first');
        if (!quickItem.displayName.trim())
            throw new Error('Add an item name first');
        quickItem.name = uniqueDraftSlug(quickItem.name || quickItem.displayName);
        requireSlug(quickItem.name, 'Item slug');
        designerDraftItems.value.push({
            id: designerTempId.value--,
            menuId: selectedMenuIdForItems.value,
            name: quickItem.name,
            displayName: quickItem.displayName,
            type: quickItem.type || 'item',
            enumType: quickItem.enumType,
            parentId: quickItem.parentId || undefined,
            isActive: true,
        });
        Object.assign(quickItem, { parentId: 0, name: '', displayName: '', type: 'item', enumType: '' });
        showQuickMenuItem.value = false;
    }
    catch (err) {
        setError(err);
    }
}
async function saveDesignerChanges() {
    try {
        if (!selectedMenuIdForItems.value)
            throw new Error('Select a working menu first');
        const idMap = new Map();
        const newItems = designerDraftItems.value.filter((item) => item.id < 0);
        for (const item of newItems) {
            const parentId = item.parentId && item.parentId < 0 ? idMap.get(item.parentId) : item.parentId;
            const { data } = await axios.post(adminUrl('/items'), {
                menuId: selectedMenuIdForItems.value,
                name: item.name,
                displayName: item.displayName,
                description: item.description,
                ingredients: item.ingredients,
                image: item.image,
                type: item.type || 'item',
                enumType: item.enumType,
                parentId: parentId || null,
                isActive: item.isActive,
            });
            idMap.set(item.id, Number(data.id));
        }
        for (const item of designerDraftItems.value.filter((row) => row.id > 0)) {
            const nextParent = item.parentId && item.parentId < 0 ? idMap.get(item.parentId) : item.parentId;
            if ((nextParent || undefined) !== designerOriginalParents.value[item.id]) {
                await axios.put(adminUrl(`/items/${item.id}`), { ...item, parentId: nextParent || null });
            }
        }
        await loadAll();
        syncItemRows();
        resetDesignerDraft();
        showArrangeDrawer.value = false;
        setNotice('Menu saved');
    }
    catch (err) {
        setError(err);
    }
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
        const item = designerDraftItems.value.find((row) => row.id === draggedDesignedItemId.value);
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
        const item = designerDraftItems.value.find((row) => row.id === draggedDesignedItemId.value);
        if (item)
            await setItemParent(item, target.id);
    }
    draggedLibraryItemId.value = null;
    draggedDesignedItemId.value = null;
}
async function setItemParent(item, parentId) {
    if (parentId === item.id)
        return setError(new Error('An item cannot be its own parent'));
    const draft = designerDraftItems.value.find((row) => row.id === item.id);
    if (!draft)
        return;
    draft.parentId = parentId || undefined;
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
    if (!selectedMenuIdForItems.value)
        return setError(new Error('Select a working menu first'));
    const baseSlug = slugify(item.name || itemLabel(item));
    designerDraftItems.value.push({
        ...item,
        id: designerTempId.value--,
        menuId: selectedMenuIdForItems.value,
        name: uniqueDraftSlug(baseSlug),
        displayName: itemLabel(item),
        parentId: parentId || undefined,
    });
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
        showPublishDrawer.value = false;
        setNotice('Event published');
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
function openQrEditor(mapping) {
    selectedQrMapping.value = mapping || null;
    showQrEditor.value = true;
    if (mapping)
        editQr(mapping);
}
function closeQrEditor() {
    showQrEditor.value = false;
    selectedQrMapping.value = null;
}
function qrTargetLabel(mapping) {
    if (mapping.url?.startsWith('/vendor/')) {
        const slug = mapping.url.split('/').pop();
        return vendors.value.find((vendor) => vendor.name === slug)?.displayName || 'Vendor card';
    }
    if (mapping.url?.includes('/item/')) {
        const slug = decodeURIComponent(mapping.url.split('/item/')[1] || '');
        return items.value.find((item) => item.name === slug)?.displayName || 'Item target';
    }
    if (mapping.url?.startsWith('/event/'))
        return 'Event menu';
    return 'Custom path';
}
function qrVendorLabel(mapping) {
    if (mapping.url?.startsWith('/vendor/')) {
        const slug = mapping.url.split('/').pop();
        return vendors.value.find((vendor) => vendor.name === slug)?.displayName || 'Vendor card';
    }
    const eventSlug = mapping.url?.split('/event/')[1]?.split('/')[0];
    const event = events.value.find((row) => row.name === eventSlug);
    return event?.vendor?.displayName || vendors.value.find((vendor) => vendor.id === event?.vendorId)?.displayName || 'Not linked';
}
function qrEventLabels(mapping) {
    const eventSlug = mapping.url?.split('/event/')[1]?.split('/')[0];
    if (!eventSlug)
        return 'No event linked';
    return events.value.find((event) => event.name === eventSlug)?.displayName || eventSlug;
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
        selectedQrMapping.value = data;
        setNotice('QR mapping saved');
    }
    catch (err) {
        setError(err);
    }
}
watch(selectedVendorId, (vendorId) => {
    localStorage.setItem('peshkash-admin-vendor-id', String(vendorId || ''));
    if (route.params.vendorId || route.params.eventId || route.params.menuId) {
        syncItemRows();
        return;
    }
    resetEvent();
    resetMenu();
    linkForm.eventId = 0;
    linkForm.menuId = 0;
    selectedMenuIdForItems.value = vendorMenus.value[0]?.id ?? 0;
    selectedEventIdForItems.value = vendorEvents.value[0]?.id ?? 0;
    syncItemRows();
});
watch([selectedMenuIdForItems, items], syncItemRows);
watch([selectedMenuIdForItems, items], resetDesignerDraft);
watch(selectedVendor, (vendor) => {
    productSelections.contactCard = Boolean(vendor?.hasContactPage);
}, { immediate: true });
watch(designerFullMenuQr, (value) => {
    productSelections.fullMenuQr = value;
});
watch(() => productSelections.fullMenuQr, (value) => {
    designerFullMenuQr.value = value;
});
watch(() => qrForm.qrHash, () => {
    qrPreview.shortQrUrl = qrForm.qrHash ? `${window.location.origin}/${qrForm.qrHash}` : '';
    if (qrPreview.shortQrUrl)
        QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
});
watch(() => route.fullPath, hydrateRouteContext);
onMounted(async () => {
    await loadAll();
    hydrateRouteContext();
    selectedMenuIdForItems.value = vendorMenus.value[0]?.id ?? 0;
    selectedEventIdForItems.value = vendorEvents.value[0]?.id ?? 0;
    hydrateRouteContext();
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
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['adhoc-box']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-main']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-button']} */ ;
/** @type {__VLS_StyleScopedClasses['home-workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['home-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['work-row']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action']} */ ;
/** @type {__VLS_StyleScopedClasses['work-row']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action']} */ ;
/** @type {__VLS_StyleScopedClasses['work-row']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['command-center']} */ ;
/** @type {__VLS_StyleScopedClasses['command-center']} */ ;
/** @type {__VLS_StyleScopedClasses['command-center']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-card']} */ ;
/** @type {__VLS_StyleScopedClasses['metric-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-card']} */ ;
/** @type {__VLS_StyleScopedClasses['workflow-card']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['item-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['item-context']} */ ;
/** @type {__VLS_StyleScopedClasses['context-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['sheet-search']} */ ;
/** @type {__VLS_StyleScopedClasses['sheet-search']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-add-row']} */ ;
/** @type {__VLS_StyleScopedClasses['linked-list']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-detail-list']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-detail-list']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-status']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['product-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['product-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['product-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['product-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-box']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-box']} */ ;
/** @type {__VLS_StyleScopedClasses['adhoc-box']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['product-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['product-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-note']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-gate']} */ ;
/** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['product-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
/** @type {__VLS_StyleScopedClasses['library-row']} */ ;
/** @type {__VLS_StyleScopedClasses['studio-phone']} */ ;
/** @type {__VLS_StyleScopedClasses['structure-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree-row']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree-row']} */ ;
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
/** @type {__VLS_StyleScopedClasses['qr-target-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-target-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['two-column']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['home-workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['command-center']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-add-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['item-toolbar']} */ ;
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['home-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-modal-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['designer-ribbon']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-context']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-switcher']} */ ;
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
        ...{ class: ({ active: __VLS_ctx.isNavActive(section.key) }) },
    }));
    const __VLS_2 = __VLS_1({
        key: (section.key),
        to: (__VLS_ctx.dashboardRouteBySection[section.key]),
        ...{ class: "nav-button" },
        ...{ class: ({ active: __VLS_ctx.isNavActive(section.key) }) },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "header-actions" },
});
if (__VLS_ctx.activeSection !== 'home') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.goBack) },
        ...{ class: "icon-button outlined" },
        title: "Back",
        'aria-label': "Back",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-arrow-left" },
    });
}
/** @type {[typeof WorkspaceSwitcher, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(WorkspaceSwitcher, new WorkspaceSwitcher({
    modelValue: (__VLS_ctx.selectedVendorId),
    vendors: (__VLS_ctx.vendors),
    selectedVendor: (__VLS_ctx.selectedVendor),
}));
const __VLS_5 = __VLS_4({
    modelValue: (__VLS_ctx.selectedVendorId),
    vendors: (__VLS_ctx.vendors),
    selectedVendor: (__VLS_ctx.selectedVendor),
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.loadAll) },
    ...{ class: "btn btn-outline-secondary btn-sm" },
    disabled: (__VLS_ctx.loading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
    ...{ class: "bi bi-arrow-clockwise" },
});
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
        ...{ class: "home-workspace" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel home-intro" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedVendor?.displayName || 'Select a vendor to begin');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "home-actions" },
    });
    const __VLS_7 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        ...{ class: "icon-action primary" },
        to: "/dashboard/events",
        title: "Open events",
    }));
    const __VLS_9 = __VLS_8({
        ...{ class: "icon-action primary" },
        to: "/dashboard/events",
        title: "Open events",
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    __VLS_10.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-calendar-event" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    var __VLS_10;
    const __VLS_11 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
        ...{ class: "icon-action" },
        to: "/dashboard/items",
        title: "Open item library",
    }));
    const __VLS_13 = __VLS_12({
        ...{ class: "icon-action" },
        to: "/dashboard/items",
        title: "Open item library",
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    __VLS_14.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-box-seam" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    var __VLS_14;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel home-summary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "work-stack" },
    });
    const __VLS_15 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
        ...{ class: "work-row" },
        to: "/dashboard/vendors",
    }));
    const __VLS_17 = __VLS_16({
        ...{ class: "work-row" },
        to: "/dashboard/vendors",
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_18.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-shop" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.vendors.length);
    var __VLS_18;
    const __VLS_19 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
        ...{ class: "work-row" },
        to: "/dashboard/events",
    }));
    const __VLS_21 = __VLS_20({
        ...{ class: "work-row" },
        to: "/dashboard/events",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    __VLS_22.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-calendar2-week" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.vendorEvents.length);
    var __VLS_22;
    const __VLS_23 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        ...{ class: "work-row" },
        to: "/dashboard/qr",
    }));
    const __VLS_25 = __VLS_24({
        ...{ class: "work-row" },
        to: "/dashboard/qr",
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    __VLS_26.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-qr-code" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    (__VLS_ctx.qrMappings.length);
    var __VLS_26;
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
    const __VLS_27 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        ...{ class: "icon-button outlined" },
        to: "/dashboard/events",
        title: "All events",
        'aria-label': "All events",
    }));
    const __VLS_29 = __VLS_28({
        ...{ class: "icon-button outlined" },
        to: "/dashboard/events",
        title: "All events",
        'aria-label': "All events",
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    __VLS_30.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-arrow-right" },
    });
    var __VLS_30;
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
    for (const [event] of __VLS_getVForSourceType((__VLS_ctx.vendorEvents))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (event.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (event.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        (event.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.eventWindow(event));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "soft-pill" },
        });
        (event.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.eventMenus(event.id).length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        const __VLS_31 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
            ...{ class: "icon-button outlined" },
            to: (__VLS_ctx.adminEventRoute(event)),
            title: "Open event",
            'aria-label': "Open event",
        }));
        const __VLS_33 = __VLS_32({
            ...{ class: "icon-button outlined" },
            to: (__VLS_ctx.adminEventRoute(event)),
            title: "Open event",
            'aria-label': "Open event",
        }, ...__VLS_functionalComponentArgsRest(__VLS_32));
        __VLS_34.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-box-arrow-up-right" },
        });
        var __VLS_34;
    }
    if (!__VLS_ctx.vendorEvents.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "5",
            ...{ class: "muted" },
        });
    }
}
if (__VLS_ctx.activeSection === 'vendors' || __VLS_ctx.activeSection === 'vendorWorkspace') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "stack-layout" },
    });
    if (__VLS_ctx.activeSection === 'vendorWorkspace' && __VLS_ctx.selectedVendor) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hero-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selectedVendor.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        (__VLS_ctx.selectedVendor.description || 'Reusable owner context for events, menus, items, and QR cards.');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hero-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'vendors' || __VLS_ctx.activeSection === 'vendorWorkspace'))
                        return;
                    if (!(__VLS_ctx.activeSection === 'vendorWorkspace' && __VLS_ctx.selectedVendor))
                        return;
                    __VLS_ctx.openVendorEditor(__VLS_ctx.selectedVendor);
                } },
            ...{ class: "btn btn-primary" },
        });
        const __VLS_35 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
            ...{ class: "btn btn-outline-primary" },
            to: "/dashboard/events",
        }));
        const __VLS_37 = __VLS_36({
            ...{ class: "btn btn-outline-primary" },
            to: "/dashboard/events",
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        __VLS_38.slots.default;
        var __VLS_38;
    }
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
                if (!(__VLS_ctx.activeSection === 'vendors' || __VLS_ctx.activeSection === 'vendorWorkspace'))
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.th, __VLS_intrinsicElements.th)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
    for (const [vendor] of __VLS_getVForSourceType((__VLS_ctx.vendors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'vendors' || __VLS_ctx.activeSection === 'vendorWorkspace'))
                        return;
                    __VLS_ctx.selectVendor(vendor);
                } },
            key: (vendor.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (vendor.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (vendor.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (vendor.description || 'No description');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatDate(vendor.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.vendorEventCount(vendor.id));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (vendor.hasContactPage ? 'Active' : 'Inactive');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'vendors' || __VLS_ctx.activeSection === 'vendorWorkspace'))
                        return;
                    __VLS_ctx.openVendorEditor(vendor);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
    }
    if (__VLS_ctx.showVendorEditor) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.closeVendorEditor) },
            ...{ class: "modal-backdrop-custom" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveVendor) },
            ...{ class: "vendor-modal" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-title-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.vendorForm.id ? 'Manage Vendor' : 'Create Vendor');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeVendorEditor) },
            ...{ class: "icon-button" },
            type: "button",
            'aria-label': "Close",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-x-lg" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "vendor-modal-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-pane" },
        });
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
            ...{ onInput: (__VLS_ctx.syncVendorQrDraft) },
            ...{ class: "form-control" },
            placeholder: "radisson-gurgaon",
        });
        (__VLS_ctx.vendorForm.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint wide" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "+91 90000 00000",
        });
        (__VLS_ctx.vendorPhone);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "events@example.com",
        });
        (__VLS_ctx.vendorEmail);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "https://example.com",
        });
        (__VLS_ctx.vendorWebsite);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "https://maps.google.com/...",
        });
        (__VLS_ctx.vendorMapUrl);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "Mon-Sun",
        });
        (__VLS_ctx.vendorBusinessDays);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "10:00 AM - 8:00 PM",
        });
        (__VLS_ctx.vendorBusinessHours);
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
            rows: "3",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "product-toggle wide" },
            ...{ class: ({ selected: __VLS_ctx.vendorForm.hasContactPage }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onChange: (__VLS_ctx.syncVendorQrDraft) },
            type: "checkbox",
        });
        (__VLS_ctx.vendorForm.hasContactPage);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-person-vcard" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "btn btn-primary" },
            type: "submit",
            disabled: (__VLS_ctx.loading),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-check2-circle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeVendorEditor) },
            ...{ class: "btn btn-outline-secondary" },
            type: "button",
            'aria-label': "Cancel",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-x-lg" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-pane qr-pane" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "preview-box" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.vendorQrDraft.url || 'Save a vendor to generate destination');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onInput: (__VLS_ctx.renderVendorQr) },
            ...{ class: "form-control" },
            placeholder: "radisson-gurgaon-card",
        });
        (__VLS_ctx.vendorQrDraft.qrHash);
        if (__VLS_ctx.vendorQrCodeDataUrl && __VLS_ctx.vendorForm.hasContactPage) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "qr-preview-card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "qr-status" },
                ...{ class: ({ active: __VLS_ctx.vendorQrIsActive }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: (__VLS_ctx.vendorQrIsActive ? 'bi bi-check-circle-fill' : 'bi bi-clock-history') },
            });
            (__VLS_ctx.vendorQrIsActive ? 'Active reusable QR' : 'Draft QR, activates on save');
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                ...{ class: "qr-image" },
                src: (__VLS_ctx.vendorQrCodeDataUrl),
                alt: "Vendor QR code",
            });
            if (__VLS_ctx.vendorQrIsActive) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: (`${__VLS_ctx.originUrl}/${__VLS_ctx.vendorQrDraft.qrHash}`),
                    target: "_blank",
                    rel: "noreferrer",
                });
                (__VLS_ctx.originUrl);
                (__VLS_ctx.vendorQrDraft.qrHash);
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
                (__VLS_ctx.originUrl);
                (__VLS_ctx.vendorQrDraft.qrHash);
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveVendorQr) },
            ...{ class: "btn btn-primary btn-sm" },
            type: "button",
            disabled: (!__VLS_ctx.vendorForm.id || !__VLS_ctx.vendorForm.hasContactPage || !__VLS_ctx.vendorQrDraft.qrHash),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-qr-code" },
        });
    }
}
if (__VLS_ctx.activeSection === 'events') {
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
        ...{ onClick: (__VLS_ctx.startNewEvent) },
        ...{ class: "btn btn-primary" },
    });
    if (__VLS_ctx.showEventEditor) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveEvent) },
            ...{ class: "inline-editor" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeEventEditor) },
            ...{ class: "btn btn-outline-secondary" },
            type: "button",
        });
    }
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
        (__VLS_ctx.eventWindow(event));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "badge text-bg-light" },
        });
        (event.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.eventMenus(event.id).length);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            ...{ class: "row-actions" },
        });
        const __VLS_39 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminEventRoute(event)),
        }));
        const __VLS_41 = __VLS_40({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminEventRoute(event)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_40));
        __VLS_42.slots.default;
        var __VLS_42;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'events'))
                        return;
                    __VLS_ctx.editEventInline(event);
                } },
            ...{ class: "btn btn-outline-secondary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'events'))
                        return;
                    __VLS_ctx.openPublishDrawer(event);
                } },
            ...{ class: "btn btn-outline-primary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-send-check" },
        });
    }
    if (!__VLS_ctx.vendorEvents.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "5",
            ...{ class: "muted" },
        });
    }
}
if (__VLS_ctx.activeSection === 'eventWorkspace') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "event-workspace" },
    });
    if (__VLS_ctx.selectedEventForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hero-panel event-hero" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selectedEventForItems.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        (__VLS_ctx.eventWindow(__VLS_ctx.selectedEventForItems));
        (__VLS_ctx.selectedEventForItems.status);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "hero-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'eventWorkspace'))
                        return;
                    if (!(__VLS_ctx.selectedEventForItems))
                        return;
                    __VLS_ctx.openPublishDrawer(__VLS_ctx.selectedEventForItems);
                } },
            ...{ class: "btn btn-primary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-send-check" },
        });
        const __VLS_43 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
            ...{ class: "btn btn-outline-primary" },
            to: (__VLS_ctx.adminQrSheetRoute(__VLS_ctx.selectedEventForItems)),
        }));
        const __VLS_45 = __VLS_44({
            ...{ class: "btn btn-outline-primary" },
            to: (__VLS_ctx.adminQrSheetRoute(__VLS_ctx.selectedEventForItems)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_44));
        __VLS_46.slots.default;
        var __VLS_46;
        const __VLS_47 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
            ...{ class: "btn btn-outline-secondary" },
            to: "/dashboard/menus/studio",
        }));
        const __VLS_49 = __VLS_48({
            ...{ class: "btn btn-outline-secondary" },
            to: "/dashboard/menus/studio",
        }, ...__VLS_functionalComponentArgsRest(__VLS_48));
        __VLS_50.slots.default;
        var __VLS_50;
    }
    if (__VLS_ctx.selectedEventForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "workspace-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "checklist premium-checklist" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.eventChecklist(__VLS_ctx.selectedEventForItems)))) {
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
            ...{ class: "payment-gate compact-gate" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
        (__VLS_ctx.eventProducts.filter((product) => product.selected).map((product) => product.label).join(', ') || 'No add-ons selected yet.');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel wide-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        const __VLS_51 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
            ...{ class: "btn btn-outline-primary btn-sm" },
            to: "/dashboard/menus/studio",
        }));
        const __VLS_53 = __VLS_52({
            ...{ class: "btn btn-outline-primary btn-sm" },
            to: "/dashboard/menus/studio",
        }, ...__VLS_functionalComponentArgsRest(__VLS_52));
        __VLS_54.slots.default;
        var __VLS_54;
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tbody, __VLS_intrinsicElements.tbody)({});
        for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.selectedEventMenus))) {
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
            (__VLS_ctx.menuItems(menu.id).length);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (__VLS_ctx.buildAbsolute(__VLS_ctx.menuPathFor(__VLS_ctx.selectedEventForItems, menu))),
                target: "_blank",
                rel: "noreferrer",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
            const __VLS_55 = {}.RouterLink;
            /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
            // @ts-ignore
            const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
                ...{ class: "btn btn-outline-secondary btn-sm" },
                to: (__VLS_ctx.adminMenuStudioRoute(menu)),
            }));
            const __VLS_57 = __VLS_56({
                ...{ class: "btn btn-outline-secondary btn-sm" },
                to: (__VLS_ctx.adminMenuStudioRoute(menu)),
            }, ...__VLS_functionalComponentArgsRest(__VLS_56));
            __VLS_58.slots.default;
            var __VLS_58;
        }
        if (!__VLS_ctx.selectedEventMenus.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
                colspan: "4",
                ...{ class: "muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel wide-panel" },
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
                    if (!(__VLS_ctx.activeSection === 'eventWorkspace'))
                        return;
                    if (!(__VLS_ctx.selectedEventForItems))
                        return;
                    __VLS_ctx.openPublishDrawer(__VLS_ctx.selectedEventForItems);
                } },
            ...{ class: "btn btn-primary btn-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-bag-check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "product-grid" },
        });
        for (const [product] of __VLS_getVForSourceType((__VLS_ctx.eventProducts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (product.key),
                ...{ class: "product-card" },
                ...{ class: ({ selected: product.selected }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: (product.icon) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (product.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (product.description);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (product.selected ? 'Selected' : 'Available');
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel wide-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        const __VLS_59 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminQrSheetRoute(__VLS_ctx.selectedEventForItems)),
        }));
        const __VLS_61 = __VLS_60({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminQrSheetRoute(__VLS_ctx.selectedEventForItems)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_60));
        __VLS_62.slots.default;
        var __VLS_62;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "qr-preview-list" },
        });
        for (const [target] of __VLS_getVForSourceType((__VLS_ctx.eventQrTargets(__VLS_ctx.selectedEventForItems)))) {
            /** @type {[typeof QrTargetPreview, ]} */ ;
            // @ts-ignore
            const __VLS_63 = __VLS_asFunctionalComponent(QrTargetPreview, new QrTargetPreview({
                key: (target.key),
                label: (target.label),
                type: (target.type),
                path: (target.path),
            }));
            const __VLS_64 = __VLS_63({
                key: (target.key),
                label: (target.label),
                type: (target.type),
                path: (target.path),
            }, ...__VLS_functionalComponentArgsRest(__VLS_63));
        }
        if (!__VLS_ctx.eventQrTargets(__VLS_ctx.selectedEventForItems).length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
        }
    }
    if (__VLS_ctx.showPublishDrawer && __VLS_ctx.selectedEventForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'eventWorkspace'))
                        return;
                    if (!(__VLS_ctx.showPublishDrawer && __VLS_ctx.selectedEventForItems))
                        return;
                    __VLS_ctx.showPublishDrawer = false;
                } },
            ...{ class: "drawer-backdrop" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "side-drawer publish-drawer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-title-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selectedEventForItems.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'eventWorkspace'))
                        return;
                    if (!(__VLS_ctx.showPublishDrawer && __VLS_ctx.selectedEventForItems))
                        return;
                    __VLS_ctx.showPublishDrawer = false;
                } },
            ...{ class: "icon-button" },
            type: "button",
            'aria-label': "Close",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-x-lg" },
        });
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
            ...{ class: "product-cart" },
        });
        for (const [product] of __VLS_getVForSourceType((__VLS_ctx.publishProducts))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (product.key),
                ...{ class: "cart-line" },
                ...{ class: ({ selected: product.selected }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "checkbox",
            });
            (__VLS_ctx.productSelections[product.key]);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: (product.icon) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (product.label);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
            (product.description);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'eventWorkspace'))
                        return;
                    if (!(__VLS_ctx.showPublishDrawer && __VLS_ctx.selectedEventForItems))
                        return;
                    __VLS_ctx.showPublishDrawer = false;
                } },
            ...{ class: "btn btn-outline-secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.publishSelectedEvent) },
            ...{ class: "btn btn-primary" },
            disabled: (!__VLS_ctx.canPublish),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-send-check" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel empty-state" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        const __VLS_66 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_67 = __VLS_asFunctionalComponent(__VLS_66, new __VLS_66({
            ...{ class: "btn btn-primary" },
            to: "/dashboard/events",
        }));
        const __VLS_68 = __VLS_67({
            ...{ class: "btn btn-primary" },
            to: "/dashboard/events",
        }, ...__VLS_functionalComponentArgsRest(__VLS_67));
        __VLS_69.slots.default;
        var __VLS_69;
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
        ...{ onClick: (() => __VLS_ctx.addDraftItemRow(__VLS_ctx.defaultItemMenuId())) },
        ...{ class: "btn btn-outline-primary" },
        disabled: (!__VLS_ctx.vendorMenus.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveDirtyItemRows) },
        ...{ class: "btn btn-primary" },
        disabled: (!__VLS_ctx.dirtyItemRows.length),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "table-filters compact-filters" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sheet-search" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-search" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
        placeholder: "Search name, identifier, type, or tag",
    });
    (__VLS_ctx.itemSearch);
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearItemFilters) },
        ...{ class: "btn btn-outline-secondary btn-sm" },
    });
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            ...{ onChange: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'inventory'))
                        return;
                    row.parentId = 0;
                    __VLS_ctx.markItemDirty(row);
                } },
            value: (row.menuId),
            ...{ class: "form-select" },
        });
        for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.vendorMenus))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (menu.id),
                value: (menu.id),
            });
            (menu.displayName);
        }
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "designer-ribbon" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.createDesignerMenu) },
        ...{ class: "btn btn-primary icon-label" },
        disabled: (!__VLS_ctx.designerMenuName || !__VLS_ctx.selectedVendor),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-plus-lg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.linkSelectedMenuToEvent) },
        ...{ class: "btn btn-outline-primary icon-label" },
        disabled: (!__VLS_ctx.selectedEventIdForItems || !__VLS_ctx.selectedMenuIdForItems),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-bag-plus" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "panel-heading compact-heading" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "sheet-search studio-search" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-search" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ class: "form-control" },
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "actions slim-actions" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'designer'))
                    return;
                __VLS_ctx.showQuickMenuItem = !__VLS_ctx.showQuickMenuItem;
            } },
        ...{ class: "icon-button outlined" },
        disabled: (!__VLS_ctx.selectedMenuForItems),
        title: "Add item",
        'aria-label': "Add item",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-plus-lg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'designer'))
                    return;
                __VLS_ctx.showArrangeDrawer = true;
            } },
        ...{ class: "icon-button outlined" },
        disabled: (!__VLS_ctx.selectedMenuForItems),
        title: "Arrange",
        'aria-label': "Arrange",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-diagram-3" },
    });
    const __VLS_70 = {}.RouterLink;
    /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
    // @ts-ignore
    const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
        ...{ class: "icon-button outlined" },
        ...{ class: ({ disabled: !__VLS_ctx.selectedMenuForItems }) },
        to: (__VLS_ctx.selectedMenuForItems ? __VLS_ctx.adminMenuPreviewRoute(__VLS_ctx.selectedMenuForItems) : '/dashboard/menus/studio'),
        title: "Open preview",
        'aria-label': "Open preview",
    }));
    const __VLS_72 = __VLS_71({
        ...{ class: "icon-button outlined" },
        ...{ class: ({ disabled: !__VLS_ctx.selectedMenuForItems }) },
        to: (__VLS_ctx.selectedMenuForItems ? __VLS_ctx.adminMenuPreviewRoute(__VLS_ctx.selectedMenuForItems) : '/dashboard/menus/studio'),
        title: "Open preview",
        'aria-label': "Open preview",
    }, ...__VLS_functionalComponentArgsRest(__VLS_71));
    __VLS_73.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-phone" },
    });
    var __VLS_73;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveDesignerChanges) },
        ...{ class: "btn btn-primary btn-sm" },
        disabled: (!__VLS_ctx.designerDirty),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-check2-circle" },
    });
    if (__VLS_ctx.showQuickMenuItem && __VLS_ctx.selectedMenuForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.createQuickMenuItem) },
            ...{ class: "quick-add-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ onBlur: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    if (!(__VLS_ctx.showQuickMenuItem && __VLS_ctx.selectedMenuForItems))
                        return;
                    __VLS_ctx.quickItem.name = __VLS_ctx.quickItem.name || __VLS_ctx.slugify(__VLS_ctx.quickItem.displayName);
                } },
            ...{ class: "form-control" },
            placeholder: "Item or category name",
        });
        (__VLS_ctx.quickItem.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
            value: (__VLS_ctx.quickItem.parentId),
            ...{ class: "form-select" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
            value: (0),
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedDesignerItems))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
                key: (item.id),
                value: (item.id),
            });
            (__VLS_ctx.itemLabel(item));
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "type",
        });
        (__VLS_ctx.quickItem.type);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
            placeholder: "tag",
        });
        (__VLS_ctx.quickItem.enumType);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "btn btn-primary" },
            type: "submit",
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "studio-live-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onDragover: () => { } },
        ...{ onDrop: (__VLS_ctx.dropOnMenuRoot) },
        ...{ class: "phone-shell studio-phone" },
        ...{ class: ({ dirty: __VLS_ctx.designerDirty }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "eyebrow" },
    });
    (__VLS_ctx.selectedEventForItems?.displayName || 'Event Preview');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    (__VLS_ctx.selectedMenuForItems?.displayName || 'Menu Preview');
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedDesignerTree))) {
        /** @type {[typeof MenuTree, ]} */ ;
        // @ts-ignore
        const __VLS_74 = __VLS_asFunctionalComponent(MenuTree, new MenuTree({
            key: (item.id),
            item: (item),
            level: (0),
            eventName: (__VLS_ctx.selectedEventForItems?.name || ''),
            menuName: (__VLS_ctx.selectedMenuForItems?.name || ''),
        }));
        const __VLS_75 = __VLS_74({
            key: (item.id),
            item: (item),
            level: (0),
            eventName: (__VLS_ctx.selectedEventForItems?.name || ''),
            menuName: (__VLS_ctx.selectedMenuForItems?.name || ''),
        }, ...__VLS_functionalComponentArgsRest(__VLS_74));
    }
    if (!__VLS_ctx.selectedDesignerItems.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "muted" },
        });
    }
    if (__VLS_ctx.showArrangeDrawer) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    if (!(__VLS_ctx.showArrangeDrawer))
                        return;
                    __VLS_ctx.showArrangeDrawer = false;
                } },
            ...{ class: "drawer-backdrop" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
            ...{ class: "side-drawer" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-title-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    if (!(__VLS_ctx.showArrangeDrawer))
                        return;
                    __VLS_ctx.showArrangeDrawer = false;
                } },
            ...{ class: "icon-button" },
            type: "button",
            'aria-label': "Close",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-x-lg" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "admin-tree" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedDesignerTree))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (item.id),
                ...{ class: "tree-root" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ onDragstart: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'designer'))
                            return;
                        if (!(__VLS_ctx.showArrangeDrawer))
                            return;
                        __VLS_ctx.dragDesignedItem(item);
                    } },
                ...{ onDragover: () => { } },
                ...{ onDrop: (...[$event]) => {
                        if (!(__VLS_ctx.activeSection === 'designer'))
                            return;
                        if (!(__VLS_ctx.showArrangeDrawer))
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
                        if (!(__VLS_ctx.showArrangeDrawer))
                            return;
                        __VLS_ctx.setItemParent(item, null);
                    } },
                ...{ class: "icon-button outlined small" },
                title: "Move to root",
                'aria-label': "Move to root",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                ...{ class: "bi bi-arrow-up-square" },
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
                            if (!(__VLS_ctx.showArrangeDrawer))
                                return;
                            __VLS_ctx.dragDesignedItem(child);
                        } },
                    ...{ onDragover: () => { } },
                    ...{ onDrop: (...[$event]) => {
                            if (!(__VLS_ctx.activeSection === 'designer'))
                                return;
                            if (!(__VLS_ctx.showArrangeDrawer))
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
                            if (!(__VLS_ctx.showArrangeDrawer))
                                return;
                            __VLS_ctx.setItemParent(child, item.id);
                        } },
                    ...{ class: "icon-button outlined small" },
                    title: "Move under this item",
                    'aria-label': "Move under this item",
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
                    ...{ class: "bi bi-arrow-return-right" },
                });
            }
        }
        if (!__VLS_ctx.selectedDesignerItems.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "drawer-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'designer'))
                        return;
                    if (!(__VLS_ctx.showArrangeDrawer))
                        return;
                    __VLS_ctx.showArrangeDrawer = false;
                } },
            ...{ class: "btn btn-outline-secondary" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.saveDesignerChanges) },
            ...{ class: "btn btn-primary" },
            disabled: (!__VLS_ctx.designerDirty),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-check2-circle" },
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
                __VLS_ctx.openPublishDrawer(__VLS_ctx.selectedEventForItems);
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
        const __VLS_77 = __VLS_asFunctionalComponent(MenuTree, new MenuTree({
            key: (item.id),
            item: (item),
            level: (0),
            eventName: (__VLS_ctx.selectedEventForItems?.name || ''),
            menuName: (__VLS_ctx.selectedMenuForItems?.name || ''),
        }));
        const __VLS_78 = __VLS_77({
            key: (item.id),
            item: (item),
            level: (0),
            eventName: (__VLS_ctx.selectedEventForItems?.name || ''),
            menuName: (__VLS_ctx.selectedMenuForItems?.name || ''),
        }, ...__VLS_functionalComponentArgsRest(__VLS_77));
    }
}
if (__VLS_ctx.activeSection === 'publish') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "publish-grid" },
    });
    if (__VLS_ctx.selectedEventForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel wide-panel publish-context" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selectedEventForItems.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "actions" },
        });
        const __VLS_80 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminEventRoute(__VLS_ctx.selectedEventForItems)),
        }));
        const __VLS_82 = __VLS_81({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminEventRoute(__VLS_ctx.selectedEventForItems)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_81));
        __VLS_83.slots.default;
        var __VLS_83;
    }
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
        ...{ class: "product-cart" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cart-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
        ...{ class: "bi bi-bag-check" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
    for (const [product] of __VLS_getVForSourceType((__VLS_ctx.publishProducts))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            key: (product.key),
            ...{ class: "cart-line" },
            ...{ class: ({ selected: product.selected }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "checkbox",
        });
        (__VLS_ctx.productSelections[product.key]);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: (product.icon) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (product.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
        (product.description);
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
        ...{ class: "table-wrap qr-sheet-table" },
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
    for (const [menu] of __VLS_getVForSourceType((__VLS_ctx.selectedEventMenus))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (`menu-${menu.id}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (menu.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.menuPathFor(__VLS_ctx.selectedEventForItems, menu));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.eventTimerLabel(__VLS_ctx.selectedEventForItems));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            title: (`Menu QR target for ${menu.displayName}`),
        });
    }
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.selectedEventItems))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({
            key: (`item-${item.id}`),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.itemLabel(item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        (__VLS_ctx.menuName(item.menuId));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (item.type || 'Item');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (__VLS_ctx.itemPathFor(__VLS_ctx.selectedEventForItems, item));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.eventTimerLabel(__VLS_ctx.selectedEventForItems));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            title: (__VLS_ctx.itemUsageTitle(item.id)),
        });
    }
    if (!__VLS_ctx.selectedEventMenus.length && !__VLS_ctx.selectedEventItems.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.tr, __VLS_intrinsicElements.tr)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({
            colspan: "5",
            ...{ class: "muted" },
        });
    }
}
if (__VLS_ctx.activeSection === 'qrSheet') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "stack-layout" },
    });
    if (__VLS_ctx.selectedEventForItems) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel-heading" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "eyebrow" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selectedEventForItems.displayName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "actions" },
        });
        const __VLS_84 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminEventRoute(__VLS_ctx.selectedEventForItems)),
        }));
        const __VLS_86 = __VLS_85({
            ...{ class: "btn btn-outline-secondary btn-sm" },
            to: (__VLS_ctx.adminEventRoute(__VLS_ctx.selectedEventForItems)),
        }, ...__VLS_functionalComponentArgsRest(__VLS_85));
        __VLS_87.slots.default;
        var __VLS_87;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "qr-sheet-grid" },
        });
        for (const [target] of __VLS_getVForSourceType((__VLS_ctx.eventQrTargets(__VLS_ctx.selectedEventForItems)))) {
            /** @type {[typeof QrTargetPreview, ]} */ ;
            // @ts-ignore
            const __VLS_88 = __VLS_asFunctionalComponent(QrTargetPreview, new QrTargetPreview({
                key: (target.key),
                label: (target.label),
                type: (target.type),
                path: (target.path),
            }));
            const __VLS_89 = __VLS_88({
                key: (target.key),
                label: (target.label),
                type: (target.type),
                path: (target.path),
            }, ...__VLS_functionalComponentArgsRest(__VLS_88));
        }
        if (!__VLS_ctx.eventQrTargets(__VLS_ctx.selectedEventForItems).length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "muted" },
            });
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "panel empty-state" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        const __VLS_91 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_92 = __VLS_asFunctionalComponent(__VLS_91, new __VLS_91({
            ...{ class: "btn btn-primary" },
            to: "/dashboard/events",
        }));
        const __VLS_93 = __VLS_92({
            ...{ class: "btn btn-primary" },
            to: "/dashboard/events",
        }, ...__VLS_functionalComponentArgsRest(__VLS_92));
        __VLS_94.slots.default;
        var __VLS_94;
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qr-target-tabs" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'qr'))
                    return;
                __VLS_ctx.qrTargetType = 'vendor';
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.qrTargetType === 'vendor' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'qr'))
                    return;
                __VLS_ctx.qrTargetType = 'menu';
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.qrTargetType === 'menu' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'qr'))
                    return;
                __VLS_ctx.qrTargetType = 'item';
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.qrTargetType === 'item' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.activeSection === 'qr'))
                    return;
                __VLS_ctx.qrTargetType = 'custom';
            } },
        type: "button",
        ...{ class: ({ active: __VLS_ctx.qrTargetType === 'custom' }) },
    });
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
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'qr'))
                        return;
                    __VLS_ctx.openQrEditor(mapping);
                } },
            key: (mapping.id),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.code, __VLS_intrinsicElements.code)({});
        (mapping.qrHash);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.qrTargetLabel(mapping));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.br)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "muted" },
        });
        (mapping.url);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (mapping.usageCount || 0);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        (__VLS_ctx.formatDate(mapping.updatedAt || mapping.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.td, __VLS_intrinsicElements.td)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.activeSection === 'qr'))
                        return;
                    __VLS_ctx.openQrEditor(mapping);
                } },
            ...{ class: "icon-button outlined small" },
            title: "Manage QR",
            'aria-label': "Manage QR",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-sliders" },
        });
    }
    if (__VLS_ctx.showQrEditor) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.closeQrEditor) },
            ...{ class: "modal-backdrop-custom" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
            ...{ onSubmit: (__VLS_ctx.saveQr) },
            ...{ class: "vendor-modal" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-title-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
        (__VLS_ctx.selectedQrMapping ? __VLS_ctx.selectedQrMapping.qrHash : 'New QR Asset');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "hint" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.closeQrEditor) },
            ...{ class: "icon-button" },
            type: "button",
            'aria-label': "Close",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-x-lg" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "vendor-modal-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-pane" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-grid" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
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
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "wide" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            ...{ class: "form-control" },
        });
        (__VLS_ctx.qrForm.url);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "check" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "checkbox",
        });
        (__VLS_ctx.qrForm.isActive);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.buildQrDestination) },
            ...{ class: "btn btn-outline-secondary" },
            type: "button",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-magic" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ class: "btn btn-primary" },
            type: "submit",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.i, __VLS_intrinsicElements.i)({
            ...{ class: "bi bi-check2-circle" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "modal-pane qr-pane" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "qr-detail-list" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedQrMapping ? __VLS_ctx.qrTargetLabel(__VLS_ctx.selectedQrMapping) : 'Draft');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedQrMapping?.usageCount || 0);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedQrMapping ? __VLS_ctx.qrVendorLabel(__VLS_ctx.selectedQrMapping) : __VLS_ctx.selectedVendor?.displayName || 'Not selected');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.selectedQrMapping ? __VLS_ctx.qrEventLabels(__VLS_ctx.selectedQrMapping) : 'No event linked');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatDate(__VLS_ctx.selectedQrMapping?.createdAt));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
        (__VLS_ctx.formatDate(__VLS_ctx.selectedQrMapping?.updatedAt));
        if (__VLS_ctx.qrCodeDataUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                ...{ class: "qr-image" },
                src: (__VLS_ctx.qrCodeDataUrl),
                alt: "QR code",
            });
        }
        if (__VLS_ctx.qrPreview.shortQrUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (__VLS_ctx.qrPreview.shortQrUrl),
                target: "_blank",
                rel: "noreferrer",
            });
            (__VLS_ctx.qrPreview.shortQrUrl);
        }
    }
}
/** @type {__VLS_StyleScopedClasses['admin-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-button']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-main']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-header']} */ ;
/** @type {__VLS_StyleScopedClasses['header-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-left']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-clockwise']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-success']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['alert']} */ ;
/** @type {__VLS_StyleScopedClasses['alert-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['py-2']} */ ;
/** @type {__VLS_StyleScopedClasses['home-workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['home-intro']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['home-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-calendar-event']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-action']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-box-seam']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['home-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['work-stack']} */ ;
/** @type {__VLS_StyleScopedClasses['work-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-shop']} */ ;
/** @type {__VLS_StyleScopedClasses['work-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-calendar2-week']} */ ;
/** @type {__VLS_StyleScopedClasses['work-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-qr-code']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-right']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['action-table']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['soft-pill']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-box-arrow-up-right']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
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
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop-custom']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-modal-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['product-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-person-vcard']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-check2-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['preview-box']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-status']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-image']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-qr-code']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-editor']} */ ;
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
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['action-table']} */ ;
/** @type {__VLS_StyleScopedClasses['badge']} */ ;
/** @type {__VLS_StyleScopedClasses['text-bg-light']} */ ;
/** @type {__VLS_StyleScopedClasses['row-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-send-check']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['event-workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['event-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-send-check']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['workspace-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['checklist']} */ ;
/** @type {__VLS_StyleScopedClasses['premium-checklist']} */ ;
/** @type {__VLS_StyleScopedClasses['done']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-gate']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-gate']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['action-table']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-bag-check']} */ ;
/** @type {__VLS_StyleScopedClasses['product-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-preview-list']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['side-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['checklist']} */ ;
/** @type {__VLS_StyleScopedClasses['done']} */ ;
/** @type {__VLS_StyleScopedClasses['product-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-send-check']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
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
/** @type {__VLS_StyleScopedClasses['compact-filters']} */ ;
/** @type {__VLS_StyleScopedClasses['sheet-search']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-search']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['editable-table']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
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
/** @type {__VLS_StyleScopedClasses['designer-ribbon']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-label']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-plus-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-label']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-bag-plus']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['compact-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['sheet-search']} */ ;
/** @type {__VLS_StyleScopedClasses['studio-search']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-search']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['library-list']} */ ;
/** @type {__VLS_StyleScopedClasses['library-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-plus-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['menu-render']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['slim-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-plus-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-diagram-3']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['disabled']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-phone']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-check2-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-add-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['studio-live-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['phone-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['studio-phone']} */ ;
/** @type {__VLS_StyleScopedClasses['dirty']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-backdrop']} */ ;
/** @type {__VLS_StyleScopedClasses['side-drawer']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-root']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree-row']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-grip-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-up-square']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-note']} */ ;
/** @type {__VLS_StyleScopedClasses['tree-children-admin']} */ ;
/** @type {__VLS_StyleScopedClasses['admin-tree-row']} */ ;
/** @type {__VLS_StyleScopedClasses['child']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-grip-vertical']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-arrow-return-right']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['drawer-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-check2-circle']} */ ;
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
/** @type {__VLS_StyleScopedClasses['wide-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['publish-context']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
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
/** @type {__VLS_StyleScopedClasses['product-cart']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-title']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-bag-check']} */ ;
/** @type {__VLS_StyleScopedClasses['cart-line']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['payment-gate']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['wide-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['table-wrap']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-sheet-table']} */ ;
/** @type {__VLS_StyleScopedClasses['table']} */ ;
/** @type {__VLS_StyleScopedClasses['table-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['align-middle']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['stack-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['panel-heading']} */ ;
/** @type {__VLS_StyleScopedClasses['eyebrow']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-sheet-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['panel']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
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
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-target-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
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
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['outlined']} */ ;
/** @type {__VLS_StyleScopedClasses['small']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-sliders']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-backdrop-custom']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title-row']} */ ;
/** @type {__VLS_StyleScopedClasses['hint']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-button']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-x-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['vendor-modal-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['form-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['form-select']} */ ;
/** @type {__VLS_StyleScopedClasses['wide']} */ ;
/** @type {__VLS_StyleScopedClasses['form-control']} */ ;
/** @type {__VLS_StyleScopedClasses['check']} */ ;
/** @type {__VLS_StyleScopedClasses['actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-outline-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-magic']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['bi']} */ ;
/** @type {__VLS_StyleScopedClasses['bi-check2-circle']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-pane']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-detail-list']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-image']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            QrTargetPreview: QrTargetPreview,
            WorkspaceSwitcher: WorkspaceSwitcher,
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
            showEventEditor: showEventEditor,
            showQuickMenuItem: showQuickMenuItem,
            showArrangeDrawer: showArrangeDrawer,
            showQrEditor: showQrEditor,
            showPublishDrawer: showPublishDrawer,
            designerMenuName: designerMenuName,
            designerNotes: designerNotes,
            designerSearch: designerSearch,
            itemSearch: itemSearch,
            itemMenuFilter: itemMenuFilter,
            itemTypeFilter: itemTypeFilter,
            vendors: vendors,
            menus: menus,
            qrMappings: qrMappings,
            selectedQrMapping: selectedQrMapping,
            vendorPhone: vendorPhone,
            vendorEmail: vendorEmail,
            vendorWebsite: vendorWebsite,
            vendorMapUrl: vendorMapUrl,
            vendorBusinessDays: vendorBusinessDays,
            vendorBusinessHours: vendorBusinessHours,
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
            productSelections: productSelections,
            adhocForm: adhocForm,
            importForm: importForm,
            quickItem: quickItem,
            selectedVendor: selectedVendor,
            vendorEvents: vendorEvents,
            vendorMenus: vendorMenus,
            selectedMenuForItems: selectedMenuForItems,
            selectedEventForItems: selectedEventForItems,
            selectedDesignerItems: selectedDesignerItems,
            selectedDesignerTree: selectedDesignerTree,
            designerDirty: designerDirty,
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
            originUrl: originUrl,
            vendorQrIsActive: vendorQrIsActive,
            publishProducts: publishProducts,
            eventProducts: eventProducts,
            activeTitle: activeTitle,
            activeSubtitle: activeSubtitle,
            selectedEventMenuLinks: selectedEventMenuLinks,
            menusForQrEvent: menusForQrEvent,
            itemsForQrEvent: itemsForQrEvent,
            slugify: slugify,
            loadAll: loadAll,
            formatDate: formatDate,
            eventWindow: eventWindow,
            vendorEventCount: vendorEventCount,
            clearItemFilters: clearItemFilters,
            isNavActive: isNavActive,
            goBack: goBack,
            adminEventRoute: adminEventRoute,
            adminQrSheetRoute: adminQrSheetRoute,
            adminMenuStudioRoute: adminMenuStudioRoute,
            adminMenuPreviewRoute: adminMenuPreviewRoute,
            menuItems: menuItems,
            defaultItemMenuId: defaultItemMenuId,
            eventChecklist: eventChecklist,
            eventQrTargets: eventQrTargets,
            fillVendorSlug: fillVendorSlug,
            fillEventSlug: fillEventSlug,
            fillMenuSlug: fillMenuSlug,
            fillRowSlug: fillRowSlug,
            fillAdhocSlug: fillAdhocSlug,
            selectVendor: selectVendor,
            openVendorEditor: openVendorEditor,
            closeVendorEditor: closeVendorEditor,
            renderVendorQr: renderVendorQr,
            syncVendorQrDraft: syncVendorQrDraft,
            saveVendor: saveVendor,
            saveVendorQr: saveVendorQr,
            startNewEvent: startNewEvent,
            editEventInline: editEventInline,
            openPublishDrawer: openPublishDrawer,
            closeEventEditor: closeEventEditor,
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
            createQuickMenuItem: createQuickMenuItem,
            saveDesignerChanges: saveDesignerChanges,
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
            buildAbsolute: buildAbsolute,
            buildQrDestination: buildQrDestination,
            openQrEditor: openQrEditor,
            closeQrEditor: closeQrEditor,
            qrTargetLabel: qrTargetLabel,
            qrVendorLabel: qrVendorLabel,
            qrEventLabels: qrEventLabels,
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
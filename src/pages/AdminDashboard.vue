<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div>
        <p class="eyebrow">Peshkash Admin</p>
        <h1>Vendor Workspace</h1>
      </div>
      <nav>
        <RouterLink
          v-for="section in sections"
          :key="section.key"
          :to="dashboardRouteBySection[section.key]"
          class="nav-button"
          :class="{ active: isNavActive(section.key) }"
        >
          <i :class="section.icon"></i>
          <span>{{ section.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="admin-main">
      <header class="workspace-header">
        <div>
          <h2>{{ activeTitle }}</h2>
          <p>{{ activeSubtitle }}</p>
        </div>
        <div class="header-actions">
          <WorkspaceSwitcher v-model="selectedVendorId" :vendors="vendors" :selected-vendor="selectedVendor" />
          <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadAll">
            <i class="bi bi-arrow-clockwise"></i>
            Refresh
          </button>
        </div>
      </header>

      <div v-if="message" class="alert alert-success py-2">{{ message }}</div>
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

      <section v-if="activeSection === 'home'" class="home-workspace">
        <div class="panel home-intro">
          <div>
            <p class="eyebrow">Workspace</p>
            <h3>{{ selectedVendor?.displayName || 'Select a vendor to begin' }}</h3>
            <p class="hint">Recent operational surfaces only. Detailed setup happens inside Vendors, Events, Menu Studio, and QR Studio.</p>
          </div>
          <div class="home-actions">
            <RouterLink class="icon-action primary" to="/dashboard/events" title="Open events">
              <i class="bi bi-calendar-event"></i><span>Events</span>
            </RouterLink>
            <RouterLink class="icon-action" to="/dashboard/items" title="Open item library">
              <i class="bi bi-box-seam"></i><span>Items</span>
            </RouterLink>
          </div>
        </div>

        <div class="panel home-summary">
          <h3>Open Work</h3>
          <div class="work-stack">
            <RouterLink class="work-row" to="/dashboard/vendors">
              <i class="bi bi-shop"></i>
              <span>Vendors</span>
              <strong>{{ vendors.length }}</strong>
            </RouterLink>
            <RouterLink class="work-row" to="/dashboard/events">
              <i class="bi bi-calendar2-week"></i>
              <span>Events</span>
              <strong>{{ vendorEvents.length }}</strong>
            </RouterLink>
            <RouterLink class="work-row" to="/dashboard/qr">
              <i class="bi bi-qr-code"></i>
              <span>QR Mappings</span>
              <strong>{{ qrMappings.length }}</strong>
            </RouterLink>
          </div>
        </div>

        <div class="panel">
          <div class="panel-heading">
            <div>
              <h3>Event Workspaces</h3>
              <p class="hint">Current vendor events. Open one to manage menus, products, QR targets, and publish readiness.</p>
            </div>
            <RouterLink class="icon-button outlined" to="/dashboard/events" title="All events" aria-label="All events"><i class="bi bi-arrow-right"></i></RouterLink>
          </div>
          <div class="table-wrap">
            <table class="table table-sm align-middle action-table">
              <thead><tr><th>Event</th><th>Window</th><th>Status</th><th>Menus</th><th></th></tr></thead>
              <tbody>
                <tr v-for="event in vendorEvents" :key="event.id">
                  <td><strong>{{ event.displayName }}</strong><br /><span class="muted">{{ event.name }}</span></td>
                  <td>{{ eventWindow(event) }}</td>
                  <td><span class="soft-pill">{{ event.status }}</span></td>
                  <td>{{ eventMenus(event.id).length }}</td>
                  <td><RouterLink class="icon-button outlined" :to="adminEventRoute(event)" title="Open event" aria-label="Open event"><i class="bi bi-box-arrow-up-right"></i></RouterLink></td>
                </tr>
                <tr v-if="!vendorEvents.length"><td colspan="5" class="muted">No events yet. Create one from Events.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'vendors' || activeSection === 'vendorWorkspace'" class="stack-layout">
        <div v-if="activeSection === 'vendorWorkspace' && selectedVendor" class="hero-panel">
          <div>
            <p class="eyebrow">Vendor Workspace</p>
            <h3>{{ selectedVendor.displayName }}</h3>
            <p class="hint">{{ selectedVendor.description || 'Reusable owner context for events, menus, items, and QR cards.' }}</p>
          </div>
          <div class="hero-actions">
            <button class="btn btn-primary" @click="openVendorEditor(selectedVendor)">Manage Vendor</button>
            <RouterLink class="btn btn-outline-primary" to="/dashboard/events">Open Events</RouterLink>
          </div>
        </div>
        <div class="panel">
          <div class="panel-heading">
            <div>
              <h3>Vendors</h3>
              <p class="hint">Create vendors only when needed. Existing vendors stay reusable for events, menus, QR cards, and future vendor logins.</p>
            </div>
            <button class="btn btn-primary" @click="openVendorEditor()">New Vendor</button>
          </div>
          <div class="table-wrap">
            <table class="table table-sm align-middle action-table">
              <thead><tr><th>Vendor</th><th>Description</th><th>Created</th><th>Events</th><th>Contact Card</th><th></th></tr></thead>
              <tbody>
                <tr v-for="vendor in vendors" :key="vendor.id" @click="selectVendor(vendor)">
                  <td><strong>{{ vendor.displayName }}</strong><br /><code>{{ vendor.name }}</code></td>
                  <td>{{ vendor.description || 'No description' }}</td>
                  <td>{{ formatDate(vendor.createdAt) }}</td>
                  <td>{{ vendorEventCount(vendor.id) }}</td>
                  <td>{{ vendor.hasContactPage ? 'Active' : 'Inactive' }}</td>
                  <td><button class="btn btn-outline-secondary btn-sm" @click.stop="openVendorEditor(vendor)">Manage</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="showVendorEditor" class="modal-backdrop-custom" @click.self="closeVendorEditor">
          <form class="vendor-modal" @submit.prevent="saveVendor">
            <div class="modal-title-row">
              <div>
                <h3>{{ vendorForm.id ? 'Manage Vendor' : 'Create Vendor' }}</h3>
                <p class="hint">Vendor details and the contact-card QR live together so setup can be verified in one place.</p>
              </div>
              <button class="icon-button" type="button" aria-label="Close" @click="closeVendorEditor"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="vendor-modal-grid">
              <div class="modal-pane">
                <div class="form-grid">
                  <label>Vendor Name<input v-model.trim="vendorForm.displayName" class="form-control" placeholder="Radisson Gurgaon" @blur="fillVendorSlug" /></label>
                  <label>Public identifier<input v-model.trim="vendorForm.name" class="form-control" placeholder="radisson-gurgaon" @input="syncVendorQrDraft" /></label>
                  <p class="hint wide">If this vendor already exists, use a clearer identifier such as city, branch, year, or a short suffix like <code>radisson-gurgaon-02</code>.</p>
                  <label class="wide">Contact Lines<input v-model.trim="vendorContactText" class="form-control" placeholder="Phone, email, website" /></label>
                  <label class="wide">Address<input v-model.trim="vendorForm.address" class="form-control" /></label>
                  <label class="wide">Description<textarea v-model.trim="vendorForm.description" class="form-control" rows="3"></textarea></label>
                  <label class="product-toggle wide" :class="{ selected: vendorForm.hasContactPage }">
                    <input v-model="vendorForm.hasContactPage" type="checkbox" @change="syncVendorQrDraft" />
                    <i class="bi bi-person-vcard"></i>
                    <span>
                      <strong>Add contact card product</strong>
                      <small>Includes vendor public card and a reusable QR mapping when the vendor is saved.</small>
                    </span>
                  </label>
                </div>
                <div class="actions">
                  <button class="btn btn-primary" type="submit" :disabled="loading">
                    <i class="bi bi-check2-circle"></i>
                    Save Vendor
                  </button>
                  <button class="btn btn-outline-secondary" type="button" @click="closeVendorEditor" aria-label="Cancel"><i class="bi bi-x-lg"></i></button>
                </div>
              </div>
              <div class="modal-pane qr-pane">
                <h4>Contact Card QR</h4>
                <p class="hint">Preview stays inactive until the vendor is saved. Saving a contact-card product activates this mapping.</p>
                <div class="preview-box">
                  <div><span>Destination</span><code>{{ vendorQrDraft.url || 'Save a vendor to generate destination' }}</code></div>
                  <label>QR Hash<input v-model.trim="vendorQrDraft.qrHash" class="form-control" placeholder="radisson-gurgaon-card" @input="renderVendorQr" /></label>
                  <div v-if="vendorQrCodeDataUrl && vendorForm.hasContactPage" class="qr-preview-card">
                    <span class="qr-status" :class="{ active: vendorQrIsActive }">
                      <i :class="vendorQrIsActive ? 'bi bi-check-circle-fill' : 'bi bi-clock-history'"></i>
                      {{ vendorQrIsActive ? 'Active reusable QR' : 'Draft QR, activates on save' }}
                    </span>
                    <img class="qr-image" :src="vendorQrCodeDataUrl" alt="Vendor QR code" />
                    <a v-if="vendorQrIsActive" :href="`${originUrl}/${vendorQrDraft.qrHash}`" target="_blank" rel="noreferrer">{{ originUrl }}/{{ vendorQrDraft.qrHash }}</a>
                    <code v-else>{{ originUrl }}/{{ vendorQrDraft.qrHash }}</code>
                  </div>
                  <p v-else class="muted">Add the contact card product to preview and activate the vendor QR.</p>
                  <button class="btn btn-primary btn-sm" type="button" :disabled="!vendorForm.id || !vendorForm.hasContactPage || !vendorQrDraft.qrHash" @click="saveVendorQr">
                    <i class="bi bi-qr-code"></i>
                    Activate QR
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section v-if="activeSection === 'events'" class="stack-layout">
        <div class="panel">
          <div class="panel-heading">
            <div>
              <h3>Events</h3>
              <p class="hint">Create event shells, clone repeat setups later, and keep publishing as the final validation step.</p>
            </div>
            <button class="btn btn-primary" @click="startNewEvent">New Event</button>
          </div>
          <form v-if="showEventEditor" class="inline-editor" @submit.prevent="saveEvent">
            <div class="form-grid">
              <label>Event Name<input v-model.trim="eventForm.displayName" class="form-control" placeholder="Sanya Reception" @blur="fillEventSlug" /></label>
              <label>Public identifier<input v-model.trim="eventForm.name" class="form-control" placeholder="sanya-reception" /></label>
              <label>Active From<input v-model="eventForm.startTime" type="datetime-local" class="form-control" /></label>
              <label>Active To<input v-model="eventForm.endTime" type="datetime-local" class="form-control" /></label>
              <label class="wide">Description<textarea v-model.trim="eventForm.eventDescription" rows="2" class="form-control"></textarea></label>
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit" :disabled="!selectedVendor">Save Event</button>
              <button class="btn btn-outline-secondary" type="button" @click="closeEventEditor">Cancel</button>
            </div>
          </form>
          <div class="table-wrap">
            <table class="table table-sm align-middle action-table">
              <thead><tr><th>Event</th><th>Window</th><th>Status</th><th>Menus</th><th></th></tr></thead>
              <tbody>
                <tr v-for="event in vendorEvents" :key="event.id">
                  <td><strong>{{ event.displayName }}</strong><br /><code>{{ event.name }}</code></td>
                  <td>{{ eventWindow(event) }}</td>
                  <td><span class="badge text-bg-light">{{ event.status }}</span></td>
                  <td>{{ eventMenus(event.id).length }}</td>
                  <td class="row-actions">
                    <RouterLink class="btn btn-outline-secondary btn-sm" :to="adminEventRoute(event)">Open</RouterLink>
                    <button class="btn btn-outline-secondary btn-sm" @click="editEventInline(event)">Edit</button>
                    <RouterLink class="btn btn-outline-primary btn-sm" :to="adminPublishRoute(event)">Publish</RouterLink>
                  </td>
                </tr>
                <tr v-if="!vendorEvents.length"><td colspan="5" class="muted">No events for this vendor yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'eventWorkspace'" class="event-workspace">
        <div v-if="selectedEventForItems" class="hero-panel event-hero">
          <div>
            <p class="eyebrow">Event Workspace</p>
            <h3>{{ selectedEventForItems.displayName }}</h3>
            <p class="hint">{{ eventWindow(selectedEventForItems) }} · {{ selectedEventForItems.status }}</p>
          </div>
          <div class="hero-actions">
            <RouterLink class="btn btn-primary" :to="adminPublishRoute(selectedEventForItems)">Publish Assistant</RouterLink>
            <RouterLink class="btn btn-outline-primary" :to="adminQrSheetRoute(selectedEventForItems)">QR Sheet</RouterLink>
            <RouterLink class="btn btn-outline-secondary" to="/dashboard/menus/studio">Menu Studio</RouterLink>
          </div>
        </div>

          <div v-if="selectedEventForItems" class="workspace-grid">
          <div class="panel">
            <h3>Readiness</h3>
            <ul class="checklist premium-checklist">
              <li v-for="item in eventChecklist(selectedEventForItems)" :key="item.label" :class="{ done: item.done }">
                <i :class="item.done ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
                {{ item.label }}
              </li>
            </ul>
            <div class="payment-gate compact-gate">
              <strong>Products before publish</strong>
              <p>Choose billable products once, then publish. Payment can sit cleanly after this confirmation.</p>
            </div>
          </div>

          <div class="panel wide-panel">
            <div class="panel-heading">
              <div>
                <h3>Linked Menus</h3>
                <p class="hint">Menus attached to this event. Open the studio for visual edits or preview the guest-facing menu.</p>
              </div>
              <RouterLink class="btn btn-outline-primary btn-sm" to="/dashboard/menus/studio">Attach / Design Menu</RouterLink>
            </div>
            <div class="table-wrap">
              <table class="table table-sm align-middle action-table">
                <thead><tr><th>Menu</th><th>Items</th><th>Public URL</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="menu in selectedEventMenus" :key="menu.id">
                    <td><strong>{{ menu.displayName }}</strong><br /><code>{{ menu.name }}</code></td>
                    <td>{{ menuItems(menu.id).length }}</td>
                    <td><a :href="buildAbsolute(menuPathFor(selectedEventForItems, menu))" target="_blank" rel="noreferrer">Open public menu</a></td>
                    <td><RouterLink class="btn btn-outline-secondary btn-sm" :to="adminMenuStudioRoute(menu)">Studio</RouterLink></td>
                  </tr>
                  <tr v-if="!selectedEventMenus.length"><td colspan="4" class="muted">No menus linked yet.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel wide-panel">
            <div class="panel-heading">
              <div>
                <h3>Products For This Event</h3>
                <p class="hint">A single pre-publish tray for features that later become pricing line items.</p>
              </div>
              <RouterLink class="btn btn-primary btn-sm" :to="adminPublishRoute(selectedEventForItems)">
                <i class="bi bi-bag-check"></i>
                Review Products
              </RouterLink>
            </div>
            <div class="product-grid">
              <div v-for="product in eventProducts" :key="product.key" class="product-card" :class="{ selected: product.selected }">
                <i :class="product.icon"></i>
                <div>
                  <strong>{{ product.label }}</strong>
                  <small>{{ product.description }}</small>
                </div>
                <span>{{ product.selected ? 'Selected' : 'Available' }}</span>
              </div>
            </div>
          </div>

          <div class="panel wide-panel">
            <div class="panel-heading">
              <div>
                <h3>QR Sheet Preview</h3>
                <p class="hint">Printable/event-check view with scannable QR previews.</p>
              </div>
              <RouterLink class="btn btn-outline-secondary btn-sm" :to="adminQrSheetRoute(selectedEventForItems)">Open QR Sheet</RouterLink>
            </div>
            <div class="qr-preview-list">
              <QrTargetPreview
                v-for="target in eventQrTargets(selectedEventForItems)"
                :key="target.key"
                :label="target.label"
                :type="target.type"
                :path="target.path"
              />
              <p v-if="!eventQrTargets(selectedEventForItems).length" class="muted">Link a menu to generate QR targets.</p>
            </div>
          </div>
        </div>

        <div v-else class="panel empty-state">
          <h3>Event not found</h3>
          <p class="hint">Choose an event from the event list, or create a new draft.</p>
          <RouterLink class="btn btn-primary" to="/dashboard/events">Back to Events</RouterLink>
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

      <section v-if="activeSection === 'inventory'" class="panel">
        <div class="panel-heading">
          <div>
            <h3>Item Library</h3>
            <p class="hint">All reusable items for the selected vendor. Search, filter, edit inline, and open item analysis from the usage column.</p>
          </div>
          <div class="item-toolbar">
            <button class="btn btn-outline-primary" :disabled="!vendorMenus.length" @click="() => addDraftItemRow(defaultItemMenuId())">Add Row</button>
            <button class="btn btn-primary" :disabled="!dirtyItemRows.length" @click="saveDirtyItemRows">Save Changed Rows</button>
          </div>
        </div>
        <div class="table-filters compact-filters">
          <div class="sheet-search"><i class="bi bi-search"></i><input v-model.trim="itemSearch" class="form-control" placeholder="Search name, identifier, type, or tag" /></div>
          <select v-model.number="itemMenuFilter" class="form-select">
            <option :value="0">All menus</option>
            <option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option>
          </select>
          <select v-model="itemTypeFilter" class="form-select">
            <option value="">All types</option>
            <option v-for="type in itemTypeOptions" :key="type" :value="type">{{ type }}</option>
          </select>
          <button class="btn btn-outline-secondary btn-sm" @click="clearItemFilters">Clear</button>
        </div>

        <div class="table-wrap">
          <table class="table table-sm align-middle editable-table">
            <thead><tr><th>Item</th><th>Slug</th><th>Menu</th><th>Parent</th><th>Type</th><th>Tag</th><th>Used In</th><th>Scans</th><th></th></tr></thead>
            <tbody>
              <tr v-for="row in inventoryRows" :key="row.clientId">
                <td><input v-model.trim="row.displayName" class="form-control" placeholder="Paneer Tikka" @input="markItemDirty(row)" @blur="fillRowSlug(row)" /></td>
                <td><input v-model.trim="row.name" class="form-control" placeholder="paneer-tikka" @input="markItemDirty(row)" /></td>
                <td>
                  <select v-model.number="row.menuId" class="form-select" @change="row.parentId = 0; markItemDirty(row)">
                    <option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option>
                  </select>
                </td>
                <td>
                  <select v-model.number="row.parentId" class="form-select" @change="markItemDirty(row)">
                    <option :value="0">No parent</option>
                    <option v-for="item in parentOptions(row)" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option>
                  </select>
                </td>
                <td><input v-model.trim="row.type" class="form-control" placeholder="item" @input="markItemDirty(row)" /></td>
                <td><input v-model.trim="row.enumType" class="form-control" placeholder="veg" @input="markItemDirty(row)" /></td>
                <td>
                  <button class="link-button" :title="itemUsageTitle(row.id)" @click="openItemAnalytics(row.id)">
                    {{ itemUsage(row.id).menus }} menus / {{ itemUsage(row.id).events }} events
                  </button>
                </td>
                <td><span class="muted">Later</span></td>
                <td>
                  <button v-if="row.isDirty || row.isNew" class="btn btn-primary btn-sm" @click="saveItemRow(row)">Save</button>
                  <span v-else class="saved-state">Saved</span>
                </td>
              </tr>
              <tr v-if="!inventoryRows.length">
                <td colspan="9" class="muted">No items match the current filters.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="activeSection === 'analytics'" class="stack-layout">
        <div class="panel">
          <button class="btn btn-outline-secondary btn-sm mb-3" @click="activeSection = 'inventory'">Back to Item Library</button>
          <h3>{{ selectedAnalyticsItem ? itemLabel(selectedAnalyticsItem) : 'Item Analytics' }}</h3>
          <p class="hint">Usage analysis is wired from current menu/event mappings. Scan count, ratings, and first-added history can plug into this page when those tables exist.</p>
          <table v-if="selectedAnalyticsItem" class="table table-sm align-middle">
            <tbody>
              <tr><td>Slug</td><td><code>{{ selectedAnalyticsItem.name }}</code></td></tr>
              <tr><td>Source menu</td><td>{{ menuName(selectedAnalyticsItem.menuId) }}</td></tr>
              <tr><td>Parent</td><td>{{ parentName(selectedAnalyticsItem.parentId) }}</td></tr>
              <tr><td>Type</td><td>{{ selectedAnalyticsItem.type || 'item' }}</td></tr>
              <tr><td>Rating</td><td>Later</td></tr>
              <tr><td>Scans</td><td>Later</td></tr>
            </tbody>
          </table>
        </div>
        <div class="panel">
          <h3>Used In</h3>
          <table class="table table-sm align-middle">
            <thead><tr><th>Event</th><th>Menu</th><th>Public URL</th></tr></thead>
            <tbody>
              <tr v-for="usage in selectedAnalyticsUsage" :key="`${usage.event.id}-${usage.menu.id}`">
                <td>{{ usage.event.displayName }}</td>
                <td>{{ usage.menu.displayName }}</td>
                <td><a :href="itemPathFor(usage.event, selectedAnalyticsItem!)" target="_blank" rel="noreferrer">Open</a></td>
              </tr>
              <tr v-if="!selectedAnalyticsUsage.length"><td colspan="3" class="muted">No event usage found yet.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="activeSection === 'designer'" class="designer-grid">
        <div class="panel designer-controls">
          <div>
            <h3>Menu Studio</h3>
            <p class="hint">Choose context once, then build from reusable items into a public-like menu canvas.</p>
          </div>
          <div class="designer-ribbon">
            <label>Event<select v-model.number="selectedEventIdForItems" class="form-select"><option :value="0">Select event</option><option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label>Working Menu<select v-model.number="selectedMenuIdForItems" class="form-select"><option :value="0">Select menu</option><option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
            <label>Custom Menu<input v-model.trim="designerMenuName" class="form-control" placeholder="Supreme Custom for Sanya" /></label>
            <button class="product-chip" :class="{ selected: designerFullMenuQr }" @click="designerFullMenuQr = !designerFullMenuQr" type="button">
              <i class="bi bi-qr-code"></i>
              <span>Full-menu QR</span>
            </button>
            <button class="btn btn-primary icon-label" :disabled="!designerMenuName || !selectedVendor" @click="createDesignerMenu">
              <i class="bi bi-plus-lg"></i>
              Create
            </button>
            <button class="btn btn-outline-primary icon-label" :disabled="!selectedEventIdForItems || !selectedMenuIdForItems" @click="linkSelectedMenuToEvent">
              <i class="bi bi-bag-plus"></i>
              Add To Event
            </button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-heading compact-heading">
            <div>
              <h3>Item Library</h3>
              <p class="hint">Click or drag an item into the menu canvas.</p>
            </div>
          </div>
          <div class="sheet-search studio-search"><i class="bi bi-search"></i><input v-model.trim="designerSearch" class="form-control" placeholder="Search items to add" /></div>
          <div class="library-list">
            <button
              v-for="item in availableDesignerItems"
              :key="item.id"
              class="library-row"
              draggable="true"
              @dragstart="dragLibraryItem(item)"
              @click="copyItemToDesignedMenu(item)"
            >
              <span><strong>{{ itemLabel(item) }}</strong><small>{{ menuName(item.menuId) }} · {{ item.type || 'item' }}</small></span>
              <i class="bi bi-plus-lg"></i>
            </button>
          </div>
        </div>

        <div class="panel menu-render" @dragover.prevent @drop="dropOnMenuRoot">
          <div class="panel-heading">
            <div>
              <h3>{{ selectedMenuForItems?.displayName || 'Select a menu' }}</h3>
              <p class="hint">Preview-first canvas. Use the structure rail only when you need to re-parent or fine tune.</p>
            </div>
            <div class="actions slim-actions">
              <button class="icon-button outlined" :disabled="!selectedMenuForItems" title="Add item" aria-label="Add item" @click="showQuickMenuItem = !showQuickMenuItem"><i class="bi bi-plus-lg"></i></button>
              <RouterLink class="icon-button outlined" :class="{ disabled: !selectedMenuForItems }" :to="selectedMenuForItems ? adminMenuPreviewRoute(selectedMenuForItems) : '/dashboard/menus/studio'" title="Open preview" aria-label="Open preview"><i class="bi bi-phone"></i></RouterLink>
            </div>
          </div>
          <form v-if="showQuickMenuItem && selectedMenuForItems" class="quick-add-row" @submit.prevent="createQuickMenuItem">
            <input v-model.trim="quickItem.displayName" class="form-control" placeholder="Item or category name" @blur="quickItem.name = quickItem.name || slugify(quickItem.displayName)" />
            <select v-model.number="quickItem.parentId" class="form-select">
              <option :value="0">No parent</option>
              <option v-for="item in selectedMenuItems" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option>
            </select>
            <input v-model.trim="quickItem.type" class="form-control" placeholder="type" />
            <input v-model.trim="quickItem.enumType" class="form-control" placeholder="tag" />
            <button class="btn btn-primary" type="submit">Save</button>
          </form>
          <div class="studio-live-preview">
            <div class="phone-shell studio-phone" @dragover.prevent @drop="dropOnMenuRoot">
              <p class="eyebrow">{{ selectedEventForItems?.displayName || 'Event Preview' }}</p>
              <h3>{{ selectedMenuForItems?.displayName || 'Menu Preview' }}</h3>
              <MenuTree
                v-for="item in selectedMenuTree"
                :key="item.id"
                :item="item"
                :level="0"
                :event-name="selectedEventForItems?.name || ''"
                :menu-name="selectedMenuForItems?.name || ''"
              />
              <p v-if="!selectedMenuItems.length" class="muted">Drop library items here or add a new item.</p>
            </div>

            <div class="structure-panel">
              <div class="structure-heading">
                <strong>Structure</strong>
                <small>Drag items here to change parents.</small>
              </div>
          <div class="admin-tree">
            <div v-for="item in selectedMenuTree" :key="item.id" class="tree-root">
              <div class="admin-tree-row" draggable="true" @dragstart="dragDesignedItem(item)" @dragover.prevent @drop.stop="dropOnDesignedItem(item)">
                <span><i class="bi bi-grip-vertical"></i> <strong>{{ itemLabel(item) }}</strong></span>
                <small>{{ item.type || 'item' }} · {{ childCount(item) }} children</small>
                <button class="btn btn-outline-secondary btn-sm" @click="setItemParent(item, null)">Root</button>
              </div>
              <textarea v-model="designerNotes[item.id]" class="form-control admin-note" rows="1" placeholder="Private admin/vendor note"></textarea>
              <div class="tree-children-admin">
                <div
                  v-for="child in item.subCategoryLineItems"
                  :key="child.id"
                  class="admin-tree-row child"
                  draggable="true"
                  @dragstart="dragDesignedItem(child)"
                  @dragover.prevent
                  @drop.stop="dropOnDesignedItem(child)"
                >
                  <span><i class="bi bi-grip-vertical"></i> {{ itemLabel(child) }}</span>
                  <small>{{ child.enumType || child.type }}</small>
                  <button class="btn btn-outline-secondary btn-sm" @click="setItemParent(child, item.id)">Move here</button>
                </div>
              </div>
            </div>
            <p v-if="!selectedMenuItems.length" class="muted">No items in this menu yet. Add from the library or create rows in Item Library.</p>
          </div>
            </div>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'preview'" class="preview-layout">
        <div class="panel">
          <h3>Preview Menu</h3>
          <div class="form-grid">
            <label>Event<select v-model.number="selectedEventIdForItems" class="form-select"><option :value="0">Select event</option><option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label>Menu<select v-model.number="selectedMenuIdForItems" class="form-select"><option :value="0">Select menu</option><option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
          </div>
          <div class="actions">
            <a v-if="selectedEventForItems && selectedMenuForItems" class="btn btn-outline-primary" :href="menuPreviewUrl" target="_blank" rel="noreferrer">Open Public Menu</a>
            <button class="btn btn-primary" :disabled="!selectedEventForItems || !selectedMenuForItems" @click="activeSection = 'publish'">Continue To Publish</button>
          </div>
        </div>
        <div class="phone-preview">
          <div class="phone-shell">
            <p class="eyebrow">{{ selectedEventForItems?.displayName || 'Event' }}</p>
            <h3>{{ selectedMenuForItems?.displayName || 'Menu Preview' }}</h3>
            <MenuTree
              v-for="item in selectedMenuTree"
              :key="item.id"
              :item="item"
              :level="0"
              :event-name="selectedEventForItems?.name || ''"
              :menu-name="selectedMenuForItems?.name || ''"
            />
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'publish'" class="publish-grid">
        <div v-if="selectedEventForItems" class="panel wide-panel publish-context">
          <div>
            <p class="eyebrow">Publish Assistant</p>
            <h3>{{ selectedEventForItems.displayName }}</h3>
            <p class="hint">Guided validation for the selected event. Direct event management stays available in the event workspace.</p>
          </div>
            <div class="actions">
              <RouterLink class="btn btn-outline-secondary btn-sm" :to="adminEventRoute(selectedEventForItems)">Event Workspace</RouterLink>
            </div>
        </div>
        <form class="panel" @submit.prevent="saveEvent">
          <h3>Event Design</h3>
          <p class="hint">Create a new event, repeat an existing setup later, then attach menus and publish after validation.</p>
          <div class="form-grid">
            <label>Event Name<input v-model.trim="eventForm.displayName" class="form-control" placeholder="Sanya Reception" @blur="fillEventSlug" /></label>
            <label>Public identifier<input v-model.trim="eventForm.name" class="form-control" placeholder="sanya-reception" /></label>
            <label>Active From<input v-model="eventForm.startTime" type="datetime-local" class="form-control" /></label>
            <label>Active To<input v-model="eventForm.endTime" type="datetime-local" class="form-control" /></label>
            <label class="wide">Description<textarea v-model.trim="eventForm.eventDescription" rows="2" class="form-control"></textarea></label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" :disabled="!selectedVendor">Save Event Draft</button>
          </div>
        </form>

        <div class="panel">
          <h3>Publish Checklist</h3>
          <ul class="checklist">
            <li v-for="item in publishChecklist" :key="item.label" :class="{ done: item.done }">
              <i :class="item.done ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
              {{ item.label }}
            </li>
          </ul>
          <div class="product-cart">
            <div class="cart-title">
              <i class="bi bi-bag-check"></i>
              <strong>Products Before Payment</strong>
            </div>
            <label v-for="product in publishProducts" :key="product.key" class="cart-line" :class="{ selected: product.selected }">
              <input v-model="productSelections[product.key]" type="checkbox" />
              <i :class="product.icon"></i>
              <span>
                <strong>{{ product.label }}</strong>
                <small>{{ product.description }}</small>
              </span>
            </label>
          </div>
          <div class="payment-gate">
            <strong>Future payment gate</strong>
            <p>Payment should happen after this product tray and validation, before making the event active or enabling final QR mappings.</p>
          </div>
          <div class="actions">
            <button class="btn btn-outline-secondary" :disabled="!selectedEventForItems" @click="loadEventIntoForm(selectedEventForItems!)">Edit Selected Event</button>
            <button class="btn btn-primary" :disabled="!canPublish" @click="publishSelectedEvent">Publish Event</button>
          </div>
        </div>

        <div class="panel wide-panel">
          <h3>Post-Publish QR Sheet</h3>
          <p class="hint">After publish, this becomes the printable/clickable list of menu and item QR targets. Timers use the event active window.</p>
          <div class="table-wrap qr-sheet-table">
            <table class="table table-sm align-middle">
              <thead><tr><th>Target</th><th>Type</th><th>Public Path</th><th>Status</th><th>QR / Analytics</th></tr></thead>
              <tbody>
                <tr v-for="menu in selectedEventMenus" :key="`menu-${menu.id}`">
                  <td><strong>{{ menu.displayName }}</strong></td>
                  <td>Menu</td>
                  <td><code>{{ menuPathFor(selectedEventForItems, menu) }}</code></td>
                  <td>{{ eventTimerLabel(selectedEventForItems) }}</td>
                  <td><button class="btn btn-outline-secondary btn-sm" :title="`Menu QR target for ${menu.displayName}`">Preview</button></td>
                </tr>
                <tr v-for="item in selectedEventItems" :key="`item-${item.id}`">
                  <td><strong>{{ itemLabel(item) }}</strong><br /><span class="muted">{{ menuName(item.menuId) }}</span></td>
                  <td>{{ item.type || 'Item' }}</td>
                  <td><code>{{ itemPathFor(selectedEventForItems, item) }}</code></td>
                  <td>{{ eventTimerLabel(selectedEventForItems) }}</td>
                  <td><button class="btn btn-outline-secondary btn-sm" :title="itemUsageTitle(item.id)">Preview</button></td>
                </tr>
                <tr v-if="!selectedEventMenus.length && !selectedEventItems.length"><td colspan="5" class="muted">Select an event with linked menus to preview the QR sheet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'qrSheet'" class="stack-layout">
        <div v-if="selectedEventForItems" class="panel">
          <div class="panel-heading">
            <div>
              <p class="eyebrow">QR Sheet</p>
              <h3>{{ selectedEventForItems.displayName }}</h3>
              <p class="hint">Reference sheet for printing, click-testing, and event readiness checks.</p>
            </div>
            <div class="actions">
              <RouterLink class="btn btn-outline-secondary btn-sm" :to="adminEventRoute(selectedEventForItems)">Event Workspace</RouterLink>
            </div>
          </div>
          <div class="qr-sheet-grid">
            <QrTargetPreview
              v-for="target in eventQrTargets(selectedEventForItems)"
              :key="target.key"
              :label="target.label"
              :type="target.type"
              :path="target.path"
            />
            <p v-if="!eventQrTargets(selectedEventForItems).length" class="muted">No menu or item targets yet.</p>
          </div>
        </div>
        <div v-else class="panel empty-state">
          <h3>QR sheet unavailable</h3>
          <p class="hint">Open a specific event first.</p>
          <RouterLink class="btn btn-primary" to="/dashboard/events">Back to Events</RouterLink>
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
          <h3>QR Studio</h3>
          <p class="hint">Start with what should be scannable. The reusable hash and destination stay visible for verification.</p>
          <div class="qr-target-tabs">
            <button type="button" :class="{ active: qrTargetType === 'vendor' }" @click="qrTargetType = 'vendor'">Vendor Card</button>
            <button type="button" :class="{ active: qrTargetType === 'menu' }" @click="qrTargetType = 'menu'">Full Menu</button>
            <button type="button" :class="{ active: qrTargetType === 'item' }" @click="qrTargetType = 'item'">Specific Item</button>
            <button type="button" :class="{ active: qrTargetType === 'custom' }" @click="qrTargetType = 'custom'">Custom</button>
          </div>
          <div class="form-grid">
            <label>QR Hash<input v-model.trim="qrForm.qrHash" class="form-control" placeholder="radisson-gurgaon-card" /></label>
            <label>Target<select v-model="qrTargetType" class="form-select"><option value="vendor">Vendor Contact Card</option><option value="menu">Event Menu</option><option value="item">Event Item</option><option value="custom">Custom Path</option></select></label>
            <label v-if="qrTargetType !== 'vendor' && qrTargetType !== 'custom'">Event<select v-model.number="qrForm.eventId" class="form-select"><option :value="0">Select event</option><option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label v-if="qrTargetType === 'menu'">Menu<select v-model.number="qrForm.menuId" class="form-select"><option :value="0">Select menu</option><option v-for="menu in menusForQrEvent" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
            <label v-if="qrTargetType === 'item'">Item<select v-model.number="qrForm.itemId" class="form-select"><option :value="0">Select item</option><option v-for="item in itemsForQrEvent" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option></select></label>
            <label class="wide">Destination URL<input v-model.trim="qrForm.url" class="form-control" placeholder="/vendor/radisson-gurgaon" /></label>
            <label class="check"><input v-model="qrForm.isActive" type="checkbox" /> Active</label>
          </div>
          <div class="preview-box" v-if="qrPreview.shortQrUrl || qrPreview.finalPublicUrl">
            <div><span>Short QR URL</span><a :href="qrPreview.shortQrUrl" target="_blank" rel="noreferrer">{{ qrPreview.shortQrUrl }}</a></div>
            <div><span>Final URL</span><a :href="qrPreview.finalPublicUrl" target="_blank" rel="noreferrer">{{ qrPreview.finalPublicUrl }}</a></div>
            <img v-if="qrCodeDataUrl" class="qr-image" :src="qrCodeDataUrl" alt="QR code" />
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
import QRCode from 'qrcode';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import QrTargetPreview from '../components/admin/QrTargetPreview.vue';
import WorkspaceSwitcher from '../components/admin/WorkspaceSwitcher.vue';
import MenuTree from '../components/MenuTree.vue';
import { API_BASE_URL } from '../config';

type SectionKey = 'home' | 'vendors' | 'vendorWorkspace' | 'events' | 'eventWorkspace' | 'qrSheet' | 'inventory' | 'analytics' | 'designer' | 'preview' | 'publish' | 'qr' | 'menus' | 'items';
type Vendor = { id: number; name: string; displayName: string; description?: string; contact: string[]; address?: string; hasContactPage: boolean; createdAt?: string };
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
  { key: 'inventory', label: 'Item Library', icon: 'bi bi-box-seam' },
  { key: 'designer', label: 'Menu Studio', icon: 'bi bi-layout-three-columns' },
  { key: 'publish', label: 'Publish Assistant', icon: 'bi bi-send-check' },
  { key: 'qr', label: 'QR Studio', icon: 'bi bi-qr-code' },
] as const;

const route = useRoute();
const router = useRouter();

const dashboardRouteBySection: Record<SectionKey, string> = {
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

function sectionFromPath(path: string): SectionKey {
  if (/^\/dashboard\/vendors\/\d+/.test(path)) return 'vendorWorkspace';
  if (path.startsWith('/dashboard/vendors')) return 'vendors';
  if (/^\/dashboard\/events\/\d+\/qr-sheet/.test(path)) return 'qrSheet';
  if (/^\/dashboard\/events\/\d+\/publish/.test(path)) return 'publish';
  if (/^\/dashboard\/events\/\d+/.test(path)) return 'eventWorkspace';
  if (path === '/dashboard/events') return 'events';
  if (path.startsWith('/dashboard/items/')) return 'analytics';
  if (path.startsWith('/dashboard/items')) return 'inventory';
  if (/^\/dashboard\/menus\/\d+\/preview/.test(path)) return 'preview';
  if (path.startsWith('/dashboard/menus/preview')) return 'preview';
  if (path.startsWith('/dashboard/menus')) return 'designer';
  if (path.startsWith('/dashboard/events/publish')) return 'publish';
  if (path.startsWith('/dashboard/qr')) return 'qr';
  return 'home';
}

const activeSection = computed<SectionKey>({
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
const designerMenuName = ref('');
const designerFullMenuQr = ref(false);
const designerNotes = reactive<Record<number, string>>({});
const designerSearch = ref('');
const itemSearch = ref('');
const itemMenuFilter = ref(0);
const itemTypeFilter = ref('');
const selectedAnalyticsItemId = ref<number | null>(null);
const draggedLibraryItemId = ref<number | null>(null);
const draggedDesignedItemId = ref<number | null>(null);
let alertTimer: number | undefined;

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
const qrCodeDataUrl = ref('');
const vendorQrCodeDataUrl = ref('');
const itemRows = ref<DraftItem[]>([]);

const vendorForm = reactive<any>({ id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false });
const eventForm = reactive<any>({ id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
const menuForm = reactive<any>({ id: null, name: '', displayName: '', description: '', isActive: true });
const linkForm = reactive({ eventId: 0, menuId: 0 });
const qrForm = reactive<any>({ qrHash: '', url: '', isActive: true, eventId: 0, menuId: 0, itemId: 0 });
const vendorQrDraft = reactive({ qrHash: '', url: '' });
const productSelections = reactive<Record<string, boolean>>({
  contactCard: false,
  fullMenuQr: false,
  itemQrSheet: true,
  menuPreview: true,
});
const adhocForm = reactive({ parentId: 0, name: '', displayName: '', customMenuDisplayName: '', addToSourceMenu: false });
const importForm = reactive({ menuId: 0, itemId: 0, customMenuDisplayName: '', destination: 'source' as 'source' | 'adhoc' | 'both' });
const quickItem = reactive({ parentId: 0, name: '', displayName: '', type: 'item', enumType: '' });

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
  if (!selectedAnalyticsItem.value) return [];
  return events.value.flatMap((event) => eventMenus(event.id)
    .filter((menu) => menu.id === selectedAnalyticsItem.value!.menuId)
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
const vendorQrIsActive = computed(() => Boolean(
  vendorForm.id
  && vendorForm.hasContactPage
  && vendorQrDraft.qrHash
  && qrMappings.value.some((mapping) => mapping.qrHash === vendorQrDraft.qrHash && mapping.url === vendorQrDraft.url && mapping.isActive)
));
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
    description: selectedMenuForItems.value ? `Create one QR for ${selectedMenuForItems.value.displayName}.` : 'Select a menu to offer a full-menu QR.',
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
  const contextual: Partial<Record<SectionKey, string>> = {
    vendorWorkspace: selectedVendor.value?.displayName || 'Vendor Workspace',
    eventWorkspace: selectedEventForItems.value?.displayName || 'Event Workspace',
    qrSheet: 'Event QR Sheet',
    analytics: selectedAnalyticsItem.value ? itemLabel(selectedAnalyticsItem.value) : 'Item Analytics',
    preview: selectedMenuForItems.value ? `${selectedMenuForItems.value.displayName} Preview` : 'Menu Preview',
  };
  return contextual[activeSection.value] || sections.find((section) => section.key === activeSection.value)?.label || 'Admin';
});
const activeSubtitle = computed(() => {
  const copy: Record<SectionKey, string> = {
    home: 'Work from a selected vendor and move through setup without losing context.',
    vendors: 'Create vendors, activate contact cards, and generate vendor QR mappings.',
    vendorWorkspace: 'Manage vendor details, contact-card product, and reusable ownership context.',
    inventory: 'Manage reusable vendor items before they are assembled into menus.',
    analytics: 'Inspect where an item is used and leave space for scans, ratings, and first-added history.',
    designer: 'Assemble event-ready menus from existing items, adhoc items, and custom menu copies.',
    preview: 'Review the menu as guests will see it before QR mapping or publish.',
    publish: 'Validate event setup and keep the future payment checkpoint in one place.',
    events: 'Create events under the selected vendor. Events do not need standalone QR codes.',
    eventWorkspace: 'Operate one event: menus, products, QR readiness, previews, and publish state.',
    qrSheet: 'Printable and testable menu/item QR target sheet for one event.',
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
  window.clearTimeout(alertTimer);
  alertTimer = window.setTimeout(() => { message.value = ''; }, 4000);
}

function setError(err: any) {
  const raw = err.response?.data?.message ?? err.message ?? 'Something went wrong';
  error.value = raw.includes('already exists')
    ? `${raw} Try a more specific slug or add a short suffix.`
    : raw;
  message.value = '';
  window.clearTimeout(alertTimer);
  alertTimer = window.setTimeout(() => { error.value = ''; }, 7000);
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
  const existingRows = vendorItems.value.map(toItemRow);
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
    hydrateRouteContext();
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

function formatDate(value?: string) {
  if (!value) return 'Later';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function eventWindow(event: EventRow) {
  if (!event.startTime && !event.endTime) return 'Dates not set';
  return `${formatDate(event.startTime)} - ${formatDate(event.endTime)}`;
}

function vendorEventCount(vendorId: number) {
  return events.value.filter((event) => event.vendorId === vendorId).length;
}

function clearItemFilters() {
  itemSearch.value = '';
  itemMenuFilter.value = 0;
  itemTypeFilter.value = '';
}

function isNavActive(section: SectionKey) {
  if (activeSection.value === section) return true;
  if (activeSection.value === 'analytics' && section === 'inventory') return true;
  if ((activeSection.value === 'eventWorkspace' || activeSection.value === 'qrSheet') && section === 'events') return true;
  if (activeSection.value === 'vendorWorkspace' && section === 'vendors') return true;
  return false;
}

function adminEventRoute(event: EventRow) {
  return `/dashboard/events/${event.id}`;
}

function adminPublishRoute(event: EventRow) {
  return `/dashboard/events/${event.id}/publish`;
}

function adminQrSheetRoute(event: EventRow) {
  return `/dashboard/events/${event.id}/qr-sheet`;
}

function adminMenuStudioRoute(menu: MenuRow) {
  return `/dashboard/menus/${menu.id}/studio`;
}

function adminMenuPreviewRoute(menu: MenuRow) {
  return `/dashboard/menus/${menu.id}/preview`;
}

function menuItems(menuId: number) {
  return items.value.filter((item) => item.menuId === menuId);
}

function defaultItemMenuId() {
  return itemMenuFilter.value || selectedMenuIdForItems.value || vendorMenus.value[0]?.id || 0;
}

function eventChecklist(event: EventRow) {
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

function eventQrTargets(event: EventRow) {
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
    }
  }

  if (menuId) {
    const menu = menus.value.find((row) => row.id === menuId);
    if (menu) {
      selectedVendorId.value = menu.vendorId;
      selectedMenuIdForItems.value = menu.id;
      const linkedEvent = events.value.find((event) => eventMenus(event.id).some((linkedMenu) => linkedMenu.id === menu.id));
      if (linkedEvent) selectedEventIdForItems.value = linkedEvent.id;
    }
  }

  selectedAnalyticsItemId.value = itemId || null;
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

function openVendorEditor(vendor?: Vendor) {
  if (vendor) {
    editVendor(vendor);
  } else {
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
  vendorQrDraft.qrHash = '';
  vendorQrDraft.url = '';
  vendorQrCodeDataUrl.value = '';
}

function editVendor(vendor: Vendor) {
  Object.assign(vendorForm, vendor);
  vendorContactText.value = vendor.contact?.join(', ') ?? '';
  selectedVendorId.value = vendor.id;
  showVendorEditor.value = true;
  activeSection.value = 'vendors';
  syncVendorQrDraft();
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
    const payload = { ...vendorForm, contact: vendorContactText.value.split(',').map((value) => value.trim()).filter(Boolean) };
    const { data } = vendorForm.id
      ? await axios.put<Vendor>(adminUrl(`/vendors/${vendorForm.id}`), payload)
      : await axios.post<Vendor>(adminUrl('/vendors'), payload);
    selectedVendorId.value = data.id;
    Object.assign(vendorForm, normalizeVendor(data));
    await syncVendorQrDraft();
    if (vendorForm.hasContactPage) {
      await saveVendorQrMapping();
    }
    await loadAll();
    editVendor(data);
    setNotice(vendorForm.hasContactPage ? 'Vendor and contact-card QR saved' : 'Vendor saved');
  } catch (err) {
    setError(err);
  }
}

async function prepareVendorQr(vendorArg?: Vendor) {
  const vendor = vendorArg || vendors.value.find((row) => row.id === vendorForm.id) || selectedVendor.value;
  if (!vendor) return setError(new Error('Select or save a vendor first'));
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
  } catch (err) {
    setError(err);
  }
}

async function saveVendorQrMapping() {
  if (!vendorForm.id) throw new Error('Save the vendor before activating the QR');
  if (!vendorForm.hasContactPage) throw new Error('Add the contact card product before activating this QR');
  await syncVendorQrDraft();
  requireSlug(vendorQrDraft.qrHash, 'QR hash');
  await axios.post(adminUrl('/qr-mappings'), { qrHash: vendorQrDraft.qrHash, url: vendorQrDraft.url, isActive: true });
}

function resetEvent() {
  Object.assign(eventForm, { id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
}

function editEvent(event: EventRow) {
  Object.assign(eventForm, { ...event, startTime: toDateTimeLocal(event.startTime), endTime: toDateTimeLocal(event.endTime) });
}

function startNewEvent() {
  resetEvent();
  showEventEditor.value = true;
}

function editEventInline(event: EventRow) {
  editEvent(event);
  showEventEditor.value = true;
}

function closeEventEditor() {
  showEventEditor.value = false;
  resetEvent();
}

async function saveEvent() {
  try {
    if (!selectedVendor.value) throw new Error('Select or create a vendor before creating an event');
    fillEventSlug();
    requireSlug(eventForm.name, 'Event slug');
    const payload = { ...eventForm, vendorId: selectedVendorId.value };
    const { data } = eventForm.id
      ? await axios.put<EventRow>(adminUrl(`/events/${eventForm.id}`), payload)
      : await axios.post<EventRow>(adminUrl('/events'), payload);
    resetEvent();
    await loadAll();
    const savedEvent = data ? normalizeEvent(data) : events.value.find((event) => event.name === payload.name && event.vendorId === selectedVendorId.value);
    showEventEditor.value = false;
    if (savedEvent && activeSection.value !== 'events') {
      selectedEventIdForItems.value = savedEvent.id;
      router.push(adminEventRoute(savedEvent));
    }
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
  return items.value.filter((item) => item.menuId === row.menuId && item.id !== row.id);
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

async function createQuickMenuItem() {
  try {
    if (!selectedMenuIdForItems.value) throw new Error('Select a working menu first');
    if (!quickItem.displayName.trim()) throw new Error('Add an item name first');
    quickItem.name = quickItem.name || slugify(quickItem.displayName);
    requireSlug(quickItem.name, 'Item slug');
    await axios.post(adminUrl('/items'), {
      menuId: selectedMenuIdForItems.value,
      name: quickItem.name,
      displayName: quickItem.displayName,
      type: quickItem.type || 'item',
      enumType: quickItem.enumType,
      parentId: quickItem.parentId || null,
      isActive: true,
    });
    Object.assign(quickItem, { parentId: 0, name: '', displayName: '', type: 'item', enumType: '' });
    showQuickMenuItem.value = false;
    await loadAll();
    syncItemRows();
    setNotice('Item added to menu');
  } catch (err) {
    setError(err);
  }
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

function menuName(menuId: number) {
  return menus.value.find((menu) => menu.id === menuId)?.displayName || 'Unknown menu';
}

function itemUsage(itemId?: number) {
  if (!itemId) return { menus: 0, events: 0 };
  const item = items.value.find((row) => row.id === itemId);
  if (!item) return { menus: 0, events: 0 };
  const eventsUsed = Object.values(eventMenuMap.value).filter((linkedMenus) => linkedMenus.some((menu) => menu.id === item.menuId)).length;
  return { menus: 1, events: eventsUsed };
}

function itemUsageTitle(itemId?: number) {
  if (!itemId) return 'Save the item before analytics are available';
  const item = items.value.find((row) => row.id === itemId);
  if (!item) return 'Item not found';
  const eventNames = events.value
    .filter((event) => eventMenus(event.id).some((menu) => menu.id === item.menuId))
    .map((event) => event.displayName);
  return eventNames.length ? `Used in ${menuName(item.menuId)} for ${eventNames.join(', ')}` : `Part of ${menuName(item.menuId)}. Not linked to an event yet.`;
}

function openItemAnalytics(itemId?: number) {
  if (!itemId) return;
  selectedAnalyticsItemId.value = itemId;
  router.push(`/dashboard/items/${itemId}`);
}

function buildItemTree(flatItems: ItemRow[]) {
  const map = new Map<number, any>();
  flatItems.forEach((item) => map.set(item.id, { ...item, itemType: item.type, subCategoryLineItems: [] }));
  const roots: any[] = [];
  flatItems.forEach((item) => {
    const node = map.get(item.id);
    if (item.parentId && map.has(item.parentId)) map.get(item.parentId).subCategoryLineItems.push(node);
    else roots.push(node);
  });
  return roots;
}

function childCount(item: any) {
  return item.subCategoryLineItems?.length ?? 0;
}

function dragLibraryItem(item: ItemRow) {
  draggedLibraryItemId.value = item.id;
  draggedDesignedItemId.value = null;
}

function dragDesignedItem(item: ItemRow) {
  draggedDesignedItemId.value = item.id;
  draggedLibraryItemId.value = null;
}

async function dropOnMenuRoot() {
  if (draggedLibraryItemId.value) {
    const item = items.value.find((row) => row.id === draggedLibraryItemId.value);
    if (item) await copyItemToDesignedMenu(item);
  } else if (draggedDesignedItemId.value) {
    const item = items.value.find((row) => row.id === draggedDesignedItemId.value);
    if (item) await setItemParent(item, null);
  }
  draggedLibraryItemId.value = null;
  draggedDesignedItemId.value = null;
}

async function dropOnDesignedItem(target: ItemRow) {
  if (draggedLibraryItemId.value) {
    const item = items.value.find((row) => row.id === draggedLibraryItemId.value);
    if (item) {
      await copyItemToDesignedMenu(item, target.id);
    }
  } else if (draggedDesignedItemId.value && draggedDesignedItemId.value !== target.id) {
    const item = items.value.find((row) => row.id === draggedDesignedItemId.value);
    if (item) await setItemParent(item, target.id);
  }
  draggedLibraryItemId.value = null;
  draggedDesignedItemId.value = null;
}

async function setItemParent(item: ItemRow, parentId: number | null) {
  try {
    if (parentId === item.id) throw new Error('An item cannot be its own parent');
    await axios.put(adminUrl(`/items/${item.id}`), { ...item, parentId });
    await loadAll();
    syncItemRows();
    setNotice('Menu nesting updated');
  } catch (err) {
    setError(err);
  }
}

async function createDesignerMenu() {
  try {
    if (!selectedVendor.value) throw new Error('Select a vendor before creating a menu');
    const name = slugify(designerMenuName.value);
    requireSlug(name, 'Menu slug');
    const { data } = await axios.post<MenuRow>(adminUrl('/menus'), {
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
  } catch (err) {
    setError(err);
  }
}

async function linkSelectedMenuToEvent() {
  try {
    if (!selectedEventIdForItems.value || !selectedMenuIdForItems.value) throw new Error('Select an event and menu first');
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
  } catch (err) {
    setError(err);
  }
}

async function copyItemToDesignedMenu(item: ItemRow, parentId: number | null = null) {
  try {
    if (!selectedMenuIdForItems.value) throw new Error('Select a working menu first');
    await axios.post(adminUrl('/items'), { ...cloneItemPayload(item, selectedMenuIdForItems.value), parentId });
    await loadAll();
    syncItemRows();
    setNotice(`${itemLabel(item)} added to ${selectedMenuForItems.value?.displayName || 'menu'}`);
  } catch (err) {
    setError(err);
  }
}

function loadEventIntoForm(event: EventRow) {
  selectedEventIdForItems.value = event.id;
  editEvent(event);
}

async function publishSelectedEvent() {
  try {
    const event = selectedEventForItems.value;
    if (!event) throw new Error('Select an event to publish');
    await axios.put(adminUrl(`/events/${event.id}`), { ...event, status: 'active' });
    await loadAll();
    setNotice('Event published. Payment gate will be inserted here before activation later.');
  } catch (err) {
    setError(err);
  }
}

function menuPathFor(event?: EventRow, menu?: MenuRow) {
  if (!event || !menu) return '';
  return `/event/${event.name}/menu/${menu.name}`;
}

function itemPathFor(event: EventRow | undefined, item: ItemRow) {
  if (!event) return '';
  const menu = menus.value.find((row) => row.id === item.menuId);
  return menu ? `/event/${event.name}/menu/${menu.name}/item/${item.name}` : '';
}

function eventTimerLabel(event?: EventRow) {
  if (!event?.startTime || !event?.endTime) return 'Timer available after dates are set';
  const now = Date.now();
  const start = new Date(event.startTime).getTime();
  const end = new Date(event.endTime).getTime();
  if (now < start) return 'Starts later';
  if (now > end) return 'Ended';
  return 'Live now';
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
    qrCodeDataUrl.value = qrPreview.shortQrUrl ? await QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }) : '';
  } catch (err) {
    setError(err);
  }
}

function editQr(mapping: QrMapping) {
  Object.assign(qrForm, { qrHash: mapping.qrHash, url: mapping.url, isActive: mapping.isActive, eventId: 0, menuId: 0, itemId: 0 });
  qrPreview.shortQrUrl = mapping.shortQrUrl;
  qrPreview.finalPublicUrl = mapping.finalPublicUrl;
  QRCode.toDataURL(mapping.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
  qrTargetType.value = 'custom';
}

async function saveQr() {
  try {
    requireSlug(qrForm.qrHash, 'QR hash');
    if (!qrForm.url) await buildQrDestination();
    const { data } = await axios.post<QrMapping>(adminUrl('/qr-mappings'), { qrHash: qrForm.qrHash, url: qrForm.url, isActive: qrForm.isActive });
    qrPreview.shortQrUrl = data.shortQrUrl;
    qrPreview.finalPublicUrl = data.finalPublicUrl;
    qrCodeDataUrl.value = await QRCode.toDataURL(data.shortQrUrl, { margin: 1, width: 180 });
    await loadAll();
    setNotice('QR mapping saved');
  } catch (err) {
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
  if (qrPreview.shortQrUrl) QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
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
</script>

<style scoped>
.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: #f7f2ea;
  color: #2f2a24;
  font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.admin-sidebar {
  background: #171512;
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
  font-family: inherit;
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
  text-decoration: none;
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
  color: #6f665c;
  font-size: 0.88rem;
}

.metric-card,
.panel,
.adhoc-box {
  background: #fffcf7;
  border: 1px solid #e8dccb;
  border-radius: 6px;
  box-shadow: 0 10px 30px rgba(42, 34, 24, 0.045);
  padding: 16px;
}

.btn,
.form-control,
.form-select {
  border-radius: 5px;
  font-family: inherit;
}

.btn {
  align-items: center;
  display: inline-flex;
  gap: 7px;
  justify-content: center;
  text-decoration: none;
}

.btn-primary {
  background: #b98f56;
  border-color: #b98f56;
  color: #171512;
}

.btn-primary:hover {
  background: #9f743d;
  border-color: #9f743d;
  color: #fff;
}

.btn-outline-primary,
.btn-outline-secondary {
  border-color: #9f743d;
  color: #8b5527;
}

.btn-outline-primary:hover,
.btn-outline-secondary:hover {
  background: #9f743d;
  border-color: #9f743d;
  color: #fff;
}

.header-actions {
  align-items: center;
  display: flex;
  gap: 12px;
}

.workspace-switcher {
  align-items: center;
  background: #fff;
  border: 1px solid #e6dfd4;
  border-radius: 999px;
  display: flex;
  gap: 10px;
  padding: 6px 8px 6px 12px;
}

.workspace-switcher span {
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
}

.workspace-switcher select {
  border: 0;
  min-width: 190px;
}

.workspace-switcher a,
.admin-main a.btn,
.nav-button {
  text-decoration: none;
}

.context-chip {
  background: #f4f1ed;
  border: 1px solid #e6dfd4;
  border-radius: 999px;
  color: #6d4c24;
  font-size: 0.8rem;
  font-weight: 800;
  padding: 6px 10px;
}

label {
  display: grid;
  gap: 6px;
  font-size: 0.82rem;
  color: #443a31;
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

.home-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.7fr);
}

.command-center,
.home-workspace,
.event-workspace,
.workspace-grid {
  display: grid;
  gap: 16px;
}

.home-workspace {
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
}

.home-intro {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 18px;
}

.home-intro h3 {
  font-family: inherit;
  font-size: 1.2rem;
  font-weight: 900;
}

.home-actions,
.row-actions,
.slim-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.home-summary {
  align-self: start;
}

.work-stack {
  display: grid;
  gap: 8px;
}

.work-row,
.icon-action {
  align-items: center;
  background: #fbf6ef;
  border: 1px solid #e7d7c0;
  border-radius: 5px;
  color: #3a3026;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 10px 12px;
  text-decoration: none;
}

.work-row:hover,
.icon-action:hover {
  border-color: #c49a63;
  color: #171512;
}

.work-row i,
.icon-action i {
  color: #9f743d;
}

.work-row span {
  flex: 1;
}

.icon-action {
  justify-content: center;
}

.icon-action.primary {
  background: #b98f56;
  border-color: #b98f56;
  color: #171512;
}

.icon-action.primary i {
  color: #171512;
}

.soft-pill {
  background: #f7efe3;
  border: 1px solid #ead8bd;
  border-radius: 5px;
  color: #7a542a;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 800;
  padding: 4px 9px;
}

.command-center {
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
}

.command-center .hero-panel,
.command-center > .panel:nth-of-type(2) {
  grid-column: 1 / -1;
}

.hero-panel {
  align-items: center;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.98), rgba(250,247,241,0.94)),
    radial-gradient(circle at 15% 20%, rgba(189,148,90,0.18), transparent 32%);
  border: 1px solid #e4d7c5;
  border-radius: 6px;
  box-shadow: 0 18px 45px rgba(21, 25, 30, 0.07);
  display: flex;
  justify-content: space-between;
  gap: 20px;
  padding: 22px;
}

.hero-panel h3 {
  font-family: inherit;
  font-size: 1.35rem;
  font-weight: 900;
  margin: 0;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.workspace-grid {
  grid-template-columns: minmax(300px, 0.75fr) minmax(320px, 1fr);
}

.action-table tbody tr {
  cursor: default;
}

.analytics-panel {
  align-self: start;
}

.metric-card span {
  display: block;
  color: #6b7280;
  font-size: 0.9rem;
}

.metric-card strong {
  font-size: 2rem;
}

.workflow-card {
  background: #fff;
  border: 1px solid #e6dfd4;
  border-radius: 8px;
  padding: 16px;
}

.workflow-card span {
  align-items: center;
  background: #15191e;
  border-radius: 999px;
  color: #fff;
  display: inline-flex;
  font-weight: 800;
  height: 26px;
  justify-content: center;
  margin-bottom: 10px;
  width: 26px;
}

.workflow-card strong {
  display: block;
  margin-bottom: 4px;
}

.workflow-card p,
.payment-note,
.payment-gate p {
  color: #6b7280;
  font-size: 0.88rem;
  margin: 0;
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

.compact-filters {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(260px, 1fr) minmax(150px, 210px) minmax(130px, 180px) auto;
  margin-bottom: 10px;
}

.sheet-search {
  position: relative;
}

.sheet-search i {
  color: #6b7280;
  left: 12px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.sheet-search input {
  padding-left: 34px;
}

.compact-heading {
  margin-bottom: 8px;
}

.studio-search {
  margin-bottom: 10px;
}

.inline-editor,
.quick-add-row {
  background: #fbfaf8;
  border: 1px solid #ece4d8;
  border-radius: 5px;
  margin-bottom: 14px;
  padding: 14px;
}

.quick-add-row {
  align-items: end;
  display: grid;
  gap: 10px;
  grid-template-columns: minmax(180px, 1fr) minmax(160px, 220px) minmax(100px, 140px) minmax(100px, 140px) auto;
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
  border-radius: 5px;
  padding: 12px;
  display: grid;
  gap: 8px;
}

.modal-backdrop-custom {
  align-items: center;
  background: rgba(21, 25, 30, 0.52);
  display: flex;
  inset: 0;
  justify-content: center;
  padding: 24px;
  position: fixed;
  z-index: 50;
}

.vendor-modal {
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 24px 70px rgba(21, 25, 30, 0.28);
  max-height: calc(100vh - 48px);
  max-width: 1120px;
  overflow: auto;
  padding: 20px;
  width: min(100%, 1120px);
}

.modal-title-row {
  align-items: start;
  border-bottom: 1px solid #ece7de;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
}

.icon-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #15191e;
  display: inline-flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.icon-button.outlined {
  border: 1px solid #d8bd8f;
  color: #8b5527;
  text-decoration: none;
}

.icon-button.outlined:hover {
  background: #f7efe3;
}

.icon-button.small {
  height: 28px;
  width: 28px;
}

.icon-button:hover {
  background: #f4f1ed;
}

.vendor-modal-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
}

.modal-pane {
  min-width: 0;
}

.qr-pane {
  background: #fbfaf8;
  border: 1px solid #e6dfd4;
  border-radius: 5px;
  padding: 14px;
}

.qr-pane h4 {
  font-family: inherit;
  font-size: 1rem;
  font-weight: 900;
  margin: 0 0 4px;
}

.qr-preview-card {
  align-items: start;
  display: grid;
  gap: 10px;
  justify-items: start;
}

.qr-status {
  align-items: center;
  background: #fff8ed;
  border: 1px solid #e7d7c0;
  border-radius: 5px;
  color: #8b5527;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 800;
  gap: 6px;
  padding: 5px 8px;
}

.qr-status.active {
  background: #eef7ec;
  border-color: #b9d7b2;
  color: #39681c;
}

.product-toggle {
  align-items: center;
  background: #fbf6ef;
  border: 1px solid #e7d7c0;
  border-radius: 5px;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: auto auto 1fr;
  padding: 12px;
}

.product-toggle input {
  margin: 0;
}

.product-toggle i {
  color: #9f743d;
  font-size: 1.2rem;
}

.product-toggle small,
.product-card small,
.cart-line small {
  color: #74695d;
  display: block;
  font-weight: 500;
}

.product-toggle.selected,
.product-card.selected,
.cart-line.selected {
  background: #fff8ed;
  border-color: #c49a63;
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

.designer-grid,
.preview-layout,
.publish-grid {
  display: grid;
  gap: 16px;
}

.designer-grid {
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
}

.designer-controls {
  align-self: start;
  grid-column: 1 / -1;
}

.designer-ribbon {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(180px, 1fr)) auto auto auto;
  margin-top: 12px;
}

.compact-check {
  padding-top: 0;
}

.product-chip {
  align-items: center;
  background: #fbf6ef;
  border: 1px solid #e7d7c0;
  border-radius: 5px;
  color: #6d4c24;
  display: inline-flex;
  gap: 8px;
  min-height: 38px;
  padding: 8px 12px;
}

.product-chip.selected {
  background: #fff8ed;
  border-color: #b98f56;
  color: #171512;
}

.icon-label i,
.product-chip i {
  font-size: 0.95rem;
}

.payment-note,
.payment-gate {
  background: #fff8ed;
  border: 1px solid #ead2ad;
  border-radius: 5px;
  margin-top: 14px;
  padding: 10px;
}

.compact-gate {
  margin-top: 0;
}

.product-grid,
.product-cart {
  display: grid;
  gap: 10px;
}

.product-grid {
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.product-card,
.cart-line {
  align-items: center;
  background: #fbf6ef;
  border: 1px solid #e7d7c0;
  border-radius: 5px;
  display: grid;
  gap: 10px;
  grid-template-columns: auto 1fr auto;
  padding: 12px;
}

.product-card > i,
.cart-line > i,
.cart-title i {
  color: #9f743d;
  font-size: 1.15rem;
}

.product-card > span {
  color: #8b5527;
  font-size: 0.78rem;
  font-weight: 800;
}

.product-cart {
  margin-top: 16px;
}

.cart-title {
  align-items: center;
  display: flex;
  gap: 8px;
}

.cart-line {
  cursor: pointer;
  grid-template-columns: auto auto 1fr;
}

.library-list {
  display: grid;
  gap: 8px;
  max-height: 560px;
  overflow: auto;
}

.library-row {
  align-items: center;
  background: #fbfaf8;
  border: 1px solid #e6dfd4;
  border-radius: 5px;
  color: #15191e;
  display: flex;
  justify-content: space-between;
  padding: 10px;
  text-align: left;
}

.library-row small,
.designed-item small,
.public-item small {
  color: #6b7280;
  display: block;
  font-size: 0.76rem;
}

.menu-render {
  min-height: 620px;
}

.studio-live-preview {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(320px, 430px) minmax(280px, 1fr);
  margin-top: 12px;
}

.studio-phone {
  border-width: 8px;
  box-shadow: 0 18px 44px rgba(42, 34, 24, 0.13);
  min-height: 560px;
  width: 100%;
}

.structure-panel {
  background: #fbf6ef;
  border: 1px solid #e7d7c0;
  border-radius: 5px;
  min-width: 0;
  padding: 12px;
}

.structure-heading {
  display: grid;
  gap: 2px;
  margin-bottom: 10px;
}

.structure-heading small {
  color: #74695d;
}

.admin-tree {
  display: grid;
  gap: 10px;
}

.admin-tree-row {
  align-items: center;
  background: #fffcf7;
  border: 1px solid #eadfce;
  border-radius: 5px;
  display: grid;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  padding: 8px 10px;
}

.admin-tree-row.child {
  margin-left: 22px;
}

.admin-tree-row span {
  min-width: 0;
}

.tree-children-admin {
  display: grid;
  gap: 8px;
  margin: 8px 0;
}

.menu-preview-card,
.phone-shell {
  background: #fffdfa;
  border: 1px solid #e6dfd4;
  border-radius: 6px;
  padding: 18px;
}

.menu-group,
.public-group {
  border-bottom: 1px solid #ece7de;
  margin-bottom: 14px;
  padding-bottom: 12px;
}

.menu-group h4,
.public-group h4 {
  font-family: inherit;
  font-size: 1rem;
  font-weight: 900;
  margin: 0 0 8px;
}

.admin-note {
  margin-bottom: 8px;
}

.designed-item,
.public-item {
  align-items: center;
  border-bottom: 1px dashed #eadfce;
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.designed-item.loose {
  border-bottom-style: solid;
}

.preview-layout {
  grid-template-columns: minmax(300px, 440px) minmax(320px, 520px);
  align-items: start;
}

.phone-preview {
  display: flex;
  justify-content: center;
}

.phone-shell {
  border: 10px solid #15191e;
  border-radius: 28px;
  box-shadow: 0 16px 45px rgba(21, 25, 30, 0.18);
  min-height: 620px;
  width: min(100%, 390px);
}

.publish-grid {
  grid-template-columns: minmax(320px, 520px) minmax(300px, 420px);
}

.publish-context {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.checklist {
  display: grid;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.checklist li {
  align-items: center;
  color: #6b7280;
  display: flex;
  gap: 8px;
}

.checklist li.done {
  color: #166534;
  font-weight: 800;
}

.qr-sheet-table code {
  white-space: normal;
  word-break: break-word;
}

.qr-preview-list,
.qr-sheet-grid {
  display: grid;
  gap: 4px;
}

.premium-checklist {
  margin-bottom: 14px;
}

.empty-state {
  display: grid;
  justify-items: start;
  gap: 10px;
}

.qr-target-tabs {
  background: #f4f1ed;
  border: 1px solid #e6dfd4;
  border-radius: 999px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin: 12px 0;
  padding: 4px;
}

.qr-target-tabs button {
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: #6b7280;
  font-weight: 800;
  padding: 8px 10px;
}

.qr-target-tabs button.active {
  background: #fff;
  box-shadow: 0 6px 16px rgba(21,25,30,0.08);
  color: #15191e;
}

.btn.disabled {
  pointer-events: none;
  opacity: 0.5;
}

@media (max-width: 900px) {
  .admin-shell {
    grid-template-columns: 1fr;
  }
  .admin-sidebar nav {
    grid-template-columns: repeat(2, 1fr);
  }
  .two-column,
  .designer-grid,
  .preview-layout,
  .publish-grid,
  .home-workspace,
  .command-center,
  .workspace-grid,
  .quick-add-row,
  .form-grid {
    grid-template-columns: 1fr;
  }
  .workspace-header,
  .panel-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .item-toolbar,
  .header-actions {
    min-width: 0;
  }
  .home-layout,
  .vendor-modal-grid,
  .compact-filters,
  .designer-ribbon {
    grid-template-columns: 1fr;
  }
  .hero-panel,
  .publish-context {
    align-items: stretch;
    flex-direction: column;
  }
  .workspace-switcher {
    align-items: stretch;
    border-radius: 8px;
    flex-direction: column;
  }
}
</style>

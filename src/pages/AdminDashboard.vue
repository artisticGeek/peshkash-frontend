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
          :class="{ active: activeSection === section.key || (activeSection === 'analytics' && section.key === 'inventory') }"
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
        <button class="btn btn-outline-secondary btn-sm" :disabled="loading" @click="loadAll">
          <i class="bi bi-arrow-clockwise"></i>
          Refresh
        </button>
      </header>

      <section v-if="activeSection !== 'vendors'" class="vendor-context slim-context">
        <label>Vendor
          <select v-model.number="selectedVendorId" class="form-select form-select-sm">
            <option :value="0">Select vendor</option>
            <option v-for="vendor in vendors" :key="vendor.id" :value="vendor.id">
              {{ vendor.displayName }}
            </option>
          </select>
        </label>
        <span v-if="selectedVendor" class="context-chip">{{ selectedVendor.name }}</span>
        <a v-if="selectedVendor?.hasContactPage" :href="vendorPublicUrl(selectedVendor)" target="_blank" rel="noreferrer">Vendor page</a>
        <span v-if="!selectedVendor" class="muted">Pick a vendor to continue.</span>
      </section>

      <div v-if="message" class="alert alert-success py-2">{{ message }}</div>
      <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>

      <section v-if="activeSection === 'home'" class="home-layout">
        <div class="panel">
          <h3>Setup Flow</h3>
          <table class="table table-sm align-middle action-table">
            <thead><tr><th>Step</th><th>Purpose</th><th>Status</th><th></th></tr></thead>
            <tbody>
              <tr v-for="step in dashboardSteps" :key="step.key" @click="activeSection = step.key">
                <td><strong>{{ step.label }}</strong></td>
                <td>{{ step.description }}</td>
                <td>{{ step.status }}</td>
                <td><button class="btn btn-outline-primary btn-sm">Open</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="panel">
          <h3>Snapshot</h3>
          <table class="table table-sm align-middle">
            <tbody>
              <tr @click="activeSection = 'vendors'"><td>Vendors</td><td class="number-cell">{{ vendors.length }}</td></tr>
              <tr @click="activeSection = 'publish'"><td>Vendor Events</td><td class="number-cell">{{ vendorEvents.length }}</td></tr>
              <tr @click="activeSection = 'designer'"><td>Vendor Menus</td><td class="number-cell">{{ vendorMenus.length }}</td></tr>
              <tr @click="activeSection = 'inventory'"><td>Vendor Items</td><td class="number-cell">{{ vendorItems.length }}</td></tr>
              <tr @click="activeSection = 'qr'"><td>QR Mappings</td><td class="number-cell">{{ qrMappings.length }}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="activeSection === 'vendors'" class="stack-layout">
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
              <thead><tr><th>Vendor</th><th>Slug</th><th>Card</th><th>QR</th><th></th></tr></thead>
              <tbody>
                <tr v-for="vendor in vendors" :key="vendor.id" @click="selectVendor(vendor)">
                  <td>{{ vendor.displayName }}</td>
                  <td><code>{{ vendor.name }}</code></td>
                  <td>{{ vendor.hasContactPage ? 'Active' : 'Inactive' }}</td>
                  <td><button class="btn btn-outline-primary btn-sm" @click.stop="prepareVendorQr(vendor)">QR</button></td>
                  <td><button class="btn btn-outline-secondary btn-sm" @click.stop="openVendorEditor(vendor)">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <form v-if="showVendorEditor" class="panel compact-editor" @submit.prevent="saveVendor">
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
            <button class="btn btn-outline-secondary" type="button" @click="closeVendorEditor">Close</button>
            <button class="btn btn-outline-primary" type="button" :disabled="!vendorForm.id" @click="prepareVendorQr()">Generate Vendor QR</button>
          </div>
          <div v-if="vendorQrDraft.url" class="preview-box">
            <div><span>Destination</span><code>{{ vendorQrDraft.url }}</code></div>
            <div><span>QR Hash</span><input v-model.trim="vendorQrDraft.qrHash" class="form-control" placeholder="radisson-gurgaon-card" /></div>
            <img v-if="vendorQrCodeDataUrl" class="qr-image" :src="vendorQrCodeDataUrl" alt="Vendor QR code" />
            <button class="btn btn-primary btn-sm" type="button" @click="saveVendorQr">Save Vendor QR</button>
          </div>
        </form>
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

      <section v-if="activeSection === 'inventory'" class="panel">
        <div class="panel-heading">
          <div>
            <h3>Item Library</h3>
            <p class="hint">All reusable items for the selected vendor. Search, filter, edit inline, and open item analysis from the usage column.</p>
          </div>
          <div class="item-toolbar">
            <button class="btn btn-outline-primary" :disabled="!selectedMenuIdForItems" @click="() => addDraftItemRow()">Add Row</button>
            <button class="btn btn-primary" :disabled="!dirtyItemRows.length" @click="saveDirtyItemRows">Save Changed Rows</button>
          </div>
        </div>
        <div class="table-filters">
          <label>Search<input v-model.trim="itemSearch" class="form-control" placeholder="Search name, slug, type, tag" /></label>
          <label>Menu<select v-model.number="itemMenuFilter" class="form-select"><option :value="0">All menus</option><option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
          <label>Type<select v-model="itemTypeFilter" class="form-select"><option value="">All types</option><option v-for="type in itemTypeOptions" :key="type" :value="type">{{ type }}</option></select></label>
        </div>

        <div class="table-wrap">
          <table class="table table-sm align-middle editable-table">
            <thead><tr><th>Item</th><th>Slug</th><th>Menu</th><th>Parent</th><th>Type</th><th>Tag</th><th>Used In</th><th>Scans</th><th></th></tr></thead>
            <tbody>
              <tr v-for="row in inventoryRows" :key="row.clientId">
                <td><input v-model.trim="row.displayName" class="form-control" placeholder="Paneer Tikka" @input="markItemDirty(row)" @blur="fillRowSlug(row)" /></td>
                <td><input v-model.trim="row.name" class="form-control" placeholder="paneer-tikka" @input="markItemDirty(row)" /></td>
                <td>{{ menuName(row.menuId) }}</td>
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
          <h3>Menu Designer</h3>
          <p class="hint">Visual nested editor. Drag items from the library into the menu, drop onto categories to re-parent, or use row actions when precision is easier.</p>
          <div class="form-grid">
            <label>Event<select v-model.number="selectedEventIdForItems" class="form-select"><option :value="0">Select event</option><option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option></select></label>
            <label>Working Menu<select v-model.number="selectedMenuIdForItems" class="form-select"><option :value="0">Select menu</option><option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option></select></label>
            <label>New Custom Menu<input v-model.trim="designerMenuName" class="form-control" placeholder="Supreme Custom for Sanya" /></label>
            <label class="check"><input v-model="designerFullMenuQr" type="checkbox" /> Enable full-menu QR</label>
          </div>
          <div class="actions">
            <button class="btn btn-primary" :disabled="!designerMenuName || !selectedVendor" @click="createDesignerMenu">Create Custom Menu</button>
            <button class="btn btn-outline-primary" :disabled="!selectedEventIdForItems || !selectedMenuIdForItems" @click="linkSelectedMenuToEvent">Use Menu For Event</button>
          </div>
          <div class="payment-note">
            Payment checkpoint later: after menu design is valid and before publishing/QR activation.
          </div>
        </div>

        <div class="panel">
          <h3>Item Library</h3>
          <input v-model.trim="designerSearch" class="form-control mb-2" placeholder="Search items to add" />
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
              <p class="hint">Admin render. Notes stay private and do not appear on public guest pages.</p>
            </div>
            <button class="btn btn-outline-secondary btn-sm" :disabled="!selectedMenuForItems" @click="activeSection = 'preview'">Preview</button>
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
        <form class="panel" @submit.prevent="saveEvent">
          <h3>Event Design</h3>
          <p class="hint">Create or edit the event shell, attach menus, validate, then publish.</p>
          <div class="form-grid">
            <label>Event Name<input v-model.trim="eventForm.displayName" class="form-control" placeholder="Sanya Reception" @blur="fillEventSlug" /></label>
            <label>Slug<input v-model.trim="eventForm.name" class="form-control" placeholder="sanya-reception" /></label>
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
          <div class="payment-gate">
            <strong>Future payment gate</strong>
            <p>Payment should happen here, after validation and before making the event active or enabling final QR mappings.</p>
          </div>
          <div class="actions">
            <button class="btn btn-outline-secondary" :disabled="!selectedEventForItems" @click="loadEventIntoForm(selectedEventForItems!)">Edit Selected Event</button>
            <button class="btn btn-primary" :disabled="!canPublish" @click="publishSelectedEvent">Publish Event</button>
          </div>
        </div>

        <div class="panel wide-panel">
          <h3>Post-Publish QR Sheet</h3>
          <p class="hint">After publish, this becomes the printable/clickable list of menu and item QR targets. Timers use the event active window.</p>
          <div class="qr-sheet">
            <article v-for="menu in selectedEventMenus" :key="menu.id" class="qr-tile">
              <strong>{{ menu.displayName }}</strong>
              <code>{{ menuPathFor(selectedEventForItems, menu) }}</code>
              <span>{{ eventTimerLabel(selectedEventForItems) }}</span>
            </article>
            <article v-for="item in selectedEventItems" :key="item.id" class="qr-tile">
              <strong>{{ itemLabel(item) }}</strong>
              <code>{{ itemPathFor(selectedEventForItems, item) }}</code>
              <span>{{ eventTimerLabel(selectedEventForItems) }}</span>
            </article>
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
import MenuTree from '../components/MenuTree.vue';
import { API_BASE_URL } from '../config';

type SectionKey = 'home' | 'vendors' | 'inventory' | 'analytics' | 'designer' | 'preview' | 'publish' | 'qr' | 'events' | 'menus' | 'items';
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
  { key: 'inventory', label: 'Item Library', icon: 'bi bi-box-seam' },
  { key: 'designer', label: 'Menu Designer', icon: 'bi bi-layout-three-columns' },
  { key: 'preview', label: 'Menu Preview', icon: 'bi bi-phone' },
  { key: 'publish', label: 'Event Publish', icon: 'bi bi-send-check' },
  { key: 'qr', label: 'QR Mappings', icon: 'bi bi-qr-code' },
] as const;

const route = useRoute();
const router = useRouter();

const dashboardRouteBySection: Record<SectionKey, string> = {
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

function sectionFromPath(path: string): SectionKey {
  if (path.startsWith('/dashboard/vendors')) return 'vendors';
  if (path.startsWith('/dashboard/items/')) return 'analytics';
  if (path.startsWith('/dashboard/items')) return 'inventory';
  if (path.startsWith('/dashboard/menus/preview')) return 'preview';
  if (path.startsWith('/dashboard/menus/designer')) return 'designer';
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

const activeTitle = computed(() => sections.find((section) => section.key === activeSection.value)?.label ?? 'Admin');
const activeSubtitle = computed(() => {
  const copy: Record<SectionKey, string> = {
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
  { key: 'vendors' as SectionKey, label: 'Vendor Setup', description: 'Create or reuse a vendor and generate contact QR codes.', status: `${vendors.value.length} vendors` },
  { key: 'inventory' as SectionKey, label: 'Item Library', description: 'Maintain the exhaustive reusable item list with filters and analytics.', status: `${vendorItems.value.length} items` },
  { key: 'designer' as SectionKey, label: 'Menu Designer', description: 'Build nested menus visually from reusable items.', status: `${vendorMenus.value.length} menus` },
  { key: 'preview' as SectionKey, label: 'Preview', description: 'Use the same recursive menu renderer guests see.', status: selectedMenuForItems.value?.displayName || 'Select menu' },
  { key: 'publish' as SectionKey, label: 'Publish', description: 'Validate event setup. Future payment gate lives here.', status: canPublish.value ? 'Ready' : 'Needs checks' },
  { key: 'qr' as SectionKey, label: 'QR Mapping', description: 'Create reusable mappings and render actual QR codes.', status: `${qrMappings.value.length} mappings` },
]);

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

function openVendorEditor(vendor?: Vendor) {
  if (vendor) {
    editVendor(vendor);
  } else {
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

function editVendor(vendor: Vendor) {
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

async function prepareVendorQr(vendorArg?: Vendor) {
  const vendor = vendorArg || vendors.value.find((row) => row.id === vendorForm.id) || selectedVendor.value;
  if (!vendor) return setError(new Error('Select or save a vendor first'));
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
  if (qrPreview.shortQrUrl) QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
});

watch(() => route.params.itemId, (itemId) => {
  selectedAnalyticsItemId.value = itemId ? Number(itemId) : null;
});

onMounted(async () => {
  await loadAll();
  if (route.params.itemId) selectedAnalyticsItemId.value = Number(route.params.itemId);
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

.slim-context {
  padding: 10px 12px;
  align-items: end;
  justify-content: flex-start;
}

.slim-context label {
  min-width: 240px;
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

.designer-grid,
.preview-layout,
.publish-grid {
  display: grid;
  gap: 16px;
}

.designer-grid {
  grid-template-columns: minmax(300px, 390px) minmax(260px, 360px) minmax(0, 1fr);
}

.designer-controls {
  align-self: start;
}

.payment-note,
.payment-gate {
  background: #fff8ed;
  border: 1px solid #ead2ad;
  border-radius: 8px;
  margin-top: 14px;
  padding: 10px;
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
  border-radius: 8px;
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

.menu-preview-card,
.phone-shell {
  background: #fffdfa;
  border: 1px solid #e6dfd4;
  border-radius: 8px;
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
  font-family: 'Urbanist', sans-serif;
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

.qr-sheet {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.qr-tile {
  border: 1px solid #e6dfd4;
  border-radius: 8px;
  display: grid;
  gap: 6px;
  padding: 12px;
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

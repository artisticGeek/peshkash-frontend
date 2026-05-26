<template>
  <div class="admin-shell" :data-sidebar="sidebarState">
    <aside class="admin-sidebar" :class="{ 'sidebar--overlay-open': sidebarOverlayOpen }">
      <div class="sidebar-brand">
        <i class="bi bi-grid-1x2-fill sidebar-logo"></i>
        <span class="sidebar-brand-name">Peshkash</span>
        <button class="sidebar-brand-toggle" type="button" :title="sidebarState === 'full' ? 'Icon-only mode' : 'Expand sidebar'" @click="cycleSidebar">
          <i :class="sidebarState === 'full' ? 'bi bi-layout-sidebar-inset-reverse' : 'bi bi-layout-sidebar-reverse'"></i>
        </button>
      </div>
      <nav>
        <RouterLink
          v-for="section in sections"
          :key="section.key"
          :to="dashboardRouteBySection[section.key]"
          class="nav-button"
          :class="{ active: isNavActive(section.key) }"
          :title="section.label"
          @click="sidebarOverlayOpen = false"
        >
          <i :class="section.icon"></i>
          <span class="nav-label">{{ section.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        <button class="nav-button sidebar-cycle-btn" type="button" :title="sidebarState === 'full' ? 'Icon-only mode' : sidebarState === 'icons' ? 'Collapse sidebar' : 'Expand sidebar'" @click="cycleSidebar">
          <i :class="sidebarState === 'full' ? 'bi bi-layout-sidebar-inset-reverse' : sidebarState === 'icons' ? 'bi bi-layout-sidebar-reverse' : 'bi bi-layout-sidebar'"></i>
          <span class="nav-label">{{ sidebarState === 'full' ? 'Compact' : sidebarState === 'icons' ? 'Collapse' : 'Expand' }}</span>
        </button>
      </div>
    </aside>

    <main class="admin-main" :class="{ 'admin-main--canvas': activeSection === 'qr-templates' }">
      <header v-if="activeSection !== 'qr-templates'" class="workspace-header">
        <div class="workspace-header-left">
          <button v-if="activeSection !== 'home'" class="icon-button outlined back-btn" title="Back" aria-label="Back" @click="goBack">
            <i class="bi bi-arrow-left"></i>
            <span v-if="activeSection === 'eventWorkspace' || activeSection === 'qrSheet'">Events</span>
            <span v-else-if="activeSection === 'vendorWorkspace'">Vendors</span>
            <span v-else-if="activeSection === 'preview' || activeSection === 'analytics' || activeSection === 'inventory'">Designer</span>
          </button>
          <div class="workspace-title">
            <h2>{{ activeTitle }}</h2>
            <p class="workspace-subtitle">{{ activeSubtitle }}</p>
          </div>
        </div>
        <div class="workspace-header-right">
          <WorkspaceSwitcher v-model="selectedVendorId" :vendors="vendors" :selected-vendor="selectedVendor" :compact="true" />
          <button class="icon-button outlined" :disabled="loading" title="Refresh" aria-label="Refresh" @click="loadAll">
            <i class="bi bi-arrow-clockwise"></i>
          </button>
        </div>
      </header>

      <!-- Toasts are rendered via Teleport below -->

      <section v-if="activeSection === 'home'" class="home-workspace">
        <div class="panel home-intro">
          <div>
            <p class="eyebrow">Workspace</p>
            <h3>{{ selectedVendor?.displayName || 'Select a vendor to begin' }}</h3>
            <p class="hint">Recent operational surfaces only. Detailed setup happens inside Vendors, Events, Menu Studio, and QR Bank.</p>
          </div>
          <div class="home-actions">
            <RouterLink class="icon-action primary" to="/dashboard/events" title="Open Event Creator">
              <i class="bi bi-calendar-event"></i><span>Events</span>
            </RouterLink>
            <RouterLink class="icon-action" to="/dashboard/menus/studio" title="Open Menu Designer">
              <i class="bi bi-layout-three-columns"></i><span>Menus</span>
            </RouterLink>
            <RouterLink class="icon-action" to="/dashboard/qr" title="Open QR Bank">
              <i class="bi bi-qr-code"></i><span>QR Bank</span>
            </RouterLink>
            <RouterLink class="icon-action" to="/dashboard/qr-templates" title="QR Print Templates">
              <i class="bi bi-layout-wtf"></i><span>Print Templates</span>
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
              <p class="hint">Current vendor events. Open one to manage menus, assets, QR targets, and publish readiness.</p>
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
            <h3>{{ selectedVendor?.displayName }}</h3>
            <p class="hint">{{ selectedVendor?.description || 'Reusable owner context for events, menus, items, and QR cards.' }}</p>
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
              <!-- LEFT PANE: scrollable -->
              <div class="modal-pane modal-pane-scroll">

                <!-- Section: Identity -->
                <p class="form-section-label"><i class="bi bi-building"></i> Identity</p>
                <div class="form-grid">
                  <label>Vendor Name<input v-model.trim="vendorForm.displayName" class="form-control" placeholder="Radisson Gurgaon" @blur="fillVendorSlug" /></label>
                  <label>
                    Public identifier
                    <div class="handle-input-wrap">
                      <span class="handle-prefix">@</span>
                      <input v-model.trim="vendorForm.name" class="form-control handle-input" placeholder="radisson-gurgaon" @input="syncVendorQrDraft" />
                    </div>
                    <span class="input-hint" v-if="vendorForm.name">{{ originUrl }}/vendor/{{ vendorForm.name }}</span>
                    <span class="input-hint" v-else>URL-friendly slug — letters, numbers, hyphens only</span>
                  </label>
                  <label class="wide">Logo URL <small class="muted">(direct image URL, optional)</small><input v-model.trim="vendorForm.logoUrl" class="form-control" placeholder="https://…" /></label>
                  <label class="wide">Description<textarea v-model.trim="vendorForm.description" class="form-control" rows="2"></textarea></label>
                </div>

                <!-- Section: Contact -->
                <p class="form-section-label"><i class="bi bi-telephone"></i> Contact</p>
                <div class="form-grid">
                  <label>Phone<input v-model.trim="vendorPhone" class="form-control" placeholder="+91 90000 00000" /></label>
                  <label>Email<input v-model.trim="vendorEmail" class="form-control" placeholder="events@example.com" /></label>
                  <label>Website<input v-model.trim="vendorWebsite" class="form-control" placeholder="example.com" /></label>
                  <label class="wide">Address<input v-model.trim="vendorForm.address" class="form-control" /></label>
                </div>

                <!-- Section: Location -->
                <p class="form-section-label"><i class="bi bi-geo-alt"></i> Location <span class="form-label-hint">· shown as map on contact card</span></p>
                <div class="wide location-block">
                  <div class="location-search-row">
                    <div class="location-input-wrap" style="flex:1; position:relative">
                      <input
                        v-model="locationSearchQuery"
                        class="form-control"
                        placeholder="Search a place…"
                        autocomplete="off"
                        @input="onLocationSearch"
                        @focus="showLocationDropdown = locationSuggestions.length > 0"
                        @blur="closeLocationDropdown"
                      />
                      <div v-if="showLocationDropdown && locationSuggestions.length" class="location-dropdown">
                        <button
                          v-for="s in locationSuggestions"
                          :key="s.place_id"
                          type="button"
                          class="location-option"
                          @mousedown.prevent="selectLocation(s)"
                        >
                          <i class="bi bi-geo-alt"></i>
                          <span>{{ s.display_name }}</span>
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      class="location-gps-btn"
                      :class="{ locating }"
                      :title="locating ? 'Getting location…' : 'Use current location'"
                      @click="useCurrentLocation"
                    >
                      <i :class="locating ? 'bi bi-hourglass-split' : 'bi bi-crosshair'"></i>
                    </button>
                  </div>
                  <div v-if="locationDisplay" class="location-confirmed">
                    <i class="bi bi-check-circle-fill"></i>
                    <span>{{ locationDisplay }}</span>
                    <button type="button" class="location-clear" @click="clearLocation"><i class="bi bi-x"></i></button>
                  </div>
                </div>

                <!-- Section: Business Hours -->
                <p class="form-section-label"><i class="bi bi-clock"></i> Business Hours</p>
                <div class="wide biz-hours-block">
                  <p class="form-label-sm">Days open</p>
                  <div class="day-chips">
                    <button
                      v-for="d in WEEK_DAYS"
                      :key="d"
                      type="button"
                      class="day-chip"
                      :class="{ active: vendorDaySelection.includes(d) }"
                      @click="toggleDay(d)"
                    >{{ d }}</button>
                  </div>
                  <p class="form-label-sm" style="margin-top:10px">Hours</p>
                  <div class="time-range-row">
                    <input type="time" v-model="vendorHoursFrom" class="form-control time-input" />
                    <span class="time-sep">to</span>
                    <input type="time" v-model="vendorHoursTo" class="form-control time-input" />
                  </div>
                  <p v-if="vendorBusinessDays || vendorBusinessHours" class="biz-hours-preview">
                    <i class="bi bi-eye"></i>
                    {{ [vendorBusinessDays, vendorBusinessHours].filter(Boolean).join('  ·  ') }}
                  </p>
                </div>

                <!-- Section: Social & Messaging -->
                <p class="form-section-label"><i class="bi bi-share"></i> Social &amp; Messaging</p>
                <div class="social-rows-block wide">
                  <div v-for="(row, idx) in vendorSocials" :key="idx" class="social-row-item">
                    <select v-model="row.type" class="form-control social-type-select">
                      <option v-for="t in SOCIAL_TYPES" :key="t.key" :value="t.key">{{ t.label }}</option>
                    </select>
                    <div class="handle-input-wrap" style="flex:1">
                      <span v-if="getSocialMeta(row.type).prefix" class="handle-prefix">{{ getSocialMeta(row.type).prefix }}</span>
                      <input
                        v-model.trim="row.value"
                        class="form-control handle-input"
                        :placeholder="getSocialMeta(row.type).hint"
                      />
                    </div>
                    <button type="button" class="remove-row-btn" @click="removeSocial(idx)" title="Remove"><i class="bi bi-x"></i></button>
                  </div>
                  <button
                    type="button"
                    class="add-social-btn"
                    :disabled="vendorSocials.length >= SOCIAL_TYPES.length"
                    @click="addSocial"
                  >
                    <i class="bi bi-plus"></i> Add Social
                  </button>
                </div>

                <!-- Contact card product toggle -->
                <div class="form-grid" style="margin-top:16px">
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

              <!-- RIGHT PANE: static QR -->
              <div class="modal-pane qr-pane">
                <h4>Contact Card QR</h4>
                <p class="hint">Saving the vendor with the contact card enabled automatically activates this mapping. Only use "Apply hash change" if you've edited the hash after printing physical QR codes.</p>
                <div class="preview-box">
                  <div><span>Destination</span><code>{{ vendorQrDraft.url || 'Save a vendor to generate destination' }}</code></div>
                  <label>
                    QR Hash
                    <input v-model.trim="vendorQrDraft.qrHash" class="form-control" placeholder="radisson-gurgaon-card" @input="renderVendorQr" />
                    <span v-if="qrHashChanged" class="input-hint warn">
                      <i class="bi bi-exclamation-triangle-fill"></i>
                      Changed from <code>{{ savedQrHash }}</code>
                    </span>
                  </label>
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

                  <!-- QR hash change confirmation -->
                  <div v-if="qrHashConfirmPending" class="qr-hash-warn">
                    <i class="bi bi-exclamation-triangle-fill"></i>
                    <p>Existing printed QR codes pointing to <strong>{{ savedQrHash }}</strong> will stop working. Only change this if you're replacing the physical QR.</p>
                    <div class="qr-hash-warn-actions">
                      <button type="button" class="btn btn-danger btn-sm" @click="confirmAndActivateQr">Yes, update QR</button>
                      <button type="button" class="btn btn-outline-secondary btn-sm" @click="qrHashConfirmPending = false">Cancel</button>
                    </div>
                  </div>

                  <button
                    v-if="showActivateQr && !qrHashConfirmPending"
                    class="btn btn-outline-secondary btn-sm"
                    type="button"
                    @click="handleActivateQr"
                  >
                    <i class="bi bi-arrow-repeat"></i>
                    Apply hash change
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
            <p class="eyebrow">{{ eventForm.id ? `Editing: ${eventForm.displayName}` : 'New Event' }}</p>
            <div class="form-grid">
              <label>Event Name<input v-model.trim="eventForm.displayName" class="form-control" placeholder="Sanya Reception" @blur="fillEventSlug" /></label>
              <label>Public identifier<input v-model.trim="eventForm.name" class="form-control" placeholder="sanya-reception" /></label>
              <label>Active From<input v-model="eventForm.startTime" type="datetime-local" class="form-control" /></label>
              <label>Active To<input v-model="eventForm.endTime" type="datetime-local" class="form-control" /></label>
              <label class="wide">Description<textarea v-model.trim="eventForm.eventDescription" rows="2" class="form-control"></textarea></label>
            </div>
            <div class="actions">
              <button class="btn btn-primary" type="submit" :disabled="!selectedVendor">{{ eventForm.id ? 'Update Event' : 'Create Event' }}</button>
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
                  <td><span class="status-pill" :class="`status-${event.status}`">{{ event.status }}</span></td>
                  <td>{{ eventMenus(event.id).length }}</td>
                  <td class="row-actions">
                    <RouterLink class="btn btn-outline-secondary btn-sm" :to="adminEventRoute(event)">Open</RouterLink>
                    <button class="btn btn-outline-secondary btn-sm" @click="editEventInline(event)">Edit</button>
                    <RouterLink v-if="event.status !== 'active'" class="btn btn-outline-primary btn-sm" :to="adminPublishRoute(event)"><i class="bi bi-send-check"></i> Publish</RouterLink>
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
            <h3>{{ selectedEventForItems?.displayName }}</h3>
            <p class="hint">{{ eventWindow(selectedEventForItems!) }}</p>
            <div class="event-steps">
              <span class="step done"><i class="bi bi-check-circle-fill"></i> Details</span>
              <span class="step-arrow">→</span>
              <span class="step" :class="{ done: selectedEventMenus.length > 0 }">
                <i :class="selectedEventMenus.length > 0 ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i> Menu
              </span>
              <span class="step-arrow">→</span>
              <span class="step" :class="{ done: selectedEventForItems?.status === 'active' }">
                <i :class="selectedEventForItems?.status === 'active' ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
                <span class="soft-pill" :class="selectedEventForItems?.status === 'active' ? 'pill-live' : selectedEventForItems?.status === 'inactive' ? 'pill-off' : ''">
                  {{ selectedEventForItems?.status }}
                </span>
              </span>
            </div>
          </div>
          <div class="hero-actions">
            <button
              v-if="selectedEventForItems?.status !== 'active'"
              class="btn btn-primary"
              :disabled="!selectedEventMenus.length"
              @click="openPublishDrawer(selectedEventForItems)"
            ><i class="bi bi-send-check"></i> Activate Event</button>
            <button
              v-else
              class="btn btn-outline-danger"
              @click="setEventStatusTo('inactive')"
            ><i class="bi bi-stop-circle"></i> Deactivate</button>
            <RouterLink class="btn btn-outline-primary" :to="adminQrSheetRoute(selectedEventForItems)">QR Sheet</RouterLink>
            <RouterLink class="btn btn-outline-secondary" to="/dashboard/menus/studio">Menu Designer</RouterLink>
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
              <strong>Selected add-ons</strong>
              <p>{{ eventProducts.filter((product) => product.selected).map((product) => product.label).join(', ') || 'No add-ons selected yet.' }}</p>
            </div>
          </div>

          <div class="panel wide-panel">
            <div class="panel-heading">
              <div>
                <h3>Linked Menus</h3>
                <p class="hint">Menus attached to this event. Attach from the vendor's menus or open Studio to edit content.</p>
              </div>
            </div>
            <div v-if="attachableMenus.length" class="attach-menu-row">
              <select v-model.number="attachMenuId" class="form-select form-select-sm">
                <option :value="0">Attach a menu…</option>
                <option v-for="m in attachableMenus" :key="m.id" :value="m.id">{{ m.displayName }}<template v-if="m.type === 'personalized'"> (personalized)</template></option>
              </select>
              <button class="btn btn-primary btn-sm" :disabled="!attachMenuId || loading" @click="attachMenuToEvent(attachMenuId)">
                <i class="bi bi-link-45deg"></i> Attach
              </button>
            </div>
            <div class="table-wrap">
              <table class="table table-sm align-middle action-table">
                <thead><tr><th>Menu</th><th>Type</th><th>Items</th><th>Public URL</th><th></th></tr></thead>
                <tbody>
                  <tr v-for="menu in selectedEventMenus" :key="menu.id">
                    <td><strong>{{ menu.displayName }}</strong><br /><code>{{ menu.name }}</code></td>
                    <td><span class="type-pill" :class="menu.type">{{ menu.type }}</span></td>
                    <td>{{ menuItems(menu.id).length }}</td>
                    <td><a :href="buildAbsolute(menuPathFor(selectedEventForItems, menu))" target="_blank" rel="noreferrer">Open public menu</a></td>
                    <td class="row-actions">
                      <RouterLink class="btn btn-outline-secondary btn-sm" :to="adminMenuStudioRoute(menu)">Studio</RouterLink>
                      <button class="btn btn-outline-danger btn-sm" :disabled="loading" @click="detachMenuFromEvent(menu.id)"><i class="bi bi-unlink"></i></button>
                    </td>
                  </tr>
                  <tr v-if="!selectedEventMenus.length"><td colspan="5" class="muted">No menus linked yet. Attach one above.</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel wide-panel">
            <div class="panel-heading">
              <div>
                <h3>Event Assets</h3>
                <p class="hint">Optional assets attached to this event.</p>
              </div>
              <button class="btn btn-primary btn-sm" @click="openPublishDrawer(selectedEventForItems)">
                <i class="bi bi-bag-check"></i>
                Review
              </button>
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
                <p class="hint">Quick-scan check. Hit "Print QRs" to generate print-ready PNGs with your template.</p>
              </div>
              <RouterLink class="btn btn-primary btn-sm" :to="adminQrSheetRoute(selectedEventForItems)">
                <i class="bi bi-printer"></i> Print QRs
              </RouterLink>
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

        <div v-if="showPublishDrawer" class="drawer-backdrop" @click.self="showPublishDrawer = false">
          <aside class="side-drawer publish-drawer">
            <div class="modal-title-row">
              <div>
                <p class="eyebrow">Publish</p>
                <h3>{{ selectedEventForItems?.displayName }}</h3>
                <p class="hint">Final review before activation.</p>
              </div>
              <button class="icon-button" type="button" aria-label="Close" @click="showPublishDrawer = false"><i class="bi bi-x-lg"></i></button>
            </div>
            <ul class="checklist">
              <li v-for="item in publishChecklist" :key="item.label" :class="{ done: item.done }">
                <i :class="item.done ? 'bi bi-check-circle-fill' : 'bi bi-circle'"></i>
                {{ item.label }}
              </li>
            </ul>
            <div class="product-cart">
              <label v-for="product in publishProducts" :key="product.key" class="cart-line" :class="{ selected: product.selected }">
                <input v-model="productSelections[product.key]" type="checkbox" />
                <i :class="product.icon"></i>
                <span>
                  <strong>{{ product.label }}</strong>
                  <small>{{ product.description }}</small>
                </span>
              </label>
            </div>
            <div class="drawer-actions">
              <button class="btn btn-outline-secondary" @click="showPublishDrawer = false">Close</button>
              <button class="btn btn-primary" :disabled="!canPublish" @click="publishSelectedEvent"><i class="bi bi-send-check"></i> Publish</button>
            </div>
          </aside>
        </div>

        <div v-if="!selectedEventForItems" class="panel empty-state">
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
              <thead><tr><th>Menu</th><th>Type</th><th>Active</th><th>Preview</th><th></th></tr></thead>
              <tbody>
                <tr v-for="menu in vendorMenus" :key="menu.id">
                  <td><strong>{{ menu.displayName }}</strong><br /><code>{{ menu.name }}</code></td>
                  <td><span class="soft-pill" :class="menu.type === 'personalized' ? 'pill-accent' : ''">{{ menu.type || 'generic' }}</span></td>
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
                <td><span class="muted">No scan data</span></td>
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
          <p class="hint">Usage is derived from current menu and event mappings.</p>
          <table v-if="selectedAnalyticsItem" class="table table-sm align-middle">
            <tbody>
              <tr><td>Slug</td><td><code>{{ selectedAnalyticsItem.name }}</code></td></tr>
              <tr><td>Source menu</td><td>{{ menuName(selectedAnalyticsItem.menuId) }}</td></tr>
              <tr><td>Parent</td><td>{{ parentName(selectedAnalyticsItem.parentId) }}</td></tr>
              <tr><td>Type</td><td>{{ selectedAnalyticsItem.type || 'item' }}</td></tr>
              <tr><td>Feedback</td><td>No feedback captured</td></tr>
              <tr><td>Scans</td><td>No scan data</td></tr>
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
            <h3>Menu Designer</h3>
            <p class="hint">Build and manage vendor menus. Select a menu to edit its items on the canvas.</p>
          </div>
          <div class="designer-ribbon">
            <label class="ribbon-group">
              Working Menu
              <div class="ribbon-menu-row">
                <select v-model.number="selectedMenuIdForItems" class="form-select" @change="showMenuRenameInline = false">
                  <option :value="0">Select menu</option>
                  <option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">
                    {{ menu.displayName }}{{ menu.type === 'personalized' ? ' ✦' : '' }}
                  </option>
                </select>
                <button v-if="selectedMenuForItems && !showMenuRenameInline" class="icon-button outlined small" title="Rename menu" @click="openMenuRename"><i class="bi bi-pencil"></i></button>
              </div>
            </label>
            <!-- Inline rename form -->
            <div v-if="showMenuRenameInline" class="ribbon-rename-row">
              <input v-model.trim="menuRenameValue" class="form-control" placeholder="New display name" @keydown.enter.prevent="saveMenuRename" @keydown.escape="showMenuRenameInline = false" />
              <button class="btn btn-primary btn-sm" :disabled="!menuRenameValue.trim()" @click="saveMenuRename"><i class="bi bi-check2"></i></button>
              <button class="btn btn-outline-secondary btn-sm" @click="showMenuRenameInline = false"><i class="bi bi-x"></i></button>
            </div>
            <div class="ribbon-divider"></div>
            <label class="ribbon-group">
              New Menu
              <div class="ribbon-input-row">
                <input v-model.trim="designerMenuName" class="form-control" placeholder="Display name" />
                <select v-model="designerMenuType" class="form-select form-select-sm type-select">
                  <option value="generic">Generic</option>
                  <option value="personalized">Personalized</option>
                </select>
              </div>
            </label>
            <button class="btn btn-primary icon-label" :disabled="!designerMenuName || !selectedVendor" @click="createDesignerMenu">
              <i class="bi bi-plus-lg"></i>
              Create
            </button>
            <div class="ribbon-divider"></div>
            <label class="ribbon-group">
              Link to Event
              <select v-model.number="selectedEventIdForItems" class="form-select">
                <option :value="0">Select event</option>
                <option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option>
              </select>
            </label>
            <button class="btn btn-outline-primary icon-label" :disabled="!selectedEventIdForItems || !selectedMenuIdForItems" @click="linkSelectedMenuToEvent">
              <i class="bi bi-bag-plus"></i>
              Add To Event
            </button>
          </div>
        </div>

        <div class="panel">
          <div class="panel-heading compact-heading">
            <div>
              <h3>Item Pool</h3>
              <p class="hint">Items from vendor's other menus. Click or drag to copy into the working menu.</p>
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
              <p class="hint">Public-like preview canvas. Drag from the library or add items, then save all changes together.</p>
            </div>
            <div class="actions slim-actions">
              <button class="icon-button outlined" :disabled="!selectedMenuForItems" title="Add item or category" aria-label="Add item" @click="openItemDrawer(null)"><i class="bi bi-plus-lg"></i></button>
              <button class="icon-button outlined" :disabled="!selectedMenuForItems" title="Arrange" aria-label="Arrange" @click="showArrangeDrawer = true"><i class="bi bi-diagram-3"></i></button>
              <RouterLink class="icon-button outlined" :class="{ disabled: !selectedMenuForItems }" :to="selectedMenuForItems ? adminMenuPreviewRoute(selectedMenuForItems) : '/dashboard/menus/studio'" title="Open preview" aria-label="Open preview"><i class="bi bi-phone"></i></RouterLink>
              <button class="btn btn-primary btn-sm" :disabled="!designerDirty" @click="saveDesignerChanges"><i class="bi bi-check2-circle"></i> Save</button>
            </div>
          </div>
          <div class="studio-live-preview">
            <div class="phone-shell studio-phone" :class="{ dirty: designerDirty }" @dragover.prevent @drop="dropOnMenuRoot">
              <p class="eyebrow">{{ linkedEventsForMenu(selectedMenuIdForItems) || 'Not linked to any event' }}</p>
              <h3>{{ selectedMenuForItems?.displayName || 'Menu Preview' }}</h3>
              <MenuTree
                v-for="item in selectedDesignerTree"
                :key="item.id"
                :item="item"
                :level="0"
                :event-name="selectedEventForItems?.name || ''"
                :menu-name="selectedMenuForItems?.name || ''"
                :edit-mode="true"
                :on-add-child="openItemDrawer"
              />
              <p v-if="!selectedDesignerItems.length" class="muted">Drop library items here or add a new item.</p>
              <!-- Root-level add button -->
              <button
                v-if="selectedMenuForItems"
                class="canvas-root-add"
                type="button"
                @click="openItemDrawer(null)"
              >
                <i class="bi bi-plus-lg"></i>
                Add item or category
              </button>
            </div>

            <div v-if="showArrangeDrawer" class="drawer-backdrop" @click.self="showArrangeDrawer = false">
              <aside class="side-drawer">
              <div class="modal-title-row">
                <div>
                  <h3>Arrange Menu</h3>
                  <p class="hint">Move items into categories, then save the menu canvas.</p>
                </div>
                <button class="icon-button" type="button" aria-label="Close" @click="showArrangeDrawer = false"><i class="bi bi-x-lg"></i></button>
              </div>
          <div class="admin-tree">
            <div v-for="item in selectedDesignerTree" :key="item.id" class="tree-root">
              <div class="admin-tree-row" draggable="true" @dragstart="dragDesignedItem(item)" @dragover.prevent @drop.stop="dropOnDesignedItem(item)">
                <span><i class="bi bi-grip-vertical"></i> <strong>{{ itemLabel(item) }}</strong></span>
                <small>{{ item.type || 'item' }} · {{ childCount(item) }} children</small>
                <button class="icon-button outlined small" title="Move to root" aria-label="Move to root" @click="setItemParent(item, null)"><i class="bi bi-arrow-up-square"></i></button>
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
                  <button class="icon-button outlined small" title="Move under this item" aria-label="Move under this item" @click="setItemParent(child, item.id)"><i class="bi bi-arrow-return-right"></i></button>
                </div>
              </div>
            </div>
            <p v-if="!selectedDesignerItems.length" class="muted">No items in this menu yet.</p>
          </div>
              <div class="drawer-actions">
                <button class="btn btn-outline-secondary" @click="showArrangeDrawer = false">Close</button>
                <button class="btn btn-primary" :disabled="!designerDirty" @click="saveDesignerChanges"><i class="bi bi-check2-circle"></i> Save Menu</button>
              </div>
              </aside>
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
            <button class="btn btn-primary" :disabled="!selectedEventForItems || !selectedMenuForItems" @click="openPublishDrawer(selectedEventForItems!)">Review & Publish</button>
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


      <section v-if="activeSection === 'qrSheet'" class="ps-workspace">
        <PrintStudio
          :event="selectedEventForItems ?? null"
          :targets="selectedEventForItems ? eventQrTargets(selectedEventForItems) : []"
          :qr-mappings="qrMappings"
        />
      </section>

      <section v-if="activeSection === 'items'" class="panel">
        <div class="panel-heading">
          <div>
            <h3>Items</h3>
            <p class="hint">Add items in rows. Choose a parent item when something belongs under a category.</p>
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
          <h3>QR Bank</h3>
          <p class="hint">Reusable QR assets and their current public destinations.</p>
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
          <h3>QR Assets</h3>
          <div class="table-wrap">
            <table class="table table-sm align-middle">
              <thead><tr><th>QR</th><th>Target</th><th>Scans</th><th>Updated</th><th></th></tr></thead>
              <tbody>
                <tr v-for="mapping in qrMappings" :key="mapping.id" @click="openQrEditor(mapping)">
                  <td><code>{{ mapping.qrHash }}</code></td>
                  <td>{{ qrTargetLabel(mapping) }}<br /><span class="muted">{{ mapping.url }}</span></td>
                  <td>{{ mapping.usageCount || 0 }}</td>
                  <td>{{ formatDate(mapping.updatedAt || mapping.createdAt) }}</td>
                  <td><button class="icon-button outlined small" title="Manage QR" aria-label="Manage QR" @click.stop="openQrEditor(mapping)"><i class="bi bi-sliders"></i></button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="showQrEditor" class="modal-backdrop-custom" @click.self="closeQrEditor">
          <form class="vendor-modal" @submit.prevent="saveQr">
            <div class="modal-title-row">
              <div>
                <h3>{{ selectedQrMapping ? selectedQrMapping.qrHash : 'New QR Asset' }}</h3>
                <p class="hint">Inspect current usage and remap the reusable QR safely.</p>
              </div>
              <button class="icon-button" type="button" aria-label="Close" @click="closeQrEditor"><i class="bi bi-x-lg"></i></button>
            </div>
            <div class="vendor-modal-grid">
              <div class="modal-pane">
                <div class="form-grid">
                  <label>QR Hash<input v-model.trim="qrForm.qrHash" class="form-control" /></label>
                  <label>Target<select v-model="qrTargetType" class="form-select"><option value="vendor">Vendor Contact Card</option><option value="menu">Event Menu</option><option value="item">Event Item</option><option value="custom">Custom Path</option></select></label>
                  <label class="wide">Destination URL<input v-model.trim="qrForm.url" class="form-control" /></label>
                  <label class="check"><input v-model="qrForm.isActive" type="checkbox" /> Active</label>
                </div>
                <div class="actions">
                  <button class="btn btn-outline-secondary" type="button" @click="buildQrDestination"><i class="bi bi-magic"></i> Generate</button>
                  <button class="btn btn-primary" type="submit"><i class="bi bi-check2-circle"></i> Save QR</button>
                </div>
              </div>
              <div class="modal-pane qr-pane">
                <h4>Current Mapping</h4>
                <div class="qr-detail-list">
                  <div><span>Target</span><strong>{{ selectedQrMapping ? qrTargetLabel(selectedQrMapping) : 'Draft' }}</strong></div>
                  <div><span>Scans</span><strong>{{ selectedQrMapping?.usageCount || 0 }}</strong></div>
                  <div><span>Vendor</span><strong>{{ selectedQrMapping ? qrVendorLabel(selectedQrMapping) : selectedVendor?.displayName || 'Not selected' }}</strong></div>
                  <div><span>Events</span><strong>{{ selectedQrMapping ? qrEventLabels(selectedQrMapping) : 'No event linked' }}</strong></div>
                  <div><span>Created</span><strong>{{ formatDate(selectedQrMapping?.createdAt) }}</strong></div>
                  <div><span>Last activated</span><strong>{{ formatDate(selectedQrMapping?.updatedAt) }}</strong></div>
                </div>
                <img v-if="qrCodeDataUrl" class="qr-image" :src="qrCodeDataUrl" alt="QR code" />
                <a v-if="qrPreview.shortQrUrl" :href="qrPreview.shortQrUrl" target="_blank" rel="noreferrer">{{ qrPreview.shortQrUrl }}</a>
              </div>
            </div>
          </form>
        </div>
      </section>

      <section v-if="activeSection === 'qr-templates'" class="qrt-embedded-section">
        <QrTemplatePage :embedded="true" />
      </section>
    </main>
  </div>

  <!-- Toast notifications -->
  <teleport to="body">
    <div class="toast-stack">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-chip"
          :class="`toast-${toast.type}`"
        >
          <i :class="toast.type === 'success' ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-circle-fill'"></i>
          <span>{{ toast.text }}</span>
          <button class="toast-close" type="button" @click="removeToast(toast.id)"><i class="bi bi-x-lg"></i></button>
        </div>
      </transition-group>
    </div>
  </teleport>

  <!-- Mobile hamburger (fixed, outside any sticky container) -->
  <teleport to="body">
    <button v-if="!sidebarOverlayOpen" class="mobile-hamburger" type="button" aria-label="Open navigation" @click="sidebarOverlayOpen = true">
      <i class="bi bi-list"></i>
    </button>
  </teleport>

  <!-- Mobile sidebar overlay backdrop -->
  <teleport to="body">
    <div v-if="sidebarOverlayOpen" class="sidebar-mobile-backdrop" @click="sidebarOverlayOpen = false"></div>
  </teleport>

  <!-- Item / Category add drawer (studio) -->
  <teleport to="body">
    <div v-if="showItemDrawer" class="drawer-backdrop" @click.self="showItemDrawer = false">
      <aside class="side-drawer item-add-drawer">
        <div class="modal-title-row">
          <div>
            <h3>Add to Menu</h3>
            <p class="hint">
              {{ itemDraft.parentId != null
                ? `Under: ${designerDraftItems.find(i => i.id === itemDraft.parentId)?.displayName || '#' + itemDraft.parentId}`
                : 'Root level — no parent category' }}
            </p>
          </div>
          <button class="icon-button" type="button" aria-label="Close" @click="showItemDrawer = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Type selector -->
        <div class="item-type-toggle">
          <button
            type="button"
            :class="{ active: itemDraft.type === 'category' }"
            @click="itemDraft.type = 'category'"
          >
            <i class="bi bi-folder2-open"></i>
            <span>Category</span>
            <small>Groups items (e.g. Starters, Mains)</small>
          </button>
          <button
            type="button"
            :class="{ active: itemDraft.type === 'item' }"
            @click="itemDraft.type = 'item'"
          >
            <i class="bi bi-card-text"></i>
            <span>Item</span>
            <small>A dish, drink, or add-on</small>
          </button>
        </div>

        <!-- Fields -->
        <div class="item-drawer-fields">
          <label>
            Name <span class="required">*</span>
            <input
              v-model.trim="itemDraft.displayName"
              class="form-control"
              :placeholder="itemDraft.type === 'category' ? 'e.g. Starters, Beverages' : 'e.g. Paneer Butter Masala'"
              autofocus
              @keydown.enter.prevent="saveItemFromDrawer"
            />
          </label>
          <template v-if="itemDraft.type === 'item'">
            <label>
              Description
              <textarea v-model.trim="itemDraft.description" class="form-control" rows="2" placeholder="Short description, optional"></textarea>
            </label>
            <label>
              Tag <small class="muted">(free text — or pick from existing)</small>
              <div class="tag-combobox">
                <input
                  v-model.trim="itemDraft.enumType"
                  class="form-control"
                  list="item-enum-type-list"
                  placeholder="e.g. veg, spicy, sale, new…"
                />
                <datalist id="item-enum-type-list">
                  <option v-for="tag in vendorEnumTypes" :key="tag" :value="tag" />
                </datalist>
                <button v-if="itemDraft.enumType" type="button" class="tag-clear-btn" title="Clear tag" @click="itemDraft.enumType = ''">
                  <i class="bi bi-x"></i>
                </button>
              </div>
            </label>
          </template>
        </div>

        <div class="drawer-actions">
          <button class="btn btn-outline-secondary" @click="showItemDrawer = false">Cancel</button>
          <button class="btn btn-primary" :disabled="!itemDraft.displayName" @click="saveItemFromDrawer">
            <i class="bi bi-plus-lg"></i>
            Add {{ itemDraft.type === 'category' ? 'Category' : 'Item' }}
          </button>
        </div>
      </aside>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import axios from 'axios';
import QRCode from 'qrcode';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import QrTargetPreview from '../components/admin/QrTargetPreview.vue';
import WorkspaceSwitcher from '../components/admin/WorkspaceSwitcher.vue';
import MenuTree from '../components/MenuTree.vue';
import QrTemplatePage from './QrTemplatePage.vue';
import PrintStudio from '../components/admin/PrintStudio.vue';
import { API_BASE_URL } from '../config';

type SectionKey = 'home' | 'vendors' | 'vendorWorkspace' | 'events' | 'eventWorkspace' | 'qrSheet' | 'inventory' | 'analytics' | 'designer' | 'preview' | 'publish' | 'qr' | 'qr-templates' | 'menus' | 'items';
type Vendor = { id: number; name: string; displayName: string; description?: string; contact: string[]; address?: string; hasContactPage: boolean; logoUrl?: string; createdAt?: string };
type EventRow = { id: number; name: string; displayName: string; eventDescription?: string; startTime?: string; endTime?: string; status: string; vendorId: number; vendor?: Vendor };
type MenuRow = { id: number; name: string; displayName: string; description?: string; isActive: boolean; vendorId: number; type: string; sourceMenuId?: number; vendor?: Vendor };
type ItemRow = { id: number; name: string; displayName: string; description?: string; ingredients?: string; image?: string; type?: string; enumType?: string; isActive: boolean; menuId: number; parentId?: number };
type QrMapping = { id: number; qrHash: string; url: string; isActive: boolean; shortQrUrl: string; finalPublicUrl: string; usageCount?: number; createdAt?: string; updatedAt?: string; expiresAt?: string };
type Preview = { eventId: number; menuId: number; itemId?: number; eventName: string; menuName: string; itemName?: string; publicPath: string; publicUrl: string };
type DraftItem = { clientId: string; id?: number; menuId: number; parentId: number; name: string; displayName: string; type: string; enumType: string; description: string; ingredients: string; image: string; isActive: boolean; isDirty: boolean; isNew: boolean };

const sections = [
  { key: 'home',          label: 'Dashboard',        icon: 'bi bi-grid-1x2' },
  { key: 'vendors',       label: 'Vendors',           icon: 'bi bi-building' },
  { key: 'events',        label: 'Event Creator',     icon: 'bi bi-calendar-event' },
  { key: 'designer',      label: 'Menu Designer',     icon: 'bi bi-layout-three-columns' },
  { key: 'qr',            label: 'QR Bank',           icon: 'bi bi-qr-code' },
  { key: 'qr-templates',  label: 'Print Templates',   icon: 'bi bi-layout-wtf' },
] as const;

const route = useRoute();
const router = useRouter();

const dashboardRouteBySection: Record<SectionKey, string> = {
  home:           '/dashboard/home',
  vendors:        '/dashboard/vendors',
  vendorWorkspace:'/dashboard/vendors',
  events:         '/dashboard/events',
  eventWorkspace: '/dashboard/events',
  qrSheet:        '/dashboard/events',
  inventory:      '/dashboard/menus/studio',
  analytics:      '/dashboard/menus/studio',
  designer:       '/dashboard/menus/studio',
  preview:        '/dashboard/menus/preview',
  publish:        '/dashboard/events',
  qr:             '/dashboard/qr',
  'qr-templates': '/dashboard/qr-templates',
  menus:          '/dashboard/menus/studio',
  items:          '/dashboard/menus/studio',
};

function sectionFromPath(path: string): SectionKey {
  if (/^\/dashboard\/vendors\/\d+/.test(path)) return 'vendorWorkspace';
  if (path.startsWith('/dashboard/vendors')) return 'vendors';
  if (/^\/dashboard\/events\/\d+\/qr-sheet/.test(path)) return 'qrSheet';
  if (/^\/dashboard\/events\/\d+\/publish/.test(path)) return 'eventWorkspace';
  if (/^\/dashboard\/events\/\d+/.test(path)) return 'eventWorkspace';
  if (path === '/dashboard/events') return 'events';
  // items routes merged into designer
  if (path.startsWith('/dashboard/items')) return 'designer';
  if (/^\/dashboard\/menus\/\d+\/preview/.test(path)) return 'preview';
  if (path.startsWith('/dashboard/menus/preview')) return 'preview';
  if (path.startsWith('/dashboard/menus')) return 'designer';
  if (path.startsWith('/dashboard/qr-templates')) return 'qr-templates';
  if (path.startsWith('/dashboard/qr')) return 'qr';
  return 'home';
}

const activeSection = computed<SectionKey>({
  get: () => sectionFromPath(route.path),
  set: (section) => router.push(dashboardRouteBySection[section]),
});
type SidebarState = 'full' | 'icons' | 'hidden';
function defaultSidebarState(): SidebarState {
  const saved = localStorage.getItem('peshkash-admin-sidebar') as SidebarState | null;
  if (saved && ['full', 'icons', 'hidden'].includes(saved)) return saved;
  return window.innerWidth < 1024 ? 'icons' : 'full';
}
const sidebarState = ref<SidebarState>(defaultSidebarState());
const sidebarOverlayOpen = ref(false);
watch(sidebarState, (v) => localStorage.setItem('peshkash-admin-sidebar', v));

function cycleSidebar() {
  const states: SidebarState[] = ['full', 'icons', 'hidden'];
  sidebarState.value = states[(states.indexOf(sidebarState.value) + 1) % states.length];
}

function toggleSidebar() {
  if (window.innerWidth < 768) {
    sidebarOverlayOpen.value = !sidebarOverlayOpen.value;
  } else {
    sidebarState.value = sidebarState.value === 'full' ? 'icons' : 'full';
  }
}

const loading = ref(false);
type Toast = { id: number; type: 'success' | 'error'; text: string };
const toasts = ref<Toast[]>([]);
let toastCounter = 0;
const selectedVendorId = ref(Number(localStorage.getItem('peshkash-admin-vendor-id') || 0));
const selectedMenuIdForItems = ref(0);
const selectedEventIdForItems = ref(0);
const showItemContextPicker = ref(false);
const showVendorEditor = ref(false);
const showEventEditor = ref(false);
const showArrangeDrawer = ref(false);
const showQrEditor = ref(false);
const showPublishDrawer = ref(false);
const designerMenuName = ref('');
const designerMenuType = ref<'generic' | 'personalized'>('generic');
const designerFullMenuQr = ref(false);
const designerNotes = reactive<Record<number, string>>({});
const designerSearch = ref('');
const designerDraftItems = ref<ItemRow[]>([]);
const designerOriginalParents = ref<Record<number, number | undefined>>({});
const designerTempId = ref(-1);
const itemSearch = ref('');
const itemMenuFilter = ref(0);
const itemTypeFilter = ref('');
const selectedAnalyticsItemId = ref<number | null>(null);
const draggedLibraryItemId = ref<number | null>(null);
const draggedDesignedItemId = ref<number | null>(null);
const showItemDrawer = ref(false);
const itemDraft = reactive({ displayName: '', name: '', type: 'item' as 'item' | 'category', enumType: '', description: '', parentId: null as number | null });
const showMenuRenameInline = ref(false);
const menuRenameValue = ref('');

const vendors = ref<Vendor[]>([]);
const events = ref<EventRow[]>([]);
const menus = ref<MenuRow[]>([]);
const items = ref<ItemRow[]>([]);
const qrMappings = ref<QrMapping[]>([]);
const selectedQrMapping = ref<QrMapping | null>(null);
const previews = reactive<{ menus: Preview[]; items: Preview[] }>({ menus: [], items: [] });
const eventMenuMap = ref<Record<number, MenuRow[]>>({});

const vendorContactText = ref('');
const vendorPhone = ref('');
const vendorEmail = ref('');
const vendorWebsite = ref('');
const vendorMapUrl = ref('');
// Dynamic social rows — replaces 6 individual refs
const SOCIAL_TYPES = [
  { key: 'WhatsApp',  icon: 'bi-whatsapp',  label: 'WhatsApp',   prefix: null,  hint: 'Number — blank auto-derives from phone' },
  { key: 'Instagram', icon: 'bi-instagram', label: 'Instagram',  prefix: '@',   hint: 'handle or instagram.com/…' },
  { key: 'Facebook',  icon: 'bi-facebook',  label: 'Facebook',   prefix: null,  hint: 'page name or facebook.com/…' },
  { key: 'LinkedIn',  icon: 'bi-linkedin',  label: 'LinkedIn',   prefix: 'in/', hint: 'profile or linkedin.com/…' },
  { key: 'Twitter',   icon: 'bi-twitter-x', label: 'Twitter / X',prefix: '@',   hint: 'handle or x.com/…' },
  { key: 'YouTube',   icon: 'bi-youtube',   label: 'YouTube',    prefix: '@',   hint: 'channel or youtube.com/…' },
] as const;
type SocialKey = (typeof SOCIAL_TYPES)[number]['key'];

const vendorSocials = ref<{ type: SocialKey | string; value: string }[]>([]);

function getSocialMeta(type: string) {
  return SOCIAL_TYPES.find(t => t.key === type) ?? { key: type, icon: 'bi-link-45deg', label: type, prefix: null, hint: '' };
}
function addSocial() {
  const used = new Set(vendorSocials.value.map(s => s.type));
  const next = SOCIAL_TYPES.find(t => !used.has(t.key));
  if (next) vendorSocials.value.push({ type: next.key, value: '' });
}
function removeSocial(idx: number) { vendorSocials.value.splice(idx, 1); }

// QR hash change detection
const savedQrHash          = ref('');
const qrHashConfirmPending = ref(false);
const vendorBusinessDays = ref('');
const vendorBusinessHours = ref('');

// ── Location picker ───────────────────────────────────────────────────────────
const locationSearchQuery   = ref('');
const locationSuggestions   = ref<{ place_id: string; display_name: string; lat: string; lon: string }[]>([]);
const locationDisplay       = ref('');
const showLocationDropdown  = ref(false);
const locating              = ref(false);
let   locationSearchTimer: ReturnType<typeof setTimeout> | null = null;

function onLocationSearch() {
  if (locationSearchTimer) clearTimeout(locationSearchTimer);
  locationDisplay.value = '';
  vendorMapUrl.value    = '';
  if (!locationSearchQuery.value.trim()) { locationSuggestions.value = []; return; }
  locationSearchTimer = setTimeout(async () => {
    try {
      const q = encodeURIComponent(locationSearchQuery.value);
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=6&addressdetails=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'Peshkash-Admin/1.0' } }
      );
      locationSuggestions.value = await res.json();
      showLocationDropdown.value = true;
    } catch { /* network error – silently ignore */ }
  }, 380);
}

function selectLocation(s: { place_id: string; display_name: string; lat: string; lon: string }) {
  vendorMapUrl.value       = `https://maps.google.com/maps?q=${s.lat},${s.lon}`;
  locationDisplay.value    = s.display_name.split(',').slice(0, 3).join(', ');
  locationSearchQuery.value = locationDisplay.value;
  locationSuggestions.value = [];
  showLocationDropdown.value = false;
}

function clearLocation() {
  vendorMapUrl.value        = '';
  locationDisplay.value     = '';
  locationSearchQuery.value = '';
  locationSuggestions.value = [];
}

function closeLocationDropdown() {
  // Small delay so a click on a suggestion registers before the list hides
  setTimeout(() => { showLocationDropdown.value = false; }, 180);
}

async function useCurrentLocation() {
  if (!navigator.geolocation) { setError(new Error('Geolocation not supported in this browser')); return; }
  locating.value = true;
  navigator.geolocation.getCurrentPosition(
    async ({ coords: { latitude, longitude } }) => {
      vendorMapUrl.value = `https://maps.google.com/maps?q=${latitude},${longitude}`;
      try {
        const res  = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
          { headers: { 'Accept-Language': 'en', 'User-Agent': 'Peshkash-Admin/1.0' } }
        );
        const data = await res.json();
        locationDisplay.value     = data.display_name?.split(',').slice(0, 3).join(', ') || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        locationSearchQuery.value = locationDisplay.value;
      } catch {
        locationDisplay.value     = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        locationSearchQuery.value = locationDisplay.value;
      }
      locating.value = false;
    },
    () => { setError(new Error('Location access denied or unavailable')); locating.value = false; },
    { timeout: 8000 }
  );
}

// ── Structured business hours inputs ─────────────────────────────────────────
const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const vendorDaySelection = ref<string[]>([]);
const vendorHoursFrom    = ref('');
const vendorHoursTo      = ref('');

function toggleDay(day: string) {
  const idx = vendorDaySelection.value.indexOf(day);
  if (idx >= 0) vendorDaySelection.value.splice(idx, 1);
  else vendorDaySelection.value.push(day);
}

function formatDaySelection(days: string[]): string {
  if (!days.length) return '';
  const ordered = WEEK_DAYS.filter(d => days.includes(d));
  if (ordered.length <= 1) return ordered.join('');
  const startIdx = WEEK_DAYS.indexOf(ordered[0] as any);
  const endIdx   = WEEK_DAYS.indexOf(ordered[ordered.length - 1] as any);
  const isRange  = endIdx - startIdx + 1 === ordered.length;
  return isRange ? `${ordered[0]}–${ordered[ordered.length - 1]}` : ordered.join(', ');
}

function parseDaySelection(str: string): string[] {
  if (!str) return [];
  const range = str.match(/^([A-Z][a-z]+)\s*[-–]\s*([A-Z][a-z]+)$/);
  if (range) {
    const s = WEEK_DAYS.indexOf(range[1] as any);
    const e = WEEK_DAYS.indexOf(range[2] as any);
    if (s >= 0 && e >= 0) return [...WEEK_DAYS.slice(s, e + 1)];
  }
  return str.split(/[,\s]+/).filter(d => (WEEK_DAYS as readonly string[]).includes(d));
}

function fmt24to12(t: string): string {
  if (!t) return '';
  const [hh, mm] = t.split(':').map(Number);
  const period = hh >= 12 ? 'PM' : 'AM';
  const h = hh % 12 || 12;
  return mm ? `${h}:${String(mm).padStart(2, '0')} ${period}` : `${h}:00 ${period}`;
}

function fmt12to24(str: string): string {
  const m = str.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!m) return '';
  let h = parseInt(m[1]);
  const min = parseInt(m[2] ?? '0');
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// Sync structured day chips → vendorBusinessDays string
watch(vendorDaySelection, (days) => {
  vendorBusinessDays.value = formatDaySelection(days);
}, { deep: true });

// Sync structured time pickers → vendorBusinessHours string
watch([vendorHoursFrom, vendorHoursTo], ([from, to]) => {
  const parts = [from ? fmt24to12(from) : '', to ? fmt24to12(to) : ''].filter(Boolean);
  vendorBusinessHours.value = parts.length === 2 ? `${parts[0]} – ${parts[1]}` : parts[0] ?? '';
});
const qrTargetType = ref<'vendor' | 'menu' | 'item' | 'custom'>('vendor');
const qrPreview = reactive({ shortQrUrl: '', finalPublicUrl: '' });
const qrCodeDataUrl = ref('');
const vendorQrCodeDataUrl = ref('');
const itemRows = ref<DraftItem[]>([]);

const vendorForm = reactive<any>({ id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false, logoUrl: '' });
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

const selectedVendor = computed(() => vendors.value.find((vendor) => vendor.id === selectedVendorId.value));
const vendorEvents = computed(() => events.value.filter((event) => event.vendorId === selectedVendorId.value));
const vendorMenus = computed(() => menus.value.filter((menu) => menu.vendorId === selectedVendorId.value));
const vendorMenuIds = computed(() => vendorMenus.value.map((menu) => menu.id));
const vendorItems = computed(() => items.value.filter((item) => vendorMenuIds.value.includes(item.menuId)));
const selectedMenuItems = computed(() => items.value.filter((item) => item.menuId === selectedMenuIdForItems.value));
const selectedMenuForItems = computed(() => vendorMenus.value.find((menu) => menu.id === selectedMenuIdForItems.value));
const selectedEventForItems = computed(() => {
  const id = selectedEventIdForItems.value || Number(route.params.eventId || 0);
  return events.value.find((event) => event.id === id);
});
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
const miscMenuItems = computed(() => miscMenu.value ? items.value.filter((item) => item.menuId === miscMenu.value!.id) : []);
const importMenuItems = computed(() => items.value.filter((item) => item.menuId === importForm.menuId));
const itemTypeOptions = computed(() => Array.from(new Set(vendorItems.value.map((item) => item.type || 'item'))).sort());
const vendorEnumTypes = computed(() => [...new Set(vendorItems.value.map(i => i.enumType).filter(Boolean))].sort() as string[]);
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
const activeEventId = computed(() => selectedEventIdForItems.value || Number(route.params.eventId || 0));
const selectedEventMenus = computed(() => activeEventId.value ? eventMenus(activeEventId.value) : []);
const selectedEventMenuIds = computed(() => selectedEventMenus.value.map((menu) => menu.id));
const attachMenuId = ref(0);
const attachableMenus = computed(() => vendorMenus.value.filter((m) => !selectedEventMenuIds.value.includes(m.id)));
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
const qrHashChanged = computed(() =>
  Boolean(vendorForm.id && savedQrHash.value && vendorQrDraft.qrHash && vendorQrDraft.qrHash !== savedQrHash.value)
);
const showActivateQr = computed(() =>
  Boolean(vendorForm.id && vendorForm.hasContactPage && vendorQrDraft.qrHash && !vendorQrIsActive.value && qrHashChanged.value)
);
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
  const contextual: Partial<Record<SectionKey, string>> = {
    vendorWorkspace: selectedVendor.value?.displayName || 'Vendor Workspace',
    eventWorkspace: selectedEventForItems.value?.displayName || 'Event Workspace',
    qrSheet: selectedEventForItems.value ? `Print Studio — ${selectedEventForItems.value.displayName}` : 'Print Studio',
    analytics: selectedAnalyticsItem.value ? itemLabel(selectedAnalyticsItem.value) : 'Item Analytics',
    preview: selectedMenuForItems.value ? `${selectedMenuForItems.value.displayName} Preview` : 'Menu Preview',
  };
  return contextual[activeSection.value] || sections.find((section) => section.key === activeSection.value)?.label || 'Admin';
});
const activeSubtitle = computed(() => {
  const copy: Record<SectionKey, string> = {
    home:           'Select a vendor and jump into your workspaces.',
    vendors:        'Create vendors, activate contact cards, and generate vendor QR mappings.',
    vendorWorkspace:'Manage vendor details, contact-card product, and reusable ownership context.',
    inventory:      'Items for the selected vendor across all menus.',
    analytics:      'Inspect where an item is used across events and menus.',
    designer:       'Build and manage vendor menus. Items live here — not as a separate section.',
    preview:        'Review the menu as guests will see it before activating the event.',
    publish:        'Review event setup and activate when ready.',
    events:         'Create and manage events. Select one to manage menus, QR targets, and publish.',
    eventWorkspace: 'Manage this event: link menus, preview, and publish.',
    qrSheet:        'Pick a print template, preview every QR at 300 DPI, and download all as print-ready PNGs.',
    menus:          'Vendor menus — generic templates and personalized event copies.',
    items:          'Items for the selected menu.',
    qr:             'View and edit QR mappings. Physical QRs are printed once and remapped per event.',
    'qr-templates': 'Design print-ready layouts once — reuse them for every event or vendor.',
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

function addToast(type: 'success' | 'error', text: string) {
  const id = ++toastCounter;
  toasts.value.push({ id, type, text });
  window.setTimeout(() => removeToast(id), type === 'error' ? 6000 : 3500);
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}

function setNotice(text: string) {
  addToast('success', text);
}

function setError(err: any) {
  const raw = err.response?.data?.message ?? err.message ?? 'Something went wrong';
  const text = raw.includes('already exists')
    ? `${raw} Try a more specific slug or add a short suffix.`
    : raw;
  addToast('error', text);
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

function resetDesignerDraft() {
  designerDraftItems.value = selectedMenuItems.value.map((item) => ({ ...item }));
  designerOriginalParents.value = Object.fromEntries(selectedMenuItems.value.map((item) => [item.id, item.parentId]));
  designerTempId.value = -1;
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
  if (!value) return 'Not set';
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
  // sub-sections roll up to their parent nav item
  if ((activeSection.value === 'analytics' || activeSection.value === 'inventory') && section === 'designer') return true;
  if ((activeSection.value === 'eventWorkspace' || activeSection.value === 'qrSheet') && section === 'events') return true;
  if (activeSection.value === 'vendorWorkspace' && section === 'vendors') return true;
  if (activeSection.value === 'preview' && section === 'designer') return true;
  return false;
}

function goBack() {
  if (activeSection.value === 'eventWorkspace' || activeSection.value === 'qrSheet') router.push('/dashboard/events');
  else if (activeSection.value === 'analytics' || activeSection.value === 'inventory') router.push('/dashboard/menus/studio');
  else if (activeSection.value === 'vendorWorkspace') router.push('/dashboard/vendors');
  else router.push('/dashboard/home');
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
      if (route.path.endsWith('/publish')) showPublishDrawer.value = true;
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
  Object.assign(vendorForm, { id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false, logoUrl: '' });
  vendorContactText.value = '';
  vendorPhone.value = '';
  vendorEmail.value = '';
  vendorWebsite.value = '';
  vendorMapUrl.value = '';
  vendorSocials.value        = [];
  savedQrHash.value          = '';
  qrHashConfirmPending.value = false;
  locationSearchQuery.value  = '';
  locationDisplay.value      = '';
  locationSuggestions.value  = [];
  showLocationDropdown.value = false;
  vendorBusinessDays.value  = '';
  vendorBusinessHours.value = '';
  vendorDaySelection.value  = [];
  vendorHoursFrom.value     = '';
  vendorHoursTo.value       = '';
  vendorQrDraft.qrHash = '';
  vendorQrDraft.url = '';
  vendorQrCodeDataUrl.value = '';
}

function editVendor(vendor: Vendor) {
  Object.assign(vendorForm, vendor);
  vendorContactText.value = vendor.contact?.join(', ') ?? '';
  hydrateVendorContactFields(vendor.contact ?? []);
  selectedVendorId.value = vendor.id;
  showVendorEditor.value = true;
  activeSection.value = 'vendors';
  // Track the hash that's already active so we can detect changes
  const existingMapping = qrMappings.value.find(m => m.url === `/vendor/${vendor.name}` && m.isActive);
  savedQrHash.value = existingMapping?.qrHash ?? `${vendor.name}-card`;
  qrHashConfirmPending.value = false;
  syncVendorQrDraft();
}

function hydrateVendorContactFields(contact: string[]) {
  const find = (label: string) => contact.find((line) => line.toLowerCase().startsWith(`${label.toLowerCase()}:`))?.split(':').slice(1).join(':').trim() || '';
  vendorPhone.value        = find('Phone');
  vendorEmail.value        = find('Email');
  vendorWebsite.value      = find('Website');
  const savedMapUrl = find('Google Maps');
  vendorMapUrl.value = savedMapUrl;
  if (savedMapUrl) {
    try {
      const u = new URL(savedMapUrl);
      const q = u.searchParams.get('q');
      locationSearchQuery.value = q ?? savedMapUrl;
      locationDisplay.value     = q ?? '';
    } catch { locationSearchQuery.value = savedMapUrl; }
  } else {
    locationSearchQuery.value = '';
    locationDisplay.value     = '';
  }
  // Rebuild social rows from recognised keys present in contact[]
  const socialKeys: SocialKey[] = ['WhatsApp', 'Instagram', 'Facebook', 'LinkedIn', 'Twitter', 'YouTube'];
  vendorSocials.value = socialKeys
    .map(key => ({ type: key, value: find(key) }))
    .filter(s => s.value);

  const days  = find('Business Days');
  const hours = find('Business Hours');
  vendorBusinessDays.value  = days;
  vendorBusinessHours.value = hours;
  vendorDaySelection.value  = parseDaySelection(days);
  const timeParts = hours.split(/\s*[-–]\s*/);
  vendorHoursFrom.value = fmt12to24(timeParts[0] ?? '');
  vendorHoursTo.value   = fmt12to24(timeParts[1] ?? '');

  if (!vendorPhone.value && !vendorEmail.value && contact.length) vendorPhone.value = contact[0] || '';
}

function vendorContactPayload() {
  const rows: [string, string][] = [
    ['Phone',         vendorPhone.value],
    ['Email',         vendorEmail.value],
    ['Website',       vendorWebsite.value],
    ['Google Maps',   vendorMapUrl.value],
    ['Business Days', vendorBusinessDays.value],
    ['Business Hours',vendorBusinessHours.value],
    ...vendorSocials.value.map(s => [s.type, s.value] as [string, string]),
  ];
  return rows.filter(([, v]) => String(v).trim()).map(([label, v]) => `${label}: ${String(v).trim()}`);
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

function handleActivateQr() {
  if (qrHashChanged.value) {
    qrHashConfirmPending.value = true;
  } else {
    saveVendorQr();
  }
}

async function confirmAndActivateQr() {
  qrHashConfirmPending.value = false;
  await saveVendorQr();
}

async function saveVendorQrMapping() {
  if (!vendorForm.id) throw new Error('Save the vendor before activating the QR');
  if (!vendorForm.hasContactPage) throw new Error('Add the contact card product before activating this QR');
  await syncVendorQrDraft();
  requireSlug(vendorQrDraft.qrHash, 'QR hash');
  const payload = { qrHash: vendorQrDraft.qrHash, url: vendorQrDraft.url, isActive: true };
  const existing = qrMappings.value.find((m) => m.qrHash === vendorQrDraft.qrHash);
  existing
    ? await axios.put(adminUrl(`/qr-mappings/${existing.id}`), payload)
    : await axios.post(adminUrl('/qr-mappings'), payload);
  savedQrHash.value = vendorQrDraft.qrHash;
  qrHashConfirmPending.value = false;
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

function openPublishDrawer(event: EventRow) {
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

function openMenuRename() {
  if (!selectedMenuForItems.value) return;
  menuRenameValue.value = selectedMenuForItems.value.displayName;
  showMenuRenameInline.value = true;
}

async function saveMenuRename() {
  if (!selectedMenuForItems.value || !menuRenameValue.value.trim()) return;
  try {
    const menu = selectedMenuForItems.value;
    await axios.put(adminUrl(`/menus/${menu.id}`), { ...menu, displayName: menuRenameValue.value.trim(), vendorId: selectedVendorId.value });
    showMenuRenameInline.value = false;
    await loadAll();
    setNotice('Menu renamed');
  } catch (err) { setError(err); }
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

function uniqueDraftSlug(base: string) {
  const clean = slugify(base || 'item');
  const existing = new Set([...items.value, ...designerDraftItems.value].map((item) => item.name));
  if (!existing.has(clean)) return clean;
  let index = 2;
  while (existing.has(`${clean}-${index}`)) index += 1;
  return `${clean}-${index}`;
}

function openItemDrawer(parentId: number | null) {
  if (!selectedMenuForItems.value) { setError(new Error('Select a working menu first')); return; }
  Object.assign(itemDraft, { displayName: '', name: '', type: 'item', enumType: '', description: '', parentId: parentId ?? null });
  showItemDrawer.value = true;
}

function saveItemFromDrawer() {
  try {
    if (!selectedMenuIdForItems.value) throw new Error('Select a working menu first');
    if (!itemDraft.displayName.trim()) throw new Error('Add a name first');
    const name = uniqueDraftSlug(itemDraft.displayName);
    designerDraftItems.value.push({
      id: designerTempId.value--,
      menuId: selectedMenuIdForItems.value,
      name,
      displayName: itemDraft.displayName,
      type: itemDraft.type,
      enumType: itemDraft.type === 'item' ? itemDraft.enumType : '',
      description: itemDraft.type === 'item' ? itemDraft.description : '',
      parentId: itemDraft.parentId ?? undefined,
      isActive: true,
    });
    showItemDrawer.value = false;
  } catch (err) {
    setError(err);
  }
}

async function saveDesignerChanges() {
  try {
    if (!selectedMenuIdForItems.value) throw new Error('Select a working menu first');
    const idMap = new Map<number, number>();
    const newItems = designerDraftItems.value.filter((item) => item.id < 0);
    for (const item of newItems) {
      const parentId = item.parentId && item.parentId < 0 ? idMap.get(item.parentId) : item.parentId;
      const { data } = await axios.post<ItemRow>(adminUrl('/items'), {
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

function linkedEventsForMenu(menuId: number): string {
  if (!menuId) return '';
  const names = events.value
    .filter((ev) => eventMenus(ev.id).some((m) => m.id === menuId))
    .map((ev) => ev.displayName);
  return names.join(' · ');
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
    const item = designerDraftItems.value.find((row) => row.id === draggedDesignedItemId.value);
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
    const item = designerDraftItems.value.find((row) => row.id === draggedDesignedItemId.value);
    if (item) await setItemParent(item, target.id);
  }
  draggedLibraryItemId.value = null;
  draggedDesignedItemId.value = null;
}

async function setItemParent(item: ItemRow, parentId: number | null) {
  if (parentId === item.id) return setError(new Error('An item cannot be its own parent'));
  const draft = designerDraftItems.value.find((row) => row.id === item.id);
  if (!draft) return;
  draft.parentId = parentId || undefined;
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
      isActive: true,
      type: designerMenuType.value,
    });
    await loadAll();
    selectedMenuIdForItems.value = Number(data.id);
    designerMenuName.value = '';
    designerMenuType.value = 'generic';
    setNotice(`${data.type === 'personalized' ? 'Personalized' : 'Generic'} menu created. Add items from the library next.`);
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
    await loadAll();
    setNotice('Menu linked to event — assign a QR hash in QR Bank if needed');
  } catch (err) {
    setError(err);
  }
}

async function attachMenuToEvent(menuId: number) {
  const eventId = selectedEventIdForItems.value || Number(route.params.eventId || 0);
  if (!eventId || !menuId) return;
  try {
    loading.value = true;
    const menu = vendorMenus.value.find((m) => m.id === menuId);
    await axios.post(adminUrl(`/events/${eventId}/menus/${menuId}`), { displayName: menu?.displayName });
    await loadEventMenuLinks();
    attachMenuId.value = 0;
    setNotice('Menu linked to event');
  } catch (err) { setError(err); }
  finally { loading.value = false; }
}

async function detachMenuFromEvent(menuId: number) {
  const eventId = selectedEventIdForItems.value || Number(route.params.eventId || 0);
  if (!eventId) return;
  try {
    loading.value = true;
    await axios.delete(adminUrl(`/events/${eventId}/menus/${menuId}`));
    await loadEventMenuLinks();
    setNotice('Menu unlinked from event');
  } catch (err) { setError(err); }
  finally { loading.value = false; }
}

async function copyItemToDesignedMenu(item: ItemRow, parentId: number | null = null) {
  if (!selectedMenuIdForItems.value) return setError(new Error('Select a working menu first'));
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

function loadEventIntoForm(event: EventRow) {
  selectedEventIdForItems.value = event.id;
  editEvent(event);
}

async function setEventStatusTo(status: 'draft' | 'active' | 'inactive') {
  try {
    const event = selectedEventForItems.value;
    if (!event) throw new Error('No event selected');
    await axios.patch(adminUrl(`/events/${event.id}/status`), { status });
    await loadAll();
    showPublishDrawer.value = false;
    const label = status === 'active' ? 'activated — QRs are live' : status === 'inactive' ? 'deactivated — QRs are off' : 'set to draft';
    setNotice(`Event ${label}.`);
  } catch (err) {
    setError(err);
  }
}

async function publishSelectedEvent() {
  await setEventStatusTo('active');
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

function openQrEditor(mapping?: QrMapping) {
  selectedQrMapping.value = mapping || null;
  showQrEditor.value = true;
  if (mapping) editQr(mapping);
}

function closeQrEditor() {
  showQrEditor.value = false;
  selectedQrMapping.value = null;
}

function qrTargetLabel(mapping: QrMapping) {
  if (mapping.url?.startsWith('/vendor/')) {
    const slug = mapping.url.split('/').pop();
    return vendors.value.find((vendor) => vendor.name === slug)?.displayName || 'Vendor card';
  }
  if (mapping.url?.includes('/item/')) {
    const slug = decodeURIComponent(mapping.url.split('/item/')[1] || '');
    return items.value.find((item) => item.name === slug)?.displayName || 'Item target';
  }
  if (mapping.url?.startsWith('/event/')) return 'Event menu';
  return 'Custom path';
}

function qrVendorLabel(mapping: QrMapping) {
  if (mapping.url?.startsWith('/vendor/')) {
    const slug = mapping.url.split('/').pop();
    return vendors.value.find((vendor) => vendor.name === slug)?.displayName || 'Vendor card';
  }
  const eventSlug = mapping.url?.split('/event/')[1]?.split('/')[0];
  const event = events.value.find((row) => row.name === eventSlug);
  return event?.vendor?.displayName || vendors.value.find((vendor) => vendor.id === event?.vendorId)?.displayName || 'Not linked';
}

function qrEventLabels(mapping: QrMapping) {
  const eventSlug = mapping.url?.split('/event/')[1]?.split('/')[0];
  if (!eventSlug) return 'No event linked';
  return events.value.find((event) => event.name === eventSlug)?.displayName || eventSlug;
}

async function saveQr() {
  try {
    requireSlug(qrForm.qrHash, 'QR hash');
    if (!qrForm.url) await buildQrDestination();
    const payload = { qrHash: qrForm.qrHash, url: qrForm.url, isActive: qrForm.isActive };
    const existingId = selectedQrMapping.value?.id;
    const { data } = existingId
      ? await axios.put<QrMapping>(adminUrl(`/qr-mappings/${existingId}`), payload)
      : await axios.post<QrMapping>(adminUrl('/qr-mappings'), payload);
    qrPreview.shortQrUrl = data.shortQrUrl;
    qrPreview.finalPublicUrl = data.finalPublicUrl;
    qrCodeDataUrl.value = await QRCode.toDataURL(data.shortQrUrl, { margin: 1, width: 180 });
    await loadAll();
    selectedQrMapping.value = data;
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
  if (qrPreview.shortQrUrl) QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
});

watch(() => route.fullPath, hydrateRouteContext);

onMounted(async () => {
  await loadAll();
  selectedMenuIdForItems.value = vendorMenus.value[0]?.id ?? 0;
  selectedEventIdForItems.value = vendorEvents.value[0]?.id ?? 0;
  hydrateRouteContext(); // must run last so URL params always win
  syncItemRows();
});
</script>

<style scoped>
/* ── Global typography ──────────────────────────────────────────────────────── */
.eyebrow {
  color: #bd945a;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 0 0 6px;
  text-transform: uppercase;
}

.workspace-header h2,
.panel h3,
.adhoc-box h4 {
  font-family: inherit;
  margin: 0;
}

/* ── Shell & sidebar layout ─────────────────────────────────────────────────── */
.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px 1fr;
  background: #f7f2ea;
  color: #2f2a24;
  font-family: 'Urbanist', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  transition: grid-template-columns 0.22s ease;
}
.admin-shell[data-sidebar="icons"] { grid-template-columns: 64px 1fr; }
.admin-shell[data-sidebar="hidden"] { grid-template-columns: 0px 1fr; }

.admin-sidebar {
  background: #171512;
  color: #fff;
  display: flex;
  flex-direction: column;
  gap: 0;
  height: 100vh;
  overflow: hidden;
  position: sticky;
  top: 0;
  transition: width 0.22s ease;
  width: 260px;
  flex-shrink: 0;
}

/* Brand row */
.sidebar-brand {
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  display: flex;
  flex-shrink: 0;
  gap: 10px;
  min-height: 56px;
  padding: 0 12px;
}
.sidebar-logo {
  color: #BD945A;
  flex-shrink: 0;
  font-size: 1.15rem;
}
.sidebar-brand-name {
  color: rgba(255,255,255,0.9);
  flex: 1;
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  transition: opacity 0.15s;
  white-space: nowrap;
}
.sidebar-brand-toggle {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
  display: flex;
  font-size: 0.95rem;
  height: 30px;
  justify-content: center;
  margin-left: auto;
  padding: 0 6px;
  transition: color 0.12s;
  flex-shrink: 0;
}
.sidebar-brand-toggle:hover { color: rgba(255,255,255,0.8); }

/* Nav */
.admin-sidebar nav {
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 2px;
  overflow-y: auto;
  padding: 4px 8px;
}

.nav-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 8px;
  color: rgba(255,255,255,0.72);
  cursor: pointer;
  display: flex;
  gap: 10px;
  padding: 10px 10px;
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}
.nav-button i { font-size: 1rem; flex-shrink: 0; }
.nav-label { font-size: 0.88rem; }

.nav-button.active,
.nav-button:hover {
  background: rgba(189,148,90,0.18);
  color: #fff;
}

/* Sidebar footer */
.sidebar-footer {
  padding: 8px 8px 16px;
  border-top: 1px solid rgba(255,255,255,0.07);
  flex-shrink: 0;
}
.sidebar-cycle-btn {
  width: 100%;
  color: rgba(255,255,255,0.44);
  font-size: 0.8rem;
}
.sidebar-cycle-btn:hover { color: rgba(255,255,255,0.7); }

/* Icons-only state */
.admin-shell[data-sidebar="icons"] .admin-sidebar { width: 56px; }
.admin-shell[data-sidebar="icons"] .nav-label,
.admin-shell[data-sidebar="icons"] .sidebar-brand-name { opacity: 0; width: 0; overflow: hidden; pointer-events: none; }
.admin-shell[data-sidebar="icons"] .nav-button { justify-content: center; padding: 10px 0; }
.admin-shell[data-sidebar="icons"] .sidebar-brand { justify-content: center; gap: 0; }
.admin-shell[data-sidebar="icons"] .sidebar-brand-toggle { display: none; }
.admin-shell[data-sidebar="icons"] .sidebar-cycle-btn { justify-content: center; }

/* Hidden state (desktop) */
.admin-shell[data-sidebar="hidden"] .admin-sidebar { width: 0; }

/* Overlay open: always show labels regardless of sidebar state */
.admin-sidebar.sidebar--overlay-open .nav-label,
.admin-sidebar.sidebar--overlay-open .sidebar-brand-name { opacity: 1; width: auto; overflow: visible; pointer-events: auto; }
.admin-sidebar.sidebar--overlay-open .nav-button { justify-content: flex-start; padding: 10px; }
.admin-sidebar.sidebar--overlay-open .sidebar-brand { justify-content: flex-start; gap: 10px; }
.admin-sidebar.sidebar--overlay-open .sidebar-cycle-btn { justify-content: flex-start; }

/* ── Workspace header ─────────────────────────────────────────────────────── */
.workspace-header {
  align-items: center;
  background: #fffcf7;
  border-bottom: 1px solid #ede8df;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
  padding: 10px 16px;
  position: sticky;
  top: 0;
  z-index: 10;
}
.workspace-header-left {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
  flex: 1;
}
.workspace-title {
  min-width: 0;
}
.workspace-title h2 {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.workspace-subtitle {
  color: #6f665c;
  font-size: 0.8rem;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.workspace-header-right {
  align-items: center;
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* Mobile-only fixed hamburger (teleported to body, outside any sticky container) */
.mobile-hamburger {
  align-items: center;
  background: #171512;
  border: 0;
  border-radius: 0 0 8px 0;
  color: #BD945A;
  cursor: pointer;
  display: none;
  font-size: 1.3rem;
  height: 44px;
  justify-content: center;
  left: 0;
  position: fixed;
  top: 0;
  width: 44px;
  z-index: 150;
}

/* ── Mobile sidebar overlay ─────────────────────────────────────────────── */
.sidebar-mobile-backdrop {
  background: rgba(0,0,0,0.48);
  bottom: 0;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 199;
}

.admin-main {
  min-width: 0;
  overflow: auto;
  padding: 16px 20px;
}

/* Mobile layout */
@media (max-width: 767px) {
  .admin-shell {
    grid-template-columns: 1fr !important;
  }
  .admin-main { padding: 12px 14px; }
  .mobile-hamburger { display: flex; }
  .workspace-header { padding: 8px 12px 8px 52px; } /* indent past fixed hamburger */
  .workspace-title h2 { font-size: 1rem; }
  .workspace-subtitle { display: none; }

  /* Sidebar: fixed overlay on mobile */
  .admin-sidebar {
    height: 100vh;
    left: 0;
    position: fixed;
    top: 0;
    transform: translateX(-100%);
    transition: transform 0.24s ease;
    width: 260px !important;
    z-index: 200;
  }
  .admin-sidebar.sidebar--overlay-open {
    box-shadow: 4px 0 24px rgba(0,0,0,0.3);
    transform: translateX(0);
  }
  .sidebar-brand-toggle { display: none; }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .admin-shell:not([data-sidebar="full"]) { grid-template-columns: 64px 1fr; }
  .admin-main { padding: 14px 16px; }
}

.admin-main--canvas {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.qrt-embedded-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ps-workspace {
  max-width: 1100px;
}

.panel-heading {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.hint {
  color: #6f665c;
  font-size: 0.88rem;
  margin: 4px 0 0;
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

.event-steps {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.event-steps .step {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.82rem;
  color: #9ca3af;
  font-weight: 500;
}

.event-steps .step.done {
  color: #16a34a;
}

.event-steps .step-arrow {
  color: #d1d5db;
  font-size: 0.75rem;
}

.pill-live {
  background: #dcfce7;
  color: #15803d;
}

.pill-off {
  background: #f3f4f6;
  color: #6b7280;
}

/* Event list status pills */
.status-pill {
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 8px;
  text-transform: uppercase;
}
.status-pill.status-active {
  background: #dcfce7;
  color: #15803d;
}
.status-pill.status-draft {
  background: #fef3c7;
  color: #92400e;
}
.status-pill.status-inactive {
  background: #f3f4f6;
  color: #6b7280;
}

/* Back button with label */
.back-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 0.8rem;
  padding: 5px 10px;
}

/* Inline menu attach row */
.attach-menu-row {
  align-items: center;
  border-bottom: 1px solid #f0ebe3;
  display: flex;
  gap: 8px;
  padding: 10px 0 14px;
  margin-bottom: 6px;
}
.attach-menu-row .form-select {
  flex: 1;
}

/* Menu type pill in linked menus table */
.type-pill {
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  padding: 2px 7px;
  text-transform: uppercase;
}
.type-pill.generic {
  background: #f3f4f6;
  color: #6b7280;
}
.type-pill.personalized {
  background: #fef3c7;
  color: #92400e;
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

.contact-section-label {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 0;
  padding: 6px 0 4px;
  border-bottom: 1px solid #e8dfd0;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: #a07c4a;
  text-transform: uppercase;
}

.form-section-label {
  align-items: center;
  border-bottom: 1px solid #e8dfd0;
  color: #a07c4a;
  display: flex;
  font-size: 0.78rem;
  font-weight: 600;
  gap: 6px;
  letter-spacing: 0.03em;
  margin: 14px 0 8px;
  padding-bottom: 5px;
  text-transform: uppercase;
}

.form-section-label:first-child {
  margin-top: 0;
}

/* Social rows */
.social-rows-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.social-row-item {
  align-items: center;
  display: flex;
  gap: 6px;
}

.social-type-select {
  flex-shrink: 0;
  width: 130px;
}

.add-social-btn {
  align-items: center;
  background: transparent;
  border: 1px dashed #c9a96e;
  border-radius: 5px;
  color: #a07c4a;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.82rem;
  font-weight: 500;
  gap: 4px;
  padding: 5px 10px;
  width: fit-content;
}

.add-social-btn:hover:not(:disabled) {
  background: #fdf5e8;
}

.add-social-btn:disabled {
  color: #bbb;
  border-color: #ddd;
  cursor: default;
}

.remove-row-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 4px;
  color: #b07070;
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  height: 30px;
  justify-content: center;
  width: 28px;
}

.remove-row-btn:hover {
  background: #fce8e8;
}

/* QR hash change warning */
.qr-hash-warn {
  background: #fff8ed;
  border: 1px solid #e8c96e;
  border-radius: 5px;
  color: #7a5a1a;
  font-size: 0.82rem;
  margin-top: 10px;
  padding: 10px 12px;
}

.qr-hash-warn > i {
  color: #c87a00;
  margin-right: 4px;
}

.qr-hash-warn p {
  margin: 4px 0 8px;
}

.qr-hash-warn-actions {
  display: flex;
  gap: 6px;
}

.input-hint.warn {
  color: #b05000;
}

.input-hint.warn i {
  margin-right: 3px;
}

/* ── Business hours structured input ───────────────────────────── */
.biz-hours-block {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label-sm {
  font-size: 0.78rem;
  font-weight: 600;
  color: #5c6472;
  margin: 0;
}

.day-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.day-chip {
  padding: 4px 10px;
  border-radius: 20px;
  border: 1.5px solid #d5cdc3;
  background: #f8f6f3;
  color: #6b6460;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  line-height: 1.4;
}
.day-chip.active {
  border-color: #BD945A;
  background: #fdf6ec;
  color: #a07c4a;
}
.day-chip:hover:not(.active) { border-color: #BD945A; color: #BD945A; }

.time-range-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.time-input {
  flex: 1;
  max-width: 140px;
  font-size: 0.85rem;
}

.time-sep {
  font-size: 0.8rem;
  color: #8a8480;
  flex-shrink: 0;
}

.biz-hours-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 0;
  font-size: 0.78rem;
  color: #a07c4a;
  font-style: italic;
}
.biz-hours-preview i { font-size: 0.72rem; opacity: 0.7; }

/* ── Location picker ────────────────────────────────────────────── */
.location-block {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label-hint {
  font-weight: 400;
  color: #9a9490;
  font-size: 0.75rem;
}

.location-search-row {
  display: flex;
  gap: 7px;
  align-items: flex-start;
}

.location-input-wrap { position: relative; flex: 1; }

.location-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #e0d8ce;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.12);
  z-index: 100;
  max-height: 220px;
  overflow-y: auto;
}

.location-option {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 9px 12px;
  background: none;
  border: none;
  border-bottom: 1px solid #f2ede7;
  text-align: left;
  cursor: pointer;
  font-size: 0.82rem;
  color: #3a3228;
  transition: background 0.12s;
  line-height: 1.35;
}
.location-option:last-child { border-bottom: none; }
.location-option:hover { background: #fdf6ec; }
.location-option i { color: #BD945A; flex-shrink: 0; margin-top: 2px; }
.location-option span { flex: 1; }

.location-gps-btn {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1.5px solid #d5cdc3;
  background: #f8f6f3;
  color: #6b6460;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.location-gps-btn:hover { border-color: #BD945A; color: #BD945A; background: #fdf6ec; }
.location-gps-btn.locating { color: #BD945A; border-color: #BD945A; animation: pulse 1s infinite; }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

.location-confirmed {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f2fbf4;
  border: 1px solid #b8dfc0;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #2d6a40;
}
.location-confirmed i { color: #4a9e62; flex-shrink: 0; }
.location-confirmed span { flex: 1; line-height: 1.3; }
.location-clear {
  background: none;
  border: none;
  cursor: pointer;
  color: #7a9e84;
  font-size: 1rem;
  padding: 0 2px;
  line-height: 1;
  flex-shrink: 0;
}
.location-clear:hover { color: #c0392b; }

/* ── Social handle inputs ────────────────────────────────────────── */
.handle-input-wrap {
  display: flex;
  align-items: center;
  border: 1px solid #ced4da;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.handle-input-wrap:focus-within {
  border-color: #BD945A;
  box-shadow: 0 0 0 3px rgba(189, 148, 90, 0.12);
}
.handle-prefix {
  padding: 0.375rem 0.6rem 0.375rem 0.75rem;
  background: #f8f6f3;
  color: #9a8878;
  font-size: 0.82rem;
  font-weight: 600;
  border-right: 1px solid #e8dfd0;
  white-space: nowrap;
  user-select: none;
}
.handle-input {
  border: none !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  flex: 1;
}
.handle-input:focus { outline: none; }

.input-hint {
  display: block;
  font-size: 0.72rem;
  color: #9a9490;
  margin-top: 3px;
  font-style: italic;
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
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  max-width: 1120px;
  overflow: hidden;
  padding: 0;
  width: min(100%, 1120px);
}

.modal-title-row {
  align-items: start;
  border-bottom: 1px solid #ece7de;
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  padding: 18px 20px 14px;
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
  flex: 1;
  gap: 0;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  min-height: 0;
  overflow: hidden;
}

.modal-pane {
  min-width: 0;
}

.modal-pane-scroll {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  padding: 16px 20px 0;
}

.modal-pane-scroll .actions:last-child {
  background: #fffcf7;
  border-top: 1px solid #ede8df;
  margin-top: auto;
  padding: 12px 0 16px;
  position: sticky;
  bottom: 0;
}

.qr-pane {
  background: #fbfaf8;
  border-left: 1px solid #e6dfd4;
  overflow-y: auto;
  padding: 18px 16px;
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

.qr-detail-list {
  display: grid;
  gap: 10px;
  margin: 12px 0;
}

.qr-detail-list div {
  border-bottom: 1px solid #eadfce;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 8px;
}

.qr-detail-list span {
  color: #74695d;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
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
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin-top: 12px;
}

.ribbon-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  min-width: 180px;
}

.ribbon-input-row {
  display: flex;
  gap: 6px;
}

.type-select {
  flex: 0 0 130px;
}

.ribbon-divider {
  align-self: stretch;
  background: #e5e7eb;
  margin: 0 4px;
  width: 1px;
}

.ribbon-menu-row {
  align-items: center;
  display: flex;
  gap: 6px;
}
.ribbon-menu-row .form-select { flex: 1; }

.ribbon-rename-row {
  align-items: center;
  background: #f5f0e8;
  border: 1px solid #e0d5c3;
  border-radius: 6px;
  display: flex;
  gap: 6px;
  padding: 6px 8px;
}

.pill-accent {
  background: #fef3e0;
  color: #8b5527;
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
  grid-template-columns: minmax(320px, 520px);
  justify-content: center;
  margin-top: 12px;
}

.studio-phone {
  border-width: 8px;
  box-shadow: 0 18px 44px rgba(42, 34, 24, 0.13);
  min-height: 560px;
  width: 100%;
}

.studio-phone.dirty {
  border-color: #9f743d;
}

.drawer-backdrop {
  align-items: stretch;
  background: rgba(21, 25, 30, 0.38);
  display: flex;
  inset: 0;
  justify-content: flex-end;
  position: fixed;
  z-index: 55;
}

.side-drawer {
  background: #fffcf7;
  box-shadow: -20px 0 60px rgba(42, 34, 24, 0.2);
  max-width: 520px;
  overflow: auto;
  padding: 20px;
  width: min(100%, 520px);
}

.drawer-actions {
  border-top: 1px solid #e7d7c0;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 14px;
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

/* ── Toast Notifications ──────────────────────────────────────────────────── */
.toast-stack {
  bottom: 24px;
  display: flex;
  flex-direction: column-reverse;
  gap: 8px;
  pointer-events: none;
  position: fixed;
  right: 24px;
  z-index: 9999;
}

.toast-chip {
  align-items: flex-start;
  border-radius: 10px;
  box-shadow: 0 6px 28px rgba(0, 0, 0, 0.18);
  display: flex;
  font-size: 0.875rem;
  font-weight: 500;
  gap: 10px;
  max-width: 400px;
  min-width: 260px;
  padding: 13px 14px;
  pointer-events: auto;
}

.toast-success { background: #14302a; color: #bbf7d0; }
.toast-error   { background: #3b1414; color: #fecaca; }

.toast-chip > i:first-child { flex-shrink: 0; font-size: 1rem; margin-top: 1px; }
.toast-chip > span { flex: 1; line-height: 1.45; }

.toast-close {
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  opacity: 0.6;
  padding: 0;
}
.toast-close:hover { opacity: 1; }

.toast-enter-active,
.toast-leave-active { transition: all 0.22s ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(28px); }

/* ── Item Add Drawer ──────────────────────────────────────────────────────── */
.item-add-drawer { max-width: 380px; }

.item-type-toggle {
  display: grid;
  gap: 8px;
  grid-template-columns: 1fr 1fr;
  margin-bottom: 20px;
}

.item-type-toggle button {
  align-items: flex-start;
  background: #f9f5ef;
  border: 2px solid #e8dccb;
  border-radius: 8px;
  color: #4b3f30;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 14px;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}
.item-type-toggle button i { font-size: 1.2rem; color: #9b7a4f; }
.item-type-toggle button span { font-size: 0.9rem; font-weight: 700; }
.item-type-toggle button small { color: #7a6649; font-size: 0.75rem; line-height: 1.3; }
.item-type-toggle button.active { background: #fff7ed; border-color: #bd945a; }
.item-type-toggle button.active i { color: #bd945a; }

.item-drawer-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 20px;
}
.item-drawer-fields label { color: #4b3f30; display: flex; flex-direction: column; font-size: 0.82rem; font-weight: 700; gap: 5px; text-transform: uppercase; }
.item-drawer-fields .required { color: #c84b4b; font-size: 0.7rem; }

.tag-combobox {
  position: relative;
  display: flex;
  align-items: center;
}
.tag-combobox input {
  padding-right: 28px;
  text-transform: none;
  font-weight: 400;
}
.tag-clear-btn {
  background: transparent;
  border: 0;
  color: #9a8870;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0 6px;
  position: absolute;
  right: 2px;
}
.tag-clear-btn:hover { color: #c84b4b; }

/* Root-level canvas add button */
.canvas-root-add {
  align-items: center;
  background: transparent;
  border: 1.5px dashed #d4b88a;
  border-radius: 8px;
  color: #9b7a4f;
  cursor: pointer;
  display: flex;
  font-size: 0.82rem;
  font-weight: 600;
  gap: 6px;
  justify-content: center;
  margin-top: 12px;
  padding: 10px 0;
  transition: border-color 0.15s, color 0.15s;
  width: 100%;
}
.canvas-root-add:hover { border-color: #bd945a; color: #7a542a; }
</style>

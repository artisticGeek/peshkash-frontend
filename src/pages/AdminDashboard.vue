<template>
  <div class="admin-shell" :data-sidebar="sidebarState">
    <aside class="admin-sidebar" :class="{ 'sidebar--overlay-open': sidebarOverlayOpen }">
      <div class="sidebar-brand">
        <i class="bi bi-grid-1x2-fill sidebar-logo"></i>
        <span class="sidebar-brand-name">Peshkash</span>
        <button class="sidebar-brand-toggle" type="button" :title="sidebarState === 'full' ? 'Compact' : 'Expand'" @click="cycleSidebar">
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
        <button class="nav-button sidebar-cycle-btn" type="button" :title="sidebarState === 'full' ? 'Compact' : 'Expand'" @click="cycleSidebar">
          <i :class="sidebarState === 'full' ? 'bi bi-layout-sidebar-inset-reverse' : 'bi bi-layout-sidebar-reverse'"></i>
          <span class="nav-label">{{ sidebarState === 'full' ? 'Compact' : 'Expand' }}</span>
        </button>
      </div>
    </aside>

    <main class="admin-main" :class="{ 'admin-main--canvas': activeSection === 'qr-templates' }">
      <header class="workspace-header">
        <div class="workspace-header-left">
          <button v-if="backDestLabel" class="back-btn" :title="`Back to ${backDestLabel}`" :aria-label="`Back to ${backDestLabel}`" @click="goBack">
            <i class="bi bi-arrow-left"></i>
            <span>{{ backDestLabel }}</span>
          </button>
          <div class="workspace-title">
            <h2>{{ activeTitle }}</h2>
          </div>
        </div>
        <div class="workspace-header-right">
          <button class="refresh-btn" :disabled="loading" title="Refresh" aria-label="Refresh" @click="loadAll">
            <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
          </button>
          <!-- Workspace gear — home page only, opens modal -->
          <button v-if="activeSection === 'home'" class="ws-gear-btn" type="button" @click="showWsModal = true" :title="selectedVendor?.displayName || 'Switch workspace'">
            <i class="bi bi-gear-fill"></i>
            <span class="ws-vendor-label">{{ selectedVendor?.displayName || 'Workspace' }}</span>
          </button>
        </div>
      </header>

      <!-- Toasts are rendered via Teleport below -->

      <section v-if="activeSection === 'home'" class="home-workspace">

        <!-- ── Metric strip ──────────────────────────────────────────── -->
        <div class="home-metrics">
          <RouterLink class="metric-tile" to="/dashboard/events">
            <span class="metric-tile-icon"><i class="bi bi-calendar2-week"></i></span>
            <div>
              <strong class="metric-value">{{ vendorEvents.length }}</strong>
              <span class="metric-label">Events</span>
            </div>
            <span class="metric-tile-sub" :class="vendorEvents.filter(e => e.status === 'active').length ? 'live' : ''">
              {{ vendorEvents.filter(e => e.status === 'active').length }} live
            </span>
          </RouterLink>
          <RouterLink class="metric-tile" to="/dashboard/menus/studio">
            <span class="metric-tile-icon"><i class="bi bi-layout-three-columns"></i></span>
            <div>
              <strong class="metric-value">{{ vendorMenus.length }}</strong>
              <span class="metric-label">Menus</span>
            </div>
            <span class="metric-tile-sub">{{ vendorMenus.filter(m => m.isActive).length }} active</span>
          </RouterLink>
          <RouterLink class="metric-tile" to="/dashboard/qr">
            <span class="metric-tile-icon"><i class="bi bi-qr-code"></i></span>
            <div>
              <strong class="metric-value">{{ vendorQrMappings.length }}</strong>
              <span class="metric-label">QR Assets</span>
            </div>
            <span class="metric-tile-sub">{{ vendorQrMappings.reduce((s, m) => s + (m.usageCount || 0), 0) }} scans</span>
          </RouterLink>
          <RouterLink class="metric-tile" to="/dashboard/menus/studio">
            <span class="metric-tile-icon"><i class="bi bi-boxes"></i></span>
            <div>
              <strong class="metric-value">{{ items.length }}</strong>
              <span class="metric-label">Items</span>
            </div>
            <span class="metric-tile-sub">across all menus</span>
          </RouterLink>
        </div>

        <!-- ── Charts row ──────────────────────────────────────────────── -->
        <div class="home-charts-row">
          <div class="panel home-chart-panel">
            <div class="panel-heading">
              <h3>QR Scans by Code</h3>
              <div class="d-flex gap-1">
                <RouterLink class="icon-btn" to="/dashboard/analytics" title="Full Analytics"><i class="bi bi-bar-chart-line"></i></RouterLink>
                <RouterLink class="icon-btn" to="/dashboard/qr" title="QR Bank"><i class="bi bi-arrow-right"></i></RouterLink>
              </div>
            </div>
            <div v-if="vendorQrMappings.length" class="chart-canvas-wrap">
              <Bar :data="qrScanChartData" :options="qrScanChartOptions" />
            </div>
            <p v-else class="muted chart-empty">No QR codes yet — create one in QR Bank.</p>
          </div>
          <div class="panel home-chart-panel">
            <div class="panel-heading">
              <h3>Assets Overview</h3>
            </div>
            <div class="chart-canvas-wrap chart-canvas-wrap--donut">
              <Doughnut :data="overviewChartData" :options="overviewChartOptions" />
            </div>
          </div>
        </div>

        <!-- ── Events list ───────────────────────────────────────────── -->
        <div class="panel home-events-panel">
          <div class="panel-heading">
            <h3>Events</h3>
            <RouterLink class="icon-btn" to="/dashboard/events" title="Manage events"><i class="bi bi-arrow-right"></i></RouterLink>
          </div>
          <div class="table-wrap">
            <table class="table table-sm align-middle action-table home-events-table">
              <thead><tr><th>Event</th><th>Window</th><th>Status</th><th>Menus</th><th></th></tr></thead>
              <tbody>
                <tr v-for="event in vendorEvents.slice(0, 8)" :key="event.id">
                  <td><strong>{{ event.displayName }}</strong><br /><code class="slug">{{ event.name }}</code></td>
                  <td class="col-window">{{ eventWindow(event) }}</td>
                  <td><span class="status-pill" :class="`status-${event.status}`">{{ event.status }}</span></td>
                  <td>{{ eventMenus(event.id).length }}</td>
                  <td><RouterLink class="icon-btn" :to="adminEventRoute(event)" title="Open event"><i class="bi bi-box-arrow-up-right"></i></RouterLink></td>
                </tr>
                <tr v-if="!vendorEvents.length"><td colspan="5" class="muted">No events yet.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section v-if="activeSection === 'vendors' || activeSection === 'vendorWorkspace'" class="stack-layout">
        <div class="panel">
          <div class="panel-heading">
            <h3>Vendors</h3>
            <button class="btn btn-primary" @click="openVendorEditor()"><i class="bi bi-plus-lg"></i> New Vendor</button>
          </div>
          <div class="table-wrap">
            <table class="table table-sm align-middle action-table vendors-table">
              <thead><tr><th>Vendor</th><th>Description</th><th>Events</th><th>Contact Card</th><th></th></tr></thead>
              <tbody>
                <tr v-for="vendor in vendors" :key="vendor.id" class="clickable-row" @click="openVendorEditor(vendor)">
                  <td>
                    <strong>{{ vendor.displayName }}</strong>
                    <span v-if="vendor.id === selectedVendorId" class="workspace-badge" title="Current workspace">●</span>
                    <br /><code class="slug">{{ vendor.name }}</code>
                  </td>
                  <td class="vendor-desc">{{ vendor.description || '—' }}</td>
                  <td>{{ vendorEventCount(vendor.id) }}</td>
                  <td>
                    <span :class="vendor.hasContactPage ? 'status-dot active' : 'status-dot'" :title="vendor.hasContactPage ? 'Contact card active' : 'No contact card'"></span>
                  </td>
                  <td class="row-actions" @click.stop>
                    <button class="icon-btn" title="Edit vendor" @click.stop="openVendorEditor(vendor)"><i class="bi bi-pencil"></i></button>
                    <button class="icon-btn icon-btn--danger" title="Delete vendor" @click.stop="deleteVendorById(vendor.id, vendor.displayName)"><i class="bi bi-trash"></i></button>
                  </td>
                </tr>
                <tr v-if="!vendors.length"><td colspan="5" class="muted">No vendors yet.</td></tr>
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
                  <button v-if="vendorForm.id" class="btn btn-outline-danger" type="button" title="Delete this vendor" @click="deleteVendorConfirmed"><i class="bi bi-trash"></i> Delete</button>
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
            <table class="table table-sm align-middle action-table events-table">
              <thead><tr><th>Event</th><th>Window</th><th>Status</th><th>Menus</th><th></th></tr></thead>
              <tbody>
                <tr v-for="event in vendorEvents" :key="event.id">
                  <td><strong>{{ event.displayName }}</strong><br /><code>{{ event.name }}</code></td>
                  <td>{{ eventWindow(event) }}</td>
                  <td><span class="status-pill" :class="`status-${event.status}`">{{ event.status }}</span></td>
                  <td>{{ eventMenus(event.id).length }}</td>
                  <td class="row-actions">
                    <RouterLink class="icon-btn" :to="adminEventRoute(event)" title="Open event workspace"><i class="bi bi-box-arrow-up-right"></i></RouterLink>
                    <button class="icon-btn" title="Edit event" @click="editEventInline(event)"><i class="bi bi-pencil"></i></button>
                    <RouterLink v-if="event.status !== 'active'" class="icon-btn icon-btn--gold" :to="adminPublishRoute(event)" title="Publish event"><i class="bi bi-send-check"></i></RouterLink>
                    <button v-if="event.status !== 'active'" class="icon-btn icon-btn--danger" title="Delete event" @click.stop="deleteEvent(event)"><i class="bi bi-trash"></i></button>
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
              :title="!selectedEventMenus.length ? 'Link a menu first' : 'Activate event'"
            ><i class="bi bi-send-check"></i> Activate</button>
            <button
              v-else
              class="btn btn-outline-danger"
              @click="confirmDeactivate"
            ><i class="bi bi-stop-circle"></i> Deactivate</button>
            <RouterLink class="icon-btn icon-btn--outlined" :to="adminQrSheetRoute(selectedEventForItems!)" title="QR Sheet"><i class="bi bi-qr-code"></i></RouterLink>
            <RouterLink class="icon-btn icon-btn--outlined" to="/dashboard/menus/studio" title="Menu Designer"><i class="bi bi-layout-three-columns"></i></RouterLink>
          </div>
        </div>

          <!-- ── Event QR ────────────────────────────────────────────────── -->
          <div v-if="selectedEventForItems" class="panel event-qr-panel">
            <div class="event-qr-header">
              <div>
                <h3>Event QR</h3>
                <p class="hint">One permanent QR for this event. It always resolves to the current linked menu — no reprinting needed when menus change.</p>
              </div>
              <span v-if="eventQrMapping" class="status-pill status-active">Active</span>
            </div>

            <div v-if="eventQrMapping" class="event-qr-body">
              <img v-if="eventQrDataUrl" class="qr-image event-qr-img" :src="eventQrDataUrl" alt="Event QR code" />
              <div class="event-qr-details">
                <div class="qr-url-row">
                  <code>{{ eventQrMapping.shortQrUrl }}</code>
                  <button class="btn btn-outline-secondary btn-sm" @click="copyText(eventQrMapping!.shortQrUrl)" title="Copy URL"><i class="bi bi-clipboard"></i></button>
                </div>
                <p class="hint dynamic-hint"><i class="bi bi-arrow-repeat"></i> Resolves dynamically → serves current linked menu at scan time</p>
                <div class="event-qr-actions">
                  <a :href="eventQrMapping.shortQrUrl" target="_blank" rel="noreferrer" class="btn btn-outline-secondary btn-sm"><i class="bi bi-box-arrow-up-right"></i> Test scan</a>
                  <button class="btn btn-outline-secondary btn-sm" @click="openQrEditor(eventQrMapping!)"><i class="bi bi-pencil"></i> Manage</button>
                </div>
              </div>
            </div>

            <div v-else class="event-qr-empty">
              <i class="bi bi-qr-code event-qr-placeholder-icon"></i>
              <div>
                <p class="hint">No QR assigned yet. Generate one to get a permanent, printable QR code for this event.</p>
                <button class="btn btn-primary" :disabled="loading" @click="generateEventQr()"><i class="bi bi-qr-code"></i> Generate Event QR</button>
              </div>
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

          <div class="panel">
            <div class="panel-heading">
              <h3>Linked Menus</h3>
            </div>
            <div v-if="attachableMenus.length" class="attach-menu-row">
              <select v-model.number="attachMenuId" class="form-select form-select-sm">
                <option :value="0">Attach a menu…</option>
                <option v-for="m in attachableMenus" :key="m.id" :value="m.id">{{ m.displayName }}<template v-if="m.type === 'personalized'"> (personalized)</template></option>
              </select>
              <button class="icon-btn icon-btn--gold" :disabled="!attachMenuId || loading" @click="attachMenuToEvent(attachMenuId)" title="Attach menu"><i class="bi bi-link-45deg"></i></button>
            </div>
            <div v-if="selectedEventMenus.length" class="menu-chips">
              <div v-for="menu in selectedEventMenus" :key="menu.id" class="menu-chip">
                <span class="type-dot" :class="menu.type"></span>
                <div class="menu-chip-info">
                  <strong>{{ menu.displayName }}</strong>
                  <span class="muted">{{ menuItems(menu.id).length }} items</span>
                </div>
                <div class="menu-chip-actions">
                  <a :href="buildAbsolute(menuPathFor(selectedEventForItems, menu))" target="_blank" rel="noreferrer" class="icon-btn" title="View public menu"><i class="bi bi-box-arrow-up-right"></i></a>
                  <RouterLink :to="adminMenuStudioRoute(menu)" class="icon-btn" title="Open in Studio"><i class="bi bi-layout-three-columns"></i></RouterLink>
                  <button class="icon-btn icon-btn--danger" :disabled="loading" title="Unlink menu" @click="detachMenuFromEvent(menu.id)"><i class="bi bi-x-lg"></i></button>
                </div>
              </div>
            </div>
            <p v-else class="muted" style="padding:8px 0">No menus linked yet.</p>
          </div>

          <div class="panel wide-panel">
            <div class="panel-heading">
              <h3>Add-ons</h3>
              <button class="icon-btn" title="Review &amp; publish" @click="openPublishDrawer(selectedEventForItems)"><i class="bi bi-bag-check"></i></button>
            </div>
            <div class="product-grid">
              <div v-for="product in eventProducts" :key="product.key" class="product-card" :class="{ selected: product.selected }">
                <i :class="product.icon"></i>
                <div>
                  <strong>{{ product.label }}</strong>
                </div>
                <span class="product-state">{{ product.selected ? 'On' : 'Off' }}</span>
              </div>
            </div>
          </div>

          <div class="panel wide-panel">
            <div class="panel-heading">
              <h3>QR Targets</h3>
              <RouterLink class="icon-btn" :to="adminQrSheetRoute(selectedEventForItems)" title="Print QR sheet"><i class="bi bi-printer"></i></RouterLink>
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

        <div v-if="loading && !selectedEventForItems" class="panel empty-state">
          <p class="hint">Loading event…</p>
        </div>
        <div v-if="!loading && !selectedEventForItems" class="panel empty-state">
          <h3>Event not found</h3>
          <p class="hint">Choose an event from the event list, or create a new draft.</p>
          <RouterLink class="btn btn-primary" to="/dashboard/events">Back to Events</RouterLink>
        </div>
      </section>

      <section v-if="activeSection === 'menus'" class="two-column">
        <form class="panel" @submit.prevent="saveMenu">
          <h3>{{ menuForm.id ? 'Edit Menu' : 'Create Menu' }}</h3>
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
                  <td class="row-actions">
                    <button class="icon-btn" title="Edit menu" @click="editMenu(menu)"><i class="bi bi-pencil"></i></button>
                    <button class="icon-btn icon-btn--danger" title="Delete menu" @click="deleteMenu(menu)"><i class="bi bi-trash"></i></button>
                  </td>
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
                <td class="row-actions">
                  <button v-if="row.isDirty || row.isNew" class="btn btn-primary btn-sm" @click="saveItemRow(row)">Save</button>
                  <span v-else class="saved-state">Saved</span>
                  <button class="icon-button outlined small" title="Delete item" @click="deleteItemRow(row)"><i class="bi bi-trash"></i></button>
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

      <!-- ── Analytics Dashboard ─────────────────────────────────────── -->
      <section v-if="activeSection === 'insights'" class="panel" style="min-height: 80vh;">
        <AnalyticsSection />
      </section>

      <section v-if="activeSection === 'designer'" class="designer-grid" :data-tab="designerMobileTab">

        <!-- Mobile tab bar (hidden on desktop via CSS) -->
        <div class="designer-mobile-tabs">
          <button :class="{ active: designerMobileTab === 'settings' }" @click="designerMobileTab = 'settings'">
            <i class="bi bi-sliders"></i> Manage
          </button>
          <button :class="{ active: designerMobileTab === 'canvas' }" @click="designerMobileTab = 'canvas'">
            <i class="bi bi-phone"></i> Preview
          </button>
        </div>

        <!-- Two-pane designer header -->
        <div class="panel designer-controls designer-panel-settings">
          <div class="designer-header-panes">
            <!-- Pane 1: Working Menu -->
            <div class="designer-pane">
              <span class="pane-label">Working Menu</span>
              <div class="pane-row">
                <select v-model.number="selectedMenuIdForItems" class="form-select" @change="showMenuRenameInline = false">
                  <option :value="0">Select menu</option>
                  <option v-for="menu in vendorMenus" :key="menu.id" :value="menu.id">
                    {{ isMenuLinked(menu.id) ? '∞ ' : '' }}{{ menu.displayName }}{{ menu.type === 'personalized' ? ' ✦' : '' }}
                  </option>
                </select>
                <button v-if="selectedMenuForItems && !showMenuRenameInline" class="icon-button outlined small" title="Rename menu" @click="openMenuRename"><i class="bi bi-pencil"></i></button>
                <button class="icon-button outlined small" :disabled="!selectedMenuIdForItems" title="Link to event" @click="showLinkEventModal = true"><i class="bi bi-link-45deg"></i></button>
              </div>
              <!-- Inline rename form -->
              <div v-if="showMenuRenameInline" class="ribbon-rename-row">
                <input v-model.trim="menuRenameValue" class="form-control" placeholder="New display name" @keydown.enter.prevent="saveMenuRename" @keydown.escape="showMenuRenameInline = false" />
                <button class="btn btn-primary btn-sm" :disabled="!menuRenameValue.trim()" @click="saveMenuRename"><i class="bi bi-check2"></i></button>
                <button class="btn btn-outline-secondary btn-sm" @click="showMenuRenameInline = false"><i class="bi bi-x"></i></button>
              </div>
              <!-- Linked event indicator -->
              <div v-if="selectedMenuIdForItems && linkedEventsForMenu(selectedMenuIdForItems)" class="linked-event-hint">
                <i class="bi bi-infinity"></i>
                <span>{{ linkedEventsForMenu(selectedMenuIdForItems) }}</span>
              </div>
            </div>

            <div class="designer-pane-divider"></div>

            <!-- Pane 2: New Menu -->
            <div class="designer-pane">
              <span class="pane-label">New Menu</span>
              <div class="pane-row">
                <input v-model.trim="designerMenuName" class="form-control" placeholder="Display name" />
                <select v-model="designerMenuType" class="form-select form-select-sm type-select">
                  <option value="generic">Generic</option>
                  <option value="personalized">Personalized</option>
                </select>
                <button class="btn btn-primary icon-label" :disabled="!designerMenuName || !selectedVendor" @click="createDesignerMenu">
                  <i class="bi bi-plus-lg"></i>
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="panel menu-render designer-panel-canvas" @dragover.prevent @drop="dropOnMenuRoot">
          <div class="panel-heading">
            <div>
              <h3>{{ selectedMenuForItems?.displayName || 'Select a menu' }}</h3>
            </div>
            <div class="actions slim-actions">
              <button class="icon-button outlined" :disabled="!selectedMenuForItems" title="Browse item library" aria-label="Browse library" @click="showItemPoolDrawer = true"><i class="bi bi-search"></i></button>
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
                <td class="row-actions">
                  <button v-if="row.isDirty || row.isNew" class="btn btn-primary btn-sm" @click="saveItemRow(row)">Save</button>
                  <span v-else class="saved-state">Saved</span>
                  <button class="icon-button outlined small" title="Delete item" @click="deleteItemRow(row)"><i class="bi bi-trash"></i></button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="adhoc-box">
          <h4>Adhoc Items</h4>
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

      <section v-if="activeSection === 'qr'" class="qr-bank-section">

        <!-- ── QR Bank header ─────────────────────────────────────── -->
        <div class="qr-bank-header panel">
          <div>
            <h3>QR Bank <span v-if="vendorQrMappings.length" class="qr-count-badge">{{ vendorQrMappings.length }}</span></h3>
          </div>
          <button class="btn btn-primary" type="button" @click="openQrEditor()">
            <i class="bi bi-plus-lg"></i> New QR Asset
          </button>
        </div>

        <!-- ── Empty state ────────────────────────────────────────── -->
        <div v-if="!vendorQrMappings.length" class="qr-empty-state panel">
          <i class="bi bi-qr-code qr-empty-icon"></i>
          <div>
            <p class="mb-0">No QR assets yet.</p>
            <p class="hint">Create your first reusable QR to start your physical QR inventory.</p>
          </div>
        </div>

        <!-- ── Filters + table ────────────────────────────────────── -->
        <template v-else>
          <div class="qr-filters-bar">
            <div class="sheet-search qr-search">
              <i class="bi bi-search"></i>
              <input v-model.trim="qrSearch" class="form-control" placeholder="Search by hash or target…" />
            </div>
            <div class="qr-type-tabs">
              <button :class="{ active: qrTypeFilter === 'all' }" @click="qrTypeFilter = 'all'">All</button>
              <button :class="{ active: qrTypeFilter === 'dynamic' }" @click="qrTypeFilter = 'dynamic'">Event</button>
              <button :class="{ active: qrTypeFilter === 'contact' }" @click="qrTypeFilter = 'contact'">Contact</button>
              <button :class="{ active: qrTypeFilter === 'menu' }" @click="qrTypeFilter = 'menu'">Menu</button>
              <button :class="{ active: qrTypeFilter === 'item' }" @click="qrTypeFilter = 'item'">Item</button>
            </div>
            <select v-model="qrSortBy" class="form-select form-select-sm qr-sort-select">
              <option value="scans">Most scans</option>
              <option value="hash">Hash A–Z</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div class="panel">
            <div class="table-wrap">
              <table class="table table-sm align-middle action-table qr-table">
                <thead>
                  <tr>
                    <th>Hash</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th>Status</th>
                    <th>Paid</th>
                    <th class="col-scans">Scans</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="mapping in filteredQrMappings"
                    :key="mapping.id"
                    class="clickable-row"
                    :class="{ 'qr-row-warn': qrStatus(mapping) === 'needs_reassignment' }"
                    @click="openQrEditor(mapping)"
                  >
                    <td><code class="qr-hash-code">{{ mapping.qrHash }}</code></td>
                    <td><span :class="`type-badge type-${qrTypeBadge(mapping).css}`">{{ qrTypeBadge(mapping).label }}</span></td>
                    <td class="qr-target-cell">{{ qrTargetLabel(mapping) }}</td>
                    <td>
                      <span :class="`status-chip chip-${qrStatus(mapping)}`">
                        <i :class="qrStatus(mapping) === 'needs_reassignment' ? 'bi bi-exclamation-circle-fill' : qrStatus(mapping) === 'inactive' ? 'bi bi-dash-circle' : 'bi bi-check-circle-fill'"></i>
                        {{ qrStatus(mapping) === 'needs_reassignment' ? 'Reassign' : qrStatus(mapping) === 'inactive' ? 'Inactive' : 'Active' }}
                      </span>
                    </td>
                    <td>
                      <span :class="mapping.paid !== false ? 'paid-badge paid-badge--paid' : 'paid-badge paid-badge--unpaid'">
                        {{ mapping.paid !== false ? 'Paid' : 'Unpaid' }}
                      </span>
                    </td>
                    <td class="col-scans">{{ mapping.usageCount || 0 }}</td>
                    <td class="row-actions" @click.stop>
                      <button class="icon-btn" title="Edit" @click.stop="openQrEditor(mapping)"><i class="bi bi-pencil"></i></button>
                      <button class="icon-btn" title="Print template" @click.stop="openPrintForQr(mapping)"><i class="bi bi-printer"></i></button>
                    </td>
                  </tr>
                  <tr v-if="!filteredQrMappings.length">
                    <td colspan="7" class="muted" style="padding:20px;text-align:center">No QR codes match your filter.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- ── QR Asset modal v2 ──────────────────────────────────── -->
        <div v-if="showQrEditor" class="modal-backdrop-custom" @click.self="closeQrEditor">
          <form class="qr-asset-modal" @submit.prevent="saveQr">
            <!-- Header strip -->
            <div class="qr-modal-header">
              <div class="qr-modal-header-left">
                <span v-if="selectedQrMapping" :class="`type-badge type-${qrTypeBadge(selectedQrMapping).css}`">{{ qrTypeBadge(selectedQrMapping).label }}</span>
                <h3>{{ selectedQrMapping ? selectedQrMapping.qrHash : 'New QR Asset' }}</h3>
                <span v-if="selectedQrMapping" :class="`status-chip chip-${qrStatus(selectedQrMapping)}`">
                  <i :class="qrStatus(selectedQrMapping) === 'needs_reassignment' ? 'bi bi-exclamation-circle-fill' : qrStatus(selectedQrMapping) === 'inactive' ? 'bi bi-dash-circle' : 'bi bi-check-circle-fill'"></i>
                  {{ qrStatus(selectedQrMapping) === 'needs_reassignment' ? 'Needs reassignment' : qrStatus(selectedQrMapping) === 'inactive' ? 'Inactive' : 'Active' }}
                </span>
              </div>
              <div class="qr-modal-header-right">
                <div v-if="selectedQrMapping" class="qr-analytics-strip">
                  <div class="qr-stat-chip">
                    <i class="bi bi-eye qr-stat-icon"></i>
                    <div class="qr-stat-content">
                      <strong class="qr-stat-val">{{ selectedQrMapping.usageCount || 0 }}</strong>
                      <span class="qr-stat-label">scans</span>
                    </div>
                    <svg class="qr-stat-spark" viewBox="0 0 44 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="0" y="0" width="44" height="10" rx="3" fill="#e8dccb"/>
                      <rect x="0" y="0" :width="Math.max(4, qrScanBarPct(selectedQrMapping) * 0.44)" height="10" rx="3" fill="#BD945A"/>
                    </svg>
                  </div>
                </div>
                <!-- Edit toggle in view mode -->
                <button v-if="qrModalMode === 'view'" class="btn btn-sm btn-primary qr-edit-btn" type="button" @click="qrModalMode = 'edit'">
                  <i class="bi bi-pencil"></i> Edit
                </button>
                <button v-else-if="qrModalMode === 'edit' && selectedQrMapping" class="btn btn-sm btn-outline-secondary qr-edit-btn" type="button" @click="qrModalMode = 'view'">
                  <i class="bi bi-eye"></i> View
                </button>
                <button class="icon-button" type="button" aria-label="Close" @click="closeQrEditor"><i class="bi bi-x-lg"></i></button>
              </div>
            </div>

            <!-- VIEW MODE: read-only display -->
            <div v-if="qrModalMode === 'view' && selectedQrMapping" class="qr-view-body">

              <!-- LEFT: QR visual + destination -->
              <div class="qr-view-visual-pane">
                <div class="qr-view-qr-wrap">
                  <div v-if="!qrForm.selectedTemplateId || !currentQrTemplate" class="plain-qr-center">
                    <img v-if="qrCodeDataUrl" class="qr-view-img" :src="qrCodeDataUrl" alt="QR code" />
                    <div v-else class="qr-view-placeholder"><i class="bi bi-qr-code"></i></div>
                  </div>
                  <div v-else class="tpl-canvas-outer">
                    <div class="tpl-canvas-preview" :style="tplCanvasStyle">
                      <template v-for="el in currentTemplateElements" :key="el.id">
                        <div :style="tplElStyle(el)">
                          <template v-if="el.type === 'qr'">
                            <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" style="width:100%;height:100%;object-fit:contain;display:block" />
                            <div v-else style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#eee;color:#aaa;font-size:1.4rem"><i class="bi bi-qr-code"></i></div>
                          </template>
                          <img v-else-if="el.type === 'image' && el.src" :src="el.src" :style="`width:100%;height:100%;object-fit:${el.objectFit||'contain'};opacity:${el.opacity??1}`" />
                          <template v-else-if="el.type === 'text'">{{ el.content }}</template>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
                <div v-if="currentQrTemplate" class="qr-view-tpl-chip">
                  <i class="bi bi-palette"></i> {{ currentQrTemplate.name }}
                </div>
                <div v-else class="qr-view-tpl-chip qr-view-tpl-chip--none">
                  <i class="bi bi-qr-code"></i> Plain QR
                </div>

                <!-- Destination card -->
                <div class="qr-view-dest">
                  <div class="qr-view-dest-row">
                    <span class="qr-view-dest-key">Scan URL</span>
                    <div class="qr-view-dest-val-wrap">
                      <a v-if="qrPreview.shortQrUrl" :href="qrPreview.shortQrUrl" target="_blank" rel="noreferrer" class="qr-view-url">{{ qrPreview.shortQrUrl }}</a>
                      <span v-else class="muted">—</span>
                      <button v-if="qrPreview.shortQrUrl" class="icon-button small" type="button" @click="copyText(qrPreview.shortQrUrl)" title="Copy"><i class="bi bi-clipboard"></i></button>
                    </div>
                  </div>
                  <div class="qr-view-dest-row">
                    <span class="qr-view-dest-key">Target</span>
                    <strong class="qr-view-dest-val">{{ qrTargetLabel(selectedQrMapping) }}</strong>
                  </div>
                </div>

                <button v-if="qrCodeDataUrl" class="btn btn-outline-secondary btn-sm qr-dl-btn" type="button" @click="downloadQrPng">
                  <i class="bi bi-download"></i> Download QR PNG
                </button>
              </div>

              <!-- RIGHT: Analytics -->
              <div class="qr-view-analytics-pane">
                <p class="form-section-label"><i class="bi bi-bar-chart-line"></i> Scan Analytics</p>
                <div class="qr-view-bigstat">
                  <span class="qr-view-bigstat-num">{{ selectedQrMapping.usageCount || 0 }}</span>
                  <span class="qr-view-bigstat-label">total scans</span>
                </div>
                <div v-if="vendorQrMappings.length" class="qr-view-chart-wrap">
                  <Bar :data="qrViewChartData" :options="qrViewChartOptions" />
                </div>
                <p v-else class="muted" style="font-size:0.8rem">No scan data yet.</p>
                <div class="qr-view-meta-grid">
                  <div class="qr-view-meta-item">
                    <span>Status</span>
                    <span :class="`status-chip chip-${qrStatus(selectedQrMapping)}`" style="font-size:0.72rem">
                      <i :class="qrStatus(selectedQrMapping) === 'inactive' ? 'bi bi-dash-circle' : 'bi bi-check-circle-fill'"></i>
                      {{ qrStatus(selectedQrMapping) === 'needs_reassignment' ? 'Needs reassignment' : qrStatus(selectedQrMapping) === 'inactive' ? 'Inactive' : 'Active' }}
                    </span>
                  </div>
                  <div class="qr-view-meta-item">
                    <span>Payment</span>
                    <span :class="selectedQrMapping.paid !== false ? 'paid-badge paid-badge--paid' : 'paid-badge paid-badge--unpaid'">{{ selectedQrMapping.paid !== false ? 'Paid' : 'Unpaid' }}</span>
                  </div>
                  <div class="qr-view-meta-item">
                    <span>Updated</span>
                    <strong>{{ formatDate(selectedQrMapping.updatedAt) }}</strong>
                  </div>
                </div>
              </div>

            </div>

            <!-- EDIT MODE: 2-column form -->
            <div v-else-if="qrModalMode === 'edit'" class="qr-modal-body-v2">

              <!-- LEFT: Form pane -->
              <div class="modal-pane modal-pane-scroll">
                <p class="form-section-label"><i class="bi bi-pencil-square"></i> {{ selectedQrMapping ? 'Reassign' : 'Configure' }}</p>
                <div class="form-grid">
                  <label class="wide">
                    Hash
                    <input v-if="!selectedQrMapping" v-model.trim="qrForm.qrHash" class="form-control" placeholder="radisson-gurgaon-card" />
                    <div v-else class="readonly-field">
                      <code class="qr-hash-code">{{ qrForm.qrHash }}</code>
                      <span class="field-lock" title="Hash cannot be changed after creation"><i class="bi bi-lock-fill"></i></span>
                    </div>
                  </label>
                  <label>
                    Type
                    <select v-if="!selectedQrMapping" v-model="qrTargetType" class="form-select">
                      <option value="event">Event Dynamic</option>
                      <option value="vendor">Contact Card</option>
                      <option value="menu">Menu Static</option>
                      <option value="item">Item Spotlight</option>
                      <option value="custom">Custom Path</option>
                    </select>
                    <div v-else class="readonly-field">
                      <span :class="`type-badge type-${qrTypeBadge(selectedQrMapping).css}`">{{ qrTypeBadge(selectedQrMapping).label }}</span>
                      <span class="field-lock" title="Type is fixed at creation"><i class="bi bi-lock-fill"></i></span>
                    </div>
                  </label>
                  <label v-if="qrTargetType === 'event' || qrTargetType === 'menu' || qrTargetType === 'item'">
                    Event
                    <select v-model.number="qrForm.eventId" class="form-select">
                      <option :value="0">Select event</option>
                      <option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option>
                    </select>
                  </label>
                  <label v-if="qrTargetType === 'menu'">
                    Menu
                    <select v-model.number="qrForm.menuId" class="form-select">
                      <option :value="0">Select menu</option>
                      <option v-for="menu in menusForQrEvent" :key="menu.id" :value="menu.id">{{ menu.displayName }}</option>
                    </select>
                  </label>
                  <label v-if="qrTargetType === 'item'">
                    Item
                    <select v-model.number="qrForm.itemId" class="form-select">
                      <option :value="0">Select item</option>
                      <option v-for="item in itemsForQrEvent" :key="item.id" :value="item.id">{{ itemLabel(item) }}</option>
                    </select>
                  </label>
                  <label v-if="qrTargetType === 'custom'" class="wide">
                    Destination
                    <input v-model.trim="qrForm.url" class="form-control" placeholder="/vendor/radisson-gurgaon" />
                  </label>
                </div>

                <div class="qr-status-row">
                  <div class="qr-status-field">
                    <p class="form-section-label" style="margin:0 0 6px"><i class="bi bi-toggle-on"></i> Status</p>
                    <div class="seg-control">
                      <button type="button" :class="['seg-btn', { active: qrForm.isActive }]" @click="qrForm.isActive = true">
                        <i class="bi bi-check-circle-fill"></i> Active
                      </button>
                      <button type="button" :class="['seg-btn', { active: !qrForm.isActive }]" @click="qrForm.isActive = false">
                        <i class="bi bi-dash-circle"></i> Inactive
                      </button>
                    </div>
                  </div>
                  <div class="qr-status-field">
                    <p class="form-section-label" style="margin:0 0 6px"><i class="bi bi-currency-rupee"></i> Payment</p>
                    <div class="seg-control">
                      <button type="button" :class="['seg-btn seg-btn--paid', { active: qrForm.paid }]" @click="qrForm.paid = true">
                        <i class="bi bi-check2"></i> Paid
                      </button>
                      <button type="button" :class="['seg-btn seg-btn--unpaid', { active: !qrForm.paid }]" @click="qrForm.paid = false">
                        Unpaid
                      </button>
                    </div>
                  </div>
                </div>

                <div class="actions">
                  <button class="btn btn-primary" type="submit"><i class="bi bi-check2-circle"></i> Save</button>
                  <button v-if="selectedQrMapping" class="btn btn-outline-danger" type="button" @click="deleteQrMappingConfirmed(selectedQrMapping!)"><i class="bi bi-trash"></i></button>
                </div>
              </div>

              <!-- RIGHT: Preview pane -->
              <div class="modal-pane qr-pane">
                <div class="template-select-row">
                  <p class="form-section-label" style="margin:0 0 6px"><i class="bi bi-palette"></i> Print Template</p>
                  <div class="template-select-combo">
                    <select v-model.number="qrForm.selectedTemplateId" class="form-select form-select-sm">
                      <option :value="0">— Plain QR (no template) —</option>
                      <option v-for="t in qrTemplates" :key="t.id" :value="t.id">{{ t.name }}</option>
                    </select>
                  </div>
                  <p v-if="!qrTemplates.length" class="hint mt-1" style="font-size:0.72rem">No templates saved yet. <button type="button" class="link-button" @click="openPrintForQr(selectedQrMapping!)">Create one →</button></p>
                </div>

                <div class="tpl-preview-wrap">
                  <div v-if="!qrForm.selectedTemplateId" class="plain-qr-center">
                    <img v-if="qrCodeDataUrl" class="qr-modal-img" :src="qrCodeDataUrl" alt="QR code" />
                    <div v-else class="qr-modal-img-placeholder"><i class="bi bi-qr-code"></i></div>
                  </div>
                  <div v-else class="tpl-canvas-outer">
                    <div class="tpl-canvas-preview" :style="tplCanvasStyle">
                      <template v-for="el in currentTemplateElements" :key="el.id">
                        <div :style="tplElStyle(el)">
                          <template v-if="el.type === 'qr'">
                            <img v-if="qrCodeDataUrl" :src="qrCodeDataUrl" style="width:100%;height:100%;object-fit:contain;display:block" />
                            <div v-else style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#eee;color:#aaa;font-size:1.4rem"><i class="bi bi-qr-code"></i></div>
                          </template>
                          <img v-else-if="el.type === 'image' && el.src" :src="el.src" :style="`width:100%;height:100%;object-fit:${el.objectFit||'contain'};opacity:${el.opacity??1}`" />
                          <template v-else-if="el.type === 'text'">{{ el.content }}</template>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>

                <div class="qr-pane-footer">
                  <div v-if="qrPreview.shortQrUrl" class="qr-url-row">
                    <a :href="qrPreview.shortQrUrl" target="_blank" rel="noreferrer" class="qr-link-small">{{ qrPreview.shortQrUrl }}</a>
                    <button class="icon-button small" type="button" @click="copyText(qrPreview.shortQrUrl)" title="Copy"><i class="bi bi-clipboard"></i></button>
                  </div>
                  <div v-if="selectedQrMapping" class="qr-modal-meta">
                    <div><span>Target</span><strong>{{ qrTargetLabel(selectedQrMapping) }}</strong></div>
                    <div><span>Updated</span><strong>{{ formatDate(selectedQrMapping.updatedAt) }}</strong></div>
                  </div>
                  <button v-if="qrCodeDataUrl" class="btn btn-outline-secondary btn-sm qr-dl-btn" type="button" @click="downloadQrPng">
                    <i class="bi bi-download"></i> Download QR
                  </button>
                </div>
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

  <!-- Workspace switcher modal -->
  <teleport to="body">
    <div v-if="showWsModal" class="ws-modal-backdrop" @click.self="showWsModal = false">
      <div class="ws-modal">
        <div class="ws-modal-header">
          <h3>Switch Workspace</h3>
          <button class="icon-button" type="button" aria-label="Close" @click="showWsModal = false"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="ws-modal-list">
          <button
            v-for="vendor in vendors"
            :key="vendor.id"
            class="ws-modal-item"
            :class="{ active: vendor.id === selectedVendorId }"
            type="button"
            @click="selectVendorWs(vendor.id)"
          >
            <span class="ws-modal-item-avatar"><i class="bi bi-shop-window"></i></span>
            <span class="ws-modal-item-name">{{ vendor.displayName }}</span>
            <i v-if="vendor.id === selectedVendorId" class="bi bi-check2 ws-modal-check"></i>
          </button>
          <div v-if="!vendors.length" class="ws-modal-empty">No vendors yet.</div>
        </div>
        <div class="ws-modal-footer">
          <RouterLink to="/dashboard/vendors" class="ws-modal-new" @click="showWsModal = false">
            <i class="bi bi-plus-circle"></i>
            <span>New Vendor</span>
          </RouterLink>
        </div>
      </div>
    </div>
  </teleport>

  <!-- Item / Category add MODAL (studio) -->
  <teleport to="body">
    <div v-if="showItemDrawer" class="modal-backdrop-custom" @click.self="showItemDrawer = false">
      <div class="item-add-modal">
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
            <span>Name <span class="required">*</span></span>
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
              Tag <small class="muted">(type freely, or tap a suggestion)</small>
              <div class="tag-combobox">
                <input
                  v-model.trim="itemDraft.enumType"
                  class="form-control"
                  placeholder="e.g. veg, spicy, sale, new…"
                />
                <button v-if="itemDraft.enumType" type="button" class="tag-clear-btn" title="Clear tag" @click="itemDraft.enumType = ''">
                  <i class="bi bi-x"></i>
                </button>
              </div>
              <div v-if="vendorEnumTypes.length > 0" class="tag-suggestions">
                <button
                  v-for="tag in vendorEnumTypes"
                  :key="tag"
                  type="button"
                  class="tag-chip"
                  :class="{ active: itemDraft.enumType === tag }"
                  @click="itemDraft.enumType = itemDraft.enumType === tag ? '' : tag"
                >{{ tag }}</button>
              </div>
              <p v-else class="tag-no-hints">No tags used by this vendor yet — type any label above.</p>
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
      </div>
    </div>
  </teleport>

  <!-- Item Pool pull-out drawer -->
  <teleport to="body">
    <div v-if="showItemPoolDrawer" class="drawer-backdrop" @click.self="showItemPoolDrawer = false">
      <aside class="side-drawer item-pool-drawer">
        <div class="modal-title-row">
          <div>
            <h3>Item Library</h3>
            <p class="hint">Click to add items, or drag onto the canvas</p>
          </div>
          <button class="icon-button" type="button" aria-label="Close" @click="showItemPoolDrawer = false">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="sheet-search studio-search">
          <i class="bi bi-search"></i>
          <input v-model.trim="designerSearch" class="form-control" placeholder="Search items…" autofocus />
        </div>
        <div class="library-list pool-library-list">
          <button
            v-for="item in availableDesignerItems"
            :key="item.id"
            class="library-row"
            draggable="true"
            @dragstart="dragLibraryItem(item)"
            @click="copyItemToDesignedMenu(item); showItemPoolDrawer = false"
          >
            <span><strong>{{ itemLabel(item) }}</strong><small>{{ menuName(item.menuId) }} · {{ item.type || 'item' }}</small></span>
            <i class="bi bi-plus-lg"></i>
          </button>
          <p v-if="!availableDesignerItems.length" class="muted pool-empty">{{ designerSearch ? 'No items match your search.' : 'All items are already in this menu.' }}</p>
        </div>
      </aside>
    </div>
  </teleport>

  <!-- Link Menu to Event modal -->
  <teleport to="body">
    <div v-if="showLinkEventModal" class="ws-modal-backdrop" @click.self="showLinkEventModal = false">
      <div class="ws-modal link-event-modal">
        <div class="ws-modal-header">
          <h3>Link to Event</h3>
          <button class="icon-button" type="button" aria-label="Close" @click="showLinkEventModal = false"><i class="bi bi-x-lg"></i></button>
        </div>
        <div class="link-event-body">
          <p class="hint link-event-hint">Linking <strong>{{ selectedMenuForItems?.displayName || 'this menu' }}</strong> to an event makes it available when guests scan the event QR code.</p>
          <label>
            Event
            <select v-model.number="selectedEventIdForItems" class="form-select">
              <option :value="0">Select event</option>
              <option v-for="event in vendorEvents" :key="event.id" :value="event.id">{{ event.displayName }}</option>
            </select>
          </label>
        </div>
        <div class="ws-modal-footer">
          <button
            class="btn btn-primary link-event-confirm-btn"
            :disabled="!selectedEventIdForItems || !selectedMenuIdForItems"
            @click="linkSelectedMenuToEventAndClose"
          >
            <i class="bi bi-infinity"></i>
            Link Menu to Event
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import axios from 'axios';
import QRCode from 'qrcode';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { Bar, Doughnut } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Tooltip, Legend, Title,
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title);
import QrTargetPreview from '../components/admin/QrTargetPreview.vue';
import MenuTree from '../components/MenuTree.vue';
import QrTemplatePage from './QrTemplatePage.vue';
import PrintStudio from '../components/admin/PrintStudio.vue';
import AnalyticsSection from '../components/analytics/AnalyticsSection.vue';
import { API_BASE_URL } from '../config';

type SectionKey = 'home' | 'vendors' | 'vendorWorkspace' | 'events' | 'eventWorkspace' | 'qrSheet' | 'inventory' | 'analytics' | 'insights' | 'designer' | 'preview' | 'publish' | 'qr' | 'qr-templates' | 'menus' | 'items';
type Vendor = { id: number; name: string; displayName: string; description?: string; contact: string[]; address?: string; hasContactPage: boolean; logoUrl?: string; createdAt?: string };
type EventRow = { id: number; name: string; displayName: string; eventDescription?: string; startTime?: string; endTime?: string; status: string; vendorId: number; vendor?: Vendor };
type MenuRow = { id: number; name: string; displayName: string; description?: string; isActive: boolean; vendorId: number; type: string; sourceMenuId?: number; vendor?: Vendor };
type ItemRow = { id: number; name: string; displayName: string; description?: string; ingredients?: string; image?: string; type?: string; enumType?: string; isActive: boolean; menuId: number; parentId?: number };
type QrMapping = { id: number; qrHash: string; url: string; type: 'static' | 'event' | 'vendor'; isActive: boolean; shortQrUrl: string; finalPublicUrl: string; usageCount?: number; vendorId?: number; eventId?: number; createdAt?: string; updatedAt?: string; expiresAt?: string; paid?: boolean; templateLabel?: string };
type Preview = { eventId: number; menuId: number; itemId?: number; eventName: string; menuName: string; itemName?: string; publicPath: string; publicUrl: string };
type DraftItem = { clientId: string; id?: number; menuId: number; parentId: number; name: string; displayName: string; type: string; enumType: string; description: string; ingredients: string; image: string; isActive: boolean; isDirty: boolean; isNew: boolean };

const sections = [
  { key: 'home',          label: 'Dashboard',        icon: 'bi bi-grid-1x2' },
  { key: 'vendors',       label: 'Vendors',           icon: 'bi bi-building' },
  { key: 'events',        label: 'Event Creator',     icon: 'bi bi-calendar-event' },
  { key: 'designer',      label: 'Menu Designer',     icon: 'bi bi-layout-three-columns' },
  { key: 'qr',            label: 'QR Bank',           icon: 'bi bi-qr-code' },
  { key: 'qr-templates',  label: 'Print Templates',   icon: 'bi bi-layout-wtf' },
  { key: 'insights',      label: 'Analytics',         icon: 'bi bi-bar-chart-line' },
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
  insights:       '/dashboard/analytics',
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
  if (path.startsWith('/dashboard/analytics')) return 'insights';
  return 'home';
}

const activeSection = computed<SectionKey>({
  get: () => sectionFromPath(route.path),
  set: (section) => router.push(dashboardRouteBySection[section]),
});
type SidebarState = 'full' | 'icons' | 'hidden';
function defaultSidebarState(): SidebarState {
  const saved = localStorage.getItem('peshkash-admin-sidebar') as SidebarState | null;
  if (saved && ['full', 'icons', 'hidden'].includes(saved)) {
    // Never restore 'hidden' on desktop — user would be stuck with no nav
    if (saved === 'hidden' && window.innerWidth >= 768) return 'icons';
    return saved;
  }
  return window.innerWidth < 1024 ? 'icons' : 'full';
}
const sidebarState = ref<SidebarState>(defaultSidebarState());
const sidebarOverlayOpen = ref(false);
watch(sidebarState, (v) => localStorage.setItem('peshkash-admin-sidebar', v));

function cycleSidebar() {
  if (window.innerWidth >= 768) {
    // Desktop: only toggle full ↔ icons — 'hidden' traps the user with no nav
    sidebarState.value = sidebarState.value === 'full' ? 'icons' : 'full';
  } else {
    const states: SidebarState[] = ['full', 'icons', 'hidden'];
    sidebarState.value = states[(states.indexOf(sidebarState.value) + 1) % states.length];
  }
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
const designerMobileTab = ref<'settings' | 'canvas'>('settings');

const vendors = ref<Vendor[]>([]);
const events = ref<EventRow[]>([]);
const menus = ref<MenuRow[]>([]);
const items = ref<ItemRow[]>([]);
const qrMappings = ref<QrMapping[]>([]);
const qrLocalMeta = ref<Record<number, { paid?: boolean; templateLabel?: string; selectedTemplateId?: number }>>({});
const selectedQrMapping = ref<QrMapping | null>(null);
const qrModalMode = ref<'view' | 'edit'>('view');
const qrTemplates = ref<Array<{ id: number; name: string; widthMm: number; heightMm: number; elements: any[] }>>([]);
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
const qrTargetType = ref<'vendor' | 'menu' | 'item' | 'custom' | 'event'>('vendor');
const qrPreview = reactive({ shortQrUrl: '', finalPublicUrl: '' });
const qrCodeDataUrl = ref('');
const vendorQrCodeDataUrl = ref('');
const eventQrDataUrl = ref('');
const itemRows = ref<DraftItem[]>([]);

const vendorForm = reactive<any>({ id: null, name: '', displayName: '', description: '', contact: [], address: '', hasContactPage: false, logoUrl: '' });
const eventForm = reactive<any>({ id: null, name: '', displayName: '', eventDescription: '', startTime: '', endTime: '', status: 'draft' });
const menuForm = reactive<any>({ id: null, name: '', displayName: '', description: '', isActive: true });
const linkForm = reactive({ eventId: 0, menuId: 0 });
const qrForm = reactive<any>({ qrHash: '', url: '', isActive: true, paid: true, templateLabel: '', selectedTemplateId: 0, eventId: 0, menuId: 0, itemId: 0 });
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
// QR mappings scoped to the selected vendor
const vendorQrMappings = computed(() => {
  const withMeta = (m: QrMapping) => ({ ...m, paid: qrLocalMeta.value[m.id]?.paid ?? true, templateLabel: qrLocalMeta.value[m.id]?.templateLabel ?? '' });
  if (!selectedVendorId.value) return qrMappings.value.map(withMeta);
  return qrMappings.value.filter((mapping) => {
    // Prefer the explicit vendorId field the backend now returns
    if (mapping.vendorId != null) return mapping.vendorId === selectedVendorId.value;
    // Fallback: infer from URL pattern (for legacy rows with no vendorId stored)
    if (mapping.url?.startsWith('/vendor/')) {
      const slug = mapping.url.split('/').pop();
      return vendors.value.find((v) => v.name === slug)?.id === selectedVendorId.value;
    }
    const eventSlug = mapping.url?.split('/event/')[1]?.split('/')[0];
    if (eventSlug) {
      const event = events.value.find((e) => e.name === eventSlug);
      return event?.vendorId === selectedVendorId.value;
    }
    return true; // custom paths shown in all vendor contexts
  }).map(withMeta);
});
const eventQrMapping = computed(() =>
  selectedEventForItems.value
    ? vendorQrMappings.value.find((m) => m.type === 'event' && Number(m.eventId) === selectedEventForItems.value!.id) ?? null
    : null
);
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
    insights:       'QR scan counts, user actions, device breakdown, and engagement trends.',
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

const BACK_DEST: Partial<Record<SectionKey, { label: string; path: string }>> = {
  vendorWorkspace: { label: 'Vendors',       path: '/dashboard/vendors' },
  eventWorkspace:  { label: 'Events',        path: '/dashboard/events' },
  qrSheet:         { label: 'Events',        path: '/dashboard/events' },
  publish:         { label: 'Events',        path: '/dashboard/events' },
  preview:         { label: 'Designer',      path: '/dashboard/menus/studio' },
  analytics:       { label: 'Designer',      path: '/dashboard/menus/studio' },
  inventory:       { label: 'Designer',      path: '/dashboard/menus/studio' },
  items:           { label: 'Designer',      path: '/dashboard/menus/studio' },
  vendors:         { label: 'Dashboard',     path: '/dashboard/home' },
  events:          { label: 'Dashboard',     path: '/dashboard/home' },
  designer:        { label: 'Dashboard',     path: '/dashboard/home' },
  menus:           { label: 'Dashboard',     path: '/dashboard/home' },
  qr:              { label: 'Dashboard',     path: '/dashboard/home' },
  'qr-templates':  { label: 'QR Bank',       path: '/dashboard/qr' },
  insights:        { label: 'Dashboard',     path: '/dashboard/home' },
};

const backDestLabel = computed(() => BACK_DEST[activeSection.value]?.label ?? '');

function goBack() {
  const dest = BACK_DEST[activeSection.value];
  router.push(dest?.path ?? '/dashboard/home');
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
    if (qrTargetType.value === 'event') {
      // Event-dynamic QRs have no static URL — skip destination build
      qrPreview.shortQrUrl = qrForm.qrHash ? `${window.location.origin}/${qrForm.qrHash}` : '';
      qrPreview.finalPublicUrl = '→ resolves dynamically at scan time';
      qrCodeDataUrl.value = qrPreview.shortQrUrl ? await QRCode.toDataURL(qrPreview.shortQrUrl, { margin: 1, width: 180 }) : '';
      return;
    }
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
  Object.assign(qrForm, { qrHash: mapping.qrHash, url: mapping.url || '', isActive: mapping.isActive, paid: mapping.paid !== false, templateLabel: mapping.templateLabel || '', selectedTemplateId: qrLocalMeta.value[mapping.id]?.selectedTemplateId ?? 0, eventId: mapping.eventId || 0, menuId: 0, itemId: 0 });
  qrPreview.shortQrUrl = mapping.shortQrUrl;
  qrPreview.finalPublicUrl = mapping.finalPublicUrl;
  if (mapping.shortQrUrl) QRCode.toDataURL(mapping.shortQrUrl, { margin: 1, width: 180 }).then((url) => { qrCodeDataUrl.value = url; });
  // Derive target type — check explicit type first, fall back to URL-based inference
  if (mapping.type === 'event') {
    qrTargetType.value = 'event';
  } else if (mapping.url?.startsWith('/vendor/')) {
    qrTargetType.value = 'vendor';
  } else if (mapping.url?.includes('/item/')) {
    qrTargetType.value = 'item';
  } else if (mapping.url?.startsWith('/event/')) {
    qrTargetType.value = 'menu';
  } else {
    qrTargetType.value = 'custom';
  }
}

function openQrEditor(mapping?: QrMapping) {
  selectedQrMapping.value = mapping || null;
  showQrEditor.value = true;
  qrModalMode.value = mapping ? 'view' : 'edit';
  if (mapping) editQr(mapping);
  loadQrTemplates();
}

function closeQrEditor() {
  showQrEditor.value = false;
  selectedQrMapping.value = null;
}

function qrTargetLabel(mapping: QrMapping) {
  if (mapping.type === 'event') {
    const event = events.value.find((e) => e.id === mapping.eventId);
    return `${event?.displayName || 'Event'} (dynamic)`;
  }
  if (mapping.url?.startsWith('/vendor/')) {
    const slug = mapping.url.split('/').pop();
    return vendors.value.find((vendor) => vendor.name === slug)?.displayName || 'Vendor card';
  }
  if (mapping.url?.includes('/item/')) {
    const slug = decodeURIComponent(mapping.url.split('/item/')[1] || '');
    return items.value.find((item) => item.name === slug)?.displayName || 'Item spotlight';
  }
  if (mapping.url?.startsWith('/event/')) {
    const parts = mapping.url.split('/');
    const menuSlug = parts[4];
    const menu = menuSlug ? menus.value.find((m) => m.name === menuSlug) : null;
    return menu ? `${menu.displayName} (static)` : 'Event menu';
  }
  return mapping.url || 'Custom path';
}

function qrStatus(mapping: QrMapping): 'active' | 'inactive' | 'needs_reassignment' {
  if (!mapping.isActive) return 'inactive';
  if (mapping.type === 'event' && !mapping.eventId) return 'needs_reassignment';
  if (mapping.url?.includes('/item/')) {
    const itemSlug = decodeURIComponent(mapping.url.split('/item/')[1] || '');
    if (itemSlug && !items.value.some((i) => i.name === itemSlug)) return 'needs_reassignment';
  }
  return 'active';
}

function qrTypeBadge(mapping: QrMapping): { label: string; css: string } {
  if (mapping.type === 'event') return { label: 'Event Dynamic', css: 'dynamic' };
  if (mapping.url?.startsWith('/vendor/')) return { label: 'Contact Card', css: 'contact' };
  if (mapping.url?.includes('/item/')) return { label: 'Item Spotlight', css: 'item' };
  if (mapping.url?.startsWith('/event/')) return { label: 'Menu Static', css: 'menu' };
  return { label: 'Custom', css: 'custom' };
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
  if (mapping.type === 'event' && mapping.eventId) {
    return events.value.find((e) => e.id === mapping.eventId)?.displayName || 'Linked event';
  }
  const eventSlug = mapping.url?.split('/event/')[1]?.split('/')[0];
  if (!eventSlug) return 'No event linked';
  return events.value.find((event) => event.name === eventSlug)?.displayName || eventSlug;
}

async function generateEventQr() {
  if (!selectedEventForItems.value) return;
  try {
    const { data } = await axios.post<QrMapping>(adminUrl(`/qr-mappings/for-event/${selectedEventForItems.value.id}`), {});
    await loadAll();
    setNotice(`Event QR created — hash: ${data.qrHash}`);
  } catch (err) {
    setError(err);
  }
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => setNotice('Copied!')).catch(() => setError(new Error('Clipboard not available')));
}

async function saveQr() {
  try {
    requireSlug(qrForm.qrHash, 'QR hash');
    const isEventType = qrTargetType.value === 'event';
    if (!isEventType && !qrForm.url) await buildQrDestination();
    const payload: Record<string, unknown> = {
      qrHash: qrForm.qrHash,
      isActive: qrForm.isActive,
      vendorId: selectedVendorId.value || null,
      type: isEventType ? 'event' : 'static',
    };
    if (isEventType) {
      payload.eventId = qrForm.eventId || null;
    } else {
      payload.url = qrForm.url;
    }
    const existingId = selectedQrMapping.value?.id;
    const { data } = existingId
      ? await axios.put<QrMapping>(adminUrl(`/qr-mappings/${existingId}`), payload)
      : await axios.post<QrMapping>(adminUrl('/qr-mappings'), payload);
    qrPreview.shortQrUrl = data.shortQrUrl;
    qrPreview.finalPublicUrl = data.finalPublicUrl;
    qrCodeDataUrl.value = await QRCode.toDataURL(data.shortQrUrl, { margin: 1, width: 180 });
    qrLocalMeta.value[data.id] = { paid: qrForm.paid, templateLabel: qrForm.templateLabel, selectedTemplateId: qrForm.selectedTemplateId };
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

watch(eventQrMapping, async (mapping) => {
  if (mapping?.shortQrUrl) {
    eventQrDataUrl.value = await QRCode.toDataURL(mapping.shortQrUrl, { margin: 1, width: 160 });
  } else {
    eventQrDataUrl.value = '';
  }
}, { immediate: true });

watch(() => route.fullPath, hydrateRouteContext);

// Reset the inline event editor whenever we navigate back to the events list
// so it never shows pre-populated with a previously-edited event's data
watch(activeSection, (section) => {
  if (section === 'events') {
    showEventEditor.value = false;
    resetEvent();
  }
});

onMounted(async () => {
  await loadAll();
  selectedMenuIdForItems.value = vendorMenus.value[0]?.id ?? 0;
  selectedEventIdForItems.value = vendorEvents.value[0]?.id ?? 0;
  hydrateRouteContext(); // must run last so URL params always win
  syncItemRows();
});

// ── Delete operations ─────────────────────────────────────────────────────────

async function deleteEvent(event: EventRow) {
  if (!window.confirm(`Delete "${event.displayName}"? This removes all linked menus and QR mappings for this event. This cannot be undone.`)) return;
  try {
    await axios.delete(adminUrl(`/events/${event.id}`));
    await loadAll();
    setNotice('Event deleted');
  } catch (err) {
    setError(err);
  }
}

async function deleteMenu(menu: MenuRow) {
  if (!window.confirm(`Delete menu "${menu.displayName}" and all its items? This cannot be undone.`)) return;
  try {
    await axios.delete(adminUrl(`/menus/${menu.id}`));
    await loadAll();
    setNotice('Menu deleted');
  } catch (err) {
    setError(err);
  }
}

async function deleteItemRow(row: DraftItem) {
  if (row.isNew) {
    // Unsaved row — just remove from local list
    itemRows.value = itemRows.value.filter((r) => r.clientId !== row.clientId);
    return;
  }
  if (!window.confirm(`Delete item "${row.displayName}"? This cannot be undone.`)) return;
  try {
    await axios.delete(adminUrl(`/items/${row.id}`));
    await loadAll();
    setNotice('Item deleted');
  } catch (err) {
    setError(err);
  }
}

async function deleteQrMappingConfirmed(mapping: QrMapping) {
  if (!window.confirm(`Delete QR mapping "${mapping.qrHash}"? The physical QR code will stop working.`)) return;
  try {
    await axios.delete(adminUrl(`/qr-mappings/${mapping.id}`));
    closeQrEditor();
    await loadAll();
    setNotice('QR mapping deleted');
  } catch (err) {
    setError(err);
  }
}

async function deleteVendorConfirmed() {
  if (!vendorForm.id) return;
  const name = vendorForm.displayName;
  if (!window.confirm(`Permanently delete vendor "${name}"? All events and menus must be removed first.`)) return;
  try {
    await axios.delete(adminUrl(`/vendors/${vendorForm.id}`));
    closeVendorEditor();
    await loadAll();
    setNotice(`Vendor "${name}" deleted`);
  } catch (err) {
    setError(err);
  }
}

function confirmDeactivate() {
  if (!window.confirm('Deactivate this event? All associated QRs will stop working immediately.')) return;
  setEventStatusTo('inactive');
}

// ── QR Bank table filters ─────────────────────────────────────────────────────
const qrSearch = ref('');
const qrTypeFilter = ref('all');
const qrSortBy = ref<'scans' | 'hash' | 'status'>('scans');

const filteredQrMappings = computed(() => {
  let list = [...vendorQrMappings.value];
  if (qrSearch.value) {
    const q = qrSearch.value.toLowerCase();
    list = list.filter((m) => m.qrHash.toLowerCase().includes(q) || qrTargetLabel(m).toLowerCase().includes(q));
  }
  if (qrTypeFilter.value !== 'all') {
    list = list.filter((m) => qrTypeBadge(m).css === qrTypeFilter.value);
  }
  if (qrSortBy.value === 'scans') list.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  else if (qrSortBy.value === 'hash') list.sort((a, b) => a.qrHash.localeCompare(b.qrHash));
  else list.sort((a, b) => qrStatus(a).localeCompare(qrStatus(b)));
  return list;
});

function openPrintForQr(mapping: QrMapping) {
  selectedQrHashForPrint.value = mapping.qrHash;
  closeQrEditor();
  router.push('/dashboard/qr-templates');
}
const selectedQrHashForPrint = ref('');

// ── QR modal: template preview ────────────────────────────────────────────────

async function loadQrTemplates() {
  try {
    const { data } = await axios.get<any[]>(adminUrl('/qr-templates'));
    qrTemplates.value = data;
  } catch { /* templates are optional */ }
}

const maxQrScans = computed(() => Math.max(1, ...vendorQrMappings.value.map((m) => m.usageCount || 0)));
function qrScanBarPct(mapping: QrMapping) {
  return Math.round(((mapping.usageCount || 0) / maxQrScans.value) * 100);
}

function downloadQrPng() {
  if (!qrCodeDataUrl.value) return;
  const a = document.createElement('a');
  a.download = `${qrForm.qrHash || 'qr'}.png`;
  a.href = qrCodeDataUrl.value;
  a.click();
}

const TPL_BASE = 3.78; // px per mm at 100%
const TPL_PREVIEW_MAX_W = 240; // max preview width in px

const currentQrTemplate = computed(() =>
  // eslint-disable-next-line eqeqeq
  qrTemplates.value.find((t) => Number(t.id) === qrForm.selectedTemplateId) ?? null,
);
const currentTemplateElements = computed(() => currentQrTemplate.value?.elements ?? []);
const tplPreviewScale = computed(() => {
  if (!currentQrTemplate.value) return 1;
  return Math.min(1, TPL_PREVIEW_MAX_W / (currentQrTemplate.value.widthMm * TPL_BASE));
});
const tplCanvasStyle = computed(() => {
  const t = currentQrTemplate.value;
  if (!t) return {};
  const s = tplPreviewScale.value;
  return {
    position: 'relative' as const,
    width: `${t.widthMm * TPL_BASE * s}px`,
    height: `${t.heightMm * TPL_BASE * s}px`,
    overflow: 'hidden',
    flexShrink: '0',
  };
});

function tplElStyle(el: any): Record<string, string> {
  const s = TPL_BASE * tplPreviewScale.value;
  const base: Record<string, string> = {
    position: 'absolute',
    left: `${el.x * s}px`,
    top: `${el.y * s}px`,
    width: `${el.width * s}px`,
    height: `${el.height * s}px`,
    overflow: 'hidden',
    boxSizing: 'border-box',
  };
  if (el.type === 'rect') {
    base.background = el.fill || 'transparent';
    if (el.strokeWidth) base.border = `${el.strokeWidth * s}px solid ${el.stroke || 'transparent'}`;
    base.borderRadius = `${(el.borderRadius || 0) * s}px`;
    base.opacity = String(el.opacity ?? 1);
  } else if (el.type === 'text') {
    base.fontFamily = el.fontFamily || 'Inter, sans-serif';
    base.fontSize = `${el.fontSize * s}px`;
    base.fontWeight = el.fontWeight || '400';
    base.color = el.color || '#000';
    base.textAlign = el.textAlign || 'left';
    base.display = 'flex';
    base.alignItems = 'center';
    base.justifyContent = el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start';
    base.lineHeight = '1.2';
    base.padding = '0 2px';
    base.whiteSpace = 'nowrap';
  } else if (el.type === 'image') {
    base.borderRadius = `${(el.borderRadius || 0) * s}px`;
    base.opacity = String(el.opacity ?? 1);
  }
  return base;
}

// ── Workspace switcher modal ───────────────────────────────────────────────────
const showWsModal = ref(false);
const showItemPoolDrawer = ref(false);
const showLinkEventModal = ref(false);

function isMenuLinked(menuId: number): boolean {
  return events.value.some((ev) => eventMenus(ev.id).some((m) => m.id === menuId));
}

async function linkSelectedMenuToEventAndClose() {
  await linkSelectedMenuToEvent();
  showLinkEventModal.value = false;
}

// ── Chart data ────────────────────────────────────────────────────────────────
const qrScanChartData = computed(() => {
  const sorted = [...vendorQrMappings.value]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 8);
  return {
    labels: sorted.map((m) => m.qrHash),
    datasets: [{
      label: 'Scans',
      data: sorted.map((m) => m.usageCount || 0),
      backgroundColor: 'rgba(189,148,90,0.75)',
      borderColor: '#9f743d',
      borderWidth: 1,
      borderRadius: 5,
    }],
  };
});

const qrScanChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { title: (items: any[]) => `QR: ${items[0].label}` } },
  },
  scales: {
    x: { ticks: { font: { size: 11 }, maxRotation: 30 }, grid: { display: false } },
    y: { ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
} as const;

const qrViewChartData = computed(() => {
  const sorted = [...vendorQrMappings.value]
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 8);
  const currentId = selectedQrMapping.value?.id;
  return {
    labels: sorted.map((m) => m.qrHash),
    datasets: [{
      label: 'Scans',
      data: sorted.map((m) => m.usageCount || 0),
      backgroundColor: sorted.map((m) => m.id === currentId ? '#BD945A' : 'rgba(189,148,90,0.3)'),
      borderColor: sorted.map((m) => m.id === currentId ? '#9f743d' : 'rgba(159,116,61,0.35)'),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };
});

const qrViewChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { title: (items: any[]) => `QR: ${items[0].label}` } },
  },
  scales: {
    x: { ticks: { font: { size: 10 }, maxRotation: 35 }, grid: { display: false } },
    y: { ticks: { font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
  },
} as const;

const overviewChartData = computed(() => ({
  labels: ['Events', 'Menus', 'Items', 'QR Assets'],
  datasets: [{
    data: [vendorEvents.value.length, vendorMenus.value.length, vendorItems.value.length, vendorQrMappings.value.length],
    backgroundColor: ['#BD945A', '#c4a86e', '#9b7a4f', '#7a5c35'],
    borderWidth: 0,
    hoverOffset: 6,
  }],
}));

const overviewChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' as const, labels: { font: { size: 11 }, boxWidth: 12, padding: 14 } },
  },
  cutout: '60%',
} as const;

function selectVendorWs(id: number) {
  selectedVendorId.value = id;
  showWsModal.value = false;
  const name = vendors.value.find((v) => v.id === id)?.displayName;
  if (name) setNotice(`Workspace: ${name}`);
}

async function deleteVendorById(id: number, name: string) {
  if (!window.confirm(`Permanently delete vendor "${name}"? All events and menus must be removed first.`)) return;
  try {
    await axios.delete(adminUrl(`/vendors/${id}`));
    await loadAll();
    setNotice(`Vendor "${name}" deleted`);
  } catch (err) { setError(err); }
}
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
  background: rgba(247, 242, 234, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(216, 189, 143, 0.35);
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  justify-content: space-between;
  min-height: 46px;
  padding: 8px 20px;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Content sections get top spacing since admin-main no longer has padding-top */
.admin-main > section,
.admin-main > .home-workspace {
  padding-top: 16px;
}

/* Make the workspace-header span edge-to-edge (break out of horizontal padding) */
.admin-main:not(.admin-main--canvas) > .workspace-header {
  margin-left: -20px;
  margin-right: -20px;
  padding-left: 20px;
  padding-right: 20px;
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
  padding: 0 20px 16px;
}

/* Mobile layout */
@media (max-width: 767px) {
  .admin-shell {
    grid-template-columns: 1fr !important;
  }
  .admin-main { padding: 0 14px 12px; }
  .admin-main > section, .admin-main > .home-workspace { padding-top: 12px; }
  .mobile-hamburger { display: flex; }
  .workspace-header { padding: 8px 14px 8px 52px; } /* indent past fixed hamburger */
  .admin-main:not(.admin-main--canvas) > .workspace-header { margin-left: -14px; margin-right: -14px; padding-left: 52px; padding-right: 14px; }
  .workspace-title h2 { font-size: 1rem; }
  .workspace-subtitle { display: none; }

  /* Designer mobile tab layout */
  .designer-mobile-tabs {
    align-items: stretch;
    background: #fffcf7;
    border: 1px solid #e8dccb;
    border-radius: 8px;
    display: flex;
    gap: 0;
    grid-column: 1 / -1;
    overflow: hidden;
    position: sticky;
    top: 0;
    z-index: 20;
  }
  .designer-mobile-tabs button {
    align-items: center;
    background: transparent;
    border: 0;
    color: #7a6a52;
    cursor: pointer;
    display: flex;
    flex: 1;
    font-size: 0.8rem;
    font-weight: 600;
    gap: 5px;
    justify-content: center;
    padding: 10px 4px;
    transition: background 0.12s;
  }
  .designer-mobile-tabs button.active {
    background: #b98f56;
    color: #fff;
  }
  .designer-mobile-tabs button:not(.active):hover { background: #f5f0e8; }

  /* Hide panels that aren't the active tab on mobile */
  .designer-grid[data-tab="settings"] .designer-panel-canvas { display: none; }
  .designer-grid[data-tab="canvas"] .designer-panel-settings { display: none; }

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

  /* Workspace header right: keep as row (no stacking of vendor + refresh) */
  .workspace-header-right {
    flex-wrap: nowrap;
    gap: 6px;
  }

  /* Vendors table: hide low-value columns on mobile */
  .vendors-table th:nth-child(2),
  .vendors-table td:nth-child(2),
  .vendors-table th:nth-child(3),
  .vendors-table td:nth-child(3),
  .vendors-table th:nth-child(5),
  .vendors-table td:nth-child(5) { display: none; }

  /* Events tables: hide Window and Menus columns on mobile */
  .events-table th:nth-child(2),
  .events-table td:nth-child(2),
  .events-table th:nth-child(4),
  .events-table td:nth-child(4),
  .home-events-table th:nth-child(2),
  .home-events-table td:nth-child(2),
  .home-events-table th:nth-child(4),
  .home-events-table td:nth-child(4) { display: none; }

  .events-table .row-actions .btn-text { display: none; }
  .events-table .row-actions .btn { padding: 4px 7px; }
}

/* Tablet */
@media (min-width: 768px) and (max-width: 1023px) {
  .admin-shell:not([data-sidebar="full"]) { grid-template-columns: 64px 1fr; }
  .admin-main { padding: 0 16px 14px; }
  .admin-main > section, .admin-main > .home-workspace { padding-top: 14px; }
  .admin-main:not(.admin-main--canvas) > .workspace-header { margin-left: -16px; margin-right: -16px; padding-left: 16px; padding-right: 16px; }
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
  grid-template-columns: 1fr;
}

.home-events-panel {
  grid-column: 1 / -1;
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
  background: #dff0da;
  color: #2e6320;
}
.status-pill.status-draft {
  background: #f0e8d8;
  color: #7a5226;
}
.status-pill.status-inactive {
  background: #eae8e5;
  color: #6b6560;
}

/* Back button — borderless text+icon */
.back-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #7a6a52;
  cursor: pointer;
  display: flex;
  font-size: 0.82rem;
  font-weight: 600;
  gap: 5px;
  padding: 5px 8px;
  white-space: nowrap;
}
.back-btn:hover {
  background: rgba(184, 143, 86, 0.1);
  color: #3d2e1a;
}

/* Refresh button — ghost, no border */
.refresh-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #8a7860;
  cursor: pointer;
  display: flex;
  font-size: 1rem;
  height: 30px;
  justify-content: center;
  width: 30px;
  transition: color 0.15s, background 0.15s;
}
.refresh-btn:hover { color: #3d2e1a; background: rgba(184, 143, 86, 0.1); }
.refresh-btn:disabled { opacity: 0.45; pointer-events: none; }
@keyframes spin { to { transform: rotate(360deg); } }
.refresh-btn .spin { animation: spin 0.7s linear infinite; }

/* Workspace gear button (header, home only) */
.ws-gear-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: #7a6a52;
  cursor: pointer;
  display: flex;
  font-size: 0.82rem;
  font-weight: 600;
  gap: 6px;
  padding: 4px 8px;
  white-space: nowrap;
}
.ws-gear-btn:hover { background: rgba(184,143,86,0.1); color: #3d2e1a; }
.ws-gear-btn i { color: #9f743d; font-size: 0.9rem; }
.ws-vendor-label { max-width: 140px; overflow: hidden; text-overflow: ellipsis; }

/* Workspace modal */
.ws-modal-backdrop {
  align-items: center;
  background: rgba(21,25,30,0.45);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: 300;
}
.ws-modal {
  background: #fffcf7;
  border: 1px solid #d8bd8f;
  border-radius: 10px;
  box-shadow: 0 24px 64px rgba(42,34,24,0.22);
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  min-width: 320px;
  overflow: hidden;
  width: min(92vw, 380px);
}
.ws-modal-header {
  align-items: center;
  border-bottom: 1px solid #e8dccb;
  display: flex;
  justify-content: space-between;
  padding: 14px 16px 12px;
}
.ws-modal-header h3 { font-size: 0.96rem; font-weight: 700; margin: 0; }
.ws-modal-list { display: flex; flex-direction: column; gap: 2px; overflow-y: auto; padding: 8px; }
.ws-modal-item {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 6px;
  color: #2f2a24;
  cursor: pointer;
  display: flex;
  font-size: 0.88rem;
  gap: 10px;
  padding: 10px 12px;
  text-align: left;
  width: 100%;
}
.ws-modal-item:hover { background: #f7efe3; }
.ws-modal-item.active { background: #fff3e0; font-weight: 600; }
.ws-modal-item-avatar { color: #9f743d; flex-shrink: 0; }
.ws-modal-item-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ws-modal-check { color: #7a7a7a; flex-shrink: 0; }
.ws-modal-empty { color: #9a8870; font-size: 0.85rem; padding: 12px; text-align: center; }
.ws-modal-footer {
  border-top: 1px solid #e8dccb;
  padding: 8px;
}
.ws-modal-new {
  align-items: center;
  border-radius: 6px;
  color: #7a542a;
  display: flex;
  font-size: 0.85rem;
  font-weight: 500;
  gap: 8px;
  padding: 10px 12px;
  text-decoration: none;
  width: 100%;
}
.ws-modal-new:hover { background: #f7efe3; color: #15191e; }


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
  background: #f0e8d8;
  color: #7a5226;
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

/* Vendor rows are clickable (set working vendor) — show it */
.vendors-table tbody tr {
  cursor: pointer;
  transition: background 0.12s;
}
.vendors-table tbody tr:hover {
  background: rgba(189, 148, 90, 0.06);
}
/* Cap vendor description so long text doesn't wreck the table */
.vendors-table .vendor-desc {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  align-items: center;
  background: #fbfaf8;
  border-left: 1px solid #e6dfd4;
  display: flex;
  flex-direction: column;
  padding: 18px 16px;
  text-align: center;
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
  grid-template-columns: 1fr;
}

.designer-controls {
  align-self: start;
}

/* Mobile tab bar — hidden on desktop, shown via mobile media query */
@media (min-width: 768px) {
  .designer-mobile-tabs {
    display: none;
  }
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
  /* Preview pane moves to top in stacked layouts */
  .vendor-modal-grid .qr-pane,
  .qr-modal-body-v2 .qr-pane {
    border-bottom: 1px solid #e6dfd4;
    border-left: none;
    order: -1;
  }
  .hero-panel,
  .publish-context {
    align-items: stretch;
    flex-direction: column;
  }
  .workspace-switcher:not(.workspace-switcher--compact) {
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

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}
.tag-chip {
  background: #f0ece6;
  border: 1.5px solid #ddd1bc;
  border-radius: 20px;
  color: #6b5a43;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 600;
  padding: 3px 10px;
  transition: all 0.12s;
}
.tag-chip:hover { background: #e8e0d4; border-color: #c9a96e; }
.tag-chip.active { background: #fef3d9; border-color: #c9a96e; color: #6e4e10; }

.tag-no-hints {
  color: #aaa;
  font-size: 0.72rem;
  font-weight: 400;
  margin: 5px 0 0;
  text-transform: none;
}

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

/* ── Event QR Panel ──────────────────────────────────────────────────────────── */
.event-qr-panel {
  margin-bottom: 0;
}
.event-qr-header {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 16px;
}
.event-qr-header h3 { margin: 0; }
.event-qr-body {
  align-items: flex-start;
  display: flex;
  gap: 20px;
}
.event-qr-img {
  border: 1px solid #e4d7c5;
  border-radius: 6px;
  flex-shrink: 0;
  width: 120px;
  height: 120px;
}
.event-qr-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.qr-url-row {
  align-items: center;
  display: flex;
  gap: 8px;
  flex-wrap: nowrap;
}
.qr-url-row code {
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dynamic-hint {
  color: #4b8b3b;
  display: flex;
  gap: 5px;
  align-items: center;
}
.event-qr-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.event-qr-empty {
  align-items: center;
  display: flex;
  gap: 20px;
  padding: 8px 0;
}
.event-qr-placeholder-icon {
  color: #c8b89a;
  font-size: 3rem;
  flex-shrink: 0;
}

/* QR Bank: dynamic type badge on tabs */
.tab-badge {
  background: #4b8b3b18;
  border-radius: 4px;
  color: #4b8b3b;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  margin-left: 4px;
  padding: 1px 5px;
  text-transform: uppercase;
}
.qr-event-hint {
  background: #f0f7ee;
  border-left: 3px solid #4b8b3b;
  border-radius: 4px;
  margin: 0 0 12px;
  padding: 8px 12px;
}

/* ── CTA row fixes ───────────────────────────────────────────────────────────── */
td.row-actions {
  display: table-cell;
  vertical-align: middle;
  white-space: nowrap;
  width: 1%;
}
/* Only use flex inside non-td row-actions containers */
div.row-actions,
.panel-heading.row-actions,
.home-actions {
  align-items: center;
  display: flex;
  flex-wrap: nowrap;
  gap: 4px;
}
/* Icon buttons inside action td: inline-flex, no margin issues */
td.row-actions .icon-btn,
td.row-actions .btn {
  display: inline-flex;
  vertical-align: middle;
}
td.row-actions .icon-btn + .icon-btn,
td.row-actions .btn + .icon-btn,
td.row-actions .icon-btn + .btn,
td.row-actions .btn + .btn,
td.row-actions a + .icon-btn,
td.row-actions .icon-btn + a {
  margin-left: 3px;
}

/* ── Mobile overrides (placed after base rules to win cascade) ──────────────── */
@media (max-width: 767px) {
  /* Stack home intro text above action grid */
  .home-intro {
    flex-direction: column;
    align-items: flex-start;
  }

  /* 2×2 grid for home shortcut buttons */
  .home-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }

  /* Hero actions: left-align on mobile so buttons don't bunch right */
  .hero-actions {
    justify-content: flex-start;
  }

  /* Event QR panel: stack QR image above details on mobile */
  .event-qr-body {
    flex-direction: column;
    align-items: flex-start;
  }
  .event-qr-empty {
    flex-direction: column;
    align-items: flex-start;
  }

  /* QR Bank: single column on mobile */
  .qr-inventory-grid {
    grid-template-columns: 1fr;
  }
  .qr-bank-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}

/* ── QR Bank redesign ────────────────────────────────────────────────────────── */
.qr-bank-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.qr-bank-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.qr-bank-header h3 {
  margin-bottom: 4px;
}

.qr-count-badge {
  background: #e8ddd0;
  border-radius: 999px;
  color: #5a4226;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 7px;
  vertical-align: middle;
}

.qr-empty-state {
  align-items: center;
  display: flex;
  gap: 16px;
  padding: 24px;
}

.qr-empty-icon {
  color: #c8b89a;
  flex-shrink: 0;
  font-size: 2.4rem;
}

.qr-inventory-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.qr-asset-card {
  background: #fff;
  border: 1.5px solid #e6dfd4;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  transition: border-color 0.14s, box-shadow 0.14s;
}

.qr-asset-card:hover {
  border-color: #c49a63;
  box-shadow: 0 4px 14px rgba(189, 148, 90, 0.12);
}

.qr-card-selected {
  border-color: #b98f56;
  box-shadow: 0 0 0 3px rgba(189, 148, 90, 0.18);
}

.qr-card-warn {
  border-color: #e8a44a;
}

.qr-card-top {
  align-items: flex-start;
  display: flex;
  gap: 6px;
  justify-content: space-between;
}

.qr-hash-code {
  font-size: 0.8rem;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.type-badge {
  border-radius: 4px;
  flex-shrink: 0;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  padding: 2px 6px;
  text-transform: uppercase;
  white-space: nowrap;
}

.type-badge.type-dynamic {
  background: #fef0d8;
  color: #7a5226;
}

.type-badge.type-contact {
  background: #e8e0d4;
  color: #4e3520;
}

.type-badge.type-menu {
  background: #ede8de;
  color: #5a3d22;
}

.type-badge.type-item {
  background: #e4ddd3;
  color: #6b4826;
}

.type-badge.type-custom {
  background: #eae8e5;
  color: #5a5550;
}

.qr-card-target {
  color: #171512;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.3;
  min-height: 2.2em;
}

.qr-card-footer {
  align-items: center;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-top: auto;
}

.status-chip {
  align-items: center;
  border-radius: 20px;
  display: inline-flex;
  font-size: 0.7rem;
  font-weight: 700;
  gap: 4px;
  padding: 2px 7px;
}

.chip-active {
  background: #dff0da;
  color: #2e6320;
}

.chip-inactive {
  background: #eae8e5;
  color: #6b6560;
}

.chip-needs_reassignment {
  background: #f0e8d8;
  color: #7a5226;
}

.qr-scan-pill {
  color: #9a8878;
  font-size: 0.75rem;
  gap: 3px;
  display: inline-flex;
  align-items: center;
}

.qr-link-small {
  color: #853f19;
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Icon buttons (compact, icon-only CTAs) ───────────────────────────────── */
.icon-btn {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #5a4a32;
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.9rem;
  height: 32px;
  justify-content: center;
  padding: 0;
  text-decoration: none;
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  width: 32px;
}
.icon-btn:hover {
  background: #f4f1ed;
  border-color: #e0d0b8;
  color: #15191e;
}
.icon-btn--gold { color: #9f743d; }
.icon-btn--gold:hover { background: #fff8ed; border-color: #c9a96e; color: #7a5418; }
.icon-btn--danger { color: #b44646; }
.icon-btn--danger:hover { background: #fce8e8; border-color: #e0a0a0; color: #8b1c1c; }
.icon-btn--outlined { border-color: #d8bd8f; color: #7a542a; }
.icon-btn--outlined:hover { background: #f7efe3; color: #15191e; }
.icon-btn--active { background: #fff8ed; border-color: #c9a96e; color: #7a5418; }
.icon-btn:disabled,
.icon-btn[disabled] { opacity: 0.45; pointer-events: none; }

/* ── Sidebar vendor persona ──────────────────────────────────────────────── */
.sidebar-vendor-section {
  border-bottom: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
  padding: 10px 8px;
  position: relative;
}

.sidebar-vendor-btn {
  align-items: center;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  color: rgba(255,255,255,0.88);
  cursor: pointer;
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  text-align: left;
  transition: background 0.12s;
  width: 100%;
}
.sidebar-vendor-btn:hover { background: rgba(255,255,255,0.1); }

.sidebar-vendor-avatar {
  align-items: center;
  background: rgba(189,148,90,0.2);
  border-radius: 7px;
  color: #BD945A;
  display: flex;
  flex-shrink: 0;
  font-size: 1rem;
  height: 34px;
  justify-content: center;
  overflow: hidden;
  width: 34px;
}
.sidebar-vendor-avatar img { height: 100%; object-fit: cover; width: 100%; }

.sidebar-vendor-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.sidebar-vendor-name {
  font-size: 0.85rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar-vendor-sub { color: rgba(255,255,255,0.44); font-size: 0.72rem; }
.sidebar-vendor-edit-icon { color: rgba(255,255,255,0.28); flex-shrink: 0; font-size: 0.72rem; opacity: 0; transition: opacity 0.15s; }
.sidebar-vendor-btn:hover .sidebar-vendor-edit-icon { opacity: 1; }

.sidebar-vendor-dropdown {
  background: #1e1b17;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  box-shadow: 0 14px 36px rgba(0,0,0,0.4);
  display: flex;
  flex-direction: column;
  gap: 2px;
  left: 8px;
  padding: 6px;
  position: absolute;
  right: 8px;
  top: calc(100% + 4px);
  z-index: 80;
}

.sidebar-vendor-option {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: rgba(255,255,255,0.8);
  cursor: pointer;
  display: flex;
  font-size: 0.84rem;
  justify-content: space-between;
  padding: 8px 10px;
  text-align: left;
  transition: background 0.1s;
}
.sidebar-vendor-option:hover { background: rgba(255,255,255,0.08); }
.sidebar-vendor-option.active { background: rgba(189,148,90,0.2); color: #BD945A; }

.sidebar-vendor-option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar-vendor-divider { border-top: 1px solid rgba(255,255,255,0.1); margin: 3px 4px; }

.sidebar-vendor-edit-btn {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 5px;
  color: rgba(255,255,255,0.55);
  cursor: pointer;
  display: flex;
  font-size: 0.82rem;
  gap: 8px;
  padding: 8px 10px;
  text-align: left;
  transition: background 0.1s, color 0.1s;
  width: 100%;
}
.sidebar-vendor-edit-btn:hover { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.88); }

.admin-shell[data-sidebar="icons"] .sidebar-vendor-section { padding: 8px 4px; }
.admin-shell[data-sidebar="icons"] .sidebar-vendor-btn { gap: 0; justify-content: center; padding: 8px 0; }
.admin-shell[data-sidebar="icons"] .sidebar-vendor-meta,
.admin-shell[data-sidebar="icons"] .sidebar-vendor-edit-icon { display: none; }
.admin-shell[data-sidebar="icons"] .sidebar-vendor-avatar { margin: 0 auto; }

/* ── Home dashboard metric tiles ─────────────────────────────────────────── */
.home-metrics {
  display: grid;
  gap: 12px;
  grid-column: 1 / -1;
  grid-template-columns: repeat(4, 1fr);
}

.metric-tile {
  align-items: center;
  background: #fffcf7;
  border: 1px solid #e8dccb;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(42, 34, 24, 0.045);
  color: #15191e;
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  text-decoration: none;
  transition: border-color 0.14s, box-shadow 0.14s;
}
.metric-tile:hover { border-color: #c49a63; box-shadow: 0 6px 20px rgba(189, 148, 90, 0.12); }

.metric-tile-icon {
  align-items: center;
  background: rgba(189,148,90,0.1);
  border-radius: 8px;
  color: #9f743d;
  display: flex;
  flex-shrink: 0;
  font-size: 1.2rem;
  height: 40px;
  justify-content: center;
  width: 40px;
}

.metric-value { display: block; font-size: 1.5rem; font-weight: 900; line-height: 1.1; }
.metric-label { color: #6b7280; display: block; font-size: 0.75rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
.metric-tile-sub { color: #9a8878; font-size: 0.75rem; margin-left: auto; white-space: nowrap; }
.metric-tile-sub.live { color: #15803d; font-weight: 700; }

/* ── QR activity bar chart ───────────────────────────────────────────────── */
.qr-activity-list { display: flex; flex-direction: column; gap: 8px; }

.qr-activity-row {
  align-items: center;
  display: grid;
  gap: 10px;
  grid-template-columns: 130px auto 1fr 36px;
}

.qr-hash-sm { color: #853f19; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.qr-activity-bar-wrap { background: #f4f1ed; border-radius: 4px; height: 8px; overflow: hidden; }
.qr-activity-bar {
  background: linear-gradient(90deg, #BD945A, #9f743d);
  border-radius: 4px;
  height: 100%;
  min-width: 4px;
  transition: width 0.4s ease;
}
.qr-activity-count { color: #6b7280; font-size: 0.78rem; font-weight: 600; text-align: right; }

/* ── Menu chips ──────────────────────────────────────────────────────────── */
.menu-chips { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

.menu-chip {
  align-items: center;
  background: #fffcf7;
  border: 1px solid #e8dccb;
  border-radius: 8px;
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  transition: border-color 0.12s;
}
.menu-chip:hover { border-color: #c49a63; }

.type-dot { border-radius: 50%; flex-shrink: 0; height: 8px; width: 8px; }
.type-dot.generic { background: #9ca3af; }
.type-dot.personalized { background: #f59e0b; }

.menu-chip-info { display: flex; flex: 1; flex-direction: column; gap: 1px; min-width: 0; }
.menu-chip-info strong { font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.menu-chip-info .muted { font-size: 0.75rem; }

.menu-chip-actions { align-items: center; display: flex; flex-shrink: 0; gap: 4px; }

/* ── QR Asset modal v2 (2-column redesign) ───────────────────────────────── */
.qr-asset-modal {
  background: #fffcf7;
  border-radius: 10px;
  box-shadow: 0 28px 80px rgba(21, 25, 30, 0.32);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  max-width: 860px;
  overflow: hidden;
  width: min(100%, 860px);
}

.qr-modal-header {
  align-items: center;
  background: #f5ede0;
  border-bottom: 1px solid #e0cba8;
  display: flex;
  flex-shrink: 0;
  gap: 12px;
  justify-content: space-between;
  padding: 12px 18px;
}

.qr-modal-header-left {
  align-items: center;
  display: flex;
  flex: 1;
  gap: 8px;
  min-width: 0;
}
.qr-modal-header-left h3 {
  color: #2a1f0f;
  font-family: inherit;
  font-size: 0.94rem;
  font-weight: 700;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.qr-modal-header-right { align-items: center; display: flex; flex-shrink: 0; gap: 10px; }
.qr-modal-header .icon-button { color: #6b5a42; }
.qr-modal-header .icon-button:hover { background: rgba(0,0,0,0.07); color: #1a0f00; }

/* Analytics strip in header */
.qr-analytics-strip {
  align-items: center;
  display: flex;
  gap: 6px;
}

.qr-stat-chip {
  align-items: center;
  background: rgba(255, 252, 247, 0.85);
  border: 1px solid #e4d4b8;
  border-radius: 6px;
  display: flex;
  gap: 6px;
  padding: 4px 8px;
}

.qr-stat-chip--muted { opacity: 0.8; }
.qr-stat-icon { color: #9f743d; font-size: 0.75rem; flex-shrink: 0; }
.qr-stat-content { display: flex; flex-direction: column; line-height: 1; }
.qr-stat-val { color: #2a1f0f; font-size: 0.78rem; font-weight: 700; }
.qr-stat-label { color: #9a8878; font-size: 0.64rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 1px; }
.qr-stat-spark { flex-shrink: 0; height: 10px; width: 44px; }

/* 2-column body */
.qr-modal-body-v2 {
  display: grid;
  flex: 1;
  gap: 0;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.85fr);
  min-height: 0;
  overflow: hidden;
}

/* QR image elements */
.qr-modal-img { border: 1px solid #e4d7c5; border-radius: 8px; display: block; max-width: 200px; width: 100%; }

.qr-modal-img-placeholder {
  align-items: center;
  background: #f0ebe3;
  border: 2px dashed #d8bd8f;
  border-radius: 8px;
  color: #c8b89a;
  display: flex;
  font-size: 3rem;
  height: 180px;
  justify-content: center;
  max-width: 200px;
  width: 100%;
}

.qr-modal-meta { display: flex; flex-direction: column; gap: 6px; }
.qr-modal-meta div { display: flex; flex-direction: column; gap: 1px; }
.qr-modal-meta span { color: #9a8878; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
.qr-modal-meta strong { font-size: 0.82rem; }

/* Read-only field display */
.readonly-field {
  align-items: center;
  background: #f7f3ee;
  border: 1px solid #e4d7c5;
  border-radius: 6px;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 7px 10px;
}

.field-lock { color: #c8a87a; font-size: 0.78rem; flex-shrink: 0; }

/* Status + Payment segmented toggles */
.qr-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 14px 0 0;
}

.qr-status-field { display: flex; flex-direction: column; flex: 1; min-width: 120px; }

.seg-control {
  border: 1px solid #e4d7c5;
  border-radius: 6px;
  display: flex;
  overflow: hidden;
}

.seg-btn {
  align-items: center;
  background: #f7f3ee;
  border: 0;
  color: #7a6650;
  cursor: pointer;
  display: flex;
  flex: 1;
  font-size: 0.78rem;
  font-weight: 600;
  gap: 5px;
  justify-content: center;
  padding: 7px 8px;
  transition: background 0.12s, color 0.12s;
}

.seg-btn + .seg-btn { border-left: 1px solid #e4d7c5; }

.seg-btn.active { background: #e8dccb; color: #3a2010; }
.seg-btn--paid.active { background: #dff0da; color: #2e6320; }
.seg-btn--unpaid.active { background: #f0e8d8; color: #7a5226; }

/* Template selector row */
.template-select-row { margin-bottom: 10px; }
.template-select-combo { display: flex; gap: 6px; }
.template-select-combo .form-select { flex: 1; }

/* Template preview */
.tpl-preview-wrap {
  align-items: center;
  background: #f3ede4;
  border: 1px solid #e4d7c5;
  border-radius: 8px;
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 160px;
  overflow: hidden;
  padding: 12px;
}

.plain-qr-center {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tpl-canvas-outer {
  align-items: center;
  display: flex;
  justify-content: center;
  max-width: 100%;
  overflow: auto;
}

.tpl-canvas-preview {
  border: 1px solid #d8c4a8;
  border-radius: 3px;
  box-shadow: 0 4px 16px rgba(42, 34, 24, 0.18);
  flex-shrink: 0;
}

/* Footer of right pane */
.qr-pane-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 10px;
}

.qr-dl-btn { align-self: center; }

/* Override qr-pane for v2 layout */
.qr-modal-body-v2 .qr-pane {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 16px;
}

.qr-modal-body-v2 .modal-pane-scroll .actions {
  border-top: 1px solid #e8dfd0;
  margin-top: auto;
  padding-top: 14px;
}

/* ── QR View Mode ─────────────────────────────────────────────────────────── */
.qr-view-body {
  display: grid;
  flex: 1;
  gap: 0;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.9fr);
  min-height: 0;
  overflow: hidden;
}

.qr-view-visual-pane {
  align-items: center;
  background: #fbfaf8;
  border-right: 1px solid #e6dfd4;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding: 24px 20px;
  text-align: center;
}

.qr-view-analytics-pane {
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow-y: auto;
  padding: 20px 18px;
}

.qr-view-qr-wrap {
  align-items: center;
  display: flex;
  justify-content: center;
}

.qr-view-img {
  border: 1px solid #e4d7c5;
  border-radius: 8px;
  display: block;
  height: 180px;
  width: 180px;
}

.qr-view-placeholder {
  align-items: center;
  background: #f3f0eb;
  border: 2px dashed #d8bd8f;
  border-radius: 8px;
  color: #b8a48a;
  display: flex;
  font-size: 3rem;
  height: 180px;
  justify-content: center;
  width: 180px;
}

.qr-view-tpl-chip {
  align-items: center;
  background: #f0ece5;
  border: 1px solid #ddd3c3;
  border-radius: 20px;
  color: #7a542a;
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 600;
  gap: 6px;
  padding: 4px 12px;
}

.qr-view-tpl-chip--none {
  background: #f3f4f6;
  border-color: #e5e7eb;
  color: #9a8878;
}

.qr-view-dest {
  background: #fff;
  border: 1px solid #e8dfd0;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  overflow: hidden;
  width: 100%;
  max-width: 340px;
}

.qr-view-dest-row {
  align-items: center;
  border-bottom: 1px solid #f0ebe3;
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 12px 16px;
}

.qr-view-dest-row:last-child { border-bottom: none; }

.qr-view-dest-key {
  color: #9a8878;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.qr-view-dest-val-wrap {
  align-items: center;
  display: flex;
  gap: 6px;
  justify-content: center;
}

.qr-view-url {
  color: #BD945A;
  font-size: 0.82rem;
  font-weight: 700;
  overflow-wrap: break-word;
  text-decoration: none;
  word-break: break-all;
}

.qr-view-url:hover { text-decoration: underline; }

.qr-view-dest-val {
  font-size: 0.9rem;
  font-weight: 700;
}

.qr-view-bigstat {
  align-items: baseline;
  display: flex;
  gap: 6px;
}

.qr-view-bigstat-num {
  color: #BD945A;
  font-size: 2.4rem;
  font-weight: 900;
  line-height: 1;
}

.qr-view-bigstat-label {
  color: #9a8878;
  font-size: 0.82rem;
}

.qr-view-chart-wrap {
  flex: 1;
  height: 180px;
  min-height: 120px;
  position: relative;
}

.qr-view-meta-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 4px;
}

.qr-view-meta-item {
  align-items: center;
  border-bottom: 1px solid #f0ebe3;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding-bottom: 10px;
}

.qr-view-meta-item:last-child { border-bottom: none; padding-bottom: 0; }

.qr-view-meta-item > span:first-child {
  color: #9a8878;
  font-size: 0.78rem;
}

.qr-edit-btn { font-size: 0.78rem; padding: 4px 10px; }

/* ── Status dot ──────────────────────────────────────────────────────────── */
.status-dot { background: #d1d5db; border-radius: 50%; display: inline-block; height: 10px; width: 10px; }
.status-dot.active { background: #22c55e; box-shadow: 0 0 0 2px rgba(34,197,94,0.2); }

/* ── Misc helpers ────────────────────────────────────────────────────────── */
.workspace-badge { color: #BD945A; font-size: 0.6rem; margin-left: 4px; vertical-align: middle; }
code.slug { color: #9a6b3a; font-size: 0.72rem; }
.clickable-row { cursor: pointer; transition: background 0.1s; }
.clickable-row:hover { background: rgba(189, 148, 90, 0.06); }

.product-state { background: #f3f4f6; border-radius: 20px; color: #6b7280; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; }
.product-card.selected .product-state { background: #dcfce7; color: #15803d; }

.stack-layout { display: flex; flex-direction: column; gap: 16px; }

.glass-panel { background: rgba(255, 252, 247, 0.72); backdrop-filter: blur(8px); border: 1px solid rgba(228, 215, 197, 0.6); }

.col-window { color: #6b7280; font-size: 0.82rem; white-space: nowrap; }

.qr-image { border: 1px solid #e4d7c5; border-radius: 6px; display: block; height: 160px; width: 160px; }

.saved-state { color: #9a8878; font-size: 0.75rem; }

/* ── Home dashboard charts ───────────────────────────────────────────────── */
.home-charts-row {
  display: grid;
  gap: 14px;
  grid-column: 1 / -1;
  grid-template-columns: minmax(0, 1.6fr) minmax(220px, 0.7fr);
}

.home-chart-panel {
  display: flex;
  flex-direction: column;
}

.chart-canvas-wrap {
  flex: 1;
  height: 220px;
  position: relative;
}

.chart-canvas-wrap--donut {
  height: 220px;
}

.chart-empty {
  align-items: center;
  display: flex;
  flex: 1;
  font-size: 0.85rem;
  justify-content: center;
  padding: 32px 0;
  text-align: center;
}

/* ── Designer two-pane header ────────────────────────────────────────────── */
.designer-header-panes {
  align-items: flex-start;
  display: flex;
  flex-wrap: wrap;
  gap: 0;
}

.designer-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-width: 240px;
  padding: 4px 16px 4px 0;
}

.designer-pane:last-child { padding-right: 0; }

.pane-label {
  color: #6b7280;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.pane-row {
  align-items: center;
  display: flex;
  gap: 6px;
}

.pane-row .form-select,
.pane-row .form-control {
  flex: 1;
  min-width: 0;
}

.pane-row .type-select { flex: 0 0 120px; }

.designer-pane-divider {
  align-self: stretch;
  background: #e5e7eb;
  margin: 0 12px;
  width: 1px;
  flex-shrink: 0;
}

.linked-event-hint {
  align-items: center;
  color: #4b8b3b;
  display: flex;
  font-size: 0.75rem;
  font-weight: 600;
  gap: 5px;
}

.linked-event-hint i { font-size: 0.85rem; }

/* ── Item add modal ──────────────────────────────────────────────────────── */
.item-add-modal {
  background: #fffcf7;
  border-radius: 10px;
  box-shadow: 0 24px 64px rgba(42, 34, 24, 0.22);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  overflow: auto;
  padding: 0;
  width: min(100%, 440px);
}

.item-add-modal .modal-title-row { padding: 18px 20px 14px; }
.item-add-modal .item-type-toggle { margin: 0 20px 16px; }
.item-add-modal .item-drawer-fields { margin: 0 20px 16px; }
.item-add-modal .drawer-actions { margin: 0; padding: 12px 20px 18px; }

/* ── Item Pool drawer ────────────────────────────────────────────────────── */
.item-pool-drawer { max-width: 380px; }

.pool-library-list {
  max-height: calc(100vh - 200px);
}

.pool-empty {
  font-size: 0.85rem;
  padding: 20px 0;
  text-align: center;
}

/* ── Link Event modal ────────────────────────────────────────────────────── */
.link-event-modal {
  width: min(92vw, 400px);
}

.link-event-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.link-event-hint { margin: 0; }

.link-event-confirm-btn {
  width: 100%;
  justify-content: center;
}

/* ── Designer grid: now two-column with controls full-width ─────────────── */
.designer-grid {
  grid-template-columns: 1fr;
}

@media (max-width: 900px) {
  .home-charts-row {
    grid-template-columns: 1fr;
  }
  .designer-header-panes {
    flex-direction: column;
  }
  .designer-pane-divider {
    height: 1px;
    margin: 8px 0;
    width: 100%;
  }
}

.link-button { background: transparent; border: 0; color: #8b5527; cursor: pointer; font-size: 0.82rem; padding: 0; text-decoration: underline; text-underline-offset: 2px; }
.link-button:hover { color: #15191e; }

/* ── Responsive additions ────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .home-metrics { grid-template-columns: repeat(2, 1fr); }
  .qr-modal-body-v2 { grid-template-columns: 1fr; overflow-y: auto; }
  .qr-activity-row { grid-template-columns: 100px auto 1fr 30px; }
  .qr-analytics-strip { display: none; }
}
/* QR view mode stacks on truly narrow screens only */
@media (max-width: 620px) {
  .qr-view-body { grid-template-columns: 1fr; overflow-y: auto; }
  .qr-view-visual-pane { border-right: none; border-bottom: 1px solid #e6dfd4; }
  .qr-view-chart-wrap { height: 140px; }
}

@media (max-width: 480px) {
  .home-metrics { grid-template-columns: 1fr 1fr; }
}

/* ── QR Bank table ───────────────────────────────────────────────────────── */
.qr-filters-bar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.qr-search {
  flex: 1;
  min-width: 180px;
}

.qr-type-tabs {
  display: flex;
  gap: 2px;
}

.qr-type-tabs button {
  background: #f7f2ea;
  border: 1px solid #e8dccb;
  border-radius: 4px;
  color: #6b5a42;
  cursor: pointer;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 5px 10px;
  transition: background 0.12s;
}

.qr-type-tabs button:hover { background: #f0e8d8; }
.qr-type-tabs button.active {
  background: #e8dccb;
  border-color: #c8a87a;
  color: #3a2a10;
}

.qr-sort-select {
  flex: 0 0 auto;
  width: auto;
}

.qr-table .qr-hash-code {
  background: #f0ebe3;
  border-radius: 4px;
  color: #7a542a;
  font-size: 0.78rem;
  padding: 2px 6px;
}

.qr-target-cell {
  color: #4a3a2a;
  font-size: 0.82rem;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-scans {
  color: #6b7280;
  font-size: 0.82rem;
  text-align: right;
  white-space: nowrap;
  width: 60px;
}

.paid-badge {
  border-radius: 10px;
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 2px 8px;
  white-space: nowrap;
}

.paid-badge--paid   { background: #dff0da; color: #2e6320; }
.paid-badge--unpaid { background: #f0e8d8; color: #7a5226; }

.qr-row-warn { background: rgba(250, 230, 195, 0.3); }
.qr-row-warn:hover { background: rgba(250, 220, 170, 0.45) !important; }

.icon-btn {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 5px;
  color: #7a6650;
  cursor: pointer;
  display: inline-flex;
  font-size: 0.82rem;
  height: 26px;
  justify-content: center;
  padding: 0;
  transition: background 0.12s, border-color 0.12s;
  width: 26px;
}

.icon-btn:hover {
  background: #f0e8d8;
  border-color: #d8bd8f;
  color: #3a2010;
}

@media (max-width: 700px) {
  .qr-filters-bar { flex-direction: column; align-items: stretch; }
  .qr-type-tabs { flex-wrap: wrap; }
  .qr-target-cell { max-width: 120px; }
}
</style>

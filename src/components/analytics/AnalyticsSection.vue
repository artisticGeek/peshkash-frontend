<template>
  <div class="analytics-section">
    <!-- Header + filters -->
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
      <div class="d-flex align-items-center gap-2">
        <div>
          <h5 class="fw-bold mb-0">Analytics</h5>
          <p class="text-muted small mb-0">QR scan and engagement data</p>
        </div>
        <span v-if="gaEnabled" class="badge bg-success-subtle text-success border border-success-subtle ms-1" style="font-size:0.7rem;">
          <i class="bi bi-graph-up me-1"></i>GA Active
        </span>
      </div>
      <div class="d-flex gap-2 align-items-center flex-wrap">
        <select
          v-if="vendors.length"
          v-model="selectedVendorId"
          class="form-select form-select-sm"
          style="max-width: 180px;"
          @change="load"
        >
          <option :value="undefined">All Vendors</option>
          <option v-for="v in vendors" :key="v.id" :value="v.id">{{ v.displayName }}</option>
        </select>
        <div class="btn-group btn-group-sm" role="group">
          <button
            v-for="r in RANGES"
            :key="r.value"
            type="button"
            class="btn btn-outline-secondary"
            :class="{ active: range === r.value }"
            @click="setRange(r.value)"
          >{{ r.label }}</button>
        </div>
        <button class="btn btn-sm btn-outline-primary" @click="load" :disabled="loading">
          <i class="bi bi-arrow-clockwise" :class="{ 'spin': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="row g-3 mb-4">
      <div v-for="n in 4" :key="n" class="col-6 col-md-3">
        <div class="card border-0 shadow-sm placeholder-glow" style="height:100px; border-radius:12px;">
          <div class="card-body"><span class="placeholder col-8 rounded"></span></div>
        </div>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="alert alert-warning d-flex align-items-center gap-2">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span>Analytics data unavailable. The <code>analytics_event</code> table may not exist yet — run the migration.</span>
    </div>

    <!-- Data -->
    <template v-else-if="summary">
      <!-- KPI Row -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-md">
          <KpiCard label="Total Scans" :value="summary.totalScans" icon="bi-qr-code-scan" icon-class="text-primary" />
        </div>
        <div class="col-6 col-md">
          <KpiCard label="User Actions" :value="summary.totalActions" icon="bi-cursor-fill" icon-class="text-success" />
        </div>
        <div class="col-6 col-md">
          <KpiCard
            label="Engagement Rate"
            :value="engagementRate"
            :subtitle="engagementRate + '% actions from scans'"
            icon="bi-arrow-repeat"
            icon-class="text-purple"
          />
        </div>
        <div class="col-6 col-md">
          <KpiCard
            label="Peak Day"
            :value="peakDay.count"
            :subtitle="peakDay.date"
            icon="bi-graph-up-arrow"
            icon-class="text-warning"
          />
        </div>
        <div class="col-6 col-md">
          <KpiCard
            label="Mobile Share"
            :value="mobilePct"
            :subtitle="mobilePct + '% of scans'"
            icon="bi-phone-fill"
            icon-class="text-info"
          />
        </div>
      </div>

      <!-- Charts row -->
      <div class="row g-3 mb-4">
        <div class="col-12 col-lg-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="fw-semibold mb-3">Scans Over Time</h6>
              <ScanChart :data="summary.scansPerDay" />
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h6 class="fw-semibold mb-3">User Actions</h6>
              <ActionBreakdown :data="summary.actionBreakdown" />
            </div>
          </div>
        </div>
      </div>

      <!-- Tables row -->
      <div class="row g-3 mb-3">
        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <h6 class="fw-semibold mb-3">Top QR Codes</h6>
              <div v-if="topQrDetails.length" class="table-responsive">
                <table class="table table-sm align-middle mb-0 qr-detail-table">
                  <thead class="table-light">
                    <tr>
                      <th>Target</th>
                      <th class="text-center">Scans</th>
                      <th class="text-center">Actions</th>
                      <th class="text-center">Rate</th>
                      <th class="text-end">Last Scan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in topQrDetails" :key="row.qrHash">
                      <td>
                        <div class="d-flex align-items-center gap-2">
                          <span class="badge qr-type-badge" :class="qrTypeBadgeClass(row.qrType)">{{ row.qrType }}</span>
                          <div>
                            <div class="fw-medium small">{{ row.targetName }}</div>
                            <code class="text-muted" style="font-size:0.7rem;">{{ row.qrHash }}</code>
                          </div>
                        </div>
                      </td>
                      <td class="text-center">{{ row.scans }}</td>
                      <td class="text-center">{{ row.actions }}</td>
                      <td class="text-center">
                        <span :class="row.scans ? 'text-success fw-medium' : 'text-muted'">
                          {{ row.scans ? Math.round((row.actions / row.scans) * 100) + '%' : '—' }}
                        </span>
                      </td>
                      <td class="text-end text-muted small">{{ formatDate(row.lastActivity) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="text-muted small mb-0">No QR scan data yet.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Device Split + Copy Summary row -->
      <div class="row g-3 mb-3">
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <h6 class="fw-semibold mb-3">Device Split</h6>
              <DeviceSplit :data="summary.deviceSplit" />
            </div>
          </div>
        </div>
        <div class="col-12 col-md-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body d-flex flex-column">
              <div class="d-flex align-items-center justify-content-between mb-3">
                <h6 class="fw-semibold mb-0">Business Summary</h6>
                <button
                  class="btn btn-sm"
                  :class="summaryCopied ? 'btn-success' : 'btn-outline-secondary'"
                  @click="copySummary"
                  :disabled="!summaryText"
                >
                  <i :class="summaryCopied ? 'bi bi-check-lg' : 'bi bi-clipboard'" class="me-1"></i>
                  {{ summaryCopied ? 'Copied!' : 'Copy' }}
                </button>
              </div>
              <p class="small text-muted mb-0 flex-grow-1" style="line-height:1.6;">{{ summaryText || 'No data to summarise yet.' }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Items table -->
      <div class="row g-3 mb-4">
        <div class="col-12">
          <div class="card border-0 shadow-sm">
            <div class="card-body">
              <h6 class="fw-semibold mb-3">Top Items / Products</h6>
              <TopItemsTable :range="range" :vendor-id="selectedVendorId" :show-vendor="true" :show-event="true" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Empty state (first-run — no rows at all) -->
    <div v-else-if="!loading" class="text-center py-5 text-muted">
      <i class="bi bi-bar-chart-line fs-1 d-block mb-3 opacity-25"></i>
      <p class="mb-0">No analytics data yet. Start scanning QR codes to see data here.</p>
    </div>

    <!-- ── Resource Drill-down ───────────────────────────────────────────── -->
    <div class="resource-drilldown mt-2">
      <div class="d-flex align-items-center justify-content-between mb-3">
        <div>
          <h5 class="fw-bold mb-0">Drill Down by Resource</h5>
          <p class="text-muted small mb-0">Click any event or contact card to see its detailed analytics</p>
        </div>
      </div>

      <!-- Resource type tabs -->
      <div class="drilldown-tabs mb-3">
        <button
          v-for="tab in resourceTabs"
          :key="tab.key"
          class="drilldown-tab-btn"
          :class="{ active: resourceTab === tab.key }"
          @click="resourceTab = tab.key; drilldownTarget = null"
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
          <span v-if="tab.count" class="drilldown-tab-count">{{ tab.count }}</span>
        </button>
      </div>

      <!-- Resource grid -->
      <div v-if="resourceTab === 'events'" class="resource-grid">
        <div
          v-for="event in drilldownEvents"
          :key="event.id"
          class="resource-card"
          :class="{ active: drilldownTarget?.type === 'event' && drilldownTarget.id === event.id }"
          @click="selectDrilldown('event', event.id, event.displayName)"
        >
          <div class="resource-card-icon"><i class="bi bi-calendar2-week"></i></div>
          <div class="resource-card-body">
            <div class="resource-card-name">{{ event.displayName }}</div>
            <div class="resource-card-meta">
              <span class="status-pill" :class="`status-${event.status}`">{{ event.status }}</span>
            </div>
          </div>
          <i class="bi bi-chevron-right resource-card-arrow"></i>
        </div>
        <div v-if="!drilldownEvents.length" class="resource-empty">
          <i class="bi bi-calendar2-x"></i>
          <span>No events found.</span>
        </div>
      </div>

      <div v-else-if="resourceTab === 'contacts'" class="resource-grid">
        <div
          v-for="vendor in drilldownVendors"
          :key="vendor.id"
          class="resource-card"
          :class="{ active: drilldownTarget?.type === 'vendor' && drilldownTarget.id === vendor.id }"
          @click="selectDrilldown('vendor', vendor.id, vendor.displayName)"
        >
          <div class="resource-card-icon"><i class="bi bi-person-vcard"></i></div>
          <div class="resource-card-body">
            <div class="resource-card-name">{{ vendor.displayName }}</div>
            <div class="resource-card-meta"><code class="small text-muted">{{ vendor.name }}</code></div>
          </div>
          <i class="bi bi-chevron-right resource-card-arrow"></i>
        </div>
        <div v-if="!drilldownVendors.length" class="resource-empty">
          <i class="bi bi-person-x"></i>
          <span>No contact cards found.</span>
        </div>
      </div>

      <!-- Inline analytics panel -->
      <div v-if="drilldownTarget" class="drilldown-panel mt-3">
        <EventAnalyticsPanel
          v-if="drilldownTarget.type === 'event'"
          :event-id="drilldownTarget.id"
          :event-name="drilldownTarget.name"
        />
        <VendorAnalyticsPanel
          v-else-if="drilldownTarget.type === 'vendor'"
          :vendor-id="drilldownTarget.id"
          :vendor-name="drilldownTarget.name"
          @close="drilldownTarget = null"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { gaEnabled } from '../../utils/ga';
import KpiCard from './KpiCard.vue';
import ScanChart from './ScanChart.vue';
import ActionBreakdown from './ActionBreakdown.vue';
import DeviceSplit from './DeviceSplit.vue';
import TopItemsTable from './TopItemsTable.vue';
import EventAnalyticsPanel from './EventAnalyticsPanel.vue';
import VendorAnalyticsPanel from './VendorAnalyticsPanel.vue';

interface Vendor { id: number; displayName: string; name: string }
interface EventResource { id: number; displayName: string; name: string; status: string }
interface QrDetail {
  qrHash: string;
  qrType: string;
  targetName: string;
  scans: number;
  actions: number;
  lastActivity: string;
}

interface Summary {
  totalScans: number;
  totalActions: number;
  scansPerDay: Array<{ date: string; count: number }>;
  topQrHashes: Array<{ qrHash: string; count: number }>;
  topQrDetails: QrDetail[];
  actionBreakdown: Array<{ actionType: string; count: number }>;
  deviceSplit: Array<{ deviceType: string; count: number }>;
}

const RANGES = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
] as const;

type RangeValue = typeof RANGES[number]['value'];

const loading = ref(false);
const error = ref(false);
const summary = ref<Summary | null>(null);
const vendors = ref<Vendor[]>([]);
const selectedVendorId = ref<number | undefined>(undefined);
const range = ref<RangeValue>('30d');

// Drill-down state
type ResourceTab = 'events' | 'contacts';
const resourceTab = ref<ResourceTab>('events');
const drilldownTarget = ref<{ type: 'event' | 'vendor'; id: number; name: string } | null>(null);
const allEvents = ref<EventResource[]>([]);
const drilldownVendors = ref<Vendor[]>([]);

const drilldownEvents = computed(() =>
  selectedVendorId.value
    ? allEvents.value.filter(e => (e as any).vendorId === selectedVendorId.value)
    : allEvents.value
);

const resourceTabs = computed(() => [
  { key: 'events' as ResourceTab, label: 'Events', icon: 'bi bi-calendar2-week', count: drilldownEvents.value.length },
  { key: 'contacts' as ResourceTab, label: 'Contact Cards', icon: 'bi bi-person-vcard', count: drilldownVendors.value.length },
]);

watch(selectedVendorId, () => {
  drilldownTarget.value = null;
});

function selectDrilldown(type: 'event' | 'vendor', id: number, name: string) {
  if (drilldownTarget.value?.type === type && drilldownTarget.value.id === id) {
    drilldownTarget.value = null; // toggle off
  } else {
    drilldownTarget.value = { type, id, name };
  }
}

const topQrDetails = computed(() => summary.value?.topQrDetails ?? []);

const engagementRate = computed(() => {
  const scans = summary.value?.totalScans ?? 0;
  if (!scans) return 0;
  return Math.round(((summary.value?.totalActions ?? 0) / scans) * 100);
});

const ACTION_LABEL: Record<string, string> = {
  whatsapp_click: 'WhatsApp', call_click: 'Phone Call', email_click: 'Email',
  directions_click: 'Directions', share_click: 'Share', save_contact: 'Save Contact',
  social_click: 'Social Link', item_expand: 'Item Expanded',
  vendor_contact_view: 'Contact Page', menu_view: 'Menu View', item_detail_view: 'Item Detail',
};

const RANGE_LABEL: Record<string, string> = {
  '7d': 'In the last 7 days', '30d': 'In the last 30 days',
  '90d': 'In the last 90 days', 'all': 'Overall',
};

const summaryCopied = ref(false);

const summaryText = computed(() => {
  const s = summary.value;
  if (!s) return '';
  const scans = s.totalScans;
  const actions = s.totalActions;
  const topQr = topQrDetails.value[0];
  const topAction = s.actionBreakdown[0];
  const period = RANGE_LABEL[range.value] ?? 'This period';

  const parts: string[] = [];
  parts.push(`${period}, your QR pages received ${scans} scan${scans !== 1 ? 's' : ''} and ${actions} customer action${actions !== 1 ? 's' : ''}.`);
  if (topQr) parts.push(`The top QR code was "${topQr.targetName}" with ${topQr.scans} scan${topQr.scans !== 1 ? 's' : ''}.`);
  if (topAction) parts.push(`${ACTION_LABEL[topAction.actionType] ?? topAction.actionType} was the most used action.`);
  if (scans > 0) parts.push(`Engagement rate: ${engagementRate.value}%.`);
  return parts.join(' ');
});

async function copySummary() {
  if (!summaryText.value) return;
  await navigator.clipboard.writeText(summaryText.value);
  summaryCopied.value = true;
  setTimeout(() => { summaryCopied.value = false; }, 2000);
}

const peakDay = computed(() => {
  const days = summary.value?.scansPerDay ?? [];
  if (!days.length) return { date: '—', count: 0 };
  const peak = days.reduce((a, b) => b.count > a.count ? b : a);
  const label = new Date(peak.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return { date: label, count: peak.count };
});

const mobilePct = computed(() => {
  const split = summary.value?.deviceSplit ?? [];
  const total = split.reduce((s, d) => s + d.count, 0);
  if (!total) return 0;
  const mobile = split.find(d => d.deviceType === 'mobile')?.count ?? 0;
  return Math.round((mobile / total) * 100);
});

function qrTypeBadgeClass(type: string) {
  return { event: 'bg-primary-subtle text-primary', vendor: 'bg-success-subtle text-success', static: 'bg-secondary-subtle text-secondary' }[type] ?? 'bg-secondary-subtle text-secondary';
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function setRange(v: RangeValue) {
  range.value = v;
  load();
}

async function load() {
  loading.value = true;
  error.value = false;
  try {
    const params: Record<string, string | number> = { range: range.value };
    if (selectedVendorId.value) params.vendorId = selectedVendorId.value;
    const res = await axios.get<Summary>(`${API_BASE_URL}/analytics/summary`, { params });
    summary.value = res.data;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

async function loadVendors() {
  try {
    const res = await axios.get<Vendor[]>(`${API_BASE_URL}/admin/vendors`);
    vendors.value = res.data ?? [];
    drilldownVendors.value = res.data ?? [];
  } catch {
    // vendors list stays empty — non-critical
  }
}

async function loadEvents() {
  try {
    const res = await axios.get<EventResource[]>(`${API_BASE_URL}/admin/events`);
    allEvents.value = res.data ?? [];
  } catch {
    // Non-critical
  }
}

onMounted(async () => {
  await Promise.all([loadVendors(), load(), loadEvents()]);
});
</script>

<style scoped>
.spin {
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.btn-group .btn.active {
  background-color: var(--bs-primary);
  color: #fff;
  border-color: var(--bs-primary);
}
.text-purple { color: #7c3aed; }
.qr-type-badge { font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; white-space: nowrap; }
.qr-detail-table th { font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
.qr-detail-table td { font-size: 0.82rem; }
.status-pill { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; text-transform: capitalize; }
.status-active { background: #d1fae5; color: #065f46; }
.status-inactive { background: #f3f4f6; color: #6b7280; }
.status-draft { background: #fef3c7; color: #92400e; }

/* Drill-down */
.resource-drilldown { border-top: 1px solid var(--bs-border-color, #dee2e6); padding-top: 2rem; }
.drilldown-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.drilldown-tab-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 20px; border: 1px solid var(--bs-border-color, #dee2e6);
  background: transparent; font-size: 0.85rem; cursor: pointer; transition: all 0.15s;
  color: var(--bs-secondary-color, #6c757d);
}
.drilldown-tab-btn:hover { background: var(--bs-light, #f8f9fa); }
.drilldown-tab-btn.active { background: var(--bs-primary); color: #fff; border-color: var(--bs-primary); }
.drilldown-tab-count { background: rgba(255,255,255,0.25); border-radius: 10px; padding: 1px 6px; font-size: 0.72rem; }
.drilldown-tab-btn:not(.active) .drilldown-tab-count { background: var(--bs-light, #f0f0f0); color: var(--bs-secondary, #6c757d); }

.resource-grid { display: flex; flex-direction: column; gap: 0.5rem; }
.resource-card {
  display: flex; align-items: center; gap: 0.75rem;
  padding: 0.75rem 1rem; border-radius: 10px;
  border: 1px solid var(--bs-border-color, #dee2e6);
  cursor: pointer; transition: all 0.15s;
  background: var(--bs-body-bg, #fff);
}
.resource-card:hover { border-color: var(--bs-primary); background: var(--bs-primary-bg-subtle, #f0f4ff); }
.resource-card.active { border-color: var(--bs-primary); background: var(--bs-primary-bg-subtle, #e8eeff); }
.resource-card-icon { width: 36px; height: 36px; border-radius: 8px; background: var(--bs-light, #f8f9fa); display: flex; align-items: center; justify-content: center; font-size: 1rem; color: var(--bs-primary); flex-shrink: 0; }
.resource-card-body { flex: 1; min-width: 0; }
.resource-card-name { font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.resource-card-meta { margin-top: 2px; }
.resource-card-arrow { color: var(--bs-secondary-color, #6c757d); font-size: 0.75rem; }
.resource-empty { display: flex; align-items: center; gap: 0.5rem; color: var(--bs-secondary-color, #6c757d); font-size: 0.85rem; padding: 1.5rem; justify-content: center; }
.drilldown-panel { border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 12px; overflow: hidden; }
</style>

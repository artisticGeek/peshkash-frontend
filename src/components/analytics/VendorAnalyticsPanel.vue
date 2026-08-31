<template>
  <div class="vendor-analytics">

    <!-- Toolbar -->
    <div class="va-toolbar">
      <span v-if="lastActivityLabel" class="va-last-scan">
        <i class="bi bi-clock me-1"></i>Last scan: {{ lastActivityLabel }}
      </span>
      <span v-else />
      <div class="va-controls">
        <DateRangePicker v-model="dateRange" @update:modelValue="load" />
        <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading" title="Refresh">
          <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
        </button>
        <button class="btn btn-sm btn-outline-success" :disabled="exportLoading"
          title="Export to Excel" @click="exportVendor(props.vendorId, props.vendorName)">
          <i class="bi bi-file-earmark-spreadsheet me-1"></i>
          <span v-if="exportLoading"><i class="bi bi-arrow-clockwise spin me-1"></i>Exporting…</span>
          <span v-else>Excel</span>
        </button>
        <button class="btn btn-sm btn-outline-secondary" @click="$emit('close')" title="Close">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="loading" class="va-stats-strip placeholder-glow mb-3">
      <div class="va-stat"><span class="placeholder col-4 rounded d-block mx-auto mb-1" style="height:2.5rem"></span><span class="placeholder col-6 rounded d-block mx-auto" style="height:.7rem"></span></div>
      <div class="va-divider" />
      <div class="va-stat"><span class="placeholder col-4 rounded d-block mx-auto mb-1" style="height:2.5rem"></span><span class="placeholder col-6 rounded d-block mx-auto" style="height:.7rem"></span></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small">
      <i class="bi bi-exclamation-triangle me-1"></i>Analytics unavailable.
    </div>

    <!-- Empty -->
    <div v-else-if="!summary || (summary.totalScans === 0 && summary.totalActions === 0)" class="text-center py-5 text-muted">
      <i class="bi bi-qr-code-scan fs-1 d-block mb-3 opacity-25"></i>
      <p class="mb-1 fw-medium">No activity yet</p>
      <p class="mb-0 small">Analytics will appear after customers scan this vendor's QR code or interact with it.</p>
    </div>

    <!-- Data -->
    <template v-else-if="summary">

      <!-- Stats strip -->
      <div class="va-stats-strip mb-3">
        <div class="va-stat">
          <div class="va-stat-value">{{ summary.totalScans }}</div>
          <div class="va-stat-label">Scans</div>
        </div>
        <div class="va-divider" />
        <div class="va-stat">
          <div class="va-stat-value">{{ totalContactActions }}</div>
          <div class="va-stat-label">Actions</div>
        </div>
        <template v-if="hasActions">
          <div class="va-divider" />
          <div class="va-stat">
            <div class="va-stat-value">{{ engagementRate }}<span class="va-pct">%</span></div>
            <div class="va-stat-label">Engagement</div>
          </div>
        </template>
      </div>

      <!-- Unified chart -->
      <div class="va-card mb-3">
        <div class="va-section-label">Activity</div>
        <div class="va-chart-wrap">
          <ContactActionsChart
            :scans-per-period="scansPerPeriod"
            :actions-per-period-by-type="actionsPerPeriodByType"
            :from="dateRange.from"
            :to="dateRange.to"
            :granularity="chartGranularity"
          />
        </div>
      </div>

      <!-- Event trace log -->
      <div class="va-card mb-3">
        <div class="va-section-label">Event Log</div>
        <EventLog
          :vendor-id="props.vendorId"
          :from="dateRange.from"
          :to="dateRange.to"
        />
      </div>

      <!-- QR table — only when there are multiple QR codes -->
      <div v-if="summary.topQrDetails.length > 1" class="va-card">
        <div class="va-section-label">QR Codes</div>
        <div class="table-responsive">
          <table class="table table-sm align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th>Target</th>
                <th class="text-center">Scans</th>
                <th class="text-center">Actions</th>
                <th class="text-center">Rate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in summary.topQrDetails" :key="row.qrHash">
                <td class="small fw-medium text-body">{{ row.targetName || '—' }}</td>
                <td class="text-center">{{ row.scans }}</td>
                <td class="text-center">{{ row.actions }}</td>
                <td class="text-center">
                  <span :class="row.actions > 0 ? 'text-success fw-medium' : 'text-muted'">
                    {{ row.scans ? Math.round((row.actions / row.scans) * 100) + '%' : '—' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import ContactActionsChart from './ContactActionsChart.vue';
import DateRangePicker, { type DateRange } from './DateRangePicker.vue';
import EventLog from './EventLog.vue';
import { useAnalyticsExport } from '../../composables/useAnalyticsExport';

const props = defineProps<{ vendorId: number; vendorName: string }>();
defineEmits<{ (e: 'close'): void }>();

const { exportVendor, loading: exportLoading } = useAnalyticsExport();

// Default: last 7 days
function defaultRange(): DateRange {
  const to   = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 3600 * 1000);
  return { from, to, label: 'Last 7 days' };
}

const dateRange = ref<DateRange>(defaultRange());

interface QrDetail { qrHash: string; qrType: string; targetName: string; scans: number; actions: number; lastActivity: string; }
interface Summary {
  totalScans: number;
  totalActions: number;
  // New fields (backend finishing_24Aug26+)
  scansPerPeriod?: Array<{ period: string; count: number }>;
  actionsPerPeriodByType?: Array<{ period: string; actionType: string; count: number }>;
  granularity?: 'hour' | 'day';
  rangeFrom?: string;
  rangeTo?: string;
  // Legacy fields — still returned by older backend
  scansPerDay?: Array<{ date: string; count: number }>;
  actionsPerDayByType?: Array<{ date: string; actionType: string; count: number }>;
  topQrDetails: QrDetail[];
  actionBreakdown: Array<{ actionType: string; count: number }>;
  lastActivity: string | null;
}

const loading = ref(false);
const error   = ref(false);
const summary = ref<Summary | null>(null);

// Backward compat: fall back to legacy scansPerDay / actionsPerDayByType if new fields absent
const scansPerPeriod = computed(() =>
  (summary.value?.scansPerPeriod?.length
    ? summary.value.scansPerPeriod
    : (summary.value?.scansPerDay ?? []).map(r => ({ period: r.date, count: r.count })))
);

const actionsPerPeriodByType = computed(() =>
  (summary.value?.actionsPerPeriodByType?.length
    ? summary.value.actionsPerPeriodByType
    : (summary.value?.actionsPerDayByType ?? []).map(r => ({ period: r.date, actionType: r.actionType, count: r.count })))
);

const chartGranularity = computed(() => summary.value?.granularity ?? 'day');

// Vendor analytics includes every vendor-owned interaction. This covers contact-card
// actions as well as custom destinations such as the Peshkash landing page.
const totalContactActions = computed(() => summary.value?.totalActions ?? 0);
const hasActions    = computed(() => totalContactActions.value > 0);
const engagementRate = computed(() => {
  const s = summary.value?.totalScans ?? 0;
  return s ? Math.round((totalContactActions.value / s) * 100) : 0;
});

const lastActivityLabel = computed(() => {
  const iso = summary.value?.lastActivity;
  if (!iso) return null;
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
});

async function load() {
  loading.value = true;
  error.value   = false;
  try {
    const { data } = await axios.get<Summary>(`${API_BASE_URL}/analytics/summary`, {
      params: {
        from:     dateRange.value.from.toISOString(),
        to:       dateRange.value.to.toISOString(),
        vendorId: props.vendorId,
      },
    });
    summary.value = data;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => props.vendorId, load);
onMounted(load);
</script>

<style scoped>
.vendor-analytics { padding: 1rem; }

/* Toolbar */
.va-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.va-last-scan { font-size: 0.8rem; color: var(--bs-secondary-color, #6c757d); }
.va-controls  { display: flex; gap: 0.375rem; align-items: center; flex-wrap: wrap; }

/* Stats strip */
.va-stats-strip {
  display: flex;
  align-items: center;
  background: var(--bs-tertiary-bg, #f8f9fa);
  border-radius: 12px;
  padding: 1rem 1.5rem;
}
.va-stat { flex: 1; text-align: center; }
.va-stat-value {
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1.1;
  color: var(--bs-body-color);
}
.va-pct { font-size: 1.1rem; font-weight: 400; color: var(--bs-secondary-color, #6c757d); }
.va-stat-label {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--bs-secondary-color, #6c757d);
  margin-top: 0.25rem;
}
.va-divider {
  width: 1px;
  height: 2.75rem;
  background: var(--bs-border-color, #dee2e6);
  flex-shrink: 0;
}

/* Section cards */
.va-card {
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 12px;
  padding: 1rem;
}
.va-section-label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--bs-secondary-color, #6c757d);
  margin-bottom: 0.75rem;
}

/* Chart area — tall enough to read */
.va-chart-wrap {
  height: 220px;
}

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

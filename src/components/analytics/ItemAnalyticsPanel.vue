<template>
  <div class="iap-wrap">

    <!-- Toolbar -->
    <div class="iap-toolbar mb-3">
      <span v-if="lastActivityLabel" class="iap-last">
        <i class="bi bi-clock me-1"></i>Last activity: {{ lastActivityLabel }}
      </span>
      <span v-else class="iap-last">No activity yet</span>
      <div class="iap-controls">
        <div class="iap-range-bar">
          <button v-for="r in RANGES" :key="r.value" class="iap-range-btn"
            :class="{ active: range === r.value }" @click="setRange(r.value)">{{ r.label }}</button>
        </div>
        <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading" title="Refresh">
          <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="iap-stats-strip placeholder-glow mb-3">
      <div class="iap-stat" v-for="n in 4" :key="n">
        <span class="placeholder col-5 rounded d-block mx-auto mb-1" style="height:2.2rem"></span>
        <span class="placeholder col-7 rounded d-block mx-auto" style="height:.65rem"></span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small mb-3">
      <i class="bi bi-exclamation-triangle me-1"></i>Analytics unavailable.
    </div>

    <!-- Empty -->
    <div v-else-if="!data || (data.totalViews === 0 && data.totalActions === 0)"
      class="iap-empty">
      <i class="bi bi-eye-slash fs-2 d-block mb-2 opacity-25"></i>
      <p class="mb-1 small fw-medium">No activity yet</p>
      <p class="mb-0 small">Analytics will appear once customers view or interact with this item.</p>
    </div>

    <!-- Data -->
    <template v-else-if="data">

      <!-- Stats strip -->
      <div class="iap-stats-strip mb-3">
        <div class="iap-stat">
          <div class="iap-stat-value">{{ data.totalViews }}</div>
          <div class="iap-stat-label">Views</div>
        </div>
        <div class="iap-divider" />
        <div class="iap-stat">
          <div class="iap-stat-value">{{ data.totalActions }}</div>
          <div class="iap-stat-label">Actions</div>
        </div>
        <div class="iap-divider" />
        <div class="iap-stat">
          <div class="iap-stat-value">{{ engagementRate }}<span class="iap-pct">%</span></div>
          <div class="iap-stat-label">Engagement</div>
        </div>
        <div class="iap-divider" />
        <div class="iap-stat">
          <div class="iap-stat-value">{{ whatsappClicks }}</div>
          <div class="iap-stat-label">WhatsApp</div>
        </div>
      </div>

      <!-- Activity chart -->
      <div class="iap-card mb-3">
        <div class="iap-section-label">Activity</div>
        <div class="iap-chart-wrap">
          <ContactActionsChart
            :scans-per-period="data.viewsPerPeriod"
            :actions-per-period-by-type="data.actionsPerPeriodByType"
            :from="rangeFrom"
            :to="rangeTo"
            :granularity="data.granularity"
            scan-label="Views"
          />
        </div>
      </div>

      <!-- Actions breakdown -->
      <div v-if="data.actionBreakdown.length" class="iap-card mb-3">
        <div class="iap-section-label">Actions Breakdown</div>
        <div v-for="row in data.actionBreakdown.slice(0, 8)" :key="row.actionType" class="iap-action-row">
          <span class="iap-action-name">{{ ACTION_LABEL[row.actionType] ?? row.actionType }}</span>
          <div class="iap-action-bar-wrap">
            <div class="iap-action-bar" :style="{ width: pct(row.count, maxAction) + '%' }"
              :class="actionBarClass(row.actionType)"></div>
          </div>
          <span class="iap-action-count">{{ row.count }}</span>
        </div>
      </div>

      <!-- Linked QR hashes -->
      <div v-if="data.linkedQrHashes.length" class="iap-card">
        <div class="iap-section-label"><i class="bi bi-qr-code me-1"></i>Linked QR Codes</div>
        <div class="d-flex flex-wrap gap-2">
          <code v-for="hash in data.linkedQrHashes" :key="hash" class="iap-qr-badge">{{ hash }}</code>
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

const props = defineProps<{
  itemId: number;
  itemName: string;
  itemType?: string;
}>();

const RANGES = [
  { label: '7D', value: '7d' }, { label: '30D', value: '30d' },
  { label: '90D', value: '90d' }, { label: 'All', value: 'all' },
] as const;
type RangeValue = typeof RANGES[number]['value'];

interface ItemAnalytics {
  totalViews: number;
  totalActions: number;
  viewsPerDay: Array<{ date: string; count: number }>;
  viewsPerPeriod: Array<{ period: string; count: number }>;
  actionsPerPeriodByType: Array<{ period: string; actionType: string; count: number }>;
  granularity: 'hour' | 'day';
  actionBreakdown: Array<{ actionType: string; count: number }>;
  lastActivity: string | null;
  linkedQrHashes: string[];
}

const ACTION_LABEL: Record<string, string> = {
  whatsapp_click: 'WhatsApp', call_click: 'Call', email_click: 'Email',
  directions_click: 'Directions', share_click: 'Share', save_contact: 'Save Contact',
  social_click: 'Social', item_expand: 'Description Read', item_detail_view: 'Detail View',
  menu_view: 'Menu View', vendor_contact_view: 'Contact View',
};

const ACTION_COLOR: Record<string, string> = {
  whatsapp_click: 'iap-bar-whatsapp', call_click: 'iap-bar-call',
  share_click: 'iap-bar-share', directions_click: 'iap-bar-dir',
};

const loading  = ref(false);
const error    = ref(false);
const data     = ref<ItemAnalytics | null>(null);
const range    = ref<RangeValue>('30d');
const rangeTo  = ref(new Date());
const rangeFrom = ref(new Date(Date.now() - 30 * 24 * 3600 * 1000));

const engagementRate = computed(() => {
  const v = data.value?.totalViews ?? 0;
  if (!v) return 0;
  return Math.min(100, Math.round(((data.value?.totalActions ?? 0) / v) * 100));
});

const whatsappClicks = computed(() =>
  data.value?.actionBreakdown.find(a => a.actionType === 'whatsapp_click')?.count ?? 0
);

const maxAction = computed(() =>
  Math.max(...(data.value?.actionBreakdown ?? []).map(r => r.count), 1)
);

const lastActivityLabel = computed(() => {
  const iso = data.value?.lastActivity;
  if (!iso) return null;
  const d = new Date(iso);
  const diffDays = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
});

function pct(val: number, max: number) { return max ? Math.round((val / max) * 100) : 0; }
function actionBarClass(type: string) { return ACTION_COLOR[type] ?? 'iap-bar-default'; }

function computeRangeDates(v: RangeValue) {
  const to = new Date();
  const days: Record<RangeValue, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 365 * 5 };
  const from = new Date(to.getTime() - days[v] * 24 * 3600 * 1000);
  return { from, to };
}

function setRange(v: RangeValue) { range.value = v; load(); }

async function load() {
  const { from, to } = computeRangeDates(range.value);
  rangeFrom.value = from;
  rangeTo.value   = to;
  loading.value = true;
  error.value   = false;
  try {
    const { data: res } = await axios.get<ItemAnalytics>(
      `${API_BASE_URL}/analytics/items/${props.itemId}`,
      { params: { range: range.value } }
    );
    data.value = res;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => props.itemId, load);
onMounted(load);
</script>

<style scoped>
.iap-wrap { padding: 0.1rem 0; }

/* Toolbar */
.iap-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 0.5rem;
}
.iap-last { font-size: 0.8rem; color: var(--bs-secondary-color, #6c757d); }
.iap-controls { display: flex; gap: 0.375rem; align-items: center; }

/* Range pills */
.iap-range-bar { display: flex; gap: 0.2rem; }
.iap-range-btn {
  border: 1px solid var(--bs-border-color, #dee2e6);
  background: var(--bs-body-bg, #fff);
  color: var(--bs-secondary-color, #6c757d);
  font-size: 0.68rem; font-weight: 500;
  padding: 2px 10px; border-radius: 20px; cursor: pointer; transition: all 0.12s;
}
.iap-range-btn:hover  { border-color: #6366f1; color: #6366f1; }
.iap-range-btn.active { background: #6366f1; border-color: #6366f1; color: #fff; }

/* Stats strip */
.iap-stats-strip {
  display: flex; align-items: center;
  background: var(--bs-tertiary-bg, #f8f9fa);
  border-radius: 12px; padding: 1rem 1.5rem;
}
.iap-stat { flex: 1; text-align: center; }
.iap-stat-value {
  font-size: 2.2rem; font-weight: 700; line-height: 1.1;
  color: var(--bs-body-color);
}
.iap-pct { font-size: 1.1rem; font-weight: 400; color: var(--bs-secondary-color, #6c757d); }
.iap-stat-label {
  font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--bs-secondary-color, #6c757d); margin-top: 0.25rem;
}
.iap-divider {
  width: 1px; height: 2.75rem;
  background: var(--bs-border-color, #dee2e6); flex-shrink: 0;
}

/* Section cards */
.iap-card { border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 12px; padding: 1rem; }
.iap-section-label {
  font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--bs-secondary-color, #6c757d); margin-bottom: 0.75rem;
}

/* Chart */
.iap-chart-wrap { height: 200px; }

/* Actions breakdown */
.iap-action-row {
  display: grid; grid-template-columns: 110px 1fr 32px;
  align-items: center; gap: 0.5rem; margin-bottom: 0.55rem;
}
.iap-action-row:last-child { margin-bottom: 0; }
.iap-action-name { font-size: 0.78rem; color: var(--bs-body-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.iap-action-bar-wrap { height: 6px; background: var(--bs-border-color, #e9ecef); border-radius: 3px; overflow: hidden; }
.iap-action-bar { height: 100%; border-radius: 3px; transition: width 0.4s ease; min-width: 2px; }
.iap-bar-default  { background: #6366f1; }
.iap-bar-whatsapp { background: #16a34a; }
.iap-bar-call     { background: #2563eb; }
.iap-bar-share    { background: #7c3aed; }
.iap-bar-dir      { background: #eab308; }
.iap-action-count { font-size: 0.75rem; font-weight: 700; text-align: right; color: var(--bs-body-color); font-variant-numeric: tabular-nums; }

/* QR badges */
.iap-qr-badge {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.7rem; color: var(--bs-secondary-color, #6c757d);
  background: var(--bs-tertiary-bg, #f8f9fa);
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 6px; padding: 0.2rem 0.5rem;
}

/* Empty */
.iap-empty { text-align: center; padding: 2.5rem 1rem; color: var(--bs-secondary-color, #6c757d); }

.spin { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

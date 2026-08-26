<template>
  <AnalyticsDrawer
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    icon="bi bi-calendar2-week"
    :title="eventName"
    subtitle="Event Analytics"
  >
    <!-- Range selector in header -->
    <template #header-actions>
      <div class="btn-group btn-group-sm">
        <button
          v-for="r in RANGES"
          :key="r.value"
          type="button"
          class="btn btn-outline-secondary"
          :class="{ active: range === r.value }"
          @click="setRange(r.value)"
        >{{ r.label }}</button>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="row g-2 mb-3">
      <div v-for="n in 4" :key="n" class="col-6">
        <div class="card border-0 shadow-sm placeholder-glow" style="height:76px;border-radius:10px;">
          <div class="card-body"><span class="placeholder col-8 rounded"></span></div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small">
      <i class="bi bi-exclamation-triangle me-1"></i>Analytics unavailable.
    </div>

    <!-- Empty -->
    <div v-else-if="!summary || summary.totalScans === 0 && !itemHasData" class="edd-empty">
      <i class="bi bi-qr-code-scan"></i>
      <p class="mb-1 fw-medium">No data yet</p>
      <p class="mb-0">Analytics will appear after customers scan this event's QR code.</p>
    </div>

    <template v-else-if="summary">
      <!-- Summary sentence -->
      <p class="edd-summary-text mb-3">
        <strong>{{ eventName }}</strong> received
        <strong>{{ summary.totalScans }} scan{{ summary.totalScans !== 1 ? 's' : '' }}</strong>
        and <strong>{{ summary.totalActions }} action{{ summary.totalActions !== 1 ? 's' : '' }}</strong>.
        <span v-if="engagementRate > 0"> Engagement rate: <strong>{{ engagementRate }}%</strong>.</span>
      </p>

      <!-- KPIs: 2-up on mobile, 4-up on wider -->
      <div class="row g-2 mb-3">
        <div class="col-6">
          <div class="edd-kpi-card">
            <div class="edd-kpi-icon text-primary"><i class="bi bi-qr-code-scan"></i></div>
            <div class="edd-kpi-val">{{ summary.totalScans }}</div>
            <div class="edd-kpi-label">Scans</div>
          </div>
        </div>
        <div class="col-6">
          <div class="edd-kpi-card">
            <div class="edd-kpi-icon text-warning"><i class="bi bi-eye"></i></div>
            <div class="edd-kpi-val">{{ itemViewCount }}</div>
            <div class="edd-kpi-label">Item Views</div>
          </div>
        </div>
        <div class="col-6">
          <div class="edd-kpi-card">
            <div class="edd-kpi-icon text-success"><i class="bi bi-cursor-fill"></i></div>
            <div class="edd-kpi-val">{{ summary.totalActions }}</div>
            <div class="edd-kpi-label">Actions</div>
          </div>
        </div>
        <div class="col-6">
          <div class="edd-kpi-card">
            <div class="edd-kpi-icon" style="color:#7c3aed"><i class="bi bi-arrow-repeat"></i></div>
            <div class="edd-kpi-val">{{ engagementRate }}%</div>
            <div class="edd-kpi-label">Engagement</div>
          </div>
        </div>
      </div>

      <!-- Scans Over Time -->
      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body pb-2">
          <h6 class="fw-semibold mb-2 small text-uppercase text-muted">Scans Over Time</h6>
          <ScanChart :data="summary.scansPerDay" />
        </div>
      </div>

      <!-- Actions breakdown (compact bar list) -->
      <div v-if="topActions.length" class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <h6 class="fw-semibold mb-3 small text-uppercase text-muted">Top Actions</h6>
          <div v-for="(a, i) in topActions" :key="a.actionType" class="edd-action-row">
            <span class="edd-action-label">{{ ACTION_LABEL[a.actionType] ?? a.actionType }}</span>
            <div class="edd-action-bar-wrap">
              <div
                class="edd-action-bar"
                :style="{ width: (topActions[0].count ? (a.count / topActions[0].count) * 100 : 0) + '%' }"
                :class="['edd-bar-color-' + (i % 5)]"
              ></div>
            </div>
            <span class="edd-action-count">{{ a.count }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Items breakdown table — always shown when event has data -->
    <div class="edd-items-section">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <h6 class="fw-semibold mb-0 small text-uppercase text-muted">Items Detail</h6>
        <span class="badge bg-secondary-subtle text-secondary border" style="font-size:0.7rem;">sortable · searchable</span>
      </div>
      <ItemBreakdownTable :event-id="eventId" :range="range" />
    </div>
  </AnalyticsDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import AnalyticsDrawer from './AnalyticsDrawer.vue';
import ScanChart from './ScanChart.vue';
import ItemBreakdownTable from './ItemBreakdownTable.vue';

const props = defineProps<{
  modelValue: boolean;
  eventId: number;
  eventName: string;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const RANGES = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
  { label: 'All', value: 'all' },
] as const;
type RangeValue = typeof RANGES[number]['value'];

const ACTION_LABEL: Record<string, string> = {
  whatsapp_click: 'WhatsApp', call_click: 'Phone Call', email_click: 'Email',
  directions_click: 'Directions', share_click: 'Share', save_contact: 'Save Contact',
  social_click: 'Social', item_expand: 'Item Expand',
  item_detail_view: 'Item Detail', menu_view: 'Menu View',
  vendor_contact_view: 'Contact View',
};

interface Summary {
  totalScans: number;
  totalActions: number;
  scansPerDay: Array<{ date: string; count: number }>;
  actionBreakdown: Array<{ actionType: string; count: number }>;
  topItemsViewed: Array<{ itemId: number; itemName: string; views: number }>;
  lastActivity: string | null;
}

const loading = ref(false);
const error = ref(false);
const summary = ref<Summary | null>(null);
const range = ref<RangeValue>('30d');

const engagementRate = computed(() => {
  const s = summary.value?.totalScans ?? 0;
  return s ? Math.round(((summary.value?.totalActions ?? 0) / s) * 100) : 0;
});

const itemViewCount = computed(() => {
  const b = summary.value?.actionBreakdown ?? [];
  const expand = b.find(a => a.actionType === 'item_expand')?.count ?? 0;
  const detail = b.find(a => a.actionType === 'item_detail_view')?.count ?? 0;
  return expand + detail;
});

const topActions = computed(() =>
  (summary.value?.actionBreakdown ?? []).slice(0, 5)
);

const itemHasData = computed(() =>
  (summary.value?.topItemsViewed?.length ?? 0) > 0
);

function setRange(v: RangeValue) { range.value = v; load(); }

async function load() {
  if (!props.eventId) return;
  loading.value = true;
  error.value = false;
  try {
    const { data } = await axios.get<Summary>(`${API_BASE_URL}/analytics/summary`, {
      params: { range: range.value, eventId: props.eventId },
    });
    summary.value = data;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

// Reload when opened or event changes
watch(() => [props.modelValue, props.eventId], ([open]) => {
  if (open) load();
});
onMounted(() => { if (props.modelValue) load(); });
</script>

<style scoped>
/* KPI cards */
.edd-kpi-card {
  padding: 0.75rem;
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 10px;
  background: var(--bs-body-bg, #fff);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.edd-kpi-icon { font-size: 1rem; margin-bottom: 4px; }
.edd-kpi-val { font-size: 1.4rem; font-weight: 700; line-height: 1.1; }
.edd-kpi-label { font-size: 0.72rem; color: var(--bs-secondary-color, #6c757d); font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }

/* Summary text */
.edd-summary-text { font-size: 0.875rem; color: var(--bs-secondary-color, #6c757d); line-height: 1.6; }

/* Action bars */
.edd-action-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.edd-action-label {
  font-size: 0.78rem;
  color: var(--bs-body-color);
  width: 110px;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.edd-action-bar-wrap {
  flex: 1;
  height: 8px;
  background: var(--bs-light, #f0f0f0);
  border-radius: 4px;
  overflow: hidden;
}
.edd-action-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
  min-width: 4px;
}
.edd-bar-color-0 { background: #6366f1; }
.edd-bar-color-1 { background: #22c55e; }
.edd-bar-color-2 { background: #f59e0b; }
.edd-bar-color-3 { background: #ec4899; }
.edd-bar-color-4 { background: #14b8a6; }
.edd-action-count {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bs-secondary-color, #6c757d);
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}

/* Items section */
.edd-items-section {
  border-top: 1px solid var(--bs-border-color, #dee2e6);
  padding-top: 1rem;
  margin-top: 0.5rem;
}

/* Empty state */
.edd-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--bs-secondary-color, #6c757d);
}
.edd-empty i { font-size: 2.5rem; opacity: 0.2; display: block; margin-bottom: 0.75rem; }
.edd-empty p { font-size: 0.875rem; }

/* Range toggle active state */
.btn-group .btn.active {
  background-color: var(--bs-primary);
  color: #fff;
  border-color: var(--bs-primary);
}
</style>

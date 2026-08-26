<template>
  <AnalyticsDrawer
    v-model="modelValue"
    icon="bi bi-box-seam"
    :title="itemName"
    subtitle="Item Analytics"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <!-- Toolbar -->
    <div class="idd-toolbar">
      <span v-if="lastActivityLabel" class="idd-last">
        <i class="bi bi-clock me-1"></i>Last activity: {{ lastActivityLabel }}
      </span>
      <span v-else class="idd-last">No activity yet</span>
      <div class="idd-controls">
        <DateRangePicker v-model="dateRange" @update:modelValue="load" />
        <button class="btn btn-sm btn-outline-secondary" @click="load" :disabled="loading" title="Refresh">
          <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="idd-stats-strip placeholder-glow mb-3">
      <div class="idd-stat" v-for="n in 4" :key="n">
        <span class="placeholder col-5 rounded d-block mx-auto mb-1" style="height:2.2rem"></span>
        <span class="placeholder col-7 rounded d-block mx-auto" style="height:.65rem"></span>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-warning py-2 small mb-3">
      <i class="bi bi-exclamation-triangle me-1"></i>Analytics unavailable.
    </div>

    <template v-else-if="data">
      <!-- Stats strip -->
      <div class="idd-stats-strip mb-3">
        <div class="idd-stat">
          <div class="idd-stat-value">{{ data.totalViews }}</div>
          <div class="idd-stat-label">Views</div>
        </div>
        <div class="idd-divider" />
        <div class="idd-stat">
          <div class="idd-stat-value">{{ data.totalActions }}</div>
          <div class="idd-stat-label">Actions</div>
        </div>
        <div class="idd-divider" />
        <div class="idd-stat">
          <div class="idd-stat-value">{{ engagementRate }}<span class="idd-pct">%</span></div>
          <div class="idd-stat-label">Engagement</div>
        </div>
        <div class="idd-divider" />
        <div class="idd-stat">
          <div class="idd-stat-value">{{ whatsappClicks }}</div>
          <div class="idd-stat-label">WhatsApp</div>
        </div>
      </div>

      <!-- Activity chart -->
      <div class="idd-card mb-3">
        <div class="idd-section-label">Activity</div>
        <div class="idd-chart-wrap">
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

      <!-- Event log — scoped to this item -->
      <div class="idd-card mb-3">
        <div class="idd-section-label">Activity Log</div>
        <div class="idd-log-hint">Who viewed or acted on this item, when, and via which event</div>
        <EventLog
          :item-id="itemId"
          :from="rangeFrom"
          :to="rangeTo"
        />
      </div>

      <!-- Actions breakdown -->
      <div v-if="data.actionBreakdown.length" class="idd-card">
        <div class="idd-section-label">Actions Breakdown</div>
        <div v-for="row in data.actionBreakdown.slice(0, 8)" :key="row.actionType" class="idd-action-row">
          <span class="idd-action-name">{{ ACTION_LABEL[row.actionType] ?? row.actionType }}</span>
          <div class="idd-action-bar-wrap">
            <div class="idd-action-bar" :style="{ width: pct(row.count, maxAction) + '%' }"
              :class="actionBarClass(row.actionType)"></div>
          </div>
          <span class="idd-action-count">{{ row.count }}</span>
        </div>
      </div>
    </template>

    <!-- Empty -->
    <div v-else-if="!loading" class="idd-empty">
      <i class="bi bi-eye-slash fs-2 d-block mb-2 opacity-25"></i>
      <p class="mb-1 small fw-medium">No activity yet</p>
      <p class="mb-0 small">Analytics will appear once customers view or interact with this item.</p>
    </div>

  </AnalyticsDrawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import AnalyticsDrawer from './AnalyticsDrawer.vue';
import ContactActionsChart from './ContactActionsChart.vue';
import EventLog from './EventLog.vue';
import DateRangePicker from './DateRangePicker.vue';

interface DateRange { from: Date; to: Date; label: string; }

const props = defineProps<{
  modelValue: boolean;
  itemId: number;
  itemName: string;
}>();
defineEmits<{ (e: 'update:modelValue', val: boolean): void }>();


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
};
const ACTION_COLOR: Record<string, string> = {
  whatsapp_click: 'idd-bar-whatsapp', call_click: 'idd-bar-call',
  share_click: 'idd-bar-share', directions_click: 'idd-bar-dir',
};

const loading = ref(false);
const error   = ref(false);
const data    = ref<ItemAnalytics | null>(null);
const dateRange = ref<DateRange>({
  from: new Date(Date.now() - 30 * 24 * 3600 * 1000),
  to: new Date(),
  label: 'Last 30 days',
});
const rangeFrom = computed(() => dateRange.value.from);
const rangeTo   = computed(() => dateRange.value.to);

const modelValue = computed(() => props.modelValue);

const engagementRate = computed(() => {
  const v = data.value?.totalViews ?? 0;
  return v ? Math.min(100, Math.round(((data.value?.totalActions ?? 0) / v) * 100)) : 0;
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
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
});

function pct(val: number, max: number) { return max ? Math.round((val / max) * 100) : 0; }
function actionBarClass(type: string) { return ACTION_COLOR[type] ?? 'idd-bar-default'; }

async function load() {
  loading.value = true;
  error.value   = false;
  try {
    const { from, to } = dateRange.value;
    const { data: res } = await axios.get<ItemAnalytics>(
      `${API_BASE_URL}/analytics/items/${props.itemId}`,
      { params: { from: from.toISOString(), to: to.toISOString() } }
    );
    data.value = res;
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.modelValue, props.itemId], ([open]) => { if (open) load(); });
onMounted(() => { if (props.modelValue) load(); });
</script>

<style scoped>
/* Toolbar */
.idd-toolbar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;
  margin-bottom: 1.25rem;
}
.idd-last { font-size: 0.8rem; color: var(--bs-secondary-color, #6c757d); }
.idd-controls { display: flex; gap: 0.375rem; align-items: center; }

/* Stats strip */
.idd-stats-strip {
  display: flex; align-items: center;
  background: var(--bs-tertiary-bg, #f8f9fa); border-radius: 12px; padding: 1rem 1.5rem;
}
.idd-stat { flex: 1; text-align: center; }
.idd-stat-value { font-size: 2.2rem; font-weight: 700; line-height: 1.1; color: var(--bs-body-color); }
.idd-pct { font-size: 1.1rem; font-weight: 400; color: var(--bs-secondary-color, #6c757d); }
.idd-stat-label {
  font-size: 0.72rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--bs-secondary-color, #6c757d); margin-top: 0.25rem;
}
.idd-divider { width: 1px; height: 2.75rem; background: var(--bs-border-color, #dee2e6); flex-shrink: 0; }

/* Cards */
.idd-card { border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 12px; padding: 1rem; }
.idd-section-label {
  font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--bs-secondary-color, #6c757d); margin-bottom: 0.5rem;
}
.idd-log-hint { font-size: 0.72rem; color: var(--bs-secondary-color, #6c757d); margin-bottom: 0.75rem; }

/* Chart */
.idd-chart-wrap { height: 200px; }

/* Actions breakdown */
.idd-action-row {
  display: grid; grid-template-columns: 110px 1fr 32px;
  align-items: center; gap: 0.5rem; margin-bottom: 0.55rem;
}
.idd-action-row:last-child { margin-bottom: 0; }
.idd-action-name { font-size: 0.78rem; color: var(--bs-body-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.idd-action-bar-wrap { height: 6px; background: var(--bs-border-color, #e9ecef); border-radius: 3px; overflow: hidden; }
.idd-action-bar { height: 100%; border-radius: 3px; transition: width 0.4s ease; min-width: 2px; }
.idd-bar-default  { background: #6366f1; }
.idd-bar-whatsapp { background: #16a34a; }
.idd-bar-call     { background: #2563eb; }
.idd-bar-share    { background: #7c3aed; }
.idd-bar-dir      { background: #eab308; }
.idd-action-count { font-size: 0.75rem; font-weight: 700; text-align: right; color: var(--bs-body-color); font-variant-numeric: tabular-nums; }

/* Empty */
.idd-empty { text-align: center; padding: 2.5rem 1rem; color: var(--bs-secondary-color, #6c757d); }

.spin { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

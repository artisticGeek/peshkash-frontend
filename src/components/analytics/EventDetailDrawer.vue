<template>
  <AnalyticsDrawer
    :model-value="modelValue"
    icon="bi bi-calendar2-week"
    :title="eventName"
    subtitle="Event Analytics"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="eda-toolbar">
      <span class="eda-last">
        <i class="bi bi-clock me-1"></i>{{ lastActivityLabel ? `Last activity: ${lastActivityLabel}` : 'No activity yet' }}
      </span>
      <div class="eda-controls">
        <DateRangePicker v-model="dateRange" @update:modelValue="load" />
        <button class="btn btn-sm btn-outline-secondary" type="button" :disabled="loading" title="Refresh" @click="load">
          <i class="bi bi-arrow-clockwise" :class="{ spin: loading }"></i>
        </button>
      </div>
    </div>

    <div v-if="loading && !summary" class="eda-stats-strip placeholder-glow mb-3">
      <div v-for="n in 4" :key="n" class="eda-stat">
        <span class="placeholder col-5 rounded d-block mx-auto mb-1" style="height:2.2rem"></span>
        <span class="placeholder col-7 rounded d-block mx-auto" style="height:.65rem"></span>
      </div>
    </div>

    <div v-else-if="error" class="alert alert-warning py-2 small mb-3">
      <i class="bi bi-exclamation-triangle me-1"></i>Event analytics could not be loaded.
    </div>

    <template v-else-if="summary">
      <div class="eda-stats-strip mb-3">
        <div class="eda-stat"><div class="eda-stat-value">{{ summary.totalScans }}</div><div class="eda-stat-label">Scans</div></div>
        <div class="eda-divider" />
        <div class="eda-stat"><div class="eda-stat-value">{{ summary.totalActions }}</div><div class="eda-stat-label">Actions</div></div>
        <div class="eda-divider" />
        <div class="eda-stat"><div class="eda-stat-value">{{ registrations.length }}</div><div class="eda-stat-label">Registrations</div></div>
        <div class="eda-divider" />
        <div class="eda-stat"><div class="eda-stat-value">{{ engagementRate }}<span class="eda-pct">%</span></div><div class="eda-stat-label">Engagement</div></div>
      </div>

      <div class="eda-card mb-3">
        <div class="eda-section-label">Activity</div>
        <div class="eda-chart-wrap">
          <ContactActionsChart
            :scans-per-period="scansPerPeriod"
            :actions-per-period-by-type="actionsPerPeriodByType"
            :from="dateRange.from"
            :to="dateRange.to"
            :granularity="chartGranularity"
          />
        </div>
      </div>

      <div class="eda-card mb-3">
        <div class="eda-section-label">Activity Log</div>
        <div class="eda-hint">Scans and guest actions for this event in chronological order.</div>
        <EventLog :event-id="eventId" :from="dateRange.from" :to="dateRange.to" />
      </div>

      <div class="eda-card mb-3">
        <div class="eda-card-heading">
          <div>
            <div class="eda-section-label mb-0">Verified Registrations</div>
            <div class="eda-hint mb-0">OTP-verified guests registered during this date range.</div>
          </div>
          <span class="eda-count">{{ registrations.length }}</span>
        </div>
        <div v-if="registrations.length" class="eda-registration-list">
          <div v-for="registration in registrations" :key="registration.id" class="eda-registration-row">
            <span class="eda-phone"><i class="bi bi-shield-check"></i>{{ registration.phone }}</span>
            <time :datetime="registration.registeredAt">{{ formatRegistrationDate(registration.registeredAt) }}</time>
          </div>
        </div>
        <div v-else class="eda-empty-inline"><i class="bi bi-person-check"></i>No registrations in this period.</div>
      </div>

      <div v-if="summary.actionBreakdown.length" class="eda-card">
        <div class="eda-section-label">Actions Breakdown</div>
        <div v-for="row in summary.actionBreakdown.slice(0, 8)" :key="row.actionType" class="eda-action-row">
          <span class="eda-action-name">{{ ACTION_LABEL[row.actionType] ?? row.actionType.replace(/_/g, ' ') }}</span>
          <div class="eda-action-bar-wrap"><div class="eda-action-bar" :style="{ width: pct(row.count, maxAction) + '%' }"></div></div>
          <span class="eda-action-count">{{ row.count }}</span>
        </div>
      </div>
    </template>
  </AnalyticsDrawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import AnalyticsDrawer from './AnalyticsDrawer.vue';
import ContactActionsChart from './ContactActionsChart.vue';
import DateRangePicker, { type DateRange } from './DateRangePicker.vue';
import EventLog from './EventLog.vue';

const props = defineProps<{ modelValue: boolean; eventId: number; eventName: string }>();
defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();

interface Registration { id: number; phone: string; registeredAt: string; updatedAt: string }
interface Summary {
  totalScans: number;
  totalActions: number;
  scansPerPeriod?: Array<{ period: string; count: number }>;
  scansPerDay?: Array<{ date: string; count: number }>;
  actionsPerPeriodByType?: Array<{ period: string; actionType: string; count: number }>;
  actionsPerDayByType?: Array<{ date: string; actionType: string; count: number }>;
  actionBreakdown: Array<{ actionType: string; count: number }>;
  granularity?: 'hour' | 'day';
  lastActivity: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  event_page_view: 'Event page viewed', event_registration: 'Registration',
  event_reminder_click: 'Reminder saved', event_share_click: 'Event shared',
  event_directions_click: 'Directions opened', event_livestream_click: 'Live stream opened',
  event_organizer_profile_click: 'Organizer profile opened', menu_view: 'Menu viewed',
  item_expand: 'Item expanded', item_detail_view: 'Item detail opened',
};

const dateRange = ref<DateRange>({
  from: new Date(Date.now() - 30 * 24 * 3600 * 1000),
  to: new Date(),
  label: 'Last 30 days',
});
const summary = ref<Summary | null>(null);
const registrations = ref<Registration[]>([]);
const loading = ref(false);
const error = ref(false);

const scansPerPeriod = computed(() => summary.value?.scansPerPeriod?.length
  ? summary.value.scansPerPeriod
  : (summary.value?.scansPerDay ?? []).map(row => ({ period: row.date, count: row.count })));
const actionsPerPeriodByType = computed(() => summary.value?.actionsPerPeriodByType?.length
  ? summary.value.actionsPerPeriodByType
  : (summary.value?.actionsPerDayByType ?? []).map(row => ({ period: row.date, actionType: row.actionType, count: row.count })));
const chartGranularity = computed(() => summary.value?.granularity ?? 'day');
const engagementRate = computed(() => {
  const scans = summary.value?.totalScans ?? 0;
  return scans ? Math.min(100, Math.round(((summary.value?.totalActions ?? 0) / scans) * 100)) : 0;
});
const maxAction = computed(() => Math.max(...(summary.value?.actionBreakdown ?? []).map(row => row.count), 1));
const lastActivityLabel = computed(() => {
  const value = summary.value?.lastActivity;
  if (!value) return null;
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
});

function pct(value: number, max: number) { return max ? Math.round((value / max) * 100) : 0; }
function formatRegistrationDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

async function load() {
  if (!props.eventId) return;
  loading.value = true;
  error.value = false;
  const params = { from: dateRange.value.from.toISOString(), to: dateRange.value.to.toISOString() };
  try {
    const [summaryResponse, registrationResponse] = await Promise.all([
      axios.get<Summary>(`${API_BASE_URL}/analytics/summary`, { params: { ...params, eventId: props.eventId } }),
      axios.get<Registration[]>(`${API_BASE_URL}/admin/events/${props.eventId}/registrations`, { params }),
    ]);
    summary.value = summaryResponse.data;
    registrations.value = Array.isArray(registrationResponse.data) ? registrationResponse.data : [];
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

watch(() => [props.modelValue, props.eventId], ([open]) => { if (open) load(); });
onMounted(() => { if (props.modelValue) load(); });
</script>

<!-- The drawer teleports its slot to <body>; these component-prefixed selectors must
     remain global so the teleported content receives its presentation styles. -->
<style>
.eda-toolbar { align-items:center;display:flex;flex-wrap:wrap;gap:.5rem;justify-content:space-between;margin-bottom:1.25rem }
.eda-last { color:var(--bs-secondary-color,#6c757d);font-size:.8rem }
.eda-controls { align-items:center;display:flex;gap:.375rem }
.eda-stats-strip { align-items:center;background:var(--bs-tertiary-bg,#f8f9fa);border-radius:12px;display:flex;padding:1rem 1.25rem }
.eda-stat { flex:1;text-align:center }
.eda-stat-value { color:var(--bs-body-color);font-size:2rem;font-weight:700;line-height:1.1 }
.eda-pct { color:var(--bs-secondary-color,#6c757d);font-size:1rem;font-weight:400 }
.eda-stat-label { color:var(--bs-secondary-color,#6c757d);font-size:.68rem;font-weight:600;letter-spacing:.05em;margin-top:.25rem;text-transform:uppercase }
.eda-divider { background:var(--bs-border-color,#dee2e6);height:2.75rem;width:1px }
.eda-card { border:1px solid var(--bs-border-color,#dee2e6);border-radius:12px;padding:1rem }
.eda-section-label { color:var(--bs-secondary-color,#6c757d);font-size:.7rem;font-weight:600;letter-spacing:.06em;margin-bottom:.5rem;text-transform:uppercase }
.eda-hint { color:var(--bs-secondary-color,#6c757d);font-size:.72rem;margin-bottom:.75rem }
.eda-chart-wrap { height:200px }
.eda-card-heading { align-items:center;display:flex;gap:1rem;justify-content:space-between;margin-bottom:.75rem }
.eda-count { align-items:center;background:var(--bs-primary-bg-subtle,#e8efff);border-radius:999px;color:var(--bs-primary);display:inline-flex;font-size:.8rem;font-weight:700;justify-content:center;min-width:32px;padding:.3rem .65rem }
.eda-registration-list { display:flex;flex-direction:column }
.eda-registration-row { align-items:center;border-top:1px solid var(--bs-border-color,#dee2e6);display:flex;gap:1rem;justify-content:space-between;padding:.7rem 0 }
.eda-phone { align-items:center;display:flex;font-size:.82rem;font-weight:600;gap:.45rem }.eda-phone i{color:var(--bs-success)}
.eda-registration-row time { color:var(--bs-secondary-color,#6c757d);font-size:.72rem;text-align:right }
.eda-empty-inline { align-items:center;color:var(--bs-secondary-color,#6c757d);display:flex;font-size:.8rem;gap:.5rem;padding:.75rem 0 }
.eda-action-row { align-items:center;display:grid;gap:.5rem;grid-template-columns:130px 1fr 32px;margin-bottom:.55rem }
.eda-action-name { font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }
.eda-action-bar-wrap { background:var(--bs-border-color,#e9ecef);border-radius:3px;height:6px;overflow:hidden }
.eda-action-bar { background:#6366f1;border-radius:3px;height:100%;min-width:2px;transition:width .4s ease }
.eda-action-count { font-size:.75rem;font-variant-numeric:tabular-nums;font-weight:700;text-align:right }
.spin { animation:spin .8s linear infinite;display:inline-block } @keyframes spin{to{transform:rotate(360deg)}}
@media(max-width:520px){.eda-stats-strip{padding:.85rem .45rem}.eda-stat-value{font-size:1.45rem}.eda-stat-label{font-size:.58rem}.eda-registration-row{align-items:flex-start;flex-direction:column;gap:.2rem}.eda-registration-row time{text-align:left}.eda-action-row{grid-template-columns:100px 1fr 24px}}
</style>

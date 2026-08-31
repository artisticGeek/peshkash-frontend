<template>
  <div class="el-wrap">
    <!-- Loading skeleton -->
    <div v-if="loading && !rows.length" class="el-skeleton">
      <div v-for="n in 6" :key="n" class="el-row el-row--skeleton">
        <span class="el-dot" style="background: var(--bs-border-color)" />
        <div class="el-body">
          <span class="placeholder rounded" style="width:70px;height:.7rem;display:block" />
          <span class="placeholder rounded mt-1" style="width:160px;height:.75rem;display:block" />
        </div>
        <span class="placeholder rounded" style="width:52px;height:1.1rem;display:inline-block;margin-left:auto" />
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="fetchError" class="alert alert-warning py-2 small mb-0">
      <i class="bi bi-exclamation-triangle me-1"></i>{{ fetchError }}
    </div>

    <!-- Empty -->
    <div v-else-if="!rows.length" class="el-empty text-muted small text-center py-4">
      <i class="bi bi-list-ul d-block fs-2 mb-2 opacity-25"></i>
      No events in this period
    </div>

    <!-- Event rows -->
    <div v-else class="el-list">
      <div
        v-for="row in rows" :key="row.id"
        class="el-row"
        :class="`el-row--${rowKind(row)}`"
      >
        <!-- Left: colored indicator -->
        <div class="el-indicator">
          <span class="el-dot" :style="{ background: dotColor(row) }" />
          <span class="el-line" />
        </div>

        <!-- Main content -->
        <div class="el-body">
          <div class="el-meta">
            <span class="el-time" :title="absTime(row.createdAt)">{{ relTime(row.createdAt) }}</span>
            <span class="el-device" :title="row.deviceType">
              <i :class="deviceIcon(row.deviceType)" />
            </span>
            <span v-if="row.referrer" class="el-referrer" :title="row.referrer">
              {{ referrerLabel(row.referrer) }}
            </span>
          </div>
          <div class="el-label">{{ eventLabel(row) }}</div>
          <div v-if="row.pageName" class="el-page">{{ row.pageName }}</div>
        </div>

        <!-- Right: session badge — the backend doesn't track a session/visitor identity yet
             (no session_id or per-event phone column exists), so this stays hidden until it does
             rather than showing an empty badge with a "Session: undefined" tooltip. -->
        <div v-if="row.phone || row.sessionId" class="el-session">
          <span class="el-session-badge" :title="row.phone ? `Phone: ${row.phone}` : `Session: ${row.sessionId}`">
            <i class="bi bi-person-circle me-1" />{{ row.phone ?? row.sessionId }}
          </span>
        </div>
      </div>

      <!-- Load more -->
      <div v-if="hasMore" class="el-loadmore">
        <button class="btn btn-sm btn-outline-secondary" :disabled="loading" @click="loadMore">
          <i v-if="loading" class="bi bi-arrow-clockwise spin me-1" />
          Load more
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

interface EventRow {
  id: number;
  createdAt: string;
  eventType: string;
  actionType: string | null;
  deviceType: string;
  // Not currently populated by the backend — no session/visitor identity is tracked in the
  // analytics_event schema (no session_id or per-event phone column).
  sessionId?: string;
  phone?: string | null;
  referrer: string | null;
  qrHash: string | null;
  pageName?: string | null;
}

const props = defineProps<{
  vendorId?: number;
  eventId?: number;
  itemId?: number;
  from: Date;
  to: Date;
}>();

const PAGE = 50;
const rows       = ref<EventRow[]>([]);
const total      = ref(0);
const loading    = ref(false);
const hasMore    = ref(false);
const fetchError = ref<string | null>(null);

const ACTION_LABELS: Record<string, string> = {
  vendor_contact_view: 'Contact page opened',
  whatsapp_click:      'WhatsApp tapped',
  call_click:          'Called',
  email_click:         'Email tapped',
  directions_click:    'Directions opened',
  save_contact:        'Contact saved',
  share_click:         'Card shared',
  instagram_click:     'Instagram visited',
  facebook_click:      'Facebook visited',
  linkedin_click:      'LinkedIn visited',
  twitter_click:       'X / Twitter visited',
  youtube_click:       'YouTube visited',
  google_review_click: 'Google Review opened',
  social_click:        'Social link clicked',
  menu_view:           'Menu viewed',
  item_expand:         'Item expanded',
  item_detail_view:    'Item detail opened',
  event_page_view:     'Event page opened',
  event_registration:  'Registration completed',
  event_reminder_click:'Reminder saved',
  event_share_click:   'Event shared',
  event_directions_click: 'Event directions opened',
  event_livestream_click: 'Live stream opened',
  event_organizer_profile_click: 'Organizer profile opened',
  landing_page_view: 'Landing page opened',
  landing_whatsapp_hero: 'Hero WhatsApp opened',
  landing_demo_anchor: 'See it in action selected',
  landing_whatsapp_business: 'Business WhatsApp opened',
  landing_whatsapp_faq: 'FAQ WhatsApp opened',
  landing_whatsapp_contact: 'Contact WhatsApp opened',
  landing_get_started: 'Get started selected',
  landing_whatsapp_nav: 'Navigation WhatsApp opened',
  landing_call: 'Landing phone call started',
  landing_email: 'Landing email opened',
  landing_contact_form_submit: 'Contact form submitted',
  landing_whatsapp_footer: 'Footer WhatsApp opened',
  landing_instagram_footer: 'Footer Instagram opened',
  landing_email_footer: 'Footer email opened',
  landing_whatsapp_floating: 'Floating WhatsApp opened',
  exhibit_page_view: 'Exhibit opened',
  exhibit_next: 'Exhibit moved to next page',
  exhibit_previous: 'Exhibit moved to previous page',
  exhibit_whatsapp: 'Exhibit WhatsApp opened',
  exhibit_share: 'Exhibit shared',
  exhibit_get_started: 'Peshkash link opened from exhibit',
};

const DOT_COLORS: Record<string, string> = {
  qr_scan:             '#6366f1',   // indigo
  vendor_contact_view: '#8b5cf6',   // violet
  whatsapp_click:      '#25d366',
  call_click:          '#3b82f6',
  email_click:         '#0ea5e9',
  directions_click:    '#eab308',
  save_contact:        '#a855f7',
  share_click:         '#f97316',
  instagram_click:     '#e1306c',
  facebook_click:      '#1877f2',
  linkedin_click:      '#0a66c2',
  twitter_click:       '#1da1f2',
  youtube_click:       '#ff0000',
  google_review_click: '#4285f4',
  social_click:        '#6b7280',
  event_page_view:     '#8b5cf6',
  event_registration:  '#16a34a',
  event_reminder_click:'#0ea5e9',
  event_share_click:   '#f97316',
  event_directions_click: '#eab308',
  event_livestream_click: '#dc2626',
  event_organizer_profile_click: '#a855f7',
  landing_page_view: '#8b5cf6',
  landing_whatsapp_hero: '#25d366',
  landing_demo_anchor: '#bd945a',
  landing_whatsapp_business: '#16a34a',
  landing_whatsapp_faq: '#4ade80',
  landing_whatsapp_contact: '#15803d',
  landing_get_started: '#bd945a',
  landing_whatsapp_nav: '#22c55e',
  landing_call: '#3b82f6',
  landing_email: '#0ea5e9',
  landing_contact_form_submit: '#a855f7',
  landing_whatsapp_footer: '#16a34a',
  landing_instagram_footer: '#e1306c',
  landing_email_footer: '#06b6d4',
  landing_whatsapp_floating: '#4ade80',
  exhibit_page_view: '#7e5b3d',
  exhibit_next: '#bd945a',
  exhibit_previous: '#a07c52',
  exhibit_whatsapp: '#25d366',
  exhibit_share: '#f97316',
  exhibit_get_started: '#a855f7',
};

function rowKind(row: EventRow) {
  return row.eventType === 'qr_scan' ? 'scan' : 'action';
}

function dotColor(row: EventRow) {
  const key = row.eventType === 'qr_scan' ? 'qr_scan' : (row.actionType ?? '');
  return DOT_COLORS[key] ?? '#9ca3af';
}

function eventLabel(row: EventRow): string {
  if (row.eventType === 'qr_scan') return 'QR Code scanned';
  return ACTION_LABELS[row.actionType ?? ''] ?? (row.actionType?.replace(/_/g, ' ') ?? 'Action');
}

function deviceIcon(dt: string) {
  if (dt === 'mobile')  return 'bi bi-phone';
  if (dt === 'tablet')  return 'bi bi-tablet';
  if (dt === 'desktop') return 'bi bi-display';
  return 'bi bi-question-circle';
}

function referrerLabel(ref: string): string {
  try {
    const u = new URL(ref);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return ref.length > 30 ? ref.slice(0, 28) + '…' : ref;
  }
}

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return absTime(iso);
}

function absTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

async function fetchRows(offset = 0) {
  loading.value = true;
  fetchError.value = null;
  try {
    const params: Record<string, any> = { from: props.from.toISOString(), to: props.to.toISOString(), limit: PAGE, offset };
    if (props.eventId) params.eventId = props.eventId;
    else if (props.itemId) params.itemId = props.itemId;
    else params.vendorId = props.vendorId;
    const { data } = await axios.get<{ rows: EventRow[]; total: number }>(
      `${API_BASE_URL}/analytics/event-log`,
      { params }
    );
    if (offset === 0) rows.value = data.rows;
    else rows.value.push(...data.rows);
    total.value = data.total;
    hasMore.value = rows.value.length < data.total;
  } catch (err: any) {
    const msg = err?.response?.data?.error ?? err?.message ?? 'Failed to load events';
    fetchError.value = msg;
    console.error('[EventLog] fetch failed:', err?.response?.status, msg, err);
  } finally {
    loading.value = false;
  }
}

function loadMore() { fetchRows(rows.value.length); }

watch([() => props.vendorId, () => props.eventId, () => props.itemId, () => props.from, () => props.to], () => fetchRows(0), { immediate: true });
</script>

<style scoped>
.el-wrap { min-height: 60px; }

.el-skeleton { display: flex; flex-direction: column; gap: 0; }

/* Row layout */
.el-list { display: flex; flex-direction: column; }

.el-row {
  display: grid;
  grid-template-columns: 20px 1fr auto;
  gap: 0 0.75rem;
  align-items: start;
  position: relative;
}

/* Indicator column */
.el-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 0.3rem;
}
.el-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1.5px currentColor;
}
.el-line {
  width: 2px;
  flex: 1;
  background: var(--bs-border-color, #dee2e6);
  margin-top: 3px;
  min-height: 24px;
}
.el-row:last-child .el-line { display: none; }

/* Skeleton row */
.el-row--skeleton {
  padding: 0.5rem 0;
}

/* Body */
.el-body {
  padding: 0.25rem 0 0.75rem;
  min-width: 0;
}
.el-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.15rem;
}
.el-time {
  font-size: 0.7rem;
  color: var(--bs-secondary-color, #6c757d);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.el-device {
  font-size: 0.72rem;
  color: var(--bs-secondary-color, #6c757d);
}
.el-referrer {
  font-size: 0.68rem;
  background: var(--bs-tertiary-bg, #f8f9fa);
  border: 1px solid var(--bs-border-color, #dee2e6);
  padding: 0.05rem 0.4rem;
  border-radius: 4px;
  color: var(--bs-secondary-color, #6c757d);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.el-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bs-body-color);
  line-height: 1.3;
}
.el-page {
  font-size: 0.72rem;
  color: var(--bs-secondary-color, #6c757d);
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Session badge */
.el-session {
  padding-top: 0.3rem;
  flex-shrink: 0;
}
.el-session-badge {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.65rem;
  color: var(--bs-secondary-color, #6c757d);
  background: var(--bs-tertiary-bg, #f8f9fa);
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 6px;
  padding: 0.15rem 0.45rem;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
}

/* Load more */
.el-loadmore {
  padding: 0.75rem 0 0.25rem 1.75rem;
  text-align: center;
}

.el-empty { padding: 2rem; }

.spin { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

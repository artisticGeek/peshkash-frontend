<template>
  <div class="uc">
    <!-- Series selector chips -->
    <div class="uc-chips">
      <!-- Scans chip always present -->
      <label class="uc-chip" :class="{ 'uc-chip--on': showScans }"
        :style="showScans ? chipStyle(SCANS_COLOR) : {}">
        <input type="checkbox" class="visually-hidden" v-model="showScans" />
        {{ props.scanLabel ?? 'Scans' }}
      </label>
      <!-- CTA chips — only types that have any data -->
      <label v-for="type in availableCtaTypes" :key="type"
        class="uc-chip" :class="{ 'uc-chip--on': selectedCtas.has(type) }"
        :style="selectedCtas.has(type) ? chipStyle(ctaColor(type)) : {}">
        <input type="checkbox" class="visually-hidden"
          :checked="selectedCtas.has(type)" @change="toggleCta(type)" />
        {{ LABELS[type] ?? type.replace(/_/g, ' ') }}
      </label>
    </div>

    <!-- Chart -->
    <div class="uc-chart-wrap">
      <div v-if="!hasData" class="uc-empty text-muted small text-center">
        <i class="bi bi-bar-chart-line d-block mb-2 fs-2 opacity-25"></i>
        No data for this period
      </div>
      <Line v-else :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

// ── Props ──────────────────────────────────────────────────────────────────────
const props = defineProps<{
  scansPerPeriod: Array<{ period: string; count: number }>;
  actionsPerPeriodByType: Array<{ period: string; actionType: string; count: number }>;
  from: Date;
  to: Date;
  granularity: 'hour' | 'day';
  scanLabel?: string;
}>();

// ── Labels / Colors ───────────────────────────────────────────────────────────
const LABELS: Record<string, string> = {
  whatsapp_click:      'WhatsApp',
  call_click:          'Call',
  email_click:         'Email',
  directions_click:    'Directions',
  save_contact:        'Save Contact',
  share_click:         'Share',
  instagram_click:     'Instagram',
  facebook_click:      'Facebook',
  linkedin_click:      'LinkedIn',
  twitter_click:       'X / Twitter',
  youtube_click:       'YouTube',
  google_review_click: 'Google Review',
  social_click:        'Social (legacy)',
  vendor_contact_view: 'Page View',
  item_expand:         'Item Expand',
  menu_view:           'Menu View',
  event_page_view:     'Event Page',
  event_registration:  'Registration',
  event_reminder_click:'Reminder',
  event_share_click:   'Event Share',
  event_directions_click: 'Directions',
  event_livestream_click: 'Live Stream',
  event_organizer_profile_click: 'Organizer',
  landing_page_view: 'Landing Page',
  landing_whatsapp_hero: 'Hero WhatsApp',
  landing_demo_anchor: 'See It in Action',
  landing_whatsapp_business: 'Business WhatsApp',
  landing_whatsapp_faq: 'FAQ WhatsApp',
  landing_whatsapp_contact: 'Contact WhatsApp',
  landing_get_started: 'Get Started',
  landing_whatsapp_nav: 'Nav WhatsApp',
  landing_call: 'Landing Call',
  landing_email: 'Landing Email',
  landing_contact_form_submit: 'Contact Form',
  landing_whatsapp_footer: 'Footer WhatsApp',
  landing_instagram_footer: 'Footer Instagram',
  landing_email_footer: 'Footer Email',
  landing_whatsapp_floating: 'Floating WhatsApp',
  exhibit_page_view: 'Exhibit View',
  exhibit_next: 'Next Page',
  exhibit_previous: 'Previous Page',
  exhibit_whatsapp: 'Exhibit WhatsApp',
  exhibit_share: 'Exhibit Share',
  exhibit_get_started: 'Peshkash Link',
};

const SCANS_COLOR = '99,102,241';   // indigo — distinct from CTAs

const CTA_COLORS: Record<string, string> = {
  whatsapp_click:      '37,211,102',
  call_click:          '59,130,246',
  email_click:         '14,165,233',
  directions_click:    '234,179,8',
  save_contact:        '168,85,247',
  share_click:         '249,115,22',
  instagram_click:     '225,48,108',
  facebook_click:      '24,119,242',
  linkedin_click:      '10,102,194',
  twitter_click:       '29,161,242',
  youtube_click:       '255,0,0',
  google_review_click: '66,133,244',
  social_click:        '107,114,128',
  event_page_view:     '139,92,246',
  event_registration:  '22,163,74',
  event_reminder_click:'14,165,233',
  event_share_click:   '249,115,22',
  event_directions_click: '234,179,8',
  event_livestream_click: '220,38,38',
  event_organizer_profile_click: '168,85,247',
  landing_page_view:     '139,92,246',
  landing_whatsapp_hero: '37,211,102',
  landing_demo_anchor:   '189,148,90',
  landing_whatsapp_business: '22,163,74',
  landing_whatsapp_faq:  '74,222,128',
  landing_whatsapp_contact: '21,128,61',
  landing_get_started:   '189,148,90',
  landing_whatsapp_nav:  '34,197,94',
  landing_call:          '59,130,246',
  landing_email:         '14,165,233',
  landing_contact_form_submit: '168,85,247',
  landing_whatsapp_footer: '22,163,74',
  landing_instagram_footer: '225,48,108',
  landing_email_footer:  '6,182,212',
  landing_whatsapp_floating: '74,222,128',
  exhibit_page_view: '126,91,61',
  exhibit_next: '189,148,90',
  exhibit_previous: '160,124,82',
  exhibit_whatsapp: '37,211,102',
  exhibit_share: '249,115,22',
  exhibit_get_started: '168,85,247',
};
const CTA_FALLBACK = '16,185,129';

function ctaColor(type: string): string {
  return CTA_COLORS[type] ?? CTA_FALLBACK;
}

function chipStyle(rgb: string) {
  return {
    background:   `rgba(${rgb},0.12)`,
    borderColor:  `rgb(${rgb})`,
    color:        `rgb(${rgb})`,
  };
}

// ── Selection state ───────────────────────────────────────────────────────────
const showScans    = ref(true);
const selectedCtas = ref<Set<string>>(new Set());  // default: none

const availableCtaTypes = computed(() => {
  const s = new Set(props.actionsPerPeriodByType.map(d => d.actionType));
  return [...s];
});

// Auto-add newly appearing CTA types (don't auto-select them, but make them available)
watch(availableCtaTypes, (n, o) => {
  // no-op: chips appear automatically via computed; selection untouched
}, { flush: 'post' });

function toggleCta(type: string) {
  const s = new Set(selectedCtas.value);
  s.has(type) ? s.delete(type) : s.add(type);
  selectedCtas.value = s;
}

// ── Period generation (gap-fill) ──────────────────────────────────────────────
// Periods are always keyed in UTC to match the database's DATE_TRUNC output.
// Display labels convert back to local time for readability.

function formatUTCKey(d: Date, g: 'hour' | 'day'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (g === 'hour') {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:00:00`;
  }
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
}

const allPeriods = computed((): string[] => {
  const periods: string[] = [];
  const toMs = props.to.getTime();

  if (props.granularity === 'hour') {
    // Truncate from to UTC hour boundary
    const startMs = Math.floor(props.from.getTime() / 3_600_000) * 3_600_000;
    for (let ms = startMs; ms <= toMs; ms += 3_600_000) {
      periods.push(formatUTCKey(new Date(ms), 'hour'));
    }
  } else {
    // Truncate from to UTC day boundary
    const cur = new Date(props.from);
    cur.setUTCHours(0, 0, 0, 0);
    while (cur.getTime() <= toMs) {
      periods.push(formatUTCKey(cur, 'day'));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return periods;
});

// Backend returns UTC timestamps without Z suffix — parse as UTC by appending Z
function normalisePeriod(raw: string, g: 'hour' | 'day'): string {
  const utcStr = raw.includes('T') ? raw + 'Z' : raw + 'T00:00:00Z';
  const d = new Date(utcStr);
  if (isNaN(d.getTime())) return raw;
  return formatUTCKey(d, g);
}

// ── Chart labels ──────────────────────────────────────────────────────────────
// Periods are UTC keys; convert to local time for axis display
const chartLabels = computed(() => {
  const spanDays = (props.to.getTime() - props.from.getTime()) / 86_400_000;
  return allPeriods.value.map(p => {
    // Parse UTC key back to a Date (append Z so JS doesn't misinterpret as local)
    const d = new Date(p.includes('T') ? p + 'Z' : p + 'T00:00:00Z');
    if (props.granularity === 'hour') {
      if (spanDays <= 1) return `${String(d.getHours()).padStart(2,'0')}:00`;
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        + ` ${String(d.getHours()).padStart(2,'0')}:00`;
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });
});

// ── Series builders ───────────────────────────────────────────────────────────
function buildScanSeries(): number[] {
  const map = new Map<string, number>();
  props.scansPerPeriod.forEach(r => map.set(normalisePeriod(r.period, props.granularity), r.count));
  return allPeriods.value.map(p => map.get(p) ?? 0);
}

function buildCtaSeries(type: string): number[] {
  const map = new Map<string, number>();
  props.actionsPerPeriodByType
    .filter(r => r.actionType === type)
    .forEach(r => map.set(normalisePeriod(r.period, props.granularity), r.count));
  return allPeriods.value.map(p => map.get(p) ?? 0);
}

function makeDataset(label: string, rgb: string, data: number[], fill = false) {
  return {
    label,
    data,
    borderColor: `rgb(${rgb})`,
    backgroundColor: fill ? `rgba(${rgb},0.08)` : `rgba(${rgb},0.1)`,
    borderWidth: 2,
    tension: 0.35,
    fill,
    pointRadius: allPeriods.value.length <= 14 ? 4 : 2,
    pointBackgroundColor: `rgb(${rgb})`,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    pointHoverRadius: 6,
  };
}

const hasData = computed(() => allPeriods.value.length > 0 && (showScans.value || selectedCtas.value.size > 0));

const chartData = computed(() => {
  const datasets = [];
  if (showScans.value) {
    const onlyScans = !selectedCtas.value.size;
    datasets.push(makeDataset('Scans', SCANS_COLOR, buildScanSeries(), onlyScans));
  }
  for (const type of selectedCtas.value) {
    datasets.push(makeDataset(LABELS[type] ?? type, ctaColor(type), buildCtaSeries(type), false));
  }
  return { labels: chartLabels.value, datasets };
});

// ── Chart options ──────────────────────────────────────────────────────────────
const chartOptions = computed(() => {
  const maxTicks = props.granularity === 'hour' ? 12 : 10;
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(17,24,39,0.9)',
        titleColor: '#f3f4f6',
        bodyColor: '#d1d5db',
        padding: { top: 8, bottom: 8, left: 12, right: 12 },
        cornerRadius: 8,
        callbacks: {
          label: (item: any) => ` ${item.dataset.label}: ${item.formattedValue}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { maxTicksLimit: maxTicks, font: { size: 11 }, color: '#9ca3af', maxRotation: 0 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        border: { display: false },
        ticks: { precision: 0, font: { size: 11 }, color: '#9ca3af', padding: 6 },
      },
    },
  };
});
</script>

<style scoped>
.uc {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  height: 100%;
}

/* Chips */
.uc-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.uc-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  border: 1.5px solid var(--bs-border-color, #dee2e6);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--bs-tertiary-bg, #f8f9fa);
  color: var(--bs-secondary-color, #6c757d);
  transition: background 0.12s, border-color 0.12s, color 0.12s;
  user-select: none;
}
.uc-chip--on { font-weight: 700; }

/* Chart */
.uc-chart-wrap {
  position: relative;
  flex: 1;
  min-height: 130px;
}
.uc-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>

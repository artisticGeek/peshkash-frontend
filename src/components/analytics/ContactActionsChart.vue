<template>
  <div class="ca-chart">
    <!-- CTA selector -->
    <div class="ca-selector">
      <label v-for="type in availableTypes" :key="type"
        class="ca-chip" :class="{ 'ca-chip--on': selected.has(type) }"
        :style="selected.has(type) ? chipStyle(type) : {}">
        <input type="checkbox" class="visually-hidden"
          :checked="selected.has(type)"
          @change="toggle(type)" />
        {{ LABEL[type] ?? type.replace(/_/g, ' ') }}
      </label>
    </div>

    <!-- Chart or empty state -->
    <div class="ca-wrap">
      <div v-if="!availableTypes.length" class="ca-empty text-muted small text-center">
        <i class="bi bi-cursor d-block mb-1 fs-3 opacity-25"></i>
        No actions yet
      </div>
      <Line v-else :data="chartData" :options="chartOptions" :plugins="[gradientPlugin]" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend, Filler, type Plugin,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const props = defineProps<{
  data: Array<{ date: string; actionType: string; count: number }>;
}>();

const LABEL: Record<string, string> = {
  whatsapp_click:      'WhatsApp',
  call_click:          'Call',
  email_click:         'Email',
  directions_click:    'Directions',
  save_contact:        'Save Contact',
  share_click:         'Share',
  social_click:        'Social',
  vendor_contact_view: 'Page View',
  item_expand:         'Item Expand',
  menu_view:           'Menu View',
};

// Ordered palette — each type gets a stable color by index
const PALETTE = [
  '37,211,102',   // green  — WhatsApp
  '59,130,246',   // blue   — Call
  '234,179,8',    // yellow — Directions
  '99,102,241',   // indigo — Save
  '168,85,247',   // purple — Share
  '14,165,233',   // sky    — Email
  '249,115,22',   // orange — Social
  '107,114,128',  // gray   — fallback
];

const COLOR_MAP: Record<string, string> = {
  whatsapp_click:      PALETTE[0],
  call_click:          PALETTE[1],
  directions_click:    PALETTE[2],
  save_contact:        PALETTE[3],
  share_click:         PALETTE[4],
  email_click:         PALETTE[5],
  social_click:        PALETTE[6],
};

function colorFor(type: string): string {
  return COLOR_MAP[type] ?? PALETTE[PALETTE.length - 1];
}

function chipStyle(type: string) {
  const c = colorFor(type);
  return {
    background: `rgba(${c},0.15)`,
    borderColor: `rgb(${c})`,
    color: `rgb(${c})`,
  };
}

// Derive all dates and types from raw data
const allDates = computed(() => {
  const s = new Set(props.data.map(d => d.date));
  return [...s].sort();
});

const availableTypes = computed(() => {
  const s = new Set(props.data.map(d => d.actionType));
  return [...s];
});

// Selection state — default: select all
const selected = ref<Set<string>>(new Set());

// Initialize with all types when data first arrives
function initSelection() {
  selected.value = new Set(availableTypes.value);
}
onMounted(initSelection);
watch(availableTypes, (n, o) => {
  // Add any new types automatically; keep existing selections
  n.forEach(t => { if (!o.includes(t)) selected.value.add(t); });
});

function toggle(type: string) {
  const s = new Set(selected.value);
  s.has(type) ? s.delete(type) : s.add(type);
  selected.value = s;
}

// Build per-type lookup: type → { date → count }
function buildSeries(type: string): number[] {
  const map = new Map<string, number>();
  props.data.filter(d => d.actionType === type).forEach(d => map.set(d.date, d.count));
  return allDates.value.map(date => map.get(date) ?? 0);
}

const gradientPlugin: Plugin<'line'> = {
  id: 'ctaGradient',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    chart.data.datasets.forEach((ds: any) => {
      if (!ds._ctaRgb || !ds.fill) return;
      const g = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
      g.addColorStop(0, `rgba(${ds._ctaRgb},0.2)`);
      g.addColorStop(1, `rgba(${ds._ctaRgb},0)`);
      ds.backgroundColor = g;
    });
  },
};

const chartData = computed(() => {
  const labels = allDates.value.map(d => {
    const dt = new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  });

  const datasets = [...selected.value].map(type => {
    const rgb = colorFor(type);
    return {
      label: LABEL[type] ?? type.replace(/_/g, ' '),
      data: buildSeries(type),
      borderColor: `rgb(${rgb})`,
      borderWidth: 2,
      tension: 0.38,
      fill: selected.value.size === 1, // gradient fill only when one line
      _ctaRgb: rgb,
      backgroundColor: `rgba(${rgb},0.12)`,
      pointRadius: allDates.value.length <= 10 ? 4 : 2,
      pointBackgroundColor: `rgb(${rgb})`,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointHoverRadius: 6,
    };
  });

  return { labels, datasets };
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false }, // we have our own chip selector
    tooltip: {
      backgroundColor: 'rgba(17,24,39,0.88)',
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
      ticks: { maxTicksLimit: 7, font: { size: 11 }, color: '#9ca3af' },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.04)', tickLength: 0 },
      border: { display: false },
      ticks: { precision: 0, font: { size: 11 }, color: '#9ca3af', padding: 6 },
    },
  },
};
</script>

<style scoped>
.ca-chart { display: flex; flex-direction: column; gap: 0.625rem; height: 100%; }

/* Chip selector */
.ca-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}
.ca-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.6rem;
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
.ca-chip--on { font-weight: 700; }

/* Chart canvas */
.ca-wrap {
  position: relative;
  flex: 1;
  min-height: 120px;
}
.ca-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>

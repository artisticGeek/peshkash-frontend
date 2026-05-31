<template>
  <div class="scan-chart-wrap">
    <Line :data="chartData" :options="chartOptions" :plugins="[gradientPlugin]" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
  type Plugin,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const props = defineProps<{
  data: Array<{ date: string; count: number }>;
  label?: string;
  /** Accent color for this series — defaults to indigo */
  accentRgb?: string;
}>();

// Default: indigo 500
const accent = computed(() => props.accentRgb ?? '99, 102, 241');

// ── Gradient fill plugin ─────────────────────────────────────────────────────
// Creates a canvas gradient on every draw so it resizes correctly.
const gradientPlugin: Plugin<'line'> = {
  id: 'scanChartGradient',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0,   `rgba(${accent.value}, 0.28)`);
    gradient.addColorStop(0.6, `rgba(${accent.value}, 0.08)`);
    gradient.addColorStop(1,   `rgba(${accent.value}, 0)`);
    // Inject gradient into every fill-enabled dataset
    chart.data.datasets.forEach((ds: any) => {
      if (ds.fill) ds.backgroundColor = gradient;
    });
  },
};

// ── Chart data ───────────────────────────────────────────────────────────────
const chartData = computed(() => ({
  labels: props.data.map(d => {
    const dt = new Date(d.date);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }),
  datasets: [{
    label: props.label ?? 'QR Scans',
    data: props.data.map(d => d.count),
    borderColor:  `rgb(${accent.value})`,
    borderWidth:  2.5,
    backgroundColor: `rgba(${accent.value}, 0.15)`, // overridden by gradient plugin
    tension: 0.42,
    fill: true,
    // Dot size scales down for dense date ranges
    pointRadius:        props.data.length <= 10 ? 4 : props.data.length <= 20 ? 3 : 2,
    pointBackgroundColor: `rgb(${accent.value})`,
    pointBorderColor:   '#fff',
    pointBorderWidth:   2,
    pointHoverRadius:   7,
    pointHoverBackgroundColor: `rgb(${accent.value})`,
    pointHoverBorderColor:  '#fff',
    pointHoverBorderWidth:  2.5,
  }],
}));

// ── Chart options ────────────────────────────────────────────────────────────
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(17, 24, 39, 0.88)',
      titleColor:  '#f3f4f6',
      bodyColor:   '#d1d5db',
      padding:     { top: 8, bottom: 8, left: 12, right: 12 },
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        // e.g. "12 Nov — 7 scans"
        title: (items: any[]) => items[0]?.label ?? '',
        label: (item: any) => ` ${item.formattedValue}`,
      },
    },
  },
  scales: {
    x: {
      grid:   { display: false },
      border: { display: false },
      ticks:  {
        maxTicksLimit: 7,
        font:  { size: 11 },
        color: '#9ca3af',
      },
    },
    y: {
      beginAtZero: true,
      grid:   { color: 'rgba(0,0,0,0.04)', tickLength: 0 },
      border: { display: false },
      ticks:  { precision: 0, font: { size: 11 }, color: '#9ca3af', padding: 6 },
    },
  },
};
</script>

<style scoped>
.scan-chart-wrap {
  position: relative;
  height: 220px;
}
</style>

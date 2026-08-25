<template>
  <div class="cac-wrap">
    <div v-if="!props.data.length" class="cac-empty text-muted small text-center py-4">
      <i class="bi bi-cursor d-block mb-1 fs-4 opacity-25"></i>
      No actions yet
    </div>
    <Bar v-else :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const props = defineProps<{
  data: Array<{ actionType: string; count: number }>;
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
  item_detail_view:    'Item Detail',
};

const COLOR: Record<string, string> = {
  whatsapp_click:   '37, 211, 102',
  call_click:       '59, 130, 246',
  email_click:      '14, 165, 233',
  directions_click: '234, 179, 8',
  save_contact:     '99, 102, 241',
  share_click:      '168, 85, 247',
};
const DEFAULT_COLOR = '107, 114, 128';

const chartData = computed(() => {
  const sorted = [...props.data].sort((a, b) => b.count - a.count);
  return {
    labels: sorted.map(d => LABEL[d.actionType] ?? d.actionType.replace(/_/g, ' ')),
    datasets: [{
      data: sorted.map(d => d.count),
      backgroundColor: sorted.map(d => `rgba(${COLOR[d.actionType] ?? DEFAULT_COLOR}, 0.75)`),
      borderColor:     sorted.map(d => `rgb(${COLOR[d.actionType] ?? DEFAULT_COLOR})`),
      borderWidth: 1,
      borderRadius: 5,
    }],
  };
});

const chartOptions = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(17,24,39,0.88)',
      titleColor: '#f3f4f6',
      bodyColor: '#d1d5db',
      padding: { top: 6, bottom: 6, left: 10, right: 10 },
      cornerRadius: 6,
      displayColors: false,
      callbacks: {
        label: (item: any) => ` ${item.formattedValue} taps`,
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.04)' },
      border: { display: false },
      ticks: { precision: 0, font: { size: 11 }, color: '#9ca3af' },
    },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 11 }, color: '#374151' },
    },
  },
};
</script>

<style scoped>
.cac-wrap {
  position: relative;
  height: 160px;
}
</style>

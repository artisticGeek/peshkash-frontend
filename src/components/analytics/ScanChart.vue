<template>
  <div class="scan-chart-wrap">
    <Bar :data="chartData" :options="chartOptions" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const props = defineProps<{
  data: Array<{ date: string; count: number }>;
  label?: string;
}>();

const chartData = computed(() => ({
  labels: props.data.map(d => {
    const dt = new Date(d.date);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }),
  datasets: [{
    label: props.label ?? 'QR Scans',
    data: props.data.map(d => d.count),
    backgroundColor: 'rgba(99, 102, 241, 0.75)',
    borderColor: 'rgb(99, 102, 241)',
    borderWidth: 1,
    borderRadius: 6,
  }],
}));

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index' as const, intersect: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { precision: 0 } },
  },
};
</script>

<style scoped>
.scan-chart-wrap {
  position: relative;
  height: 220px;
}
</style>

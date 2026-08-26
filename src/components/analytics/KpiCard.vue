<template>
  <div class="kpi-card card border-0 shadow-sm h-100">
    <div class="card-body d-flex flex-column justify-content-between p-3">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="kpi-label text-muted small text-uppercase fw-semibold">{{ label }}</span>
        <span class="kpi-icon fs-4" :class="iconClass">
          <i :class="`bi ${icon}`"></i>
        </span>
      </div>
      <div class="kpi-value fw-bold" style="font-size: 2rem; line-height: 1.1;">
        {{ formattedValue }}
      </div>
      <div v-if="subtitle" class="kpi-subtitle text-muted small mt-1">{{ subtitle }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  label: string;
  value: number;
  icon: string;
  iconClass?: string;
  subtitle?: string;
}>();

const formattedValue = computed(() => {
  if (props.value >= 1_000_000) return (props.value / 1_000_000).toFixed(1) + 'M';
  if (props.value >= 1_000) return (props.value / 1_000).toFixed(1) + 'K';
  return String(props.value);
});
</script>

<style scoped>
.kpi-card {
  border-radius: 12px;
  transition: box-shadow 0.2s;
}
.kpi-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.10) !important;
}
.kpi-icon {
  opacity: 0.7;
}
</style>

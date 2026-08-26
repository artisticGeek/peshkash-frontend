<template>
  <div class="device-split">
    <div v-if="!data.length" class="text-muted small py-3 text-center">No data yet</div>
    <div v-else>
      <div v-for="item in data" :key="item.deviceType" class="mb-2">
        <div class="d-flex justify-content-between small mb-1">
          <span class="fw-medium d-flex align-items-center gap-1">
            <i :class="deviceIcon(item.deviceType)" class="text-muted"></i>
            {{ capitalize(item.deviceType) }}
          </span>
          <span class="text-muted">{{ item.count }} <span class="text-muted">({{ pct(item.count) }}%)</span></span>
        </div>
        <div class="progress" style="height: 6px; border-radius: 3px;">
          <div
            class="progress-bar"
            :class="deviceColor(item.deviceType)"
            :style="{ width: pct(item.count) + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  data: Array<{ deviceType: string; count: number }>;
}>();

const total = computed(() => props.data.reduce((s, d) => s + d.count, 0) || 1);

function pct(count: number) {
  return Math.round((count / total.value) * 100);
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const ICONS: Record<string, string> = {
  mobile: 'bi bi-phone-fill',
  desktop: 'bi bi-display',
  tablet: 'bi bi-tablet-fill',
  unknown: 'bi bi-question-circle',
};

function deviceIcon(type: string) {
  return ICONS[type] ?? ICONS.unknown;
}

const COLORS: Record<string, string> = {
  mobile: 'bg-primary',
  desktop: 'bg-success',
  tablet: 'bg-info',
  unknown: 'bg-secondary',
};

function deviceColor(type: string) {
  return COLORS[type] ?? 'bg-secondary';
}
</script>

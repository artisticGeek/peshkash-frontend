<template>
  <div class="drp" ref="root">
    <!-- Trigger button -->
    <button class="drp-trigger btn btn-sm btn-outline-secondary" @click="toggle">
      <i class="bi bi-calendar3 me-1"></i>
      <span>{{ activeLabel }}</span>
      <i class="bi bi-chevron-down ms-1" style="font-size:.65rem"></i>
    </button>

    <!-- Panel -->
    <Teleport to="body">
      <div v-if="open" class="drp-backdrop" @click.self="close" />
      <div v-if="open" class="drp-panel" :style="panelStyle">
        <div class="drp-body">
          <!-- Preset list -->
          <ul class="drp-presets">
            <li v-for="p in PRESETS" :key="p.label">
              <button class="drp-preset-btn" :class="{ active: activeLabel === p.label }"
                @click="applyPreset(p)">{{ p.label }}</button>
            </li>
          </ul>

          <!-- Divider -->
          <div class="drp-sep" />

          <!-- Custom range inputs -->
          <div class="drp-custom">
            <p class="drp-custom-title">Custom range</p>
            <label class="drp-field-label">From</label>
            <input class="form-control form-control-sm mb-2" type="datetime-local"
              v-model="customFrom" :max="customTo || undefined" />
            <label class="drp-field-label">To</label>
            <input class="form-control form-control-sm mb-3" type="datetime-local"
              v-model="customTo" :min="customFrom || undefined" />
            <button class="btn btn-sm btn-primary w-100"
              :disabled="!customFrom || !customTo"
              @click="applyCustom">Apply</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

export interface DateRange {
  from: Date;
  to: Date;
  label: string;
}

const emit = defineEmits<{ (e: 'update:modelValue', v: DateRange): void }>();
const props = withDefaults(defineProps<{ modelValue?: DateRange }>(), {});

const PRESETS = [
  { label: 'Last 1 hour',   hours: 1    },
  { label: 'Last 3 hours',  hours: 3    },
  { label: 'Last 6 hours',  hours: 6    },
  { label: 'Last 12 hours', hours: 12   },
  { label: 'Last 24 hours', hours: 24   },
  { label: 'Last 3 days',   hours: 72   },
  { label: 'Last 7 days',   hours: 168  },
  { label: 'Last 14 days',  hours: 336  },
  { label: 'Last 30 days',  hours: 720  },
  { label: 'Last 90 days',  hours: 2160 },
  { label: 'Last 6 months', hours: 4380 },
  { label: 'Last 1 year',   hours: 8760 },
];

const open = ref(false);
const root = ref<HTMLElement | null>(null);
const panelStyle = ref<Record<string, string>>({});

const activeLabel = computed(() => props.modelValue?.label ?? 'Last 7 days');

// datetime-local needs "YYYY-MM-DDTHH:mm"
function toLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const customFrom = ref('');
const customTo   = ref('');

function toggle() {
  open.value = !open.value;
  if (open.value) {
    // Pre-fill custom inputs from current selection
    if (props.modelValue) {
      customFrom.value = toLocal(props.modelValue.from);
      customTo.value   = toLocal(props.modelValue.to);
    }
    // Position panel below trigger
    requestAnimationFrame(() => {
      if (!root.value) return;
      const rect = root.value.getBoundingClientRect();
      panelStyle.value = {
        top:  `${rect.bottom + window.scrollY + 6}px`,
        left: `${Math.max(8, rect.right - 380 + window.scrollX)}px`,
      };
    });
  }
}

function close() { open.value = false; }

function applyPreset(p: { label: string; hours: number }) {
  const to   = new Date();
  const from = new Date(to.getTime() - p.hours * 3600 * 1000);
  emit('update:modelValue', { from, to, label: p.label });
  close();
}

function applyCustom() {
  if (!customFrom.value || !customTo.value) return;
  const from = new Date(customFrom.value);
  const to   = new Date(customTo.value);
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || from >= to) return;
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
  emit('update:modelValue', { from, to, label: `${fmt(from)} – ${fmt(to)}` });
  close();
}

// Close on outside click
function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) close();
}
onMounted(() => document.addEventListener('click', onDocClick, true));
onUnmounted(() => document.removeEventListener('click', onDocClick, true));
</script>

<style scoped>
.drp { position: relative; display: inline-block; }

.drp-trigger {
  white-space: nowrap;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

/* Backdrop — light, just for closing on outside click */
.drp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1039;
}

/* Panel */
.drp-panel {
  position: absolute;
  z-index: 1040;
  width: 380px;
  background: var(--bs-body-bg, #fff);
  border: 1px solid var(--bs-border-color, #dee2e6);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0,0,0,.12);
  overflow: hidden;
}

.drp-body {
  display: flex;
  gap: 0;
}

/* Presets */
.drp-presets {
  list-style: none;
  margin: 0;
  padding: 0.5rem 0;
  min-width: 140px;
  border-right: 1px solid var(--bs-border-color, #dee2e6);
  background: var(--bs-tertiary-bg, #f8f9fa);
}
.drp-presets li { margin: 0; }
.drp-preset-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 0.35rem 1rem;
  font-size: 0.78rem;
  color: var(--bs-body-color);
  cursor: pointer;
  transition: background 0.1s;
  white-space: nowrap;
}
.drp-preset-btn:hover { background: var(--bs-secondary-bg, #e9ecef); }
.drp-preset-btn.active {
  color: var(--bs-primary, #0d6efd);
  font-weight: 600;
  background: rgba(13,110,253,0.07);
}

.drp-sep {
  width: 1px;
  background: var(--bs-border-color, #dee2e6);
  flex-shrink: 0;
}

/* Custom range inputs */
.drp-custom {
  flex: 1;
  padding: 1rem;
  min-width: 0;
}
.drp-custom-title {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--bs-secondary-color, #6c757d);
  margin-bottom: 0.75rem;
}
.drp-field-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--bs-secondary-color, #6c757d);
  display: block;
  margin-bottom: 0.25rem;
}
</style>

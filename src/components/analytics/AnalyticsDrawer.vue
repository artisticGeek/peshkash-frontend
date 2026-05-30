<template>
  <Teleport to="body">
    <Transition name="adrawer-fade">
      <div
        v-if="modelValue"
        class="adrawer-backdrop"
        @click.self="close"
        @keydown.esc="close"
        tabindex="-1"
      >
        <Transition name="adrawer-slide" appear>
          <div v-if="modelValue" class="adrawer-panel" role="dialog" :aria-label="title">
            <!-- Header -->
            <div class="adrawer-header">
              <div class="adrawer-title-row">
                <div v-if="icon" class="adrawer-icon">
                  <i :class="icon"></i>
                </div>
                <div class="adrawer-title-block">
                  <h5 class="adrawer-title">{{ title }}</h5>
                  <p v-if="subtitle" class="adrawer-subtitle">{{ subtitle }}</p>
                </div>
              </div>
              <!-- Right-side slot for range selector, etc. -->
              <div class="adrawer-header-actions">
                <slot name="header-actions" />
                <button class="adrawer-close-btn" @click="close" aria-label="Close">
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>
            </div>
            <!-- Scrollable body -->
            <div class="adrawer-body">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { watch } from 'vue';

const props = defineProps<{
  modelValue: boolean;
  title?: string;
  subtitle?: string;
  icon?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

function close() { emit('update:modelValue', false); }

// Lock body scroll while drawer is open
watch(() => props.modelValue, open => {
  if (open) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}, { immediate: false });
</script>

<style scoped>
/* ── Backdrop ──────────────────────────────────────────────────────────────── */
.adrawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1060;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(3px);
  display: flex;
  justify-content: flex-end;
  outline: none;
}

/* ── Panel ─────────────────────────────────────────────────────────────────── */
.adrawer-panel {
  position: relative;
  width: 100%;
  max-width: 560px;
  height: 100%;
  background: var(--bs-body-bg, #fff);
  box-shadow: -6px 0 32px rgba(0, 0, 0, 0.14);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Mobile: bottom sheet */
@media (max-width: 767px) {
  .adrawer-backdrop {
    align-items: flex-end;
    justify-content: stretch;
  }
  .adrawer-panel {
    max-width: 100%;
    width: 100%;
    height: 92dvh;
    border-radius: 20px 20px 0 0;
  }
}

/* ── Header ────────────────────────────────────────────────────────────────── */
.adrawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--bs-border-color, #dee2e6);
  flex-shrink: 0;
  min-width: 0;
}
.adrawer-title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  flex: 1;
}
.adrawer-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bs-primary-bg-subtle, #e8efff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  color: var(--bs-primary);
  flex-shrink: 0;
}
.adrawer-title-block { min-width: 0; }
.adrawer-title {
  font-size: 0.95rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.adrawer-subtitle {
  font-size: 0.75rem;
  color: var(--bs-secondary-color, #6c757d);
  margin: 2px 0 0;
}

.adrawer-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}
.adrawer-close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bs-light, #f8f9fa);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--bs-secondary-color, #6c757d);
  font-size: 0.85rem;
  transition: background 0.15s, color 0.15s;
}
.adrawer-close-btn:hover {
  background: var(--bs-secondary-bg, #e9ecef);
  color: var(--bs-body-color);
}

/* ── Body ──────────────────────────────────────────────────────────────────── */
.adrawer-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.25rem;
  -webkit-overflow-scrolling: touch;
}

/* ── Transitions ────────────────────────────────────────────────────────────── */
/* Backdrop fade */
.adrawer-fade-enter-active,
.adrawer-fade-leave-active { transition: opacity 0.22s ease; }
.adrawer-fade-enter-from,
.adrawer-fade-leave-to { opacity: 0; }

/* Panel slide (desktop: from right) */
.adrawer-slide-enter-active {
  transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
}
.adrawer-slide-leave-active {
  transition: transform 0.2s ease-in;
}
.adrawer-slide-enter-from,
.adrawer-slide-leave-to {
  transform: translateX(100%);
}

/* Panel slide (mobile: from bottom) */
@media (max-width: 767px) {
  .adrawer-slide-enter-from,
  .adrawer-slide-leave-to {
    transform: translateY(100%);
  }
}
</style>

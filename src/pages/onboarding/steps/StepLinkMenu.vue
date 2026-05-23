<template>
  <div class="step-link">
    <h5 class="step-title">Link Menu to Event</h5>

    <div class="summary-card">
      <div class="summary-row">
        <span class="label">Menu</span>
        <span class="value">{{ selectedMenu?.displayName ?? '—' }}</span>
      </div>
      <div class="divider"></div>
      <div class="summary-row">
        <span class="label">Event</span>
        <span class="value">{{ selectedEvent?.displayName ?? '—' }}</span>
      </div>
    </div>

    <div v-if="linked" class="alert alert-success mt-3">
      <i class="bi bi-check-circle-fill me-2"></i>
      Menu successfully linked to this event.
    </div>

    <div v-else>
      <p class="text-muted small mt-3">
        Once linked, scanning a QR code for this event will surface items from the selected menu.
      </p>
      <button class="btn btn-primary w-100 mt-2" :disabled="!selectedMenu || !selectedEvent || state.loading" @click="link">
        <span v-if="state.loading" class="spinner-border spinner-border-sm me-2"></span>
        Associate Menu &rarr; Event
      </button>
      <p v-if="state.error" class="text-danger small mt-2">{{ state.error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useOnboarding } from '../../../composables/useOnboarding';

const props = defineProps<{ vendorName: string; menuId: number | null; eventId: number | null }>();
const emit = defineEmits<{ (e: 'linked'): void }>();

const { state, linkMenuToEvent } = useOnboarding(props.vendorName);
const linked = ref(false);

const selectedMenu = computed(() => state.menus.find(m => m.id === props.menuId));
const selectedEvent = computed(() => state.events.find(e => e.id === props.eventId));

async function link() {
  if (!props.menuId || !props.eventId) return;
  await linkMenuToEvent(props.eventId, props.menuId);
  linked.value = true;
  emit('linked');
}
</script>

<style scoped>
.step-title { font-weight: 700; margin-bottom: 1.25rem; }

.summary-card {
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.25rem;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
}
.label { color: #6b7280; font-size: 0.85rem; }
.value { font-weight: 600; }
.divider { border-top: 1px solid #f3f4f6; margin: 0.5rem 0; }
</style>

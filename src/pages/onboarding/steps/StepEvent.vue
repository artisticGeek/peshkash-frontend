<template>
  <div class="step-event">
    <h5 class="step-title">Create or Select an Event</h5>

    <!-- Existing events -->
    <div v-if="state.events.length" class="mb-4">
      <p class="text-muted small mb-2">Your existing events</p>
      <div
        v-for="event in state.events"
        :key="event.id"
        class="event-card"
        :class="{ selected: state.selectedEventId === event.id }"
        @click="select(event.id)"
      >
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <div class="fw-semibold">{{ event.displayName }}</div>
            <div class="text-muted small">{{ event.name }}</div>
            <span class="status-badge" :class="event.status">{{ event.status }}</span>
          </div>
          <i v-if="state.selectedEventId === event.id" class="bi bi-check-circle-fill text-success fs-5"></i>
        </div>
      </div>
    </div>

    <!-- Create new event -->
    <div class="create-card">
      <div class="d-flex align-items-center gap-2 mb-3 create-header" @click="showForm = !showForm">
        <i class="bi bi-calendar-plus"></i>
        <span class="fw-semibold">Create New Event</span>
        <i class="bi ms-auto" :class="showForm ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
      </div>

      <form v-if="showForm" @submit.prevent="submit">
        <div class="mb-3">
          <label class="form-label small fw-semibold">Event Name <span class="text-muted">(URL-safe)</span></label>
          <input v-model="form.name" type="text" class="form-control" placeholder="e.g. sharma-wedding-jun2025" required />
        </div>
        <div class="mb-3">
          <label class="form-label small fw-semibold">Display Name</label>
          <input v-model="form.displayName" type="text" class="form-control" placeholder="e.g. Sharma Wedding" required />
        </div>
        <div class="mb-3">
          <label class="form-label small fw-semibold">Description <span class="text-muted">(optional)</span></label>
          <textarea v-model="form.eventDescription" class="form-control" rows="2"></textarea>
        </div>
        <button type="submit" class="btn btn-primary w-100" :disabled="state.loading">
          <span v-if="state.loading" class="spinner-border spinner-border-sm me-2"></span>
          Create Event
        </button>
        <p v-if="state.error" class="text-danger small mt-2">{{ state.error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useOnboarding } from '../../../composables/useOnboarding';

const props = defineProps<{ vendorName: string }>();
const emit = defineEmits<{ (e: 'selected', eventId: number): void }>();

const { state, fetchEvents, createEvent } = useOnboarding(props.vendorName);
const showForm = ref(false);
const form = ref({ name: '', displayName: '', eventDescription: '' });

onMounted(fetchEvents);

function select(eventId: number) {
  (state as any).selectedEventId = eventId;
  emit('selected', eventId);
}

async function submit() {
  const event = await createEvent({ ...form.value });
  showForm.value = false;
  form.value = { name: '', displayName: '', eventDescription: '' };
  select(event.id);
}
</script>

<style scoped>
.step-title { font-weight: 700; margin-bottom: 1.25rem; }

.event-card {
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: border-color 0.15s;
}
.event-card:hover { border-color: #6366f1; }
.event-card.selected { border-color: #6366f1; background: #f5f3ff; }

.status-badge {
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: 12px;
  display: inline-block;
  margin-top: 4px;
  &.draft { background: #fef9c3; color: #713f12; }
  &.active { background: #dcfce7; color: #14532d; }
}

.create-card {
  border: 2px dashed #d1d5db;
  border-radius: 10px;
  padding: 1rem;
}
.create-header { cursor: pointer; user-select: none; }
</style>

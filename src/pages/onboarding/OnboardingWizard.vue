<template>
  <div class="wizard-shell">
    <Navbar />

    <div class="wizard-container">
      <!-- Header -->
      <div class="text-center mb-4">
        <h2 class="fw-bold">Set Up Your Event</h2>
        <p class="text-muted small">{{ steps[currentStep].subtitle }}</p>
      </div>

      <!-- Progress bar -->
      <div class="progress-bar-wrapper mb-4">
        <div
          v-for="(step, i) in steps"
          :key="i"
          class="step-dot"
          :class="{
            completed: i < currentStep,
            active: i === currentStep,
            pending: i > currentStep,
          }"
          @click="jumpTo(i)"
        >
          <span class="dot-icon">
            <i v-if="i < currentStep" class="bi bi-check-lg"></i>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="dot-label">{{ step.label }}</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: progressWidth }"></div>
        </div>
      </div>

      <!-- Step content -->
      <div class="step-content">
        <StepMenu
          v-if="currentStep === 0"
          :vendorName="vendorName"
          @selected="onMenuSelected"
        />
        <StepItems
          v-else-if="currentStep === 1"
          :vendorName="vendorName"
          :menuId="selectedMenuId!"
        />
        <StepEvent
          v-else-if="currentStep === 2"
          :vendorName="vendorName"
          @selected="onEventSelected"
        />
        <StepLinkMenu
          v-else-if="currentStep === 3"
          :vendorName="vendorName"
          :menuId="selectedMenuId"
          :eventId="selectedEventId"
          @linked="onLinked"
        />
        <StepPayment
          v-else-if="currentStep === 4"
          :vendorName="vendorName"
          :menuId="selectedMenuId"
          :eventId="selectedEventId"
        />
      </div>

      <!-- Navigation -->
      <div class="wizard-nav mt-4">
        <button v-if="currentStep > 0" class="btn btn-outline-secondary" @click="currentStep--">
          <i class="bi bi-arrow-left me-1"></i> Back
        </button>
        <div class="ms-auto">
          <button
            v-if="currentStep < steps.length - 1"
            class="btn btn-primary"
            :disabled="!canProceed"
            @click="next"
          >
            Next <i class="bi bi-arrow-right ms-1"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '../../components/Navbar.vue';
import StepMenu from './steps/StepMenu.vue';
import StepItems from './steps/StepItems.vue';
import StepEvent from './steps/StepEvent.vue';
import StepLinkMenu from './steps/StepLinkMenu.vue';
import StepPayment from './steps/StepPayment.vue';

const route = useRoute();
const vendorName = route.params.vendorName as string;

const currentStep = ref(0);
const selectedMenuId = ref<number | null>(null);
const selectedEventId = ref<number | null>(null);
const linkConfirmed = ref(false);

const steps = [
  { label: 'Menu', subtitle: 'Choose or create the menu you want to serve at this event.' },
  { label: 'Items', subtitle: 'Add dishes and categories to your menu.' },
  { label: 'Event', subtitle: 'Create or select the event this menu will be served at.' },
  { label: 'Link', subtitle: 'Associate your menu with the event.' },
  { label: 'Pay', subtitle: 'Activate the event with a time window.' },
];

const progressWidth = computed(() => `${(currentStep.value / (steps.length - 1)) * 100}%`);

const canProceed = computed(() => {
  if (currentStep.value === 0) return selectedMenuId.value !== null;
  if (currentStep.value === 2) return selectedEventId.value !== null;
  if (currentStep.value === 3) return linkConfirmed.value;
  return true;
});

function jumpTo(i: number) {
  if (i <= currentStep.value) currentStep.value = i;
}

function next() {
  if (currentStep.value < steps.length - 1) currentStep.value++;
}

function onMenuSelected(menuId: number) {
  selectedMenuId.value = menuId;
}

function onEventSelected(eventId: number) {
  selectedEventId.value = eventId;
}

function onLinked() {
  linkConfirmed.value = true;
}
</script>

<style scoped>
.wizard-shell {
  min-height: 100vh;
  background: #f9fafb;
}

.wizard-container {
  max-width: 560px;
  margin: 0 auto;
  padding: 2rem 1rem 4rem;
}

/* ── Progress bar ─────────────────────────────────────────────────────────── */
.progress-bar-wrapper {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.progress-track {
  position: absolute;
  top: 16px;
  left: 16px;
  right: 16px;
  height: 3px;
  background: #e5e7eb;
  z-index: 0;
}
.progress-fill {
  height: 100%;
  background: #6366f1;
  transition: width 0.35s ease;
}

.step-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  z-index: 1;
}
.dot-icon {
  width: 32px; height: 32px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  border: 3px solid #e5e7eb;
  background: white;
  transition: all 0.2s;
}
.step-dot.completed .dot-icon { background: #6366f1; border-color: #6366f1; color: white; }
.step-dot.active .dot-icon    { border-color: #6366f1; color: #6366f1; }
.dot-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: #9ca3af;
  white-space: nowrap;
}
.step-dot.active .dot-label,
.step-dot.completed .dot-label { color: #4338ca; }

/* ── Step content ─────────────────────────────────────────────────────────── */
.step-content {
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 1px 8px rgba(0,0,0,0.07);
  min-height: 300px;
}

/* ── Nav ──────────────────────────────────────────────────────────────────── */
.wizard-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>

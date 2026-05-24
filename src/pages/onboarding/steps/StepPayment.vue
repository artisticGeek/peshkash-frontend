<template>
  <div class="step-payment">
    <h5 class="step-title">Activate Event</h5>

    <!-- Success screen -->
    <div v-if="paymentSuccess" class="text-center py-4">
      <i class="bi bi-patch-check-fill text-success" style="font-size: 3rem;"></i>
      <h5 class="mt-3 fw-bold">Payment Successful!</h5>
      <p class="text-muted">Your event is now live. Guests can scan QR codes to view the menu.</p>
      <div class="summary-card mt-4">
        <div class="summary-row">
          <span class="label">Event</span>
          <span class="value">{{ selectedEvent?.displayName }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Active From</span>
          <span class="value">{{ formatDate(form.startTime) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Active Until</span>
          <span class="value">{{ formatDate(computedEndTime) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">Amount Paid</span>
          <span class="value">{{ pricing?.currency }} {{ pricing?.amount }}</span>
        </div>
      </div>
    </div>

    <template v-else>
      <!-- Pricing config -->
      <div v-if="!pricing" class="alert alert-warning">
        No pricing configuration found for your account. Please contact support.
      </div>

      <template v-else>
        <div class="pricing-card mb-4">
          <div class="pricing-model-badge">{{ modelLabel }}</div>
          <div class="pricing-amount">{{ pricing.currency }} {{ pricing.amount }}</div>
          <div v-if="pricing.notes" class="text-muted small mt-2">{{ pricing.notes }}</div>
        </div>

        <!-- Timing inputs -->
        <div class="mb-3">
          <label class="form-label small fw-semibold">Event Start Date & Time</label>
          <input v-model="form.startTime" type="datetime-local" class="form-control" required />
        </div>

        <div class="mb-3">
          <label class="form-label small fw-semibold">Duration (hours)</label>
          <input v-model.number="form.durationHours" type="number" class="form-control" min="1" max="72" required />
          <div v-if="computedEndTime" class="text-muted small mt-1">
            Event ends at: <strong>{{ formatDate(computedEndTime) }}</strong>
          </div>
        </div>

        <!-- Order summary -->
        <div class="summary-card mb-4">
          <div class="summary-row">
            <span class="label">Event</span>
            <span class="value">{{ selectedEvent?.displayName ?? '—' }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Menu</span>
            <span class="value">{{ selectedMenu?.displayName ?? '—' }}</span>
          </div>
          <div class="divider"></div>
          <div class="summary-row">
            <span class="label">Total</span>
            <span class="value fw-bold">{{ pricing.currency }} {{ pricing.amount }}</span>
          </div>
        </div>

        <button
          class="btn btn-success w-100 btn-pay"
          :disabled="!form.startTime || !form.durationHours || state.loading"
          @click="pay"
        >
          <span v-if="state.loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-shield-lock-fill me-2"></i>
          Pay & Activate
        </button>
        <p class="text-muted small text-center mt-2">Powered by Razorpay. Secure & encrypted.</p>
        <p v-if="state.error" class="text-danger small">{{ state.error }}</p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useOnboarding } from '../../../composables/useOnboarding';

const props = defineProps<{ vendorName: string; menuId: number | null; eventId: number | null }>();

const { state, fetchPricingConfig, initiatePayment, verifyPayment } = useOnboarding(props.vendorName);

const form = ref({ startTime: '', durationHours: 6 });
const paymentSuccess = ref(false);

const pricing = computed(() => state.pricingConfig);
const selectedEvent = computed(() => state.events.find(e => e.id === props.eventId));
const selectedMenu = computed(() => state.menus.find(m => m.id === props.menuId));

const modelLabels: Record<string, string> = {
  per_event: 'Per Event',
  per_month: 'Per Month',
  per_year: 'Per Year',
  package: 'Package',
  custom: 'Custom',
};
const modelLabel = computed(() => modelLabels[pricing.value?.modelType ?? ''] ?? pricing.value?.modelType);

const computedEndTime = computed(() => {
  if (!form.value.startTime || !form.value.durationHours) return null;
  const end = new Date(form.value.startTime);
  end.setHours(end.getHours() + form.value.durationHours);
  return end.toISOString();
});

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

onMounted(fetchPricingConfig);

async function pay() {
  if (!props.eventId || !props.menuId || !pricing.value) return;

  // Dynamically load Razorpay script if not already present
  if (!window.Razorpay) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.head.appendChild(script);
    });
  }

  const order = await initiatePayment(props.eventId, {
    pricingConfigId: pricing.value.id,
    startTime: form.value.startTime,
    durationHours: form.value.durationHours,
  });

  const rzp = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    name: 'Peshkash',
    description: `Event activation — ${selectedEvent.value?.displayName}`,
    order_id: order.orderId,
    handler: async (response) => {
      await verifyPayment(props.eventId!, {
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });
      paymentSuccess.value = true;
    },
    theme: { color: '#6366f1' },
  });

  rzp.open();
}
</script>

<style scoped>
.step-title { font-weight: 700; margin-bottom: 1.25rem; }

.pricing-card {
  border: 2px solid #6366f1;
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  background: linear-gradient(135deg, #f5f3ff, #ede9fe);
}
.pricing-model-badge {
  display: inline-block;
  background: #6366f1;
  color: white;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}
.pricing-amount {
  font-size: 2rem;
  font-weight: 800;
  color: #4338ca;
}

.summary-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1rem;
}
.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.35rem 0;
}
.label { color: #6b7280; font-size: 0.85rem; }
.value { font-weight: 600; font-size: 0.9rem; }
.divider { border-top: 1px solid #f3f4f6; margin: 0.5rem 0; }

.btn-pay { font-size: 1rem; padding: 0.75rem; font-weight: 600; }
</style>

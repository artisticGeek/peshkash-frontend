<!--
  LoginModal — unified phone→OTP login overlay.
  Replaces DashboardLogin (full-page gate) and LoginDrawer (side drawer).

  Usage:
    <LoginModal :model-value="!authStore.isLoggedIn"
                @update:model-value="onModalVisibility"
                @success="onLoginSuccess"
                allow-skip />

  Props:
    modelValue  — controls visibility
    allowSkip   — shows "Skip for now" link (public pages)

  Emits:
    update:modelValue — false when user presses X or clicks backdrop
    success           — { role, vendorId } on successful OTP verify
    skip              — when skip link is clicked
-->
<template>
  <Teleport to="body">
    <Transition name="lm-fade">
      <div
        v-if="modelValue"
        class="lm-backdrop"
        @click.self="handleClose"
        aria-modal="true"
        role="dialog"
        aria-label="Sign in"
      >
        <Transition name="lm-scale" appear>
          <div v-if="modelValue" class="lm-card">

            <!-- Close button -->
            <button class="lm-close" @click="handleClose" aria-label="Close">
              <i class="bi bi-x-lg"></i>
            </button>

            <!-- Brand -->
            <div class="lm-brand">
              <i class="bi bi-grid-1x2-fill lm-brand-icon"></i>
              <span class="lm-brand-name">Peshkash</span>
            </div>

            <h5 class="lm-title">Sign in to continue</h5>
            <p class="lm-sub">Enter your phone number and we'll send a one-time code.</p>

            <!-- ── Step 1: Phone ── -->
            <template v-if="step === 'phone'">
              <div class="lm-field">
                <label class="lm-label">Phone number</label>
                <div class="lm-phone-row">
                  <span class="lm-prefix">+91</span>
                  <input
                    ref="phoneInputRef"
                    v-model="rawPhone"
                    type="tel"
                    class="lm-input"
                    placeholder="98765 43210"
                    maxlength="10"
                    inputmode="tel"
                    autocomplete="tel"
                    @keyup.enter="send"
                  />
                </div>
              </div>
              <div v-if="error" class="lm-error">
                <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
              </div>
              <button class="lm-btn" :disabled="loading" @click="send">
                <i v-if="loading" class="bi bi-arrow-clockwise spin me-2"></i>
                {{ loading ? 'Sending OTP…' : 'Send OTP' }}
              </button>
            </template>

            <!-- ── Step 2: OTP ── -->
            <template v-else-if="step === 'otp'">
              <p class="lm-sent-note">
                <i class="bi bi-check-circle-fill text-success me-1"></i>
                OTP sent to +91 {{ rawPhone }}
                <button class="lm-link" @click="changeNumber">Change</button>
              </p>
              <div class="lm-field">
                <label class="lm-label">6-digit OTP</label>
                <input
                  ref="otpInputRef"
                  v-model="loginState.otp.value"
                  type="text"
                  class="lm-otp-input"
                  placeholder="_ _ _ _ _ _"
                  maxlength="6"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  @keyup.enter="verify"
                />
              </div>
              <div v-if="error" class="lm-error">
                <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
              </div>
              <button class="lm-btn" :disabled="loading" @click="verify">
                <i v-if="loading" class="bi bi-arrow-clockwise spin me-2"></i>
                {{ loading ? 'Verifying…' : 'Verify & Sign In' }}
              </button>
            </template>

            <!-- ── Step 3: Success ── -->
            <template v-else-if="step === 'success'">
              <div class="lm-success">
                <i class="bi bi-check-circle-fill"></i>
                <p>Signed in!</p>
                <p class="lm-success-sub">Loading your workspace…</p>
              </div>
            </template>

            <p v-if="allowSkip && step !== 'success'" class="lm-skip-row">
              <button class="lm-link lm-skip-link" @click="$emit('skip')">Skip for now</button>
            </p>

            <p class="lm-footer">No account needed — just use your phone to receive a code.</p>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref } from 'vue';
import { useOtpLogin } from '../../composables/useOtpLogin';
import type { Role } from '../../stores/auth';

const props = defineProps<{
  modelValue: boolean;
  allowSkip?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'success', payload: { role: Role; vendorId: number | null }): void;
  (e: 'skip'): void;
}>();

const loginState = useOtpLogin();
const { step, phone, loading, error, sendOtp, verifyOtp, reset } = loginState;

const phoneInputRef = ref<HTMLInputElement | null>(null);
const otpInputRef   = ref<HTMLInputElement | null>(null);

// Strip +91 prefix from the composable's phone ref for display
const rawPhone = computed({
  get: () => phone.value.replace(/^\+91/, '').replace(/\s/g, ''),
  set: (v) => { phone.value = v; },
});

async function send() {
  if (!phone.value.startsWith('+')) {
    phone.value = '+91' + phone.value.replace(/\D/g, '');
  }
  await sendOtp();
  // Focus OTP input after transition
  if (step.value === 'otp') {
    await nextTick();
    otpInputRef.value?.focus();
  }
}

async function verify() {
  const result = await verifyOtp();
  if (result) {
    setTimeout(() => {
      emit('success', result);
      emit('update:modelValue', false);
    }, 600);
  }
}

function changeNumber() {
  reset();
  nextTick(() => phoneInputRef.value?.focus());
}

function handleClose() {
  emit('update:modelValue', false);
}

// Reset state and focus phone input when modal opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reset();
      nextTick(() => phoneInputRef.value?.focus());
    }
  },
);
</script>

<style scoped>
/* ── Backdrop ───────────────────────────────────────────────────────────────── */
.lm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1080;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

/* ── Card ───────────────────────────────────────────────────────────────────── */
.lm-card {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: var(--bs-body-bg, #fff);
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.18), 0 1px 4px rgba(0, 0, 0, 0.08);
  padding: 2rem 2rem 1.5rem;
  overflow: hidden;
}

/* ── Close button ───────────────────────────────────────────────────────────── */
.lm-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bs-light, #f0f2f5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--bs-secondary-color, #6c757d);
  font-size: 0.8rem;
  transition: background 0.15s, color 0.15s;
}
.lm-close:hover {
  background: var(--bs-secondary-bg, #e2e5ea);
  color: var(--bs-body-color, #212529);
}

/* ── Brand ──────────────────────────────────────────────────────────────────── */
.lm-brand {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  font-size: 1rem;
  margin-bottom: 1.5rem;
}
.lm-brand-icon {
  font-size: 1.15rem;
  color: var(--bs-primary, #0d6efd);
}

/* ── Headings ───────────────────────────────────────────────────────────────── */
.lm-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--bs-body-color);
}
.lm-sub {
  font-size: 0.875rem;
  color: var(--bs-secondary-color, #6c757d);
  margin-bottom: 1.5rem;
}

/* ── Field ──────────────────────────────────────────────────────────────────── */
.lm-field { margin-bottom: 1rem; }
.lm-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--bs-body-color);
  margin-bottom: 0.4rem;
}

/* Phone row */
.lm-phone-row {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--bs-border-color, #dee2e6);
  border-radius: 12px;
  overflow: hidden;
  background: var(--bs-body-bg, #fff);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.lm-phone-row:focus-within {
  border-color: var(--bs-primary, #0d6efd);
  box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb, 13, 110, 253), 0.15);
}
.lm-prefix {
  padding: 0.65rem 0.9rem;
  background: var(--bs-light, #f8f9fa);
  border-right: 1.5px solid var(--bs-border-color, #dee2e6);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--bs-secondary-color, #6c757d);
  flex-shrink: 0;
}
.lm-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.65rem 0.9rem;
  font-size: 1rem;
  background: transparent;
  color: var(--bs-body-color);
}

/* OTP input */
.lm-otp-input {
  width: 100%;
  border: 1.5px solid var(--bs-border-color, #dee2e6);
  border-radius: 12px;
  padding: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-align: center;
  outline: none;
  background: var(--bs-body-bg, #fff);
  color: var(--bs-body-color);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.lm-otp-input:focus {
  border-color: var(--bs-primary, #0d6efd);
  box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb, 13, 110, 253), 0.15);
}

/* ── Sent note ──────────────────────────────────────────────────────────────── */
.lm-sent-note {
  font-size: 0.85rem;
  color: var(--bs-secondary-color, #6c757d);
  margin-bottom: 1rem;
}

/* ── Error ──────────────────────────────────────────────────────────────────── */
.lm-error {
  font-size: 0.82rem;
  color: #dc3545;
  background: #fff5f5;
  border: 1px solid #ffd6d6;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  margin-bottom: 0.75rem;
}

/* ── Primary button ─────────────────────────────────────────────────────────── */
.lm-btn {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 12px;
  background: var(--bs-primary, #0d6efd);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  margin-top: 0.25rem;
}
.lm-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.lm-btn:not(:disabled):hover { opacity: 0.88; }
.lm-btn:not(:disabled):active { transform: scale(0.98); }

/* ── Link / change button ───────────────────────────────────────────────────── */
.lm-link {
  border: none;
  background: none;
  color: var(--bs-primary, #0d6efd);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  margin-left: 0.4rem;
}

/* ── Success state ──────────────────────────────────────────────────────────── */
.lm-success {
  text-align: center;
  padding: 1.5rem 0 0.5rem;
  color: var(--bs-success, #198754);
}
.lm-success i {
  font-size: 3rem;
  display: block;
  margin-bottom: 0.6rem;
}
.lm-success p {
  font-weight: 700;
  font-size: 1.1rem;
  margin-bottom: 0.2rem;
}
.lm-success-sub {
  font-size: 0.82rem;
  color: var(--bs-secondary-color, #6c757d);
  font-weight: 400 !important;
}

/* ── Skip / footer ──────────────────────────────────────────────────────────── */
.lm-skip-row {
  text-align: center;
  margin-top: 1rem;
  margin-bottom: 0;
}
.lm-skip-link {
  font-size: 0.82rem;
  color: var(--bs-secondary-color, #6c757d);
  margin-left: 0;
}
.lm-footer {
  margin-top: 1.25rem;
  margin-bottom: 0;
  font-size: 0.75rem;
  color: var(--bs-secondary-color, #6c757d);
  text-align: center;
  line-height: 1.5;
}

/* ── Transitions ────────────────────────────────────────────────────────────── */
.lm-fade-enter-active,
.lm-fade-leave-active { transition: opacity 0.2s ease; }
.lm-fade-enter-from,
.lm-fade-leave-to { opacity: 0; }

.lm-scale-enter-active { transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1); }
.lm-scale-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.lm-scale-enter-from,
.lm-scale-leave-to { opacity: 0; transform: scale(0.92) translateY(8px); }

/* ── Spinner ────────────────────────────────────────────────────────────────── */
.spin { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

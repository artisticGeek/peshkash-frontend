<!--
  LoginDrawer — lightweight phone→OTP drawer for public vendor/event pages.
  Used when vendor.requireLogin = true.
  Emits 'success' with { role, vendorId } on completion.
-->
<template>
  <Teleport to="body">
    <Transition name="ldrawer-fade">
      <div v-if="modelValue" class="ldrawer-backdrop" @click.self="$emit('update:modelValue', false)">
        <Transition name="ldrawer-slide" appear>
          <div v-if="modelValue" class="ldrawer-panel" role="dialog" aria-label="Sign in">

            <!-- Header -->
            <div class="ldrawer-header">
              <div class="ldrawer-brand">
                <i class="bi bi-grid-1x2-fill ldrawer-logo"></i>
                <span>Peshkash</span>
              </div>
              <button class="ldrawer-close" @click="$emit('update:modelValue', false)">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <!-- Body -->
            <div class="ldrawer-body">
              <h5 class="ldrawer-title">Sign in to continue</h5>
              <p class="ldrawer-sub">Enter your phone number and we'll send a one-time code.</p>

              <!-- Step 1: Phone -->
              <template v-if="step === 'phone'">
                <div class="ldrawer-field">
                  <label class="ldrawer-label">Phone number</label>
                  <div class="ldrawer-phone-row">
                    <span class="ldrawer-prefix">+91</span>
                    <input
                      v-model="rawPhone"
                      type="tel"
                      class="ldrawer-input"
                      placeholder="98765 43210"
                      maxlength="10"
                      inputmode="tel"
                      @keyup.enter="send"
                      autofocus
                    />
                  </div>
                </div>
                <div v-if="error" class="ldrawer-error">{{ error }}</div>
                <button class="ldrawer-btn-primary" :disabled="loading" @click="send">
                  <span v-if="loading"><i class="bi bi-arrow-clockwise spin me-1"></i>Sending…</span>
                  <span v-else>Send OTP</span>
                </button>
              </template>

              <!-- Step 2: OTP -->
              <template v-else-if="step === 'otp'">
                <p class="ldrawer-sent-msg">
                  <i class="bi bi-check-circle text-success me-1"></i>
                  OTP sent to +91 {{ rawPhone }}
                  <button class="ldrawer-change-link" @click="changeNumber">Change</button>
                </p>
                <div class="ldrawer-field">
                  <label class="ldrawer-label">6-digit OTP</label>
                  <input
                    v-model="loginState.otp.value"
                    type="text"
                    class="ldrawer-input ldrawer-otp-input"
                    placeholder="_ _ _ _ _ _"
                    maxlength="6"
                    inputmode="numeric"
                    @keyup.enter="verify"
                    autofocus
                  />
                </div>
                <div v-if="error" class="ldrawer-error">{{ error }}</div>
                <button class="ldrawer-btn-primary" :disabled="loading" @click="verify">
                  <span v-if="loading"><i class="bi bi-arrow-clockwise spin me-1"></i>Verifying…</span>
                  <span v-else>Verify &amp; Continue</span>
                </button>
              </template>

              <!-- Step 3: Success -->
              <template v-else-if="step === 'success'">
                <div class="ldrawer-success">
                  <i class="bi bi-check-circle-fill"></i>
                  <p>You're in!</p>
                </div>
              </template>

              <p class="ldrawer-skip" v-if="allowSkip">
                <button class="ldrawer-skip-btn" @click="$emit('skip')">Skip for now</button>
              </p>
            </div>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
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
const { step, phone, otp, loading, error, sendOtp, verifyOtp, reset } = loginState;

// Keep rawPhone in sync with the composable's phone ref (strip +91 prefix)
const rawPhone = computed({
  get: () => phone.value.replace(/^\+91/, '').replace(/\s/g, ''),
  set: v => { phone.value = v; },
});

async function send() {
  // Normalise: prepend +91 if not present
  if (!phone.value.startsWith('+')) {
    phone.value = '+91' + phone.value.replace(/\D/g, '');
  }
  await sendOtp();
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
}

// Reset state when drawer closes
watch(() => props.modelValue, open => {
  if (!open) reset();
});
</script>

<style scoped>
/* Backdrop */
.ldrawer-backdrop {
  position: fixed; inset: 0; z-index: 1070;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
  display: flex; justify-content: flex-end;
}
/* Panel */
.ldrawer-panel {
  width: 100%; max-width: 380px; height: 100%;
  background: var(--bs-body-bg, #fff);
  box-shadow: -4px 0 24px rgba(0,0,0,0.12);
  display: flex; flex-direction: column;
}
@media (max-width: 767px) {
  .ldrawer-backdrop { align-items: flex-end; justify-content: stretch; }
  .ldrawer-panel { max-width: 100%; height: auto; max-height: 90dvh; border-radius: 20px 20px 0 0; }
}

/* Header */
.ldrawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--bs-border-color, #dee2e6);
}
.ldrawer-brand {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 700; font-size: 1rem;
}
.ldrawer-logo { font-size: 1.1rem; color: var(--bs-primary); }
.ldrawer-close {
  width: 30px; height: 30px; border: none;
  background: var(--bs-light, #f8f9fa); border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--bs-secondary-color, #6c757d); font-size: 0.85rem;
}
.ldrawer-close:hover { background: var(--bs-secondary-bg, #e9ecef); }

/* Body */
.ldrawer-body { flex: 1; padding: 1.5rem 1.25rem; overflow-y: auto; }
.ldrawer-title { font-size: 1.15rem; font-weight: 700; margin-bottom: 0.25rem; }
.ldrawer-sub { font-size: 0.875rem; color: var(--bs-secondary-color, #6c757d); margin-bottom: 1.5rem; }

/* Field */
.ldrawer-field { margin-bottom: 1rem; }
.ldrawer-label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--bs-body-color); text-transform: uppercase; letter-spacing: 0.04em; }
.ldrawer-phone-row { display: flex; align-items: center; border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 10px; overflow: hidden; background: var(--bs-body-bg, #fff); }
.ldrawer-phone-row:focus-within { border-color: var(--bs-primary); box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15); }
.ldrawer-prefix { padding: 0.6rem 0.75rem; background: var(--bs-light, #f8f9fa); font-size: 0.9rem; font-weight: 600; color: var(--bs-secondary-color, #6c757d); border-right: 1px solid var(--bs-border-color, #dee2e6); flex-shrink: 0; }
.ldrawer-input { flex: 1; border: none; outline: none; padding: 0.6rem 0.75rem; font-size: 1rem; background: transparent; color: var(--bs-body-color); }
.ldrawer-otp-input { letter-spacing: 0.3em; font-size: 1.25rem; font-weight: 700; text-align: center; border: 1px solid var(--bs-border-color, #dee2e6); border-radius: 10px; padding: 0.65rem; width: 100%; }
.ldrawer-otp-input:focus { border-color: var(--bs-primary); outline: none; box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15); }

/* Sent message */
.ldrawer-sent-msg { font-size: 0.85rem; color: var(--bs-secondary-color, #6c757d); margin-bottom: 1rem; }
.ldrawer-change-link { border: none; background: none; color: var(--bs-primary); font-size: 0.85rem; cursor: pointer; text-decoration: underline; padding: 0; margin-left: 0.5rem; }

/* Error */
.ldrawer-error { color: #dc3545; font-size: 0.82rem; margin-bottom: 0.75rem; }

/* Primary button */
.ldrawer-btn-primary {
  width: 100%; padding: 0.75rem; border: none; border-radius: 10px;
  background: var(--bs-primary, #0d6efd); color: #fff;
  font-size: 0.95rem; font-weight: 600; cursor: pointer;
  transition: opacity 0.15s;
}
.ldrawer-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
.ldrawer-btn-primary:not(:disabled):hover { opacity: 0.88; }

/* Success */
.ldrawer-success { text-align: center; padding: 2rem 0; color: var(--bs-success, #198754); }
.ldrawer-success i { font-size: 3rem; display: block; margin-bottom: 0.75rem; }
.ldrawer-success p { font-weight: 600; font-size: 1.1rem; margin: 0; }

/* Skip */
.ldrawer-skip { text-align: center; margin-top: 1.25rem; }
.ldrawer-skip-btn { border: none; background: none; color: var(--bs-secondary-color, #6c757d); font-size: 0.82rem; cursor: pointer; text-decoration: underline; }

/* Transitions */
.ldrawer-fade-enter-active, .ldrawer-fade-leave-active { transition: opacity 0.2s; }
.ldrawer-fade-enter-from, .ldrawer-fade-leave-to { opacity: 0; }
.ldrawer-slide-enter-active { transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1); }
.ldrawer-slide-leave-active { transition: transform 0.2s ease-in; }
.ldrawer-slide-enter-from, .ldrawer-slide-leave-to { transform: translateX(100%); }
@media (max-width: 767px) {
  .ldrawer-slide-enter-from, .ldrawer-slide-leave-to { transform: translateY(100%); }
}
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

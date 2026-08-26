<!--
  DashboardLogin — full-page login gate for /dashboard/* routes.
  Shown when user is not authenticated. Emits 'success' when login completes.
-->
<template>
  <div class="dlogin-shell">
    <div class="dlogin-card">
      <!-- Brand -->
      <div class="dlogin-brand">
        <i class="bi bi-grid-1x2-fill dlogin-logo"></i>
        <span class="dlogin-brand-name">Peshkash</span>
      </div>

      <h4 class="dlogin-title">Welcome back</h4>
      <p class="dlogin-sub">Sign in with your phone number to access your workspace.</p>

      <!-- Step 1: Phone -->
      <template v-if="step === 'phone'">
        <div class="dlogin-field">
          <label class="dlogin-label">Phone number</label>
          <div class="dlogin-phone-row">
            <span class="dlogin-prefix">+91</span>
            <input
              v-model="rawPhone"
              type="tel"
              class="dlogin-input"
              placeholder="98765 43210"
              maxlength="10"
              inputmode="tel"
              @keyup.enter="send"
              autofocus
            />
          </div>
        </div>
        <div v-if="error" class="dlogin-error">
          <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
        </div>
        <button class="dlogin-btn" :disabled="loading" @click="send">
          <i v-if="loading" class="bi bi-arrow-clockwise spin me-2"></i>
          {{ loading ? 'Sending OTP…' : 'Send OTP' }}
        </button>
      </template>

      <!-- Step 2: OTP -->
      <template v-else-if="step === 'otp'">
        <div class="dlogin-otp-sent">
          <i class="bi bi-phone-fill me-1 text-success"></i>
          OTP sent to <strong>+91 {{ rawPhone }}</strong>
          <button class="dlogin-change-link" @click="changeNumber">Change</button>
        </div>
        <div class="dlogin-field">
          <label class="dlogin-label">6-digit OTP</label>
          <input
            v-model="loginState.otp.value"
            type="text"
            class="dlogin-otp-input"
            placeholder="_ _ _ _ _ _"
            maxlength="6"
            inputmode="numeric"
            @keyup.enter="verify"
            autofocus
          />
        </div>
        <div v-if="error" class="dlogin-error">
          <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
        </div>
        <button class="dlogin-btn" :disabled="loading" @click="verify">
          <i v-if="loading" class="bi bi-arrow-clockwise spin me-2"></i>
          {{ loading ? 'Verifying…' : 'Verify & Sign In' }}
        </button>
      </template>

      <!-- Step 3: Success (brief, then parent redirects) -->
      <template v-else-if="step === 'success'">
        <div class="dlogin-success">
          <i class="bi bi-check-circle-fill"></i>
          <p>Signed in successfully!</p>
          <p class="dlogin-success-sub">Loading your workspace…</p>
        </div>
      </template>

      <p class="dlogin-footer">No account needed for customers — just enter your phone and we'll send a code.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useOtpLogin } from '../../composables/useOtpLogin';
import type { Role } from '../../stores/auth';

const emit = defineEmits<{
  (e: 'success', payload: { role: Role; vendorId: number | null }): void;
}>();

const loginState = useOtpLogin();
const { step, phone, otp, loading, error, sendOtp, verifyOtp, reset } = loginState;

const rawPhone = computed({
  get: () => phone.value.replace(/^\+91/, '').replace(/\s/g, ''),
  set: v => { phone.value = v; },
});

async function send() {
  if (!phone.value.startsWith('+')) {
    phone.value = '+91' + phone.value.replace(/\D/g, '');
  }
  await sendOtp();
}

async function verify() {
  const result = await verifyOtp();
  if (result) {
    setTimeout(() => emit('success', result), 700);
  }
}

function changeNumber() { reset(); }
</script>

<style scoped>
.dlogin-shell {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bs-light, #f8f9fa);
  padding: 1.5rem;
}
.dlogin-card {
  width: 100%;
  max-width: 400px;
  background: var(--bs-body-bg, #fff);
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  padding: 2.5rem 2rem;
}

/* Brand */
.dlogin-brand {
  display: flex; align-items: center; gap: 0.5rem;
  font-weight: 700; font-size: 1.1rem;
  margin-bottom: 1.75rem;
}
.dlogin-logo { font-size: 1.3rem; color: var(--bs-primary); }
.dlogin-brand-name { letter-spacing: -0.01em; }

.dlogin-title { font-size: 1.4rem; font-weight: 700; margin-bottom: 0.3rem; }
.dlogin-sub { font-size: 0.875rem; color: var(--bs-secondary-color, #6c757d); margin-bottom: 1.75rem; }

/* Field */
.dlogin-field { margin-bottom: 1rem; }
.dlogin-label { display: block; font-size: 0.78rem; font-weight: 600; margin-bottom: 0.4rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--bs-body-color); }
.dlogin-phone-row {
  display: flex; align-items: center;
  border: 1.5px solid var(--bs-border-color, #dee2e6);
  border-radius: 10px; overflow: hidden;
  background: var(--bs-body-bg, #fff);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.dlogin-phone-row:focus-within {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15);
}
.dlogin-prefix {
  padding: 0.65rem 0.9rem;
  background: var(--bs-light, #f8f9fa);
  border-right: 1.5px solid var(--bs-border-color, #dee2e6);
  font-size: 0.95rem; font-weight: 600;
  color: var(--bs-secondary-color, #6c757d);
  flex-shrink: 0;
}
.dlogin-input {
  flex: 1; border: none; outline: none;
  padding: 0.65rem 0.9rem;
  font-size: 1rem; background: transparent;
  color: var(--bs-body-color);
}
.dlogin-otp-input {
  width: 100%;
  border: 1.5px solid var(--bs-border-color, #dee2e6);
  border-radius: 10px;
  padding: 0.75rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.35em;
  text-align: center;
  outline: none;
  background: var(--bs-body-bg, #fff);
  color: var(--bs-body-color);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.dlogin-otp-input:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 3px rgba(var(--bs-primary-rgb), 0.15);
}

/* OTP sent note */
.dlogin-otp-sent {
  font-size: 0.85rem;
  color: var(--bs-secondary-color, #6c757d);
  margin-bottom: 1rem;
}
.dlogin-change-link {
  border: none; background: none;
  color: var(--bs-primary); font-size: 0.85rem;
  cursor: pointer; text-decoration: underline;
  padding: 0; margin-left: 0.5rem;
}

/* Error */
.dlogin-error {
  color: #dc3545;
  font-size: 0.82rem;
  margin-bottom: 0.75rem;
  background: #fff5f5;
  border: 1px solid #ffd6d6;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
}

/* Button */
.dlogin-btn {
  width: 100%; padding: 0.8rem;
  border: none; border-radius: 10px;
  background: var(--bs-primary, #0d6efd);
  color: #fff; font-size: 1rem; font-weight: 600;
  cursor: pointer; transition: opacity 0.15s;
  margin-top: 0.25rem;
}
.dlogin-btn:disabled { opacity: 0.65; cursor: not-allowed; }
.dlogin-btn:not(:disabled):hover { opacity: 0.88; }

/* Success */
.dlogin-success {
  text-align: center; padding: 1.5rem 0;
  color: var(--bs-success, #198754);
}
.dlogin-success i { font-size: 3.5rem; display: block; margin-bottom: 0.75rem; }
.dlogin-success p { font-weight: 600; font-size: 1.15rem; margin-bottom: 0.25rem; }
.dlogin-success-sub { font-size: 0.85rem; color: var(--bs-secondary-color, #6c757d); font-weight: 400; }

/* Footer note */
.dlogin-footer {
  margin-top: 1.5rem; margin-bottom: 0;
  font-size: 0.75rem;
  color: var(--bs-secondary-color, #6c757d);
  text-align: center;
  line-height: 1.5;
}

.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

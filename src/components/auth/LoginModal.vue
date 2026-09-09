<!--
  LoginModal — unified phone→OTP login drawer.
  Bottom-anchored sheet (not a centered modal) per the reference spec from the design team,
  Sept 2026. Slides up from the bottom edge; dismissible via backdrop click or Escape only —
  no close (×) button and no skip link on the public-page usage, by explicit request. The
  dashboard's own login keeps its close button since that spec was scoped to "the public
  drawer" specifically (see doc section 10).

  Usage (public pages):
    <LoginModal v-model="loginModalOpen" :vendor-name="vendorName" hide-close-button @success="..." />

  Usage (dashboard):
    <LoginModal v-model="!authStore.isLoggedIn" @success="onLoginSuccess" />

  Props:
    modelValue       — controls visibility
    vendorName       — drives the phone/success copy ("Take {vendorName} with you.", etc);
                        omitted on the dashboard, which falls back to plain functional copy
    hideCloseButton  — true on public pages; dashboard keeps the × button

  Emits:
    update:modelValue — false on backdrop click, Escape, or successful login
    dismiss           — { reason: 'backdrop' | 'escape' } — fires only on a premature close,
                        not on the modelValue=false that follows a successful login
    success           — { role, vendorId } on successful OTP verify
-->
<template>
  <Teleport to="body">
    <Transition name="lm-fade">
      <div
        v-if="modelValue"
        class="lm-backdrop"
        @click.self="dismiss('backdrop')"
      >
        <Transition name="lm-drawer" appear>
          <section
            v-if="modelValue"
            ref="drawerRef"
            class="lm-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="lm-drawer-title"
            @keydown="onDrawerKeydown"
          >
            <header class="lm-header">
              <PeshkashLogo variant="light-bg" :height="20" />
              <button v-if="!hideCloseButton" class="lm-close" @click="dismiss('close')" aria-label="Close">
                <i class="bi bi-x-lg"></i>
              </button>
            </header>

            <div class="lm-progress" role="progressbar" :aria-valuenow="stepIndex + 1" aria-valuemin="1" aria-valuemax="3" aria-label="Sign-in progress">
              <span v-for="n in 3" :key="n" class="lm-progress-seg" :class="{ 'lm-progress-seg--active': stepIndex >= n - 1 }"></span>
            </div>

            <div class="lm-content">
              <!-- ── Step 1: Phone ── -->
              <template v-if="step === 'phone'">
                <h2 id="lm-drawer-title" class="lm-title font-serif">{{ phoneHeadline }}</h2>
                <div class="lm-field">
                  <label class="lm-label" for="lm-phone-input">Phone number</label>
                  <div class="lm-phone-row">
                    <span class="lm-prefix">+91</span>
                    <input
                      id="lm-phone-input"
                      ref="phoneInputRef"
                      v-model="rawPhone"
                      type="tel"
                      class="lm-input"
                      placeholder="98765 43210"
                      maxlength="10"
                      inputmode="tel"
                      autocomplete="tel"
                      :aria-invalid="!!error"
                      aria-describedby="lm-error-msg"
                      @keyup.enter="send"
                    />
                  </div>
                </div>
                <p v-if="error" id="lm-error-msg" class="lm-error" role="alert">
                  <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
                </p>
                <button class="lm-btn" :disabled="loading || !canSendPhone" @click="send">
                  <i v-if="loading" class="bi bi-arrow-clockwise spin me-2"></i>
                  {{ loading ? 'Sending code…' : 'Send one-time code' }}
                </button>
              </template>

              <!-- ── Step 2: OTP ── -->
              <template v-else-if="step === 'otp'">
                <h2 id="lm-drawer-title" class="lm-title font-serif">One quick check.</h2>
                <p class="lm-sent-note">
                  Code sent to +91 {{ rawPhone }}
                  <button class="lm-link" @click="changeNumber">Change number</button>
                </p>
                <div class="lm-field">
                  <label class="lm-label" for="lm-otp-input">6-digit code</label>
                  <input
                    id="lm-otp-input"
                    ref="otpInputRef"
                    v-model="otpValue"
                    type="text"
                    class="lm-otp-input"
                    placeholder="_ _ _ _ _ _"
                    maxlength="6"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    :aria-invalid="!!error"
                    aria-describedby="lm-error-msg"
                    @keyup.enter="verify"
                  />
                </div>
                <p v-if="error" id="lm-error-msg" class="lm-error" role="alert">
                  <i class="bi bi-exclamation-circle me-1"></i>{{ error }}
                </p>
                <button class="lm-btn" :disabled="loading || otpValue.length !== 6" @click="verify">
                  <i v-if="loading" class="bi bi-arrow-clockwise spin me-2"></i>
                  {{ loading ? 'Verifying…' : 'Verify and continue' }}
                </button>
              </template>

              <!-- ── Step 3: Success ── -->
              <template v-else-if="step === 'success'">
                <div class="lm-success" role="status" aria-live="polite">
                  <span class="lm-success-mark"><i class="bi bi-check-lg"></i></span>
                  <h2 id="lm-drawer-title" class="lm-title font-serif">You're in.</h2>
                  <p class="lm-sub">{{ successSub }}</p>
                </div>
              </template>
            </div>
          </section>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref } from 'vue';
import { useOtpLogin } from '../../composables/useOtpLogin';
import type { Role } from '../../stores/auth';
import PeshkashLogo from '../PeshkashLogo.vue';

const props = withDefaults(defineProps<{
  modelValue: boolean;
  vendorName?: string;
  hideCloseButton?: boolean;
}>(), {
  vendorName: '',
  hideCloseButton: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'dismiss', payload: { reason: 'backdrop' | 'close' | 'escape' }): void;
  (e: 'success', payload: { role: Role; vendorId: number | null }): void;
}>();

const loginState = useOtpLogin();
const { step, phone, loading, error, sendOtp, verifyOtp, reset } = loginState;

const phoneInputRef = ref<HTMLInputElement | null>(null);
const otpInputRef   = ref<HTMLInputElement | null>(null);
const drawerRef      = ref<HTMLElement | null>(null);

const stepIndex = computed(() => ({ phone: 0, otp: 1, success: 2 }[step.value] ?? 0));

const phoneHeadline = computed(() =>
  props.vendorName ? `Take ${props.vendorName} with you.` : 'Sign in to continue'
);
const successSub = computed(() =>
  props.vendorName ? `${props.vendorName} is yours to revisit.` : 'Loading your workspace…'
);

// Strip everything but digits, capped at 10 — accepts pasted numbers with spaces/punctuation
const rawPhone = computed({
  get: () => phone.value.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10),
  set: (v) => { phone.value = v.replace(/\D/g, '').slice(0, 10); },
});
const canSendPhone = computed(() => rawPhone.value.length === 10);

// otp.value is exposed by useOtpLogin as a plain ref inside loginState; re-expose typed as string
const otpValue = computed({
  get: () => (loginState.otp.value as string) ?? '',
  set: (v: string) => { loginState.otp.value = v.replace(/\D/g, '').slice(0, 6); },
});

async function send() {
  if (!canSendPhone.value) return;
  phone.value = '+91' + rawPhone.value;
  await sendOtp();
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

/** Never interrupt an active OTP entry or verification — only phone-step and success allow dismiss. */
function dismiss(reason: 'backdrop' | 'close' | 'escape') {
  if (step.value === 'otp' && loading.value) return;
  emit('dismiss', { reason });
  emit('update:modelValue', false);
}

function onDrawerKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    dismiss('escape');
    return;
  }
  if (e.key !== 'Tab') return;
  // Light focus trap: wrap Tab/Shift+Tab within the drawer's focusable elements.
  const focusable = drawerRef.value?.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable || !focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

// Reset state and focus phone input when the drawer opens
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
  /* The exact six tokens from BRAND_BRIEF.md — nothing invented. */
  --lm-ink:        #1A1410;
  --lm-muted:      #564C40;
  --lm-cream:      #F5F2EE;
  --lm-cream-dark: #EBE7E1;
  --lm-gold:       #BD945A;
  --lm-gold-light: #D4A87A;

  position: fixed;
  inset: 0;
  z-index: 1080;
  /* Spec: the page underneath should stay recognizable — a light scrim, not a heavy black one. */
  background: rgba(26, 20, 16, 0.16);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

/* ── Drawer ─────────────────────────────────────────────────────────────────── */
.lm-drawer {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: var(--lm-cream);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 24px rgba(26, 20, 16, 0.14);
  padding-bottom: env(safe-area-inset-bottom, 0);
  overflow: hidden;
}

/* ── Header ─────────────────────────────────────────────────────────────────── */
.lm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem 0;
}
.lm-close {
  width: 32px;
  height: 32px;
  min-width: 44px;
  min-height: 44px;
  margin: -6px -10px 0 0;
  border: none;
  background: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--lm-muted);
  font-size: 0.85rem;
  transition: background 0.15s, color 0.15s;
}
.lm-close:hover { background: var(--lm-cream-dark); color: var(--lm-ink); }

/* ── Progress ───────────────────────────────────────────────────────────────── */
.lm-progress {
  display: flex;
  gap: 5px;
  padding: 0.9rem 1.5rem 0;
}
.lm-progress-seg {
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: var(--lm-cream-dark);
  transition: background 0.2s;
}
.lm-progress-seg--active { background: var(--lm-gold); }

/* ── Content ────────────────────────────────────────────────────────────────── */
.lm-content { padding: 1.1rem 1.5rem 1.6rem; }

/* ── Headings ───────────────────────────────────────────────────────────────── */
.lm-title {
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 1rem;
  color: var(--lm-ink);
}
.lm-sub {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--lm-muted);
  margin: 0;
}

/* ── Field ──────────────────────────────────────────────────────────────────── */
.lm-field { margin-bottom: 1.1rem; }
.lm-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--lm-ink);
  margin-bottom: 0.5rem;
}

/* Phone row */
.lm-phone-row {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--lm-cream-dark);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.15s;
}
.lm-phone-row:focus-within { border-color: var(--lm-gold); }
.lm-prefix {
  padding: 0.7rem 0.9rem;
  background: var(--lm-cream-dark);
  border-right: 1.5px solid var(--lm-cream-dark);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--lm-muted);
  flex-shrink: 0;
}
.lm-input {
  flex: 1;
  min-height: 44px;
  border: none;
  outline: none;
  padding: 0.7rem 0.9rem;
  font-size: 1rem;
  background: transparent;
  color: var(--lm-ink);
}

/* OTP input */
.lm-otp-input {
  width: 100%;
  min-height: 44px;
  border: 1.5px solid var(--lm-cream-dark);
  border-radius: 8px;
  padding: 0.8rem;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: 0.3em;
  text-align: center;
  outline: none;
  background: #fff;
  color: var(--lm-ink);
  transition: border-color 0.15s;
}
.lm-otp-input:focus { border-color: var(--lm-gold); }

/* ── Sent note ──────────────────────────────────────────────────────────────── */
.lm-sent-note {
  font-size: 0.85rem;
  color: var(--lm-muted);
  margin-bottom: 1.1rem;
}

/* ── Error ──────────────────────────────────────────────────────────────────── */
.lm-error {
  font-size: 0.82rem;
  color: #9B2A46;
  background: #FBF0F3;
  border: 1px solid #EFD2DB;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  margin: 0 0 0.75rem;
}

/* ── Primary button ─────────────────────────────────────────────────────────── */
.lm-btn {
  width: 100%;
  min-height: 44px;
  padding: 0.85rem;
  border: none;
  border-radius: 8px;
  background: var(--lm-gold);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s, transform 0.1s;
}
.lm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.lm-btn:not(:disabled):hover { background: var(--lm-gold-light); }
.lm-btn:not(:disabled):active { transform: scale(0.98); }
.lm-btn:focus-visible,
.lm-close:focus-visible,
.lm-link:focus-visible,
.lm-input:focus-visible,
.lm-otp-input:focus-visible {
  outline: 2px solid var(--lm-gold);
  outline-offset: 2px;
}

/* ── Link / change button ───────────────────────────────────────────────────── */
.lm-link {
  border: none;
  background: none;
  color: var(--lm-gold);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
  margin-left: 0.4rem;
}

/* ── Success state ──────────────────────────────────────────────────────────── */
.lm-success { text-align: center; padding: 0.5rem 0 0.2rem; }
.lm-success-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  border: 1.5px solid var(--lm-gold);
  color: var(--lm-gold);
  font-size: 1.4rem;
}
.lm-success .lm-title { margin-bottom: 0.4rem; }

/* ── Transitions ────────────────────────────────────────────────────────────── */
.lm-fade-enter-active,
.lm-fade-leave-active { transition: opacity 0.18s ease-out; }
.lm-fade-enter-from,
.lm-fade-leave-to { opacity: 0; }

.lm-drawer-enter-active { transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1); }
.lm-drawer-leave-active { transition: transform 0.18s ease-in; }
.lm-drawer-enter-from,
.lm-drawer-leave-to { transform: translateY(100%); }

@media (prefers-reduced-motion: reduce) {
  .lm-fade-enter-active, .lm-fade-leave-active,
  .lm-drawer-enter-active, .lm-drawer-leave-active { transition: opacity 0.01s linear !important; }
  .lm-drawer-enter-from, .lm-drawer-leave-to { transform: none !important; }
}

/* ── Spinner ────────────────────────────────────────────────────────────────── */
.spin { animation: spin 0.8s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>

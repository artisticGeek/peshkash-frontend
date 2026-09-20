<template>
  <Teleport to="body">
    <Transition name="pwa-sheet-fade">
      <div v-if="installOpen || notificationOpen" class="pwa-sheet-backdrop" @click.self="dismissCurrent">
        <Transition name="pwa-sheet-rise" appear>
          <aside ref="sheetRef" class="pwa-sheet" role="dialog" aria-modal="true" tabindex="-1" :aria-labelledby="installOpen ? 'pwa-install-title' : 'pwa-notification-title'" @keydown.esc="dismissCurrent">
            <header>
              <span>Your Peshkash</span>
              <button type="button" aria-label="Not now" @click="dismissCurrent"><i class="bi bi-x-lg"></i></button>
            </header>

            <template v-if="installOpen">
              <span class="pwa-sheet-mark"><i class="bi bi-phone"></i></span>
              <p class="pwa-sheet-kicker">Keep it close</p>
              <h2 id="pwa-install-title">Peshkash, on your home screen.</h2>
              <p class="pwa-sheet-copy">Return to saved pieces, recent visits and everything that caught your eye—without finding the link again.</p>

              <ol v-if="isIosInstallHelp" class="pwa-ios-steps">
                <li><span>1</span><p>Tap the browser’s <strong>Share</strong> button.</p></li>
                <li><span>2</span><p>Choose <strong>Add to Home Screen</strong>.</p></li>
                <li><span>3</span><p>Tap <strong>Add</strong>. Peshkash will open like an app.</p></li>
              </ol>

              <div class="pwa-sheet-actions">
                <button v-if="!isIosInstallHelp" type="button" class="pwa-primary" @click="install"><i class="bi bi-box-arrow-down"></i> Add to home screen</button>
                <button v-else type="button" class="pwa-primary" @click="dismissInstall(1)">Got it</button>
                <button type="button" class="pwa-secondary" @click="dismissInstall()">Not now</button>
              </div>
              <p class="pwa-fineprint">Install once. New Peshkash improvements arrive automatically.</p>
            </template>

            <template v-else>
              <span class="pwa-sheet-mark"><i class="bi bi-bell"></i></span>
              <p class="pwa-sheet-kicker">Stay in the loop</p>
              <h2 id="pwa-notification-title">Turn on Peshkash notifications?</h2>
              <p class="pwa-sheet-copy">Hear about relevant collections, events and the things you choose to follow.</p>
              <div class="pwa-consent-note"><i class="bi bi-shield-check"></i><span>You can turn this off anytime in Peshkash preferences.</span></div>
              <p v-if="notificationError" class="pwa-error" role="alert">{{ notificationError }}</p>
              <div class="pwa-sheet-actions">
                <button type="button" class="pwa-primary" :disabled="notificationBusy" @click="enableNotifications"><i class="bi bi-bell"></i> {{ notificationBusy ? 'Enabling…' : 'Enable updates' }}</button>
                <button type="button" class="pwa-secondary" :disabled="notificationBusy" @click="dismissNotification">Not now</button>
              </div>
            </template>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { usePwaLifecycle, type PwaEngagementContext } from '../../composables/usePwaLifecycle'

type EngagementDetail = PwaEngagementContext & { active:boolean; synced:boolean }

const route = useRoute()
const auth = useAuthStore()
const lifecycle = usePwaLifecycle()
const {
  installOpen, notificationOpen, notificationError,
  notificationBusy, isIosInstallHelp, install, dismissInstall,
  enableNotifications, dismissNotification, considerAfterEngagement,
  considerAfterLogin, noteHomeVisit,
} = lifecycle
const anyOpen = computed(() => installOpen.value || notificationOpen.value)
const sheetRef = ref<HTMLElement | null>(null)
let previousBodyOverflow = ''
let previousFocus: HTMLElement | null = null

function dismissCurrent() {
  if (installOpen.value) dismissInstall()
  else dismissNotification()
}

function onEngagement(event: Event) {
  const detail = (event as CustomEvent<EngagementDetail>).detail
  if (!detail?.active) return
  considerAfterEngagement({ vendorId: detail.vendorId, vendorName: detail.vendorName }, auth.isLoggedIn)
}

function onLogin(event: Event) {
  const detail = (event as CustomEvent<{ role:string }>).detail
  considerAfterLogin(detail?.role || null)
}

function onInstallRequest() {
  lifecycle.requestInstall(true)
}

watch(() => [route.path, auth.isLoggedIn] as const, ([path, loggedIn]) => {
  if (path.startsWith('/home')) noteHomeVisit(loggedIn)
}, { immediate: true })

watch(anyOpen, open => {
  if (open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nextTick(() => sheetRef.value?.focus())
  } else {
    document.body.style.overflow = previousBodyOverflow
    previousFocus?.focus()
    previousFocus = null
  }
})

onMounted(() => {
  window.addEventListener('peshkash:engagement-change', onEngagement)
  window.addEventListener('peshkash:auth-login', onLogin)
  window.addEventListener('peshkash:open-install', onInstallRequest)
})
onUnmounted(() => {
  window.removeEventListener('peshkash:engagement-change', onEngagement)
  window.removeEventListener('peshkash:auth-login', onLogin)
  window.removeEventListener('peshkash:open-install', onInstallRequest)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<style scoped>
.pwa-sheet-backdrop{align-items:flex-end;background:rgba(26,20,16,.38);display:flex;inset:0;justify-content:center;padding:1rem;position:fixed;z-index:1200}.pwa-sheet{background:#fffaf3;border:1px solid #ddcfbf;border-radius:22px;box-shadow:0 24px 70px rgba(26,20,16,.3);color:#241a13;max-width:470px;padding:1.35rem 1.4rem 1.25rem;width:100%}.pwa-sheet header{align-items:center;display:flex;justify-content:space-between}.pwa-sheet header>span,.pwa-sheet-kicker{color:#a77d45;font-size:.64rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.pwa-sheet header button{background:transparent;border:0;color:#766452;height:40px;width:40px}.pwa-sheet-mark{align-items:center;background:#eadfce;border-radius:50%;color:#8b653c;display:flex;font-size:1.2rem;height:46px;justify-content:center;margin-top:1.1rem;width:46px}.pwa-sheet-kicker{margin:1rem 0 .45rem}.pwa-sheet h2{font:500 2rem/1.08 Georgia,serif;margin:0;max-width:390px}.pwa-sheet-copy{color:#766452;font-size:.88rem;line-height:1.6;margin:.75rem 0 0}.pwa-sheet-actions{display:grid;gap:.55rem;margin-top:1.25rem}.pwa-primary,.pwa-secondary{align-items:center;border-radius:999px;display:flex;font-size:.8rem;font-weight:700;gap:.5rem;justify-content:center;min-height:48px;padding:.65rem 1rem}.pwa-primary{background:#241a13;border:1px solid #241a13;color:#fff7ec}.pwa-secondary{background:transparent;border:1px solid #d8c9b7;color:#6c5845}.pwa-primary:disabled,.pwa-secondary:disabled{opacity:.55}.pwa-fineprint{color:#95816d;font-size:.66rem;margin:.75rem 0 0;text-align:center}.pwa-ios-steps{display:grid;gap:.65rem;list-style:none;margin:1.1rem 0 0;padding:0}.pwa-ios-steps li{align-items:center;border-top:1px solid #e7dbcd;display:grid;gap:.75rem;grid-template-columns:30px 1fr;padding-top:.65rem}.pwa-ios-steps li>span{background:#eee2d2;border-radius:50%;display:grid;font:500 .78rem Georgia,serif;height:28px;place-items:center;width:28px}.pwa-ios-steps p{color:#6f5e4d;font-size:.78rem;margin:0}.pwa-consent-note{align-items:center;background:#f0e7da;border-radius:10px;color:#705d49;display:flex;font-size:.72rem;gap:.6rem;margin-top:1rem;padding:.75rem}.pwa-consent-note i{color:#8b693f;font-size:1rem}.pwa-error{color:#9a3129;font-size:.74rem;margin:.8rem 0 0}.pwa-sheet-fade-enter-active,.pwa-sheet-fade-leave-active{transition:opacity .2s}.pwa-sheet-fade-enter-from,.pwa-sheet-fade-leave-to{opacity:0}.pwa-sheet-rise-enter-active{transition:transform .28s cubic-bezier(.22,1,.36,1)}.pwa-sheet-rise-leave-active{transition:transform .18s ease}.pwa-sheet-rise-enter-from,.pwa-sheet-rise-leave-to{transform:translateY(105%)}@media(min-width:700px){.pwa-sheet-backdrop{align-items:center}.pwa-sheet-rise-enter-from,.pwa-sheet-rise-leave-to{transform:translateY(18px)}}@media(prefers-reduced-motion:reduce){.pwa-sheet-fade-enter-active,.pwa-sheet-fade-leave-active,.pwa-sheet-rise-enter-active,.pwa-sheet-rise-leave-active{transition:none}}
</style>

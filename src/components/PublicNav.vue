<template>
  <nav class="pk-public-nav">
    <a href="https://peshkash.app" target="_blank" rel="noopener" class="pk-nav-brand">
      <PeshkashLogo variant="dark-bg" :height="36" />
    </a>
    <div class="pk-nav-actions">
      <a href="https://peshkash.app/#contact" target="_blank" rel="noopener" class="pk-nav-cta">
        <i class="bi bi-qr-code-scan"></i><span>Get your QR</span>
      </a>
      <button
        type="button"
        class="pk-menu-trigger"
        aria-label="Open Peshkash menu"
        aria-controls="pk-context-drawer"
        :aria-expanded="drawerOpen"
        @click="openDrawer"
      >
        <i class="bi bi-list"></i>
        <span v-if="hasNewActivity" class="pk-menu-dot" aria-hidden="true"></span>
      </button>
    </div>
  </nav>

  <Teleport to="body">
    <Transition name="pk-drawer-fade">
      <div v-if="drawerOpen" class="pk-drawer-backdrop" @click.self="closeDrawer">
        <Transition name="pk-drawer-slide" appear>
          <aside
            id="pk-context-drawer"
            ref="drawerRef"
            class="pk-context-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pk-drawer-title"
            tabindex="-1"
            @keydown.esc="closeDrawer"
          >
            <header class="pk-drawer-header">
              <span>Your Peshkash</span>
              <button type="button" aria-label="Close menu" @click="closeDrawer"><i class="bi bi-x-lg"></i></button>
            </header>

            <section class="pk-drawer-context" aria-live="polite">
              <span class="pk-context-mark"><i :class="contextIcon"></i></span>
              <h2 id="pk-drawer-title">{{ contextTitle }}</h2>
              <p>{{ contextCopy }}</p>

              <article v-if="recentItem" class="pk-saved-item">
                <div class="pk-saved-thumb">
                  <img v-if="recentItem.image && !imageFailed" :src="recentItem.image" :alt="recentItem.itemName" @error="imageFailed = true" />
                  <span v-else>{{ initials(recentItem.itemName) }}</span>
                </div>
                <div>
                  <strong>{{ recentItem.itemName }}</strong>
                  <small>{{ [recentItem.vendorName, recentItem.eventName].filter(Boolean).join(' · ') || 'Saved just now' }}</small>
                </div>
              </article>

              <div class="pk-context-actions">
                <RouterLink v-if="auth.isLoggedIn" :to="contextPath" class="pk-primary-action" @click="closeDrawer">{{ contextPrimaryLabel }}</RouterLink>
                <button v-else type="button" class="pk-primary-action" @click="startLogin">{{ contextGuestLabel }}</button>
                <button type="button" class="pk-secondary-action" @click="closeDrawer">Keep exploring</button>
              </div>
              <p v-if="!auth.isLoggedIn" class="pk-identity-note">Your phone number securely links this device to your private collection.</p>
              <p v-else class="pk-identity-note">Synced with {{ maskedPhone }}.</p>
            </section>

            <nav class="pk-drawer-links" aria-label="Peshkash links">
              <RouterLink to="/home/history" @click="closeDrawer"><span>Activity history</span><i class="bi bi-chevron-right"></i></RouterLink>
              <a href="https://peshkash.app" target="_blank" rel="noopener"><span>How Peshkash works</span><i class="bi bi-arrow-up-right"></i></a>
            </nav>

            <section class="pk-business-card">
              <p>Hosting an experience?</p>
              <h3>Make your own Peshkash.</h3>
              <a href="https://peshkash.app/#contact" target="_blank" rel="noopener">Get your QR <i class="bi bi-arrow-right"></i></a>
            </section>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <Transition name="pk-save-pop">
      <aside v-if="savePopupOpen && recentItem" class="pk-save-popup" role="status" aria-live="polite">
        <span class="pk-save-popup-mark"><i :class="popupIcon"></i></span>
        <div class="pk-save-popup-copy">
          <strong>{{ popupTitle }}</strong>
          <span>{{ popupSubtitle }}</span>
          <RouterLink :to="contextPath" @click="closeSavePopup">{{ contextPrimaryLabel }} <i class="bi bi-arrow-right"></i></RouterLink>
        </div>
        <button type="button" class="pk-save-popup-close" aria-label="Dismiss saved confirmation" @click="closeSavePopup"><i class="bi bi-x"></i></button>
      </aside>
    </Transition>
  </Teleport>

  <LoginModal
    v-model="loginOpen"
    :vendor-name="recentItem?.vendorName || ''"
    @success="onLoginSuccess"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import PeshkashLogo from '@/components/PeshkashLogo.vue'
import LoginModal from '@/components/auth/LoginModal.vue'
import { useAuthStore } from '@/stores/auth'

type EngagementChange = {
  action: 'save' | 'like' | 'dislike'
  active: boolean
  synced: boolean
  itemName: string
  image: string | null
  vendorName: string | null
  eventName: string | null
}

const auth = useAuthStore()
const router = useRouter()
const drawerOpen = ref(false)
const loginOpen = ref(false)
const savePopupOpen = ref(false)
const hasNewActivity = ref(false)
const recentItem = ref<EngagementChange | null>(null)
const imageFailed = ref(false)
const drawerRef = ref<HTMLElement | null>(null)
let previousBodyOverflow = ''
let savePopupTimer: number | undefined

const maskedPhone = computed(() => auth.phone ? `${auth.phone.slice(0, -4).replace(/\d/g, '•')}${auth.phone.slice(-4)}` : '')
const contextPath = computed(() => recentItem.value?.action === 'like' ? '/home/liked' : recentItem.value?.action === 'dislike' ? '/home/disliked' : '/home/saved')
const contextPrimaryLabel = computed(() => recentItem.value?.action === 'like' ? 'View liked items' : recentItem.value?.action === 'dislike' ? 'View disliked items' : 'View saved items')
const contextGuestLabel = computed(() => recentItem.value?.action === 'like' ? 'Sign in & view liked items' : recentItem.value?.action === 'dislike' ? 'Sign in & view disliked items' : 'Sign in & view saved items')
const contextIcon = computed(() => recentItem.value?.action === 'like' ? 'bi bi-hand-thumbs-up' : recentItem.value?.action === 'dislike' ? 'bi bi-hand-thumbs-down' : recentItem.value ? 'bi bi-bookmark-check' : 'bi bi-bookmark-heart')
const actionPlace = computed(() => recentItem.value?.action === 'like' ? 'your likes' : recentItem.value?.action === 'dislike' ? 'your dislikes' : 'your collection')
const addedTitle = computed(() => recentItem.value?.action === 'like' ? 'Added to your likes' : recentItem.value?.action === 'dislike' ? 'Added to your dislikes' : 'Saved to your collection')
const deviceTitle = computed(() => recentItem.value?.action === 'like' ? 'Liked on this device' : recentItem.value?.action === 'dislike' ? 'Disliked on this device' : 'Saved on this device')
const contextTitle = computed(() => {
  if (recentItem.value) {
    if (!recentItem.value.active) return `Removed from ${actionPlace.value}.`
    return auth.isLoggedIn && recentItem.value.synced ? `${addedTitle.value}.` : `${deviceTitle.value}.`
  }
  return auth.isLoggedIn ? 'Everything you kept, together.' : 'Keep what catches your eye.'
})
const contextCopy = computed(() => {
  if (recentItem.value) {
    if (!recentItem.value.active) return 'Your preference has been updated on this device.'
    if (auth.isLoggedIn && recentItem.value.synced) return 'You can return to it from any device where you’re signed in.'
    if (auth.isLoggedIn) return 'It is kept on this device. Open your collection to retry account sync.'
    return 'Sign in to keep this preference across your devices and return to it later.'
  }
  return auth.isLoggedIn
    ? 'Open your saved items, reactions and recent activity.'
    : 'Sign in once to keep saved items and activity connected across devices.'
})
const popupIcon = computed(() => recentItem.value?.action === 'like' ? 'bi bi-hand-thumbs-up-fill' : recentItem.value?.action === 'dislike' ? 'bi bi-hand-thumbs-down-fill' : 'bi bi-bookmark-check')
const popupTitle = computed(() => recentItem.value?.active ? addedTitle.value : `Removed from ${actionPlace.value}`)
const popupSubtitle = computed(() => recentItem.value && !recentItem.value.synced ? 'Kept on this device — sync will retry' : recentItem.value?.itemName || '')

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'P'
}

function openDrawer() {
  closeSavePopup()
  drawerOpen.value = true
  hasNewActivity.value = false
  nextTick(() => drawerRef.value?.focus())
}

function closeDrawer() {
  drawerOpen.value = false
}

function closeSavePopup() {
  window.clearTimeout(savePopupTimer)
  savePopupOpen.value = false
}

function showSavePopup() {
  window.clearTimeout(savePopupTimer)
  savePopupOpen.value = true
  savePopupTimer = window.setTimeout(() => { savePopupOpen.value = false }, 6000)
}

function startLogin() {
  closeDrawer()
  loginOpen.value = true
}

function onLoginSuccess() {
  loginOpen.value = false
  router.push(contextPath.value)
}

function onEngagementChange(event: Event) {
  const detail = (event as CustomEvent<EngagementChange>).detail
  if (!detail) return
  recentItem.value = detail
  imageFailed.value = false
  hasNewActivity.value = detail.active
  if (auth.isLoggedIn) showSavePopup()
  else openDrawer()
}

watch(drawerOpen, (open) => {
  if (open) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = previousBodyOverflow
  }
})

onMounted(() => window.addEventListener('peshkash:engagement-change', onEngagementChange))
onUnmounted(() => {
  window.removeEventListener('peshkash:engagement-change', onEngagementChange)
  window.clearTimeout(savePopupTimer)
  document.body.style.overflow = previousBodyOverflow
})
</script>

<style scoped>
.pk-public-nav{align-items:center;background:rgba(26,20,16,.97);box-shadow:0 1px 0 rgba(189,148,90,.18);display:flex;justify-content:space-between;padding:.5rem 1.25rem;position:sticky;top:0;z-index:1030}.pk-nav-brand{align-items:center;display:flex;opacity:.9;transition:opacity .2s}.pk-nav-brand:hover{opacity:1}.pk-nav-actions{align-items:center;display:flex;gap:.5rem}.pk-nav-cta{align-items:center;border:1px solid rgba(189,148,90,.4);border-radius:100px;color:#bd945a;display:inline-flex;font-size:.8rem;font-weight:600;gap:.4rem;letter-spacing:.02em;padding:.38rem .9rem;text-decoration:none;transition:all .2s}.pk-nav-cta:hover{background:rgba(189,148,90,.12);border-color:#bd945a;color:#d4ac72}.pk-menu-trigger{align-items:center;background:transparent;border:0;color:#e7ded2;display:grid;font-size:1.3rem;height:38px;place-items:center;position:relative;width:38px}.pk-menu-trigger:hover{color:#d4ac72}.pk-menu-trigger:focus-visible{outline:2px solid #bd945a;outline-offset:2px}.pk-menu-dot{background:#bd945a;border:2px solid #1a1410;border-radius:50%;height:10px;position:absolute;right:3px;top:3px;width:10px}.pk-drawer-backdrop{background:rgba(26,20,16,.25);inset:0;position:fixed;z-index:1070}.pk-context-drawer{background:#fffaf3;box-shadow:-18px 0 55px rgba(26,20,16,.2);display:flex;flex-direction:column;height:100%;max-width:390px;overflow-y:auto;padding:1.35rem;position:absolute;right:0;top:0;width:min(90vw,390px)}.pk-drawer-header{align-items:center;display:flex;justify-content:space-between}.pk-drawer-header>span{color:#a77d45;font-size:.65rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.pk-drawer-header button{background:transparent;border:0;color:#766452;font-size:.9rem;height:38px;width:38px}.pk-drawer-context{padding-top:1.4rem}.pk-context-mark{align-items:center;background:#eadfce;border-radius:50%;color:#8b653c;display:flex;font-size:1.05rem;height:42px;justify-content:center;width:42px}.pk-drawer-context h2{color:#241a13;font:500 1.75rem/1.08 Georgia,serif;margin:1rem 0 .55rem}.pk-drawer-context>p{color:#766452;font-size:.84rem;line-height:1.55;margin:0}.pk-saved-item{align-items:center;border-bottom:1px solid #e2d6c8;border-top:1px solid #e2d6c8;display:grid;gap:.75rem;grid-template-columns:52px 1fr;margin-top:1.25rem;padding:.85rem 0}.pk-saved-thumb{background:linear-gradient(145deg,#e6dacb,#d4c1aa);border-radius:10px;color:#6e5640;display:grid;font:500 1rem Georgia,serif;height:52px;overflow:hidden;place-items:center;width:52px}.pk-saved-thumb img{height:100%;object-fit:cover;width:100%}.pk-saved-item strong{color:#2a1d14;display:block;font:500 .95rem Georgia,serif}.pk-saved-item small{color:#85715e;display:block;font-size:.69rem;margin-top:.3rem}.pk-context-actions{display:grid;gap:.55rem;margin-top:1.3rem}.pk-primary-action,.pk-secondary-action{align-items:center;border-radius:999px;display:flex;font-size:.78rem;font-weight:600;justify-content:center;min-height:44px;text-decoration:none}.pk-primary-action{background:#241a13;border:1px solid #241a13;color:#fff7ec}.pk-primary-action:hover{color:#fff7ec}.pk-secondary-action{background:transparent;border:1px solid #d8c9b7;color:#6c5845}.pk-identity-note{font-size:.67rem!important;margin:.7rem .35rem 0!important;text-align:center}.pk-drawer-links{border-top:1px solid #e2d6c8;display:grid;margin-top:1.4rem;padding-top:.65rem}.pk-drawer-links a{align-items:center;color:#5f4e3e;display:flex;font-size:.76rem;justify-content:space-between;min-height:40px;text-decoration:none}.pk-business-card{background:#eee2d2;border-radius:14px;margin-top:auto;padding:1rem}.pk-business-card p{color:#9a7448;font-size:.58rem;font-weight:800;letter-spacing:.12em;margin:0;text-transform:uppercase}.pk-business-card h3{color:#2c1e14;font:500 1.08rem Georgia,serif;margin:.4rem 0}.pk-business-card a{color:#6d4d2d;font-size:.72rem;font-weight:700;text-decoration:none}.pk-business-card a i{margin-left:.25rem}.pk-drawer-fade-enter-active,.pk-drawer-fade-leave-active{transition:opacity .2s}.pk-drawer-fade-enter-from,.pk-drawer-fade-leave-to{opacity:0}.pk-drawer-slide-enter-active,.pk-drawer-slide-leave-active{transition:transform .25s ease}.pk-drawer-slide-enter-from,.pk-drawer-slide-leave-to{transform:translateX(100%)}
.pk-save-popup{align-items:start;background:#fffaf3;border:1px solid #ddcfbf;border-radius:16px;bottom:1.4rem;box-shadow:0 18px 48px rgba(35,24,16,.2);color:#241a13;display:grid;gap:.75rem;grid-template-columns:38px minmax(0,1fr) 28px;padding:.85rem;position:fixed;right:1.4rem;width:min(360px,calc(100vw - 2rem));z-index:1065}.pk-save-popup-mark{align-items:center;background:#eadfce;border-radius:50%;color:#8b653c;display:flex;height:38px;justify-content:center;width:38px}.pk-save-popup-copy{min-width:0}.pk-save-popup-copy strong{display:block;font:500 .98rem Georgia,serif}.pk-save-popup-copy>span{color:#7d6a57;display:block;font-size:.72rem;margin-top:.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pk-save-popup-copy a{color:#79532e;display:inline-flex;font-size:.72rem;font-weight:700;gap:.35rem;margin-top:.55rem;text-decoration:none}.pk-save-popup-close{background:transparent;border:0;color:#8b7763;font-size:1rem;height:28px;padding:0;width:28px}.pk-save-pop-enter-active,.pk-save-pop-leave-active{transition:opacity .18s ease,transform .18s ease}.pk-save-pop-enter-from,.pk-save-pop-leave-to{opacity:0;transform:translateY(10px)}
@media(max-width:540px){.pk-public-nav{padding:.45rem .75rem}.pk-nav-cta{font-size:.69rem;padding:.36rem .65rem}.pk-nav-cta span{display:inline}.pk-menu-trigger{height:36px;width:36px}.pk-context-drawer{max-width:none;width:min(92vw,390px)}.pk-save-popup{bottom:5.4rem;left:.75rem;right:.75rem;width:auto}}
</style>

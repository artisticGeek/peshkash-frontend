import { computed, ref, shallowRef } from 'vue'
import { enableVendorPush, getPushConfig, pwaInstalled, pushSupported } from '../utils/pushNotifications'
import { gtagEvent } from '../utils/ga'

interface InstallPromptChoice { outcome: 'accepted' | 'dismissed'; platform: string }
interface InstallPromptEvent extends Event {
  platforms?: string[]
  prompt: () => Promise<void>
  userChoice: Promise<InstallPromptChoice>
}

export interface PwaEngagementContext {
  vendorId: number | null
  vendorName: string | null
}

const DAY = 24 * 60 * 60 * 1000
const INSTALL_SNOOZE_KEY = 'peshkash_pwa_install_snooze_until'
const NOTIFICATION_SNOOZE_KEY = 'peshkash_push_snooze_until'
const HOME_VISITS_KEY = 'peshkash_pwa_home_visits'

const deferredInstall = shallowRef<InstallPromptEvent | null>(null)
const installOpen = ref(false)
const notificationOpen = ref(false)
const notificationContext = ref<PwaEngagementContext | null>(null)
const notificationError = ref('')
const notificationBusy = ref(false)
const installed = ref(false)
const initialized = ref(false)
let surfaceUsedThisSession = false
let homeVisitCounted = false
let installRequested = false

function readNumber(key: string) {
  const value = Number(localStorage.getItem(key) || 0)
  return Number.isFinite(value) ? value : 0
}

function isStandalone() {
  return pwaInstalled()
}

const isIos = computed(() => /iphone|ipad|ipod/i.test(navigator.userAgent))
const isIosInstallHelp = computed(() => isIos.value && !installed.value)
const installAvailable = computed(() => !installed.value && (Boolean(deferredInstall.value) || isIos.value))

function snoozed(key: string) {
  return readNumber(key) > Date.now()
}

function closeSurfaces() {
  installOpen.value = false
  notificationOpen.value = false
  notificationError.value = ''
}

function initializePwaLifecycle() {
  if (initialized.value) return
  initialized.value = true
  installed.value = isStandalone()

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredInstall.value = event as InstallPromptEvent
    gtagEvent('pwa_install_available', {
      platforms: (event as InstallPromptEvent).platforms?.join(',') || 'web',
    })
    if (installRequested) requestInstall()
  })
  window.addEventListener('appinstalled', () => {
    installed.value = true
    deferredInstall.value = null
    installOpen.value = false
    surfaceUsedThisSession = true
    localStorage.setItem('peshkash_pwa_installed_at', String(Date.now()))
    gtagEvent('pwa_installed', {
      display_mode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    })
  })
}

function requestInstall(manual = false) {
  initializePwaLifecycle()
  if (installed.value || (!manual && surfaceUsedThisSession)) return false
  if (!manual && snoozed(INSTALL_SNOOZE_KEY)) return false
  if (!installAvailable.value) {
    installRequested = true
    return false
  }
  installRequested = false
  notificationOpen.value = false
  installOpen.value = true
  surfaceUsedThisSession = true
  return true
}

async function install() {
  if (isIosInstallHelp.value) return
  const prompt = deferredInstall.value
  if (!prompt) return
  gtagEvent('pwa_install_prompt_opened')
  await prompt.prompt()
  const choice = await prompt.userChoice
  gtagEvent('pwa_install_prompt_result', {
    outcome: choice.outcome,
    platform: choice.platform || 'web',
  })
  deferredInstall.value = null
  installRequested = false
  installOpen.value = false
  if (choice.outcome === 'dismissed') {
    localStorage.setItem(INSTALL_SNOOZE_KEY, String(Date.now() + 14 * DAY))
  }
}

function dismissInstall(days = 14) {
  installOpen.value = false
  installRequested = false
  localStorage.setItem(INSTALL_SNOOZE_KEY, String(Date.now() + days * DAY))
}

async function requestNotification(context: PwaEngagementContext, manual = false) {
  initializePwaLifecycle()
  if (!installed.value || surfaceUsedThisSession || !context.vendorId || !pushSupported()) return false
  if (Notification.permission !== 'default') return false
  if (!manual && snoozed(NOTIFICATION_SNOOZE_KEY)) return false
  try {
    const config = await getPushConfig()
    if (!config.enabled) return false
  } catch {
    return false
  }
  installOpen.value = false
  notificationContext.value = context
  notificationError.value = ''
  notificationOpen.value = true
  surfaceUsedThisSession = true
  return true
}

async function enableNotifications() {
  const vendorId = notificationContext.value?.vendorId
  if (!vendorId || notificationBusy.value) return
  notificationBusy.value = true
  notificationError.value = ''
  try {
    await enableVendorPush(vendorId)
    notificationOpen.value = false
  } catch (error: any) {
    notificationError.value = error?.response?.data?.error || error?.message || 'Could not enable notifications.'
  } finally {
    notificationBusy.value = false
  }
}

function dismissNotification() {
  notificationOpen.value = false
  notificationError.value = ''
  localStorage.setItem(NOTIFICATION_SNOOZE_KEY, String(Date.now() + 14 * DAY))
}

function considerAfterEngagement(context: PwaEngagementContext, loggedIn: boolean) {
  if (!loggedIn) return
  window.setTimeout(() => {
    if (!installed.value) requestInstall()
    else requestNotification(context)
  }, 6500)
}

function considerAfterLogin(role: string | null) {
  if (role !== 'customer') return
  window.setTimeout(() => requestInstall(), 1800)
}

function noteHomeVisit(loggedIn: boolean) {
  if (!loggedIn || homeVisitCounted) return
  homeVisitCounted = true
  const visits = readNumber(HOME_VISITS_KEY) + 1
  localStorage.setItem(HOME_VISITS_KEY, String(Math.min(visits, 20)))
  if (visits >= 2) window.setTimeout(() => requestInstall(), 1600)
}

export function usePwaLifecycle() {
  initializePwaLifecycle()
  return {
    installed,
    installAvailable,
    installOpen,
    notificationOpen,
    notificationContext,
    notificationError,
    notificationBusy,
    isIosInstallHelp,
    closeSurfaces,
    requestInstall,
    install,
    dismissInstall,
    requestNotification,
    enableNotifications,
    dismissNotification,
    considerAfterEngagement,
    considerAfterLogin,
    noteHomeVisit,
  }
}

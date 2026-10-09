import { registerSW } from 'virtual:pwa-register'
import { ref } from 'vue'

let lastUpdateCheck = 0
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null

export const pwaUpdateAvailable = ref(false)
export const pwaUpdateBusy = ref(false)
export const pwaUpdateError = ref('')
export const pwaBuildId = __PESHKASH_BUILD__

export async function applyPeshkashUpdate() {
  if (!updateServiceWorker || pwaUpdateBusy.value) return
  pwaUpdateBusy.value = true
  pwaUpdateError.value = ''
  try {
    // `true` tells vite-plugin-pwa to message the waiting worker with
    // SKIP_WAITING and reload only after the new worker controls the page.
    await updateServiceWorker(true)
  } catch (error: any) {
    pwaUpdateBusy.value = false
    pwaUpdateError.value = error?.message || 'The update could not be installed. Please try again.'
  }
}

export function dismissPeshkashUpdate() {
  pwaUpdateAvailable.value = false
  pwaUpdateError.value = ''
}

export function registerPeshkashPwa() {
  updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_workerUrl, registration) {
      const checkForUpdate = () => {
        if (!registration || document.visibilityState !== 'visible') return
        const now = Date.now()
        if (now - lastUpdateCheck < 5 * 60 * 1000) return
        lastUpdateCheck = now
        registration.update().catch(() => {})
      }
      checkForUpdate()
      document.addEventListener('visibilitychange', checkForUpdate)
      window.addEventListener('online', checkForUpdate)
      window.setInterval(checkForUpdate, 30 * 60 * 1000)
    },
    // Do not activate a waiting worker in the middle of a live session. Surface
    // an explicit update action so forms and OTP flows are never reloaded by
    // surprise, while users can still move to the newest build immediately.
    onNeedRefresh() {
      pwaUpdateAvailable.value = true
      pwaUpdateError.value = ''
    },
  })

  return updateServiceWorker
}

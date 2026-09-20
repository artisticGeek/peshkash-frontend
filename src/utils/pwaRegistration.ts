import { registerSW } from 'virtual:pwa-register'

let lastUpdateCheck = 0

export function registerPeshkashPwa() {
  const updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_workerUrl, registration) {
      const checkForUpdate = () => {
        if (!registration || document.visibilityState !== 'visible') return
        const now = Date.now()
        if (now - lastUpdateCheck < 60 * 60 * 1000) return
        lastUpdateCheck = now
        registration.update().catch(() => {})
      }
      checkForUpdate()
      document.addEventListener('visibilitychange', checkForUpdate)
    },
    // With prompt registration the next worker waits while this launch is active.
    // Once every Peshkash window closes, the browser activates it automatically,
    // giving the user the latest build on the next launch without interrupting work.
    onNeedRefresh() {
      window.dispatchEvent(new CustomEvent('peshkash:update-ready'))
    },
  })

  return updateServiceWorker
}

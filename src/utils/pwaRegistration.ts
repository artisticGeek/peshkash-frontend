import { registerSW } from 'virtual:pwa-register'

let lastUpdateCheck = 0
let reloadingForUpdate = false

export function registerPeshkashPwa() {
  const updateServiceWorker = registerSW({
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
    },
    onNeedRefresh() {
      updateServiceWorker(true).catch(() => {})
    },
  })

  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (reloadingForUpdate) return
    reloadingForUpdate = true
    window.location.reload()
  })

  return updateServiceWorker
}

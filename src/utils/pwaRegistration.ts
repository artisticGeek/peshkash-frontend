import { registerSW } from 'virtual:pwa-register'

let lastUpdateCheck = 0
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
    // Do not activate a waiting worker in the middle of a live session. It
    // becomes active after the current app is closed, preserving form state.
    onNeedRefresh() {},
  })

  return updateServiceWorker
}

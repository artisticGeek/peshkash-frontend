import axios from 'axios'
import { API_BASE_URL } from '../config'

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(character => character.charCodeAt(0)))
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function pwaInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

export async function getPushConfig() {
  return (await axios.get<{ enabled:boolean;publicKey:string }>(`${API_BASE_URL}/user/push/config`)).data
}

export async function enablePushNotifications() {
  if (!pwaInstalled()) throw new Error('Install Peshkash first, then enable notifications from the installed app.')
  if (!pushSupported()) throw new Error('Browser notifications are not supported on this device.')
  const config = await getPushConfig()
  if (!config.enabled || !config.publicKey) throw new Error('Peshkash push delivery has not been configured yet.')
  const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(config.publicKey),
  })
  await axios.post(`${API_BASE_URL}/user/push/subscriptions`, { subscription: subscription.toJSON() })
}

export async function disablePushNotifications() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  await axios.delete(`${API_BASE_URL}/user/push/subscriptions`)
  await subscription?.unsubscribe()
}

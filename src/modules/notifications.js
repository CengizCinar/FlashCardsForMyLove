// ── Push Bildirimleri ─────────────────────────────────────────────────────
// VAPID public key Netlify env'den gelecek (deploy sonrası)
// Şimdilik placeholder — deploy adımında doldurulacak

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

export async function requestPermissionAndSubscribe() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push bildirimleri bu tarayıcıda desteklenmiyor.')
  }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error('Bildirim izni verilmedi.')
  }

  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VAPID anahtarı henüz ayarlanmamış.')
  }

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  })

  return subscription
}

export async function unsubscribePush() {
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) await sub.unsubscribe()
}

export async function getCurrentSubscription() {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

// Subscription + schedule'ı Netlify'a kaydet
export async function saveScheduleToServer(subscription, times) {
  const res = await fetch('/api/save-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription, times })
  })
  if (!res.ok) throw new Error('Sunucuya kaydedilemedi')
  return res.json()
}

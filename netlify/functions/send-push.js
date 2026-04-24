import webpush from 'web-push'
import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  webpush.setVapidDetails(
    'mailto:' + process.env.VAPID_EMAIL,
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  let data
  try {
    const store = getStore('flashcard-settings')
    data = await store.get('user-settings', { type: 'json' })
  } catch (e) {
    return new Response('Store error: ' + e.message, { status: 200 })
  }

  if (!data?.subscription || !data?.times) {
    return new Response(JSON.stringify({ status: 'no_subscription', data }), { status: 200 })
  }

  // Timezone offset kullanıcıdan gelir (dakika cinsinden, örn. -120 = UTC+2)
  // Gelmezse Hollanda varsayılanı: UTC+1 kış / UTC+2 yaz
  // Basit çözüm: saati hem UTC hem UTC+1 hem UTC+2'ye göre kontrol et
  const now = new Date()
  const nowUTC = now.getUTCHours() * 60 + now.getUTCMinutes()

  const shouldSend = data.times.some(t => {
    const [h, m] = t.split(':').map(Number)
    const targetMinutes = h * 60 + m
    // UTC, UTC+1 ve UTC+2 için kontrol et (Hollanda)
    return [0, 60, 120].some(offset => {
      const adjusted = ((nowUTC + offset) % 1440 + 1440) % 1440
      return Math.abs(targetMinutes - adjusted) <= 16
    })
  })

  if (!shouldSend) {
    const localTime = new Date(now.getTime() + 2 * 3600000)
    return new Response(
      `Not time yet. UTC: ${now.toUTCString()} | Times: ${data.times.join(', ')}`,
      { status: 200 }
    )
  }

  try {
    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({
        title: 'Kelime vakti! 📚',
        body: 'Bugünkü kartlarını çalışmak için dokun.',
        url: '/'
      })
    )
    return new Response('Push sent ✓', { status: 200 })
  } catch (err) {
    return new Response('Push failed: ' + err.statusCode + ' ' + err.message, { status: 500 })
  }
}

export const config = { path: '/api/send-push' }
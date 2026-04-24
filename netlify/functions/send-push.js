import webpush from 'web-push'
import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  // VAPID ayarla
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
    return new Response('No store data: ' + e.message, { status: 200 })
  }

  if (!data?.subscription || !data?.times) {
    return new Response('No subscription found', { status: 200 })
  }

  // Şu anki saat — UTC bazlı ±15 dk pencere
  const now = new Date()
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  const shouldSend = data.times.some(t => {
    const [h, m] = t.split(':').map(Number)
    const diff = Math.abs((h * 60 + m) - nowMinutes)
    return diff <= 15
  })

  if (!shouldSend) {
    return new Response(`Not time yet (now: ${now.toUTCString()})`, { status: 200 })
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
    return new Response('Push sent', { status: 200 })
  } catch (err) {
    return new Response('Push failed: ' + err.message, { status: 500 })
  }
}

export const config = { path: '/api/send-push' }
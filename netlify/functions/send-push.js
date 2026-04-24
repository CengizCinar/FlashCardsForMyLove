// ── Netlify Function: push bildirimi gönder ───────────────────────────────
// cron-job.org bu URL'yi çağırır: /.netlify/functions/send-push
// Blobs'tan subscription ve schedule okur, saat uyuşuyorsa push gönderir

const webpush = require('web-push')
const { getStore } = require('@netlify/blobs')

exports.handler = async (event) => {
  // GET isteği değilse reddet (güvenlik)
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  // VAPID anahtarları Netlify env vars'tan
  webpush.setVapidDetails(
    'mailto:' + process.env.VAPID_EMAIL,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const store = getStore('flashcard-settings')
  const data  = await store.get('user-settings', { type: 'json' })

  if (!data?.subscription || !data?.times) {
    return { statusCode: 200, body: 'No subscription found' }
  }

  // Şu anki saat (HH:MM) — kullanıcının timezone'u Netlify'da UTC
  // Gerçek timezone desteği için client'dan timezone gönderilebilir
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

  // 30 dk pencere içinde mi? (cron her 30 dk çalışır)
  const shouldSend = data.times.some(t => {
    const [th, tm] = t.split(':').map(Number)
    const [nh, nm] = hhmm.split(':').map(Number)
    const diff = Math.abs((th * 60 + tm) - (nh * 60 + nm))
    return diff <= 15
  })

  if (!shouldSend) {
    return { statusCode: 200, body: 'Not time yet' }
  }

  try {
    await webpush.sendNotification(
      data.subscription,
      JSON.stringify({
        title: 'Kelime vakti! 📚',
        body:  'Bugünkü kartlarını çalışmak için dokun.',
        url:   '/'
      })
    )
    return { statusCode: 200, body: 'Push sent' }
  } catch (err) {
    console.error('Push error:', err)
    return { statusCode: 500, body: 'Push failed: ' + err.message }
  }
}

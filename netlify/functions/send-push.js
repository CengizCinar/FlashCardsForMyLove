import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async (req, context) => {
  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@example.com'),
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  try {
    // 1. Tüm abonelikleri al
    const { data: subs, error: subError } = await supabase.from('subscriptions').select('*')
    if (subError || !subs || subs.length === 0) {
      return new Response('No subscriptions found', { status: 200 })
    }

    // 2. Supabase'den kelimeleri al
    const { data: cards, error: cardError } = await supabase.from('cards').select('*')
    if (cardError || !cards || cards.length === 0) {
      return new Response('No cards found in Supabase', { status: 200 })
    }

    const now = new Date()
    const nowUTC = now.getUTCHours() * 60 + now.getUTCMinutes()
    let sentCount = 0;

    for (const sub of subs) {
      // Saat kontrolü (Mevcut mantık: UTC ve Hollanda saatleri)
      const times = sub.notification_times || []
      const shouldSend = times.some(t => {
        const [h, m] = t.split(':').map(Number)
        const targetMinutes = h * 60 + m
        return [0, 60, 120].some(offset => {
          const adjusted = ((nowUTC + offset) % 1440 + 1440) % 1440
          return Math.abs(targetMinutes - adjusted) <= 16
        })
      })

      if (!shouldSend) continue;

      // Kartlar arasından rastgele birini seç
      const randomCard = cards[Math.floor(Math.random() * cards.length)]

      // %50 ihtimalle Türkçe ya da Hollandaca sor
      const askFront = Math.random() > 0.5
      const title = askFront ? "Bu kelimenin anlamı ne? 🤔" : "Bunun Hollandacası ne? 🇳🇱"
      const body = askFront ? randomCard.front : randomCard.back

      try {
        await webpush.sendNotification(
          sub.subscription_data,
          JSON.stringify({ title, body, url: '/' })
        )
        sentCount++;
      } catch (err) {
        // Hata 410 ise (Gone), kullanıcı bildirimi kapatmış demektir. Aboneliği sil.
        if (err.statusCode === 410) {
          await supabase.from('subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    return new Response(`Push process complete. Sent: ${sentCount}`, { status: 200 })
  } catch (err) {
    return new Response('Server error: ' + err.message, { status: 500 })
  }
}

export const config = { path: '/api/send-push' }
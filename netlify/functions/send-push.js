import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Hollanda yerel saatini al (Europe/Amsterdam)
function getNLTime() {
  const now = new Date()
  const nl = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(now)
  const [h, m] = nl.split(':').map(Number)
  return { hours: h, minutes: m, totalMinutes: h * 60 + m }
}

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

    const nl = getNLTime()
    let sentCount = 0
    const skipped = []

    for (const sub of subs) {
      const times = sub.notification_times || []

      // Hollanda saatine göre kontrol — ±7 dk pencere (15 dk cron için yeterli)
      const shouldSend = times.some(t => {
        const [h, m] = t.split(':').map(Number)
        const target = h * 60 + m
        return Math.abs(nl.totalMinutes - target) <= 7
      })

      if (!shouldSend) {
        skipped.push(`${sub.id.slice(0,8)}: NL=${nl.hours}:${String(nl.minutes).padStart(2,'0')}, targets=${times.join(',')}`)
        continue
      }

      // Tekrar gönderme koruması: son 30 dk içinde gönderildiyse atla
      if (sub.last_notified_at) {
        const lastSent = new Date(sub.last_notified_at)
        const diffMin = (Date.now() - lastSent.getTime()) / 60000
        if (diffMin < 30) {
          skipped.push(`${sub.id.slice(0,8)}: cooldown (${Math.round(diffMin)}m ago)`)
          continue
        }
      }

      // Kartlar arasından rastgele birini seç
      const randomCard = cards[Math.floor(Math.random() * cards.length)]

      // %50 ihtimalle Türkçe ya da Hollandaca sor
      const askFront = Math.random() > 0.5
      const title = askFront ? "Bu kelimenin anlamı ne? 🤔" : "Bunun Hollandacası ne? 🇳🇱"
      const body = askFront ? randomCard.front : randomCard.back

      try {
        await webpush.sendNotification(
          sub.subscription_data,
          JSON.stringify({ title, body, url: '/', front: randomCard.front, back: randomCard.back, askFront })
        )
        // Son gönderim zamanını güncelle (kolon varsa)
        await supabase.from('subscriptions').update({ last_notified_at: new Date().toISOString() }).eq('id', sub.id).catch(() => {})
        sentCount++
      } catch (err) {
        if (err.statusCode === 410) {
          await supabase.from('subscriptions').delete().eq('id', sub.id)
        }
      }
    }

    return new Response(
      `NL Time: ${nl.hours}:${String(nl.minutes).padStart(2,'0')} | Sent: ${sentCount} | Skipped: ${skipped.length}\n${skipped.join('\n')}`,
      { status: 200 }
    )
  } catch (err) {
    return new Response('Server error: ' + err.message, { status: 500 })
  }
}

// Netlify Scheduled Function: her 15 dakikada bir çalışır
// Cron-job.org'a gerek kalmaz!
export const config = {
  schedule: '*/15 * * * *'
}
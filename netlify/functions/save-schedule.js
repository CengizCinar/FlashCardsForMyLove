import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { subscription, times } = await req.json()

    if (!subscription || !times) {
      return new Response('Missing fields', { status: 400 })
    }

    // Endpoint değerini benzersiz bir ID'ye çevirerek cihazları ayırıyoruz
    const deviceId = btoa(subscription.endpoint).substring(0, 20)

    const { error } = await supabase
      .from('subscriptions')
      .upsert(
        {
          id: deviceId,
          subscription_data: subscription,
          notification_times: times
        },
        { onConflict: 'id' }
      )

    if (error) throw error

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response('Error: ' + error.message, { status: 500 })
  }
}

export const config = { path: '/api/save-schedule' }
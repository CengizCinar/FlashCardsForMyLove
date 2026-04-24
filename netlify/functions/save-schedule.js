import { getStore } from '@netlify/blobs'

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { subscription, times } = body
  if (!subscription || !times) {
    return new Response('Missing fields', { status: 400 })
  }

  const store = getStore('flashcard-settings')
  await store.setJSON('user-settings', { subscription, times })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}

export const config = { path: '/api/save-schedule' }
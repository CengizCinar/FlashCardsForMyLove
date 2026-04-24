// Kullanıcının subscription ve bildirim saatlerini Blobs'a kaydet
const { getStore } = require('@netlify/blobs')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405 }

  const { subscription, times } = JSON.parse(event.body || '{}')
  if (!subscription || !times) return { statusCode: 400, body: 'Missing fields' }

  const store = getStore('flashcard-settings')
  await store.setJSON('user-settings', { subscription, times })

  return { statusCode: 200, body: JSON.stringify({ ok: true }) }
}

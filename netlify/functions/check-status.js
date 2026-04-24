import { getStore } from '@netlify/blobs'

export default async (req, context) => {
    try {
        const store = getStore('flashcard-settings')
        const data = await store.get('user-settings', { type: 'json' })
        return new Response(JSON.stringify({
            hasSubscription: !!data?.subscription,
            times: data?.times || [],
            endpoint: data?.subscription?.endpoint?.slice(0, 50) + '...' || null
        }, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        })
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 200 })
    }
}

export const config = { path: '/api/check-status' }
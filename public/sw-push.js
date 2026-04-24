// Push bildirim handler — Service Worker'a eklenir
self.addEventListener('push', (event) => {
    let data = { title: 'Kelime vakti! 📚', body: 'Bugünkü kartlarını çalışmak için dokun.', url: '/' }
    try { if (event.data) data = { ...data, ...event.data.json() } } catch { }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/favicon.svg',
            badge: '/favicon.svg',
            vibrate: [200, 100, 200],
            data: { url: data.url, front: data.front, back: data.back, askFront: data.askFront },
            requireInteraction: false
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    const d = event.notification.data || {}
    // Kelime bilgisi varsa URL'ye ekle
    let url = d.url || '/'
    if (d.front && d.back) {
        url = `/?quiz=${encodeURIComponent(d.front)}&answer=${encodeURIComponent(d.back)}&dir=${d.askFront ? 'front' : 'back'}`
    }
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            const existing = list.find(c => c.url.includes(self.location.origin))
            if (existing) {
                existing.navigate(url)
                return existing.focus()
            }
            return clients.openWindow(url)
        })
    )
})
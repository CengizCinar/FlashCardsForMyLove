// Push bildirim handler — Service Worker'a eklenir
self.addEventListener('push', (event) => {
    let data = { title: 'Kelime vakti! 📚', body: 'Bugünkü kartlarını çalışmak için dokun.', url: '/' }
    try { if (event.data) data = { ...data, ...event.data.json() } } catch { }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            vibrate: [200, 100, 200],
            data: { url: data.url },
            requireInteraction: false
        })
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
            const existing = list.find(c => c.url.includes(self.location.origin))
            if (existing) return existing.focus()
            return clients.openWindow(event.notification.data?.url || '/')
        })
    )
})
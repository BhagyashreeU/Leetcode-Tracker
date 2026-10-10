// Service worker: makes the app installable and shows review reminders sent by
// the send-reminders Edge Function. It doesn't cache anything, so a new deploy
// is picked up on the next page load.

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'LeetCode Tracker', {
      body: data.body || 'You have reviews due today.',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      // One reminder at a time, but a new one still alerts when an older
      // one (or a test) is still in the notification list.
      tag: 'reviews-due',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin))
      return open ? open.focus() : self.clients.openWindow(url)
    }),
  )
})

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { StaleWhileRevalidate } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST || [])

registerRoute(
  ({ url }) => /^https?:\/\/fonts\.(googleapis|gstatic)\.com\//i.test(url.href),
  new StaleWhileRevalidate({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
)

registerRoute(
  ({ url, sameOrigin }) => !url.pathname.startsWith('/api/') && /\.(png|jpg|jpeg|gif|webp|avif|ico|svg)$/i.test(url.pathname) && sameOrigin,
  new StaleWhileRevalidate({
    cacheName: 'image-assets-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
      new CacheableResponsePlugin({ statuses: [200] }),
    ],
  }),
)

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim()
      const keys = await caches.keys()
      const validPrefixes = ['workbox-precache', 'google-fonts-cache', 'image-assets-cache']
      await Promise.all(
        keys
          .filter(k => !validPrefixes.some(p => k.startsWith(p)))
          .map(k => caches.delete(k))
      )
    })()
  )
})

cleanupOutdatedCaches()

self.addEventListener('push', (event) => {
  const payload = event.data?.json() ?? {}
  const title = payload.title ?? 'Salones'
  const options: NotificationOptions = {
    body: payload.body ?? '',
    icon: payload.icon ?? '/icon-192.png',
    badge: payload.badge ?? '/icon-192.png',
    data: payload.data ?? {},
    tag: payload.tag ?? 'default',
    vibrate: [200, 100, 200],
    requireInteraction: payload.requireInteraction ?? false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const targetUrl = event.notification.data?.url ?? '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          return client.navigate(targetUrl)
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})

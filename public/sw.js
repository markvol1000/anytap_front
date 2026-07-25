/* Minimal service worker — required for Chrome/Android PWA install (beforeinstallprompt).
 * Version bump forces clients to drop stale bundles after deploy.
 */
const SW_VERSION = 'anytap-2026-07-12-1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const client of clients) {
      client.postMessage({ type: 'SW_UPDATED', version: SW_VERSION });
    }
  })());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.warn('[SW] Fetch failed:', err);
      return new Response('Network error', { status: 503 });
    })
  );
});

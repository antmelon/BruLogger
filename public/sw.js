// Service worker for the installed web app. It only does one thing: when a page can't load because
// there's no connection, it shows offline.html instead of the browser's error page, which looks
// broken in an installed app. Nothing else is cached. Brews live in Supabase, so the app needs the
// network anyway, and caching the app's own files risks serving an old version after a deploy.

const CACHE = 'offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' }))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Lets page loads start while the worker is still starting up
      if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // the app's files, Supabase and the API go straight to the network
  event.respondWith(
    (async () => {
      try {
        return (await event.preloadResponse) || (await fetch(event.request));
      } catch {
        return caches.match(OFFLINE_URL);
      }
    })(),
  );
});

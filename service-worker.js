const CACHE_NAME = 'rhyme-finder-v2-MW';
const ASSETS = [
  '/rhyme/',
  '/rhyme/index.html',
  '/rhyme/style.css',
  '/rhyme/script.js',
  '/rhyme/cmudict.json',
  '/rhyme/service-worker.js',
];
self.addEventListener('install', e =>
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  )
);
self.addEventListener('activate', e =>
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  )
);
self.addEventListener('fetch', e => {
  if (!e.request.url.includes('/rhyme/')) return;
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request)
    )
  );
});
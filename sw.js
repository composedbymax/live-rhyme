const CACHE_NAME = "glsl-app-offline";
const ASSETS = [
    "/live/index.html",
    "/live/style.css",
    "/live/script.js",
    "/live/cmudict.json",
    "/live/sw.js",
];
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS);
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});
self.addEventListener("activate", (event) => {
    event.waitUntil(
        self.clients.claim().then(() => {
        })
    );
});
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseToCache);
                            });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        console.log(`Network failed for: ${event.request.url}`);
                        return new Response("Offline - content not available", {
                            status: 503,
                            statusText: "Service Unavailable"
                        });
                    });
            })
    );
});
// LIFELINE AI — Service Worker (PWA, offline-first)
const CACHE_NAME = "lifeline-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/styles/main.css",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/favicon.svg",
  "/icons/logo.svg",
  "/src/main.js",
  "/src/store.js",
  "/src/types.js",
  "/src/ui.js",
  "/src/analyzer.js",
  "/src/location.js",
  "/src/voice.js",
  "/src/contacts.js",
  "/src/sync.js",
  "/src/auth.js",
  "/src/handlers.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(event.request));
    return;
  }
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        return new Response("Offline — content not cached", { status: 503, statusText: "Service Unavailable" });
      });
    })
  );
});

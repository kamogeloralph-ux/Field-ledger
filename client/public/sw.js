// Field Ledger direction: offline resilience supports the field workflow without hiding the sync state.
const CACHE_NAME = "field-ledger-shell-v1";

self.addEventListener("install", (event) => {
  const scope = self.registration.scope;
  const appShell = [scope, new URL("manifest.webmanifest", scope).toString()];
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(appShell)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match(self.registration.scope))),
  );
});

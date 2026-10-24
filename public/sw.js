const CACHE = "folio-shell-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        cache.addAll([
          "./",
          "./index.html",
          "./icon.svg",
          "./manifest.webmanifest",
        ]),
      ),
  );
  // Wait for existing tabs to close so a new shell cannot replace their assets.
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // The HTML and hashed assets must come from the same installed release.
      if (event.request.mode === "navigate") {
        const shell = await cache.match(
          new URL("./index.html", self.registration.scope).href,
        );
        if (shell) return shell;
      }
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const retained = await caches.match(event.request);
      if (retained) return retained;
      return fetch(event.request);
    })(),
  );
});

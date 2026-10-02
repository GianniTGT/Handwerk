// Service Worker — offline-mbështetja për monteuret në teren.
// Strategjia: asetet statike cache-first; faqet network-first me fallback
// nga cache (shikon porositë/adresat e vizituara edhe pa rrjet); /offline
// si fallback i fundit. Shkrimet offline radhiten në klient (offlineQueue).
const VERSION = "v2";
const STATIC_CACHE = `handwerk-static-${VERSION}`;
const PAGE_CACHE = `handwerk-pages-${VERSION}`;
const PRECACHE = ["/offline", "/manifest.webmanifest", "/tiff-logo.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((emra) =>
        Promise.all(
          emra
            .filter((emri) => emri.startsWith("handwerk-") && !emri.endsWith(VERSION))
            .map((emri) => caches.delete(emri))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Asetet e pandryshueshme: cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/tiff-logo.svg" ||
    url.pathname === "/manifest.webmanifest"
  ) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((resp) => {
            if (resp.ok) {
              const kopje = resp.clone();
              caches.open(STATIC_CACHE).then((c) => c.put(req, kopje));
            }
            return resp;
          })
      )
    );
    return;
  }

  // Fotot e rapporteve: network-first me fallback cache (private, max-age të shkurtër)
  if (url.pathname.startsWith("/api/fotos/")) {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const kopje = resp.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, kopje));
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // RSC-fetches (navigimet me klik + prefetch i Next): network-first me cache.
  // Next i pre-fetch-on linket e dukshme — kështu faqet bëhen offline-të-gatshme
  // automatikisht sapo shfaqet lista.
  if (req.headers.get("RSC") === "1") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const kopje = resp.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, kopje));
          }
          return resp;
        })
        .catch(async () => (await caches.match(req)) || Response.error())
    );
    return;
  }

  // Navigimet (faqet): network-first, fallback cache, pastaj /offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((resp) => {
          if (resp.ok) {
            const kopje = resp.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, kopje));
          }
          return resp;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/offline")))
    );
  }
});

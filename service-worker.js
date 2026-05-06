// BrewCheck service worker.
// Strategy:
//   - Static shell (HTML/CSS/JS/icons): cache-first with network fallback.
//   - Beer data: network-first so updates ship without users having to clear cache.
//   - Tesseract CDN assets: cached on first use so OCR works offline after first scan.

const CACHE_NAME = "brewcheck-v1";
const SHELL_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/data/beerDatabase.js",
  "./js/data/fuzzyMatcher.js",
  "./js/utils/queryPreprocessor.js",
  "./js/services/recommendationEngine.js",
  "./js/services/speechRecognizer.js",
  "./js/services/textRecognizer.js",
  "./js/views/searchView.js",
  "./js/views/beerDetailView.js",
  "./js/views/menuScanView.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon-180.png",
  "./icons/favicon-32.png",
  "./icon-master.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Network-first for the beer dataset
  if (url.pathname.endsWith("/data/beer_data.json")) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Same-origin: cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req));
    return;
  }

  // Cross-origin (Tesseract CDN): cache opportunistically
  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const response = await fetch(req);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    return cached || new Response("offline", { status: 503 });
  }
}

async function networkFirst(req) {
  try {
    const response = await fetch(req);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, response.clone()).catch(() => {});
    }
    return response;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    throw err;
  }
}

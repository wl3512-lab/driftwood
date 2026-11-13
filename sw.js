/* Driftwood service worker — offline + installable.
 *
 * Strategy: precache the static bundle on install; serve local files
 * cache-first (they only change when a new build ships, which bumps VERSION);
 * fetch CDN libraries (p5, fonts, face-api) network-first and keep a copy so
 * a second visit works with no connection at all. Camera models and the
 * optional live-AI proxy are never cached.
 */
const VERSION = "dw-v19";
const PRECACHE = [
  "./",
  "./index.html",
  "./v2/",
  "./v2/index.html",
  "./manifest.webmanifest",
  "./icons/app-icon-192.png",
  "./icons/app-icon-512.png",
  "./icons/app-icon-maskable-512.png",
  "./icons/app-icon-180.png",
  "./icons/mood-garden-favicon.svg",
  "./icons/fox.svg", "./icons/parrot.svg", "./icons/bunny.svg", "./icons/dog.svg", "./icons/cat.svg"
];
const RUNTIME_HOSTS = ["cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com", "cdn.jsdelivr.net"];
const NEVER_CACHE = ["itp-ima-replicate-proxy.web.app", "justadudewhohacks.github.io"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION)
      // addAll fails atomically on one 404, so add one at a time and tolerate misses
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (NEVER_CACHE.some((h) => url.host === h)) return;
  // face-api model weights are large and only needed with the camera on
  const isModelWeights = url.host !== self.location.host &&
    (url.pathname.includes("/model/") || url.pathname.endsWith("-shard1") || url.pathname.endsWith("manifest.json"));
  if (isModelWeights) return;

  const sameOrigin = url.origin === self.location.origin;
  const runtime = RUNTIME_HOSTS.some((h) => url.host === h);
  if (!sameOrigin && !runtime) return;

  if (sameOrigin) {
    // Cache-first, refreshed in the background so the next load has the latest.
    // The refresh must revalidate: a plain fetch() can be answered from the
    // HTTP cache, which would keep rewriting the same stale copy forever.
    event.respondWith(
      caches.match(req).then((hit) => {
        const refresh = fetch(req, { cache: "no-cache" }).then((res) => {
          if (res && res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        }).catch(() => hit);
        return hit || refresh;
      })
    );
    return;
  }

  // CDN: network-first, fall back to the stored copy when offline
  event.respondWith(
    fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req))
  );
});

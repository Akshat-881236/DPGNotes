/** DPGNotes Service Worker */
const CACHE_NAME = "dpgnotes-core-v1.0.2";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/404.html",
  "/ANH.png",
  "/dpg-loader.js",
  "/pwa.js",
  "/manifest.json",
  "/custom-dialogs.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Pre-cache partial notice:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never intercept non-GET or cross-origin requests
  if (req.method !== "GET" || !url.protocol.startsWith("http")) return;
  if (url.origin !== self.location.origin) return;

  // 2. Never intercept backend APIs
  if (url.pathname.startsWith("/api/")) return;

  // 3. Navigation / Document requests: Network-First with safe fallback
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
          return fetch(req); // Fall back naturally
        })
    );
    return;
  }

  // 4. Static assets (images, fonts, scripts, css): Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200 && networkRes.type === "basic") {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return networkRes;
      }).catch(() => null);

      if (cached) {
        // Return cached immediately while updating cache in background
        return cached;
      }

      return networkFetch.then((res) => {
        if (res) return res;
        if (req.destination === "image") {
          return caches.match("/ANH.png");
        }
        return new Response(null, { status: 404, statusText: "Not Found" });
      });
    })
  );
});

self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.action === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data.action === "CLEAR_STALE_CACHE") {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((requests) => {
        requests.forEach((req) => {
          const u = new URL(req.url);
          if (!PRECACHE_ASSETS.includes(u.pathname)) {
            cache.delete(req);
          }
        });
      });
    });
  }
});

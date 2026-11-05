/** DPGNotes Service Worker */
const CACHE_NAME = "dpgnotes-core-v1.0.0";
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
        console.warn("[ServiceWorker] Pre-cache partial fail:", err);
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
  if (req.method !== "GET" || !url.protocol.startsWith("http")) return;
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("firestore.googleapis.com") ||
    url.hostname.includes("identitytoolkit.googleapis.com") ||
    url.hostname.includes("securetoken.googleapis.com") ||
    url.hostname.includes("googlesyndication.com") ||
    url.hostname.includes("doubleclick.net")
  ) {
    return; // Pass through to network
  }
  if (
    req.destination === "image" ||
    req.destination === "font" ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".webp") ||
    url.pathname.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          }
          return res;
        }).catch(() => caches.match("/ANH.png"));
      })
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(async (err) => {
        if (cached) return cached;
        if (req.mode === "navigate" || req.destination === "document") {
          const fallback = await caches.match("/index.html");
          if (fallback) return fallback;
        }
        return new Response(null, { status: 504, statusText: "Offline or Gateway Timeout" });
      });
      return cached || fetchPromise;
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

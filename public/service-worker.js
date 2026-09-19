/**
 * DPGNotes Service Worker
 * Version: 1.0.0
 * Architecture: Stale-While-Revalidate for visited assets, Network-First for API routes, Cache-First for static icons/images.
 */

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

// Install: Pre-cache core shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("[ServiceWorker] Pre-cache partial fail:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Purge obsolete cache stores
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

// Fetch: Strategy dispatcher
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests, Chrome extension schemes, or Firebase API / Google Analytics / AdSense
  if (req.method !== "GET" || !url.protocol.startsWith("http")) return;

  // Never cache backend API routes, Firestore endpoints, Google Auth, or AdSense
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

  // Cache-First for local images and static fonts
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

  // Stale-While-Revalidate for HTML, JS, CSS, and visited PDFs
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "cors")) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        }
        return res;
      }).catch((err) => {
        if (cached) return cached;
        // Offline Fallback for HTML documents
        if (req.mode === "navigate" || req.destination === "document") {
          return caches.match("/index.html");
        }
        throw err;
      });

      return cached || fetchPromise;
    })
  );
});

// Message Listener for cache invalidation & high-speed refresh
self.addEventListener("message", (event) => {
  if (!event.data) return;
  if (event.data.action === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data.action === "CLEAR_STALE_CACHE") {
    caches.open(CACHE_NAME).then((cache) => {
      cache.keys().then((requests) => {
        // Keep pre-cached assets, delete older dynamic entries
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

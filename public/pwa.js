/**
 * DPGNotes PWA Controller
 * Invisible background worker lifecycle and high-speed network cache synchronization.
 * Strictly 0 UI impact on user presentation.
 */

(function() {
  "use strict";

  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then((registration) => {
        // Background update check
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                // Inform new worker to activate in background
                installingWorker.postMessage({ action: "SKIP_WAITING" });
              }
            });
          }
        });

        // High-Speed Connection Optimization Engine:
        // Detects broadband / 5G / high 4G connections and instructs the service worker
        // to purge stale assets and re-sync fresh content.
        function checkHighSpeedConnection() {
          try {
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            let isHighSpeed = false;

            if (conn) {
              const is4G = conn.effectiveType === "4g";
              const isFastDownlink = (conn.downlink && conn.downlink >= 5.0);
              const isLowRtt = (conn.rtt && conn.rtt <= 100);
              if (is4G && (isFastDownlink || isLowRtt)) {
                isHighSpeed = true;
              }
            } else if (navigator.onLine) {
              // Fallback assumption if onLine and unmetered
              isHighSpeed = true;
            }

            if (isHighSpeed && registration.active) {
              const lastSync = parseInt(sessionStorage.getItem("dpg_pwa_fast_sync") || "0", 10);
              const now = Date.now();
              // Sync at most once every 15 minutes on high speed connection
              if (now - lastSync > 900000) {
                registration.active.postMessage({ action: "CLEAR_STALE_CACHE" });
                sessionStorage.setItem("dpg_pwa_fast_sync", now.toString());
              }
            }
          } catch(e) {
            // Passive error suppression
          }
        }

        setTimeout(checkHighSpeedConnection, 3000);

        if (navigator.connection) {
          navigator.connection.addEventListener("change", checkHighSpeedConnection);
        }
      })
      .catch((err) => {
        // Passive registration error handling without user disruption
        console.warn("[PWA] ServiceWorker registration skipped:", err);
      });
  });
})();

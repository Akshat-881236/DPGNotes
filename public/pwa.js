/** DPGNotes PWA Controller */
(function() {
  "use strict";
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener("statechange", () => {
              if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
                installingWorker.postMessage({ action: "SKIP_WAITING" });
              }
            });
          }
        });
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
              isHighSpeed = true;
            }
            if (isHighSpeed && registration.active) {
              const lastSync = parseInt(sessionStorage.getItem("dpg_pwa_fast_sync") || "0", 10);
              const now = Date.now();
              if (now - lastSync > 900000) {
                registration.active.postMessage({ action: "CLEAR_STALE_CACHE" });
                sessionStorage.setItem("dpg_pwa_fast_sync", now.toString());
              }
            }
          } catch(e) {
          }
        }
        setTimeout(checkHighSpeedConnection, 3000);
        if (navigator.connection) {
          navigator.connection.addEventListener("change", checkHighSpeedConnection);
        }
      })
      .catch((err) => {
        console.warn("[PWA] ServiceWorker registration skipped:", err);
      });
  });
})();

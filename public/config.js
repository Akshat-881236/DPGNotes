// ==========================================
// DPGNOTES DUAL-VENDOR CONFIGURATION (Render Primary -> Vercel Fallback)
// ==========================================

const RENDER_PRIMARY_URL = "https://dpgnotes.onrender.com";
const VERCEL_FALLBACK_URL = "https://dpgnotes.vercel.app";

if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_BASE_URL = 'http://localhost:5000';
  } else {
    // Render is ALWAYS primary backend across all domains (web.app, vercel.app, etc.)
    window.API_BASE_URL = RENDER_PRIMARY_URL;

    const activeFallback = window.location.hostname.includes('vercel.app') 
      ? window.location.origin 
      : VERCEL_FALLBACK_URL;

    // Asynchronously ping Render health endpoint. If suspended/offline (e.g. HTTP 503), switch to Vercel fallback!
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    fetch(`${RENDER_PRIMARY_URL}/`, { method: 'GET', signal: controller.signal, mode: 'cors' })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) {
          console.warn("[DPGNotes Dynamic Failover] Render server offline/suspended (HTTP " + res.status + "). Switching to Vercel Fallback Backend!");
          window.API_BASE_URL = activeFallback;
        } else {
          console.log("[DPGNotes Dynamic Failover] Render Primary Backend Active!");
        }
      })
      .catch(err => {
        clearTimeout(timeoutId);
        console.warn("[DPGNotes Dynamic Failover] Render ping failed (" + err.message + "). Switching to Vercel Fallback Backend!");
        window.API_BASE_URL = activeFallback;
      });
  }
}

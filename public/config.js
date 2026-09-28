// ==========================================
// DPGNOTES CONFIGURATION
// ==========================================

var RENDER_BACKEND_URL = window.RENDER_BACKEND_URL || "https://dpgnotes.onrender.com";
window.RENDER_BACKEND_URL = RENDER_BACKEND_URL;
window.RENDER_BACKEND_URI = RENDER_BACKEND_URL;

if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_BASE_URL = 'http://localhost:5000';
  } else {
    window.API_BASE_URL = RENDER_BACKEND_URL;
  }
}

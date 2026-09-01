// ==========================================
// DPGNOTES CONFIGURATION
// ==========================================

const RENDER_BACKEND_URL = "https://dpgnotes.onrender.com";

if (typeof window !== 'undefined') {
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_BASE_URL = 'http://localhost:5000';
  } else {
    window.API_BASE_URL = RENDER_BACKEND_URL;
  }
}

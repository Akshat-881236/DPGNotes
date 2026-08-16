// ==========================================
// DPGNOTES CONFIGURATION
// ==========================================

// Replace this URL with your actual Render API URL once deployed.
// Do NOT include a trailing slash (e.g. use "https://dpg-notes-backend.onrender.com" instead of "https://dpg-notes-backend.onrender.com/")
// If you are testing locally, you can change this to "http://localhost:5000"

// Auto-detect environment: Use current origin if hosted on Vercel/localhost, else fallback to active Vercel/Render API backend
if (typeof window !== 'undefined') {
  if (window.location.hostname.includes('vercel.app') || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.API_BASE_URL = window.location.origin;
  } else {
    // Primary Vercel Serverless Backend fallback for Firebase / External sites
    window.API_BASE_URL = "https://dpgnotes.vercel.app";
  }
}

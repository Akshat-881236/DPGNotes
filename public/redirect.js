// ============================================================================
// DPGNOTES EXTERNAL REDIRECT WARNING COMPONENT
// ============================================================================
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Dynamically inject styling for the redirect warning modal
    const style = document.createElement('style');
    style.innerHTML = `
      .redirect-modal-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(2, 6, 23, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex; align-items: center; justify-content: center;
        z-index: 999999;
        opacity: 0; pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .redirect-modal-overlay.active {
        opacity: 1; pointer-events: auto;
      }
      .redirect-modal-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.95));
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
        border-radius: 20px;
        padding: 2.2rem;
        max-width: 480px; width: 90%;
        text-align: center;
        transform: translateY(20px);
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        color: #f8fafc;
        font-family: 'Inter', sans-serif;
      }
      .redirect-modal-overlay.active .redirect-modal-card {
        transform: translateY(0);
      }
      .redirect-icon {
        font-size: 3rem; color: #f59e0b; margin-bottom: 1rem;
        display: inline-block; animation: pulse 2s infinite;
      }
      .redirect-title {
        font-size: 1.4rem; font-weight: 800; margin-bottom: 0.8rem;
        background: linear-gradient(135deg, #fff, #94a3b8);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      }
      .redirect-desc {
        color: #94a3b8; font-size: 0.92rem; line-height: 1.6; margin-bottom: 1.5rem;
      }
      .redirect-url-box {
        background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.05);
        padding: 0.8rem 1rem; border-radius: 10px;
        font-family: monospace; font-size: 0.82rem; color: #a5b4fc;
        word-break: break-all; text-align: left; margin-bottom: 1.5rem;
        max-height: 80px; overflow-y: auto;
      }
      .redirect-actions {
        display: flex; gap: 0.8rem; justify-content: center; margin-bottom: 1rem;
      }
      .redirect-btn {
        border: none; padding: 0.75rem 1.4rem; border-radius: 10px;
        font-weight: 700; font-size: 0.88rem; cursor: pointer;
        transition: all 0.2s ease;
      }
      .redirect-btn-proceed {
        background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white;
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }
      .redirect-btn-proceed:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
      }
      .redirect-btn-cancel {
        background: rgba(255, 255, 255, 0.05); color: #cbd5e1;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }
      .redirect-btn-cancel:hover {
        background: rgba(255, 255, 255, 0.1); color: white;
      }
      .redirect-learn-more {
        font-size: 0.8rem; color: #a78bfa; text-decoration: none;
        transition: color 0.2s;
      }
      .redirect-learn-more:hover {
        color: #f8fafc; text-decoration: underline;
      }
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);

    // Create Modal Element structure
    const overlay = document.createElement('div');
    overlay.className = 'redirect-modal-overlay';
    overlay.innerHTML = `
      <div class="redirect-modal-card">
        <div class="redirect-icon">⚠️</div>
        <div class="redirect-title">Leaving DPGNotes</div>
        <div class="redirect-desc">You are leaving the DPGNotes Academic Portal to visit an external site. Please make sure you trust the destination URL.</div>
        <div class="redirect-url-box" id="redirectDestUrl">https://example.com</div>
        <div class="redirect-actions">
          <button class="redirect-btn redirect-btn-cancel" id="redirectCancelBtn">Stay Here</button>
          <button class="redirect-btn redirect-btn-proceed" id="redirectProceedBtn">Proceed</button>
        </div>
        <a href="#" class="redirect-learn-more" id="redirectLearnMoreLink">Learn more about our External Links Policy</a>
      </div>
    `;
    document.body.appendChild(overlay);

    let pendingUrl = '';

    function getLegalLinksPolicyUrl() {
      return 'https://dpgnotes.web.app/legal/index.html#links-policy';
    }

    const learnMoreEl = document.getElementById('redirectLearnMoreLink');
    if (learnMoreEl) {
      learnMoreEl.setAttribute('href', getLegalLinksPolicyUrl());
    }

    // Bind event handlers
    document.getElementById('redirectCancelBtn').addEventListener('click', () => {
      overlay.classList.remove('active');
    });
    document.getElementById('redirectProceedBtn').addEventListener('click', () => {
      if (pendingUrl) {
        window.open(pendingUrl, '_blank', 'noopener,noreferrer');
      }
      overlay.classList.remove('active');
    });
    document.getElementById('redirectLearnMoreLink').addEventListener('click', (e) => {
      e.preventDefault();
      window.open(getLegalLinksPolicyUrl(), '_blank');
      overlay.classList.remove('active');
    });

    // Intercept clicks on links globally
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      // 1. Bypass download links, in-memory data exports, or programmatic bypasses
      if (anchor.hasAttribute('download') || anchor.download || 
          anchor.getAttribute('data-bypass-redirect') === 'true' || 
          anchor.closest('[data-bypass-redirect]')) {
        return;
      }

      const href = anchor.getAttribute('href');
      if (!href) return;

      // 2. Bypass internal anchors, empty links, javascript actions, mailto/tel protocols, and in-memory local data URLs
      if (href.startsWith('#') || 
          href.startsWith('javascript:') || 
          href.startsWith('mailto:') || 
          href.startsWith('tel:') || 
          href.startsWith('blob:') || 
          href.startsWith('data:') || 
          href.startsWith('filesystem:') || 
          href === '') {
        return;
      }

      try {
        const url = new URL(href, window.location.href);

        // 3. Only intercept standard web navigations (http and https)
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          return;
        }

        // 4. Same origin is strictly internal
        if (url.origin === window.location.origin) {
          return;
        }

        // 5. Must have a valid hostname to be considered external
        if (!url.hostname) {
          return;
        }

        const internalHosts = [
          window.location.hostname,
          'dpgnotes.web.app', 
          'dpgnotes.firebaseapp.com', 
          'localhost', 
          '127.0.0.1',
          'github.io',
          'digiindia-student-platform.onrender.com',
          'digiindia',
          'akshat-881236.github.io',
          'akshat-145609.github.io'
        ];
        
        // If it is external (not in trusted internal hosts)
        if (!internalHosts.some(host => host && url.hostname.toLowerCase().includes(host.toLowerCase()))) {
          e.preventDefault();
          pendingUrl = url.href;
          document.getElementById('redirectDestUrl').innerText = pendingUrl;
          overlay.classList.add('active');
        }
      } catch (err) {
        // Safe fallback for unparseable href strings
      }
    }, true);

    // ============================================================================
    // DPGNOTES GUEST ACCESS QUOTA ENFORCEMENT (6 Visits / 3 PDFs per day)
    // ============================================================================
    (function checkGuestQuota() {
      // 1. Authenticated Users have Unlimited Access
      const activeUid = localStorage.getItem("dpgActiveUserUid");
      if (activeUid) return;

      // 2. Legal Policy Pages, Quota Lockdown Screen, and Contributor Creator Studios are strictly Exempt from Guest Quota
      if (window.location.pathname.includes('/legal') || 
          window.location.href.includes('legal/index.html') ||
          window.location.pathname.includes('quota-lockdown.html') ||
          window.location.pathname.includes('admin') ||
          window.location.pathname.includes('dashboard') ||
          window.location.pathname.includes('train_model')) {
        return;
      }

      // 3. Retrieve or initialize Anonymous Guest ID
      let guestId = localStorage.getItem("dpg_guest_id");
      if (!guestId) {
        guestId = "guest_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
        localStorage.setItem("dpg_guest_id", guestId);
      }

      // Action: PDF view vs Page visit
      const isPdfViewer = window.location.pathname.includes('dpgnotes-pdf-viewer.html');

      // Cookie helper functions for multi-layer tamper protection
      function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
      }
      function setCookie(name, val) {
        document.cookie = name + '=' + val + ';path=/;max-age=86400;SameSite=Strict';
      }
      function clearCookie(name) {
        document.cookie = name + '=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }

      // Local storage & multi-layer offline tracking fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem("dpg_quota_date");
      let pageVisits = parseInt(localStorage.getItem("dpg_quota_visits") || "0", 10);
      let pdfViews = parseInt(localStorage.getItem("dpg_quota_pdfs") || "0", 10);

      // Check tamper lock across localStorage, sessionStorage, and cookies
      const isLockedLocal = localStorage.getItem("dpg_quota_locked") === "true";
      const isLockedSession = sessionStorage.getItem("dpg_quota_locked") === "true";
      const isLockedCookie = getCookie("dpg_quota_locked") === "true";

      if (savedDate !== todayStr) {
        pageVisits = 0;
        pdfViews = 0;
        localStorage.setItem("dpg_quota_date", todayStr);
        localStorage.removeItem("dpg_quota_locked");
        sessionStorage.removeItem("dpg_quota_locked");
        clearCookie("dpg_quota_locked");
      } else if (isLockedLocal || isLockedSession || isLockedCookie) {
        // Tamper detected or lock previously set: enforce lock across all 3 layers & immediately bounce to quota-lockdown.html
        localStorage.setItem("dpg_quota_locked", "true");
        sessionStorage.setItem("dpg_quota_locked", "true");
        setCookie("dpg_quota_locked", "true");
        pageVisits = 99;
        pdfViews = 99;

        if (!window.location.pathname.includes('quota-lockdown.html')) {
          window.location.href = "https://dpgnotes.web.app/quota-lockdown.html?returnUrl=" + encodeURIComponent(window.location.href);
          return;
        }
      }

      if (isPdfViewer) pdfViews += 1;
      else pageVisits += 1;

      localStorage.setItem("dpg_quota_visits", pageVisits);
      localStorage.setItem("dpg_quota_pdfs", pdfViews);

      // Server-side Python Service Quota Verification (Backed by IP + Firestore)
      const PYTHON_SERVICE = "https://dpgnotes-python-service.onrender.com";
      const currentAction = isPdfViewer ? "pdf_view" : "page_visit";

      fetch(PYTHON_SERVICE + "/api/guest-quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guestId, action: currentAction })
      }).then(r => r.json()).then(data => {
        if (data && data.allowed === false) {
          triggerQuotaReachedPhase();
        }
      }).catch(err => {
        console.warn("Python Server quota check error:", err);
      });

      function triggerQuotaReachedPhase() {
        // Enforce lock across all 3 storage layers
        localStorage.setItem("dpg_quota_locked", "true");
        sessionStorage.setItem("dpg_quota_locked", "true");
        setCookie("dpg_quota_locked", "true");

        if (window.location.pathname.includes('quota-lockdown.html')) {
          return;
        }

        // Always redirect user to quota-lockdown.html with complete absolute URL
        window.location.href = "https://dpgnotes.web.app/quota-lockdown.html?returnUrl=" + encodeURIComponent(window.location.href);
      }



      // Never lock out search engine crawlers (Googlebot, Bingbot, Lighthouse, Google-InspectionTool, etc.)
      const isCrawler = /bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool|lighthouse/i.test(navigator.userAgent);
      if (isCrawler) {
        return;
      }

      // Check local limit first
      if (pageVisits > 6 || pdfViews > 3 || new URLSearchParams(location.search).get('quotaReached') === 'true') {
        triggerQuotaReachedPhase();
        return;
      }

      // Server IP + Guest ID verification
      fetch((window.API_BASE_URL || '') + '/api/guest-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId, action: currentAction })
      }).then(res => res.json()).then(data => {
        if (data && data.allowed === false) {
          triggerQuotaReachedPhase();
        }
      }).catch(err => console.warn('Server guest quota tracking error:', err));
    })();

    // Automatically trigger Device Logging for page load (logs once per user per IP per day)
    (function logDeviceTelemetry() {
      if (/bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool|lighthouse/i.test(navigator.userAgent)) {
        return;
      }
      const activeUser = JSON.parse(localStorage.getItem("dpgActiveUser") || "{}");
      const userType = activeUser.role === 'admin' || activeUser.email === 'its.akshatnetworkhub23@gmail.com' ? 'Admin' : (activeUser.uid ? 'Contributor' : 'Anonymous');
      const userId = activeUser.uid || localStorage.getItem("dpg_guest_id") || "guest_anon";
      const email = activeUser.email || "guest@dpgnotes.app";

      const perm = localStorage.getItem("dpg_device_perm_granted") === "true";
      const hwInfo = perm ? {
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        cpuCores: navigator.hardwareConcurrency || 4,
        deviceMemoryGB: navigator.deviceMemory || 4,
        platform: navigator.platform,
        touchSupport: ('ontouchstart' in window)
      } : null;

      fetch((window.API_BASE_URL || '') + '/api/device-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userType,
          userId,
          email,
          permissionGranted: perm,
          hardwareInfo: hwInfo
        })
      }).catch(err => console.warn('Device log tracking error:', err));
    })();

    // Automatically trigger Ad Track-ID Attribution & Screentime Telemetry
    (function initAdTrackTelemetry() {
      const params = new URLSearchParams(window.location.search);
      const trackId = params.get('track_id') || params.get('trackId');
      if (!trackId) return;

      // Set cookie for track_id
      const d = new Date();
      d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000));
      document.cookie = `dpg_ad_click_track_id=${encodeURIComponent(trackId)};expires=${d.toUTCString()};path=/;SameSite=Lax`;

      const pageUrl = window.location.href;
      const pageTitle = document.title || "DPGNotes Resource Page";
      const pageDesc = document.querySelector('meta[name="description"]')?.content || "";
      const startTime = Date.now();

      let adId = "";
      try {
        const map = JSON.parse(localStorage.getItem('dpg_ad_track_map') || '{}');
        if (map[trackId]) adId = map[trackId].adId;
      } catch(e) {}

      async function syncAdTrackSession(screentimeSec = 0) {
        try {
          const activeUser = JSON.parse(localStorage.getItem("dpgActiveUser") || "{}");
          const visitorUid = activeUser.uid || localStorage.getItem("dpgActiveUserUid") || localStorage.getItem("dpg_guest_id") || "guest_anon";
          const visitorEmail = activeUser.email || localStorage.getItem("dpgActiveUserEmail") || "guest@dpgnotes.app";

          const trackingData = {
            trackId,
            adId,
            pageUrl,
            pageTitle,
            pageDescription: pageDesc,
            visitorUid,
            visitorEmail,
            screentimeSeconds: screentimeSec,
            referrerUrl: document.referrer || "",
            timestamp: new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
          };

          if (window.dpgDb && window.doc && window.setDoc) {
            await window.setDoc(window.doc(window.dpgDb, "ad_trackings", `${trackId}_${visitorUid}`), trackingData, { merge: true }).catch(console.warn);
          } else {
            fetch((window.API_BASE_URL || '') + '/api/ad-track-telemetry', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(trackingData)
            }).catch(console.warn);
          }
        } catch(e) {
          console.warn("Sync ad track session error:", e);
        }
      }

      syncAdTrackSession(0);

      setInterval(() => {
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        syncAdTrackSession(elapsedSec);
      }, 5000);

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          const elapsedSec = Math.round((Date.now() - startTime) / 1000);
          syncAdTrackSession(elapsedSec);
        }
      });
      window.addEventListener('beforeunload', () => {
        const elapsedSec = Math.round((Date.now() - startTime) / 1000);
        syncAdTrackSession(elapsedSec);
      });
    })();
  });
})();

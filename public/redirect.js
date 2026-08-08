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
        <a href="/legal/index.html#links-policy" class="redirect-learn-more" id="redirectLearnMoreLink">Learn more about our External Links Policy</a>
      </div>
    `;
    document.body.appendChild(overlay);

    let pendingUrl = '';

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
      window.open('/legal/index.html#links-policy', '_blank');
      overlay.classList.remove('active');
    });

    // Intercept clicks on links globally
    document.addEventListener('click', (e) => {
      const anchor = e.target.closest('a');
      if (!anchor) return;

      const href = anchor.getAttribute('href');
      if (!href) return;

      // Bypass internal anchors, empty links, javascript actions, mailto/tel protocols
      if (href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:') || href === '') {
        return;
      }

      try {
        const url = new URL(href, window.location.href);
        const internalHosts = ['dpgnotes.web.app', 'dpgnotes.firebaseapp.com', 'localhost', '127.0.0.1'];
        
        // If it is external
        if (!internalHosts.some(host => url.hostname.includes(host))) {
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

      // 2. Legal Policy Pages are strictly Exempt
      if (window.location.pathname.includes('/legal') || window.location.href.includes('legal/index.html')) return;

      // 3. Retrieve or initialize Anonymous Guest ID
      let guestId = localStorage.getItem("dpg_guest_id");
      if (!guestId) {
        guestId = "guest_" + Math.random().toString(36).substring(2, 10) + "_" + Date.now();
        localStorage.setItem("dpg_guest_id", guestId);
      }

      // Action: PDF view vs Page visit
      const isPdfViewer = window.location.pathname.includes('dpgnotes-pdf-viewer.html');
      const action = isPdfViewer ? 'pdf_view' : 'page_visit';

      // Local storage offline tracking fallback
      const todayStr = new Date().toISOString().split('T')[0];
      const savedDate = localStorage.getItem("dpg_quota_date");
      let pageVisits = parseInt(localStorage.getItem("dpg_quota_visits") || "0", 10);
      let pdfViews = parseInt(localStorage.getItem("dpg_quota_pdfs") || "0", 10);

      if (savedDate !== todayStr) {
        pageVisits = 0;
        pdfViews = 0;
        localStorage.setItem("dpg_quota_date", todayStr);
      }

      if (isPdfViewer) pdfViews += 1;
      else pageVisits += 1;

      localStorage.setItem("dpg_quota_visits", pageVisits);
      localStorage.setItem("dpg_quota_pdfs", pdfViews);

      function triggerQuotaReachedPhase() {
        if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/public/')) {
          window.location.href = "index.html?quotaReached=true";
          return;
        }

        // 1. Immediately inject hard CSS override into head so no other DOM elements can ever render
        if (!document.getElementById('quotaLockOverrideStyle')) {
          const st = document.createElement('style');
          st.id = 'quotaLockOverrideStyle';
          st.innerHTML = `
            body > *:not(#unnegotiableLockedQuotaScreen) {
              display: none !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
              height: 100vh !important;
              width: 100vw !important;
              background: #020617 !important;
            }
          `;
          (document.head || document.documentElement).appendChild(st);
        }

        function buildQuotaScreen() {
          if (document.body) {
            document.body.style.cssText = 'margin:0; padding:0; overflow:hidden; background:#020617; font-family:"Inter",sans-serif; color:#f8fafc; height:100vh; width:100vw; display:flex; align-items:center; justify-content:center;';
            
            // Hide/remove any other child elements in body
            Array.from(document.body.children).forEach(child => {
              if (child.id !== 'unnegotiableLockedQuotaScreen') {
                child.style.display = 'none';
              }
            });

            if (!document.getElementById('unnegotiableLockedQuotaScreen')) {
              const lockedContainer = document.createElement('div');
              lockedContainer.id = 'unnegotiableLockedQuotaScreen';
              lockedContainer.style.cssText = 'width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1.5rem; background:radial-gradient(circle at center, rgba(30,41,59,0.9), #020617 80%); box-sizing:border-box; text-align:center; overflow-y:auto; position:fixed; inset:0; z-index:999999;';

              lockedContainer.innerHTML = `
                <div style="background:rgba(15,23,42,0.85); border:1px solid rgba(239,68,68,0.35); border-radius:24px; padding:2rem 1.5rem; max-width:540px; width:100%; box-shadow:0 25px 60px rgba(0,0,0,0.9); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); margin:auto; box-sizing:border-box;">
                  <div style="display:inline-flex; align-items:center; gap:8px; margin-bottom:1rem; background:rgba(239,68,68,0.12); border:1px solid rgba(239,68,68,0.3); padding:5px 14px; border-radius:999px; color:#fca5a5; font-size:0.8rem; font-weight:700; text-transform:uppercase; letter-spacing:1px;">
                    <i class="ri-alarm-warning-fill" style="color:#ef4444; font-size:1rem;"></i> Daily Access Limit Reached
                  </div>

                  <h1 style="font-family:'Outfit',sans-serif; font-size:1.8rem; font-weight:800; color:white; margin-bottom:0.6rem; line-height:1.2;">
                    Daily Guest Quota Exceeded
                  </h1>

                  <p style="color:#94a3b8; font-size:0.9rem; line-height:1.6; margin-bottom:1.2rem;">
                    You have used all <strong style="color:white;">6 page visits</strong> and <strong style="color:white;">3 PDF reads</strong> allocated for guest viewers today.<br>
                    Sign in with your Google account to enjoy <strong style="color:#a78bfa;">unlimited free access</strong> to all notes, papers, and AI assistants.
                  </p>

                  <!-- LIVE RESET COUNTDOWN TIMER -->
                  <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:0.85rem; margin-bottom:1.5rem; display:flex; flex-direction:column; align-items:center; gap:4px;">
                    <span style="font-size:0.72rem; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:1px;">Quota Resets In</span>
                    <div id="quotaCountdownTimer" style="font-family:monospace; font-size:1.8rem; font-weight:800; color:#818cf8; letter-spacing:2px;">00:00:00</div>
                    <span style="font-size:0.7rem; color:#94a3b8;">(HH : MM : SS until midnight UTC)</span>
                  </div>

                  <!-- SINGLE GOOGLE SIGN IN BUTTON -->
                  <button id="lockedGoogleSignInBtn" onclick="if(window.signInWithGoogle){window.signInWithGoogle();}else{window.location.href='index.html';}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; border:none; padding:1rem 1.5rem; border-radius:12px; font-weight:800; font-size:1rem; cursor:pointer; box-shadow:0 8px 25px rgba(99,102,241,0.5); display:inline-flex; align-items:center; gap:10px; width:100%; justify-content:center; transition:all 0.3s ease;">
                    <i class="ri-google-fill" style="font-size:1.3rem;"></i> Sign In / Sign Up with Google
                  </button>

                  <!-- SPONSORED NATIVE AD ON QUOTA LOCK SCREEN -->
                  <div class="native-ads" data-ad-variant="feed" data-ad-count="1" style="margin-top:1.2rem; text-align:left; width:100%;"></div>

                  <!-- LEGAL NOTES DEEP LINKS -->
                  <div style="margin-top:1.2rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.08); text-align:center;">
                    <div style="font-size:0.78rem; color:#64748b; font-weight:600; margin-bottom:0.6rem;">DPGNotes Legal Center Policies:</div>
                    <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px 12px; font-size:0.8rem;">
                      <a href="legal/index.html#privacy" target="_blank" style="color:#a78bfa; text-decoration:none;">Privacy Policy</a>
                      <span style="color:#334155;">•</span>
                      <a href="legal/index.html#terms" target="_blank" style="color:#a78bfa; text-decoration:none;">Terms of Use</a>
                      <span style="color:#334155;">•</span>
                      <a href="legal/index.html#drasa" target="_blank" style="color:#a78bfa; text-decoration:none;">DRASA Regulations</a>
                      <span style="color:#334155;">•</span>
                      <a href="legal/index.html#copyright" target="_blank" style="color:#a78bfa; text-decoration:none;">Copyright Policy</a>
                      <span style="color:#334155;">•</span>
                      <a href="legal/index.html#disclaimer" target="_blank" style="color:#a78bfa; text-decoration:none;">Disclaimer</a>
                      <span style="color:#334155;">•</span>
                      <a href="legal/index.html#faq" target="_blank" style="color:#a78bfa; text-decoration:none;">Legal FAQ</a>
                    </div>
                  </div>
                </div>
              `;

              document.body.appendChild(lockedContainer);

              if (typeof window.renderNativeDPGAds === "function") {
                setTimeout(window.renderNativeDPGAds, 300);
              }
            }
          }
        }

        buildQuotaScreen();
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', buildQuotaScreen);
        }
        window.addEventListener('load', buildQuotaScreen);

        // Start live countdown timer to midnight
        function updateTimer() {
          const now = new Date();
          const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
          const diffMs = midnight - now;

          if (diffMs <= 0) {
            localStorage.removeItem("dpg_quota_visits");
            localStorage.removeItem("dpg_quota_pdfs");
            window.location.href = "index.html";
            return;
          }

          const hours = Math.floor(diffMs / 3600000);
          const mins = Math.floor((diffMs % 3600000) / 60000);
          const secs = Math.floor((diffMs % 60000) / 1000);

          const hStr = String(hours).padStart(2, '0');
          const mStr = String(mins).padStart(2, '0');
          const sStr = String(secs).padStart(2, '0');

          const timerEl = document.getElementById('quotaCountdownTimer');
          if (timerEl) {
            timerEl.textContent = `${hStr}:${mStr}:${sStr}`;
          }
        }

        updateTimer();
        setInterval(updateTimer, 1000);
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
        body: JSON.stringify({ guestId, action })
      }).then(res => res.json()).then(data => {
        if (data && data.allowed === false) {
          triggerQuotaReachedPhase();
        }
      }).catch(err => console.warn('Server guest quota tracking error:', err));
    })();

    // Automatically trigger Device Logging for page load (logs once per user per IP per day)
    (function logDeviceTelemetry() {
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
  });
})();

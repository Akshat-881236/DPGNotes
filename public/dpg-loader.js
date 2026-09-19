/**
 * DPGNotes Universal Intelligent Pre-loader & Server Pingup System
 * 
 * Standalone, zero-dependency script executed prior to any page styles or scripts.
 * 
 * Features:
 * - Central DPGNotes logo with animated rotating circular green progress ring (#10b981)
 * - Render Cloud Server Pingup status telemetry (/api/ping)
 * - Session frequency throttle: Displays only once every > 5 minutes after closing tab/browser
 * - Optimized adaptive timing: fast (< 3s) on normal connections, max 12s cutoff on poor networks
 * - Graceful lazy-loading handoff
 */
(function() {
  const SESSION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const MIN_DISPLAY_TIME_MS = 1200;           // 1.2 seconds for smooth visual experience
  const MAX_CUTOFF_TIME_MS = 12000;           // 12.0 seconds strict maximum cutoff
  const STORAGE_KEY = 'dpg_loader_last_active';

  // 1. Check if user visited within the last 5 minutes
  try {
    const lastActive = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (lastActive) {
      const elapsed = now - parseInt(lastActive, 10);
      if (!isNaN(elapsed) && elapsed < SESSION_INTERVAL_MS) {
        // Active session within 5 minutes: Update heartbeat and skip loader
        localStorage.setItem(STORAGE_KEY, now.toString());
        return;
      }
    }
    // Record current active time
    localStorage.setItem(STORAGE_KEY, now.toString());
  } catch (e) {
    // If localStorage is blocked, proceed with loader
  }

  // Continuously update heartbeat so active browsing doesn't re-trigger loader
  window.addEventListener('beforeunload', function() {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch(e) {}
  });

  const startTime = Date.now();
  let isDismissed = false;
  let serverStatus = 'checking'; // 'checking' | 'online' | 'standby'
  let progressPercent = 10;

  // 2. Inject CSS Styles
  const styleEl = document.createElement('style');
  styleEl.id = 'dpg-loader-styles';
  styleEl.textContent = `
    #dpgLoaderOverlay {
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      background: #060913;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif;
      color: #f8fafc;
      overflow: hidden;
      opacity: 1;
      transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #dpgLoaderOverlay.fade-out {
      opacity: 0;
      transform: scale(1.03);
      pointer-events: none;
    }
    .dpg-loader-center-stage {
      position: relative;
      width: 140px;
      height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;
    }
    .dpg-loader-svg-ring {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    .dpg-loader-track {
      fill: none;
      stroke: rgba(255, 255, 255, 0.08);
      stroke-width: 6;
    }
    .dpg-loader-fill-ring {
      fill: none;
      stroke: #10b981;
      stroke-width: 6;
      stroke-linecap: round;
      stroke-dasharray: 377;
      stroke-dashoffset: 377;
      transition: stroke-dashoffset 0.25s ease;
      filter: drop-shadow(0 0 10px rgba(16, 185, 129, 0.65));
    }
    .dpg-loader-rotating-halo {
      position: absolute;
      inset: -6px;
      border-radius: 50%;
      border: 2px dashed rgba(16, 185, 129, 0.35);
      animation: dpgSpinHalo 8s linear infinite;
    }
    @keyframes dpgSpinHalo {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .dpg-loader-brand-logo {
      width: 76px;
      height: 76px;
      border-radius: 50%;
      object-fit: cover;
      background: #0f172a;
      border: 2px solid rgba(16, 185, 129, 0.4);
      box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);
      z-index: 2;
      animation: dpgPulseLogo 2s ease-in-out infinite;
    }
    @keyframes dpgPulseLogo {
      0%, 100% { transform: scale(1); filter: brightness(1); }
      50% { transform: scale(1.05); filter: brightness(1.15); }
    }
    .dpg-loader-title {
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0 0 6px 0;
      background: linear-gradient(135deg, #ffffff, #cbd5e1);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .dpg-loader-status {
      font-size: 0.84rem;
      color: #94a3b8;
      margin: 0 0 16px 0;
      min-height: 20px;
      text-align: center;
      transition: color 0.3s;
    }
    .dpg-loader-percent-badge {
      font-size: 0.78rem;
      font-weight: 700;
      color: #10b981;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 2px 10px;
      border-radius: 999px;
      margin-bottom: 12px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .dpg-loader-ping-status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 0.76rem;
      padding: 4px 14px;
      border-radius: 20px;
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e1;
    }
    .dpg-loader-ping-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
      box-shadow: 0 0 8px #f59e0b;
      animation: dpgDotPulse 1.5s infinite;
    }
    .dpg-loader-ping-dot.online {
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
    }
    @keyframes dpgDotPulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
  `;

  // 3. Create DOM Structure
  const overlay = document.createElement('div');
  overlay.id = 'dpgLoaderOverlay';
  overlay.innerHTML = `
    <div class="dpg-loader-center-stage">
      <div class="dpg-loader-rotating-halo"></div>
      <svg class="dpg-loader-svg-ring" viewBox="0 0 140 140">
        <circle class="dpg-loader-track" cx="70" cy="70" r="60"></circle>
        <circle id="dpgLoaderFillRing" class="dpg-loader-fill-ring" cx="70" cy="70" r="60"></circle>
      </svg>
      <img src="/ANH.png" alt="DPGNotes Logo" class="dpg-loader-brand-logo" onerror="this.src='ANH.png'">
    </div>
    <div class="dpg-loader-percent-badge" id="dpgLoaderPercentText">15% Loaded</div>
    <h2 class="dpg-loader-title">DPGNotes</h2>
    <p class="dpg-loader-status" id="dpgLoaderStatusText">Preparing academic knowledge hub...</p>
    <div class="dpg-loader-ping-status">
      <span class="dpg-loader-ping-dot" id="dpgLoaderPingDot"></span>
      <span id="dpgLoaderPingLabel">Render Server: Checking API connectivity...</span>
    </div>
  `;

  // Fast Mount Strategy: append as early as possible
  function mount() {
    const target = document.body || document.documentElement;
    if (target && !document.getElementById('dpgLoaderOverlay')) {
      document.head.appendChild(styleEl);
      target.appendChild(overlay);
    }
  }

  if (document.readyState === 'loading') {
    mount();
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }

  // 4. Update Ring Progress Helper
  // Circumference for r=60 is 2 * PI * 60 = ~376.99
  const CIRCUMFERENCE = 377;
  function updateProgress(percent, statusMsg) {
    if (isDismissed) return;
    progressPercent = Math.min(100, Math.max(progressPercent, percent));

    const fillRing = document.getElementById('dpgLoaderFillRing');
    const percentText = document.getElementById('dpgLoaderPercentText');
    const statusText = document.getElementById('dpgLoaderStatusText');

    if (fillRing) {
      const offset = CIRCUMFERENCE - (CIRCUMFERENCE * (progressPercent / 100));
      fillRing.style.strokeDashoffset = offset;
    }
    if (percentText) {
      percentText.textContent = `${Math.round(progressPercent)}% Loaded`;
    }
    if (statusMsg && statusText) {
      statusText.textContent = statusMsg;
    }
  }

  // 5. Check Render Cloud Server Ping (/api/ping)
  async function pingServer() {
    const pingDot = document.getElementById('dpgLoaderPingDot');
    const pingLabel = document.getElementById('dpgLoaderPingLabel');

    try {
      const apiBase = (window.API_BASE_URL || '').replace(/\/+$/, '');
      const pingUrl = apiBase ? `${apiBase}/api/ping` : '/api/ping';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(pingUrl, { signal: controller.signal, cache: 'no-store' });
      clearTimeout(timeoutId);

      if (res.ok) {
        serverStatus = 'online';
        if (pingDot) {
          pingDot.classList.add('online');
        }
        if (pingLabel) {
          pingLabel.textContent = 'Render Server: Operational (API Active)';
        }
      } else {
        throw new Error('Non-200');
      }
    } catch (e) {
      serverStatus = 'standby';
      if (pingLabel) {
        pingLabel.textContent = 'Render Server: Ready (Local/Static Cached)';
      }
    }
  }

  pingServer();

  // Progress stepped milestones
  setTimeout(() => updateProgress(35, "Verifying client security and modules..."), 300);
  setTimeout(() => updateProgress(65, "Syncing curriculum assets and databases..."), 700);

  // 6. Dismissal Engine
  function dismissLoader() {
    if (isDismissed) return;
    isDismissed = true;

    updateProgress(100, "Ready!");
    const ov = document.getElementById('dpgLoaderOverlay');
    if (ov) {
      ov.classList.add('fade-out');
      setTimeout(() => {
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        const st = document.getElementById('dpg-loader-styles');
        if (st && st.parentNode) st.parentNode.removeChild(st);
      }, 550);
    }
  }

  // Window load event handler
  window.addEventListener('load', function() {
    updateProgress(85, "Finalizing page render...");
    const elapsed = Date.now() - startTime;
    const remainingDelay = Math.max(0, MIN_DISPLAY_TIME_MS - elapsed);

    setTimeout(() => {
      dismissLoader();
    }, remainingDelay);
  });

  // Strict Max Timeout: 12 seconds in poor network environments
  setTimeout(function() {
    if (!isDismissed) {
      updateProgress(100, "Assets loaded via background stream.");
      dismissLoader();
    }
  }, MAX_CUTOFF_TIME_MS);

})();

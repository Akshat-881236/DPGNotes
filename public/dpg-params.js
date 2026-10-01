/**
 * DPGNotes Universal URL Parameter, Attribution, Telemetry & Media Responsiveness Engine
 * =========================================================================================
 * Features:
 *  1. Smart Share Link resolution & instant redirection (?share=TOKEN)
 *  2. Standard UTM & Referrer parameter extraction and multi-tier persistence
 *  3. Inbound Traffic Source Classification:
 *     - AI Tools: ChatGPT, Gemini, Claude, Copilot, Perplexity, Poe, DeepSeek, Mistral
 *     - Search Engines: Google, Edge/Bing, Internet Explorer/MSN, Yahoo, DuckDuckGo, Baidu, Yandex, Ecosia
 *     - Social Networks: X/Twitter, LinkedIn, Facebook, Instagram, Reddit, YouTube, WhatsApp, Telegram
 *     - Campaign / UTM / Direct Referrals
 *  4. Incognito / Private Browsing heuristic detection
 *  5. Guest Mode vs Authenticated Contributor detection
 *  6. Location & IP Telemetry: IP Address, Country, City, GMT Offset, Timezone
 *  7. Device & Viewport Metrics: Desktop, Tablet, Mobile breakdown
 *  8. Custom Media Responsiveness Rating Star Modal:
 *     - STRICTLY Tablet & Mobile only (never on desktop)
 *     - 1-5 Star interactive rating
 *     - For ratings <= 3 stars, provides optional feedback input with Active Page URL
 *     - Persists feedback and telemetry into Firestore
 *  9. Sign-In trigger with destination redirection (?isSignIn=true)
 * 10. Search Crawler Transparency (crawlers never blocked)
 * =========================================================================================
 */
(function() {
  'use strict';

  // 1. Crawler / Bot Detection
  const isCrawler = /bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool|lighthouse/i.test(navigator.userAgent);

  // Parse search parameters
  const searchStr = window.location.search;
  const params = new URLSearchParams(searchStr);

  // ==========================================================================
  // 2. UTM & REFERRER ATTRIBUTION CAPTURE
  // ==========================================================================
  const source = params.get('utm_source') || params.get('utm-source') || params.get('source') || '';
  const medium = params.get('utm_medium') || params.get('utm-medium') || params.get('medium') || '';
  const campaign = params.get('utm_campaign') || params.get('utm-campaign') || params.get('campaign') || '';
  const term = params.get('utm_term') || params.get('utm-term') || params.get('term') || '';
  const content = params.get('utm_content') || params.get('utm-content') || params.get('content') || '';
  const gclid = params.get('gclid') || '';
  const fbclid = params.get('fbclid') || '';

  // External Referrer detection
  let referrer = params.get('utm_referrer') || params.get('utm-referrer') || params.get('ref') || params.get('referrer') || '';
  if (!referrer && document.referrer) {
    try {
      const refUrl = new URL(document.referrer);
      if (refUrl.hostname !== window.location.hostname && !refUrl.hostname.includes('dpgnotes')) {
        referrer = document.referrer;
      }
    } catch(e) {
      if (!document.referrer.includes(window.location.hostname)) {
        referrer = document.referrer;
      }
    }
  }

  const hasAttribution = Boolean(source || medium || campaign || term || content || referrer || gclid || fbclid);

  let activeAttribution = null;
  if (hasAttribution) {
    activeAttribution = {
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      utm_term: term,
      utm_content: content,
      utm_referrer: referrer,
      gclid: gclid,
      fbclid: fbclid,
      landing_page: window.location.pathname + window.location.search,
      captured_at: new Date().toISOString()
    };

    try {
      // Session storage (current browsing session)
      sessionStorage.setItem('dpg_attribution', JSON.stringify(activeAttribution));

      // First-Touch attribution (only set once per browser lifetime)
      if (!localStorage.getItem('dpg_attribution_first')) {
        localStorage.setItem('dpg_attribution_first', JSON.stringify(activeAttribution));
      }

      // Last-Touch attribution (updated on each landing with new params)
      localStorage.setItem('dpg_attribution_last', JSON.stringify(activeAttribution));

      // Flat compatibility keys
      if (source) {
        sessionStorage.setItem('utm_source', source);
        sessionStorage.setItem('utm-source', source);
        localStorage.setItem('utm_source', source);
        localStorage.setItem('utm-source', source);
        document.cookie = `dpg_utm_source=${encodeURIComponent(source)};path=/;max-age=2592000;SameSite=Lax`;
      }
      if (referrer) {
        sessionStorage.setItem('utm_referrer', referrer);
        sessionStorage.setItem('utm-referrer', referrer);
        localStorage.setItem('utm_referrer', referrer);
        localStorage.setItem('utm-referrer', referrer);
        document.cookie = `dpg_utm_referrer=${encodeURIComponent(referrer)};path=/;max-age=2592000;SameSite=Lax`;
      }
      if (medium) {
        sessionStorage.setItem('utm_medium', medium);
        sessionStorage.setItem('utm-medium', medium);
      }
      if (campaign) {
        sessionStorage.setItem('utm_campaign', campaign);
        sessionStorage.setItem('utm-campaign', campaign);
      }
    } catch(e) {
      console.warn('[dpg-params] Failed to persist attribution storage:', e);
    }
  }

  setupAttributionHelper(activeAttribution);

  function setupAttributionHelper(currentAttr) {
    window.dpgAttribution = {
      current: currentAttr,
      get: function() {
        if (this.current) return this.current;
        try {
          return JSON.parse(sessionStorage.getItem('dpg_attribution') || localStorage.getItem('dpg_attribution_last') || '{}');
        } catch(e) {
          return {};
        }
      },
      getFirstTouch: function() {
        try {
          return JSON.parse(localStorage.getItem('dpg_attribution_first') || '{}');
        } catch(e) {
          return {};
        }
      },
      getLastTouch: function() {
        try {
          return JSON.parse(localStorage.getItem('dpg_attribution_last') || '{}');
        } catch(e) {
          return {};
        }
      },
      buildQueryString: function() {
        const data = this.get();
        const sp = new URLSearchParams();
        if (data.utm_source) sp.set('utm_source', data.utm_source);
        if (data.utm_medium) sp.set('utm_medium', data.utm_medium);
        if (data.utm_campaign) sp.set('utm_campaign', data.utm_campaign);
        if (data.utm_referrer) sp.set('utm_referrer', data.utm_referrer);
        const qs = sp.toString();
        return qs ? '?' + qs : '';
      }
    };
  }

  // ==========================================================================
  // 3. INBOUND TRAFFIC CLASSIFICATION ALGORITHM (AI, Search, Social, Direct)
  // ==========================================================================
  function classifyInboundTraffic(refUrlStr, searchParams) {
    const utmSource = (searchParams.get('utm_source') || searchParams.get('utm-source') || searchParams.get('source') || '').toLowerCase();
    const utmMedium = (searchParams.get('utm_medium') || searchParams.get('utm-medium') || searchParams.get('medium') || '').toLowerCase();

    let refHost = '';
    if (refUrlStr) {
      try {
        const parsed = new URL(refUrlStr);
        refHost = parsed.hostname.toLowerCase();
      } catch (e) {
        refHost = refUrlStr.toLowerCase();
      }
    }

    // A. AI Tools Detection (ChatGPT, Gemini, Claude, Copilot, Perplexity, Poe, etc.)
    if (
      utmSource.includes('chatgpt') ||
      utmSource.includes('openai') ||
      refHost.includes('chatgpt.com') ||
      refHost.includes('chat.openai.com') ||
      refHost.includes('oaistatic.com')
    ) {
      return { category: 'AI Tool', name: 'ChatGPT', channel: 'AI Referral' };
    }
    if (
      utmSource.includes('gemini') ||
      utmSource.includes('bard') ||
      refHost.includes('gemini.google.com') ||
      refHost.includes('bard.google.com')
    ) {
      return { category: 'AI Tool', name: 'Google Gemini', channel: 'AI Referral' };
    }
    if (
      utmSource.includes('claude') ||
      utmSource.includes('anthropic') ||
      refHost.includes('claude.ai') ||
      refHost.includes('anthropic.com')
    ) {
      return { category: 'AI Tool', name: 'Claude', channel: 'AI Referral' };
    }
    if (
      utmSource.includes('perplexity') ||
      refHost.includes('perplexity.ai')
    ) {
      return { category: 'AI Tool', name: 'Perplexity AI', channel: 'AI Referral' };
    }
    if (
      utmSource.includes('copilot') ||
      refHost.includes('copilot.microsoft.com') ||
      refHost.includes('edgeservices.bing.com')
    ) {
      return { category: 'AI Tool', name: 'Microsoft Copilot', channel: 'AI Referral' };
    }
    if (
      utmSource.includes('poe') ||
      refHost.includes('poe.com')
    ) {
      return { category: 'AI Tool', name: 'Poe AI', channel: 'AI Referral' };
    }
    if (
      utmSource.includes('deepseek') ||
      refHost.includes('deepseek.com')
    ) {
      return { category: 'AI Tool', name: 'DeepSeek', channel: 'AI Referral' };
    }
    if (
      utmSource.includes('mistral') ||
      refHost.includes('mistral.ai')
    ) {
      return { category: 'AI Tool', name: 'Mistral AI', channel: 'AI Referral' };
    }

    // B. Search Engines (Google, Internet Explorer / Edge, Bing, Yahoo, DuckDuckGo, etc.)
    if (
      (refHost.includes('google.') && !refHost.includes('gemini.google.com') && !refHost.includes('bard.google.com')) ||
      utmSource === 'google'
    ) {
      return { category: 'Search Engine', name: 'Google Search', channel: 'Organic Search' };
    }
    if (
      refHost.includes('bing.com') ||
      utmSource === 'bing'
    ) {
      return { category: 'Search Engine', name: 'Bing Search', channel: 'Organic Search' };
    }
    if (
      refHost.includes('yahoo.com') ||
      utmSource === 'yahoo'
    ) {
      return { category: 'Search Engine', name: 'Yahoo', channel: 'Organic Search' };
    }
    if (
      refHost.includes('duckduckgo.com') ||
      utmSource === 'duckduckgo'
    ) {
      return { category: 'Search Engine', name: 'DuckDuckGo', channel: 'Organic Search' };
    }
    if (
      refHost.includes('baidu.com') ||
      utmSource === 'baidu'
    ) {
      return { category: 'Search Engine', name: 'Baidu', channel: 'Organic Search' };
    }
    if (
      refHost.includes('yandex.') ||
      utmSource === 'yandex'
    ) {
      return { category: 'Search Engine', name: 'Yandex', channel: 'Organic Search' };
    }
    if (
      refHost.includes('ecosia.org') ||
      utmSource === 'ecosia'
    ) {
      return { category: 'Search Engine', name: 'Ecosia', channel: 'Organic Search' };
    }
    if (
      refHost.includes('msn.com') ||
      /trident|msie/i.test(navigator.userAgent)
    ) {
      return { category: 'Search Engine', name: 'Internet Explorer / MSN', channel: 'Organic Search' };
    }

    // C. Social Platforms
    if (refHost.includes('t.co') || refHost.includes('twitter.com') || refHost.includes('x.com') || utmSource === 'twitter' || utmSource === 'x') {
      return { category: 'Social', name: 'X / Twitter', channel: 'Social Referral' };
    }
    if (refHost.includes('linkedin.com') || refHost.includes('lnkd.in') || utmSource === 'linkedin') {
      return { category: 'Social', name: 'LinkedIn', channel: 'Social Referral' };
    }
    if (refHost.includes('facebook.com') || refHost.includes('fb.me') || utmSource === 'facebook') {
      return { category: 'Social', name: 'Facebook', channel: 'Social Referral' };
    }
    if (refHost.includes('instagram.com') || utmSource === 'instagram') {
      return { category: 'Social', name: 'Instagram', channel: 'Social Referral' };
    }
    if (refHost.includes('reddit.com') || utmSource === 'reddit') {
      return { category: 'Social', name: 'Reddit', channel: 'Social Referral' };
    }
    if (refHost.includes('youtube.com') || refHost.includes('youtu.be') || utmSource === 'youtube') {
      return { category: 'Social', name: 'YouTube', channel: 'Social Referral' };
    }
    if (refHost.includes('whatsapp.com') || utmSource === 'whatsapp') {
      return { category: 'Social', name: 'WhatsApp', channel: 'Social Referral' };
    }
    if (refHost.includes('t.me') || refHost.includes('telegram.org') || utmSource === 'telegram') {
      return { category: 'Social', name: 'Telegram', channel: 'Social Referral' };
    }

    // D. Campaign / UTM Traffic
    if (utmSource) {
      return { category: 'Campaign', name: utmSource.toUpperCase(), channel: utmMedium || 'Campaign' };
    }

    // E. External Reference
    if (refHost && !refHost.includes(window.location.hostname)) {
      return { category: 'Other Referral', name: refHost.replace('www.', ''), channel: 'External Referral' };
    }

    // F. Direct / Bookmark
    return { category: 'Direct', name: 'Direct Traffic', channel: 'Direct / Bookmark' };
  }

  // ==========================================================================
  // 4. INCOGNITO / PRIVATE BROWSING DETECTION HEURISTIC
  // ==========================================================================
  async function detectIncognito() {
    try {
      // Chromium (Chrome, Edge, Opera, Brave, Vivaldi)
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        // Quota is heavily capped in incognito (typically < 120MB, whereas normal is multi-GB)
        if (quota && quota < 125 * 1024 * 1024) {
          return true;
        }
      }
      // Safari / WebKit
      if (/Safari/i.test(navigator.userAgent) && !/Chrome|Chromium|Edg/i.test(navigator.userAgent)) {
        try {
          if (window.openDatabase === undefined) {
            // standard in modern Safari
          } else {
            window.openDatabase(null, null, null, null);
          }
        } catch (_) {
          return true;
        }
      }
      // Firefox
      if ('MozAppearance' in document.documentElement.style) {
        if (navigator.serviceWorker === undefined) {
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  // ==========================================================================
  // 5. DEVICE & VIEWPORT CLASSIFICATION
  // ==========================================================================
  function detectDeviceType() {
    const ua = navigator.userAgent;
    const width = window.innerWidth;
    const isTouch = navigator.maxTouchPoints > 0;

    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) || (width >= 768 && width <= 1024 && isTouch)) {
      return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua) || width < 768) {
      return 'Mobile';
    }
    return 'Desktop';
  }

  function getGmtOffsetString() {
    const offsetMinutes = -new Date().getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const hours = String(Math.floor(absMinutes / 60)).padStart(2, '0');
    const mins = String(absMinutes % 60).padStart(2, '0');
    return `GMT${sign}${hours}:${mins}`;
  }

  // ==========================================================================
  // 6. LOCATION & IP TELEMETRY
  // ==========================================================================
  async function resolveGeoLocation() {
    try {
      const cached = sessionStorage.getItem('dpg_visitor_geo');
      if (cached) return JSON.parse(cached);
    } catch(e) {}

    let geo = {
      ip: 'Unknown',
      country: 'Unknown',
      city: 'N/A'
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch('https://freeipapi.com/api/json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        geo.ip = data.ipAddress || 'Unknown';
        geo.country = data.countryName || 'Unknown';
        geo.city = data.cityName || 'N/A';
        try {
          sessionStorage.setItem('dpg_visitor_geo', JSON.stringify(geo));
        } catch(e) {}
        return geo;
      }
    } catch(err) {
      // Fallback IP lookup
      try {
        const resIp = await fetch('https://api.ipify.org?format=json');
        if (resIp.ok) {
          const ipData = await resIp.json();
          geo.ip = ipData.ip || 'Unknown';
        }
      } catch(_) {}
    }

    try {
      sessionStorage.setItem('dpg_visitor_geo', JSON.stringify(geo));
    } catch(e) {}
    return geo;
  }

  // ==========================================================================
  // 7. FIREBASE TELEMETRY PERSISTENCE (visitor_metrics)
  // ==========================================================================
  async function logTelemetryVisit() {
    if (isCrawler) return;

    // Deduplicate within the same browsing session per active page
    const pageKey = 'dpg_metric_logged_' + window.location.pathname;
    try {
      if (sessionStorage.getItem(pageKey)) return;
      sessionStorage.setItem(pageKey, 'true');
    } catch(e) {}

    try {
      const [isIncognito, geo] = await Promise.all([
        detectIncognito(),
        resolveGeoLocation()
      ]);

      const detectedTraffic = classifyInboundTraffic(referrer, params);
      const deviceType = detectDeviceType();
      const timezone = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
      const gmtOffset = getGmtOffsetString();

      let userUid = '';
      try {
        userUid = localStorage.getItem('dpgActiveUserUid') || (window.dpgAuth && window.dpgAuth.currentUser ? window.dpgAuth.currentUser.uid : '');
      } catch(e) {}
      const userMode = userUid ? 'Contributor' : 'Guest';

      // Dynamically load Firebase Firestore
      const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
      const { getFirestore, collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');

      const firebaseConfig = {
        apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
        authDomain: "dpgnotes.firebaseapp.com",
        projectId: "dpgnotes",
        storageBucket: "dpgnotes.firebasestorage.app",
        messagingSenderId: "910494426039",
        appId: "1:910494426039:web:adeae5315caaf846c43e32"
      };

      const app = getApps().find(a => a.name === "dpgnotes") || (!getApps().length ? initializeApp(firebaseConfig, "dpgnotes") : getApps()[0]);
      const db = getFirestore(app);

      const metricPayload = {
        activePageUrl: window.location.href,
        pathname: window.location.pathname,
        referrer: referrer || document.referrer || '',
        sourceCategory: detectedTraffic.category,
        sourceName: detectedTraffic.name,
        channel: detectedTraffic.channel,
        utm_source: source,
        utm_medium: medium,
        utm_campaign: campaign,
        utm_term: term,
        utm_content: content,
        deviceType: deviceType,
        isIncognito: Boolean(isIncognito),
        userMode: userMode,
        userId: userUid || 'Guest',
        ip: geo.ip || 'Unknown',
        country: geo.country || 'Unknown',
        city: geo.city || 'N/A',
        gmtOffset: gmtOffset,
        timezone: timezone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        userAgent: navigator.userAgent,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, "visitor_metrics"), metricPayload);
    } catch(telemetryErr) {
      console.warn('[dpg-params] Telemetry log notice:', telemetryErr.message || telemetryErr);
    }
  }

  // Trigger telemetry logging after page interactive
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(logTelemetryVisit, 1200));
  } else {
    setTimeout(logTelemetryVisit, 1200);
  }

  // ==========================================================================
  // 8. CUSTOM MEDIA RESPONSIVENESS RATING MODAL (TABLET & MOBILE ONLY)
  // ==========================================================================
  function initResponsivenessRatingModal() {
    if (isCrawler) return;

    const deviceType = detectDeviceType();
    const isTabletOrMobile = deviceType === 'Mobile' || deviceType === 'Tablet' || window.innerWidth <= 1024;

    // STRICTLY for Tablet and Mobile devices only
    if (!isTabletOrMobile) return;

    // Check if already rated or recently dismissed
    try {
      if (localStorage.getItem('dpg_responsiveness_rated')) return;
      if (sessionStorage.getItem('dpg_responsiveness_dismissed')) return;
    } catch(e) {}

    // Show modal smoothly after 7 seconds of page interaction
    setTimeout(renderResponsivenessModal, 7000);

    function renderResponsivenessModal() {
      if (document.getElementById('dpgResponsivenessModal')) return;

      const modalContainer = document.createElement('div');
      modalContainer.id = 'dpgResponsivenessModal';
      modalContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(30px);
        width: calc(100% - 32px);
        max-width: 440px;
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-radius: 18px;
        box-shadow: 0 20px 45px rgba(0, 0, 0, 0.7), 0 0 25px rgba(99, 102, 241, 0.2);
        padding: 1.25rem 1.4rem;
        z-index: 999999;
        font-family: 'Outfit', 'Inter', system-ui, -apple-system, sans-serif;
        color: #f8fafc;
        opacity: 0;
        transition: opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
      `;

      modalContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg, #3b82f6, #6366f1); display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; box-shadow:0 4px 10px rgba(59,130,246,0.3);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
            </div>
            <div>
              <h4 style="margin:0; font-size:0.98rem; font-weight:700; color:#ffffff; letter-spacing:-0.01em;">Media Responsiveness Rating</h4>
              <p style="margin:0; font-size:0.75rem; color:#94a3b8;">${deviceType} Layout Quality Check</p>
            </div>
          </div>
          <button id="dpgCloseRespModal" style="background:transparent; border:none; color:#64748b; font-size:1.2rem; cursor:pointer; padding:2px; line-height:1; border-radius:6px;" title="Dismiss">&times;</button>
        </div>

        <p style="margin:0 0 0.85rem 0; font-size:0.85rem; color:#cbd5e1; line-height:1.45;">
          How satisfied are you with the layout and media responsiveness on your <strong>${deviceType}</strong>?
        </p>

        <!-- Star Rating Pool -->
        <div style="display:flex; justify-content:center; gap:10px; margin:0.8rem 0 0.6rem 0;" id="dpgStarContainer">
          <button class="dpg-star-btn" data-rating="1" style="background:none; border:none; font-size:1.75rem; color:#475569; cursor:pointer; transition:transform 0.15s, color 0.15s; padding:0;">★</button>
          <button class="dpg-star-btn" data-rating="2" style="background:none; border:none; font-size:1.75rem; color:#475569; cursor:pointer; transition:transform 0.15s, color 0.15s; padding:0;">★</button>
          <button class="dpg-star-btn" data-rating="3" style="background:none; border:none; font-size:1.75rem; color:#475569; cursor:pointer; transition:transform 0.15s, color 0.15s; padding:0;">★</button>
          <button class="dpg-star-btn" data-rating="4" style="background:none; border:none; font-size:1.75rem; color:#475569; cursor:pointer; transition:transform 0.15s, color 0.15s; padding:0;">★</button>
          <button class="dpg-star-btn" data-rating="5" style="background:none; border:none; font-size:1.75rem; color:#475569; cursor:pointer; transition:transform 0.15s, color 0.15s; padding:0;">★</button>
        </div>
        <div id="dpgRatingLabel" style="text-align:center; font-size:0.8rem; font-weight:600; color:#38bdf8; min-height:1.2rem; margin-bottom:0.5rem;">Select your rating</div>

        <!-- Optional Poor Rating Feedback Box (<= 3 stars) -->
        <div id="dpgPoorFeedbackSection" style="display:none; margin-top:0.75rem; animation:dpgFadeIn 0.3s ease;">
          <label style="display:block; font-size:0.78rem; color:#fca5a5; margin-bottom:0.35rem; font-weight:600;">
            Help us improve! What layout or media issues did you face? (Optional):
          </label>
          <textarea id="dpgRespFeedbackText" rows="2" placeholder="e.g. text overlaps, button cut off, card spilled off screen..." style="width:100%; box-sizing:border-box; background:rgba(0,0,0,0.35); border:1px solid rgba(239,68,68,0.4); border-radius:10px; color:#ffffff; font-family:inherit; font-size:0.82rem; padding:0.6rem; outline:none; resize:none;"></textarea>
          <p style="margin:4px 0 0 0; font-size:0.7rem; color:#64748b;">Active Page: <code style="color:#94a3b8; font-size:0.7rem;">${window.location.pathname}</code></p>
        </div>

        <div style="display:flex; gap:10px; margin-top:0.9rem;">
          <button id="dpgSubmitRespBtn" disabled style="flex:1; background:linear-gradient(135deg, #3b82f6, #6366f1); color:white; border:none; border-radius:10px; padding:0.65rem; font-weight:600; font-size:0.85rem; cursor:pointer; opacity:0.5; transition:all 0.2s;">
            Submit Rating
          </button>
          <button id="dpgDismissRespBtn" style="background:rgba(255,255,255,0.06); color:#cbd5e1; border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:0.65rem 1rem; font-size:0.82rem; cursor:pointer;">
            Later
          </button>
        </div>
        <style>
          @keyframes dpgFadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
          .dpg-star-btn:hover, .dpg-star-btn:active { transform: scale(1.2); }
        </style>
      `;

      document.body.appendChild(modalContainer);

      // Trigger enter transition
      requestAnimationFrame(() => {
        modalContainer.style.opacity = '1';
        modalContainer.style.transform = 'translateX(-50%) translateY(0)';
      });

      let currentRating = 0;
      const starBtns = modalContainer.querySelectorAll('.dpg-star-btn');
      const ratingLabel = modalContainer.querySelector('#dpgRatingLabel');
      const poorSection = modalContainer.querySelector('#dpgPoorFeedbackSection');
      const submitBtn = modalContainer.querySelector('#dpgSubmitRespBtn');
      const closeBtn = modalContainer.querySelector('#dpgCloseRespModal');
      const dismissBtn = modalContainer.querySelector('#dpgDismissRespBtn');
      const feedbackInput = modalContainer.querySelector('#dpgRespFeedbackText');

      const ratingDescriptions = {
        1: '★ Very Poor Layout',
        2: '★★ Needs Improvement',
        3: '★★★ Average Responsiveness',
        4: '★★★★ Good Experience',
        5: '★★★★★ Flawless Responsiveness'
      };

      starBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          currentRating = parseInt(btn.dataset.rating, 10);
          updateStarDisplay(currentRating);
          submitBtn.disabled = false;
          submitBtn.style.opacity = '1';
          submitBtn.style.boxShadow = '0 4px 14px rgba(99,102,241,0.4)';

          // If 3 stars or less, show feedback box
          if (currentRating <= 3) {
            poorSection.style.display = 'block';
            if (feedbackInput) feedbackInput.focus();
          } else {
            poorSection.style.display = 'none';
          }
        });
      });

      function updateStarDisplay(score) {
        starBtns.forEach(b => {
          const val = parseInt(b.dataset.rating, 10);
          if (val <= score) {
            b.style.color = '#f59e0b';
            b.style.textShadow = '0 0 10px rgba(245, 158, 11, 0.6)';
          } else {
            b.style.color = '#475569';
            b.style.textShadow = 'none';
          }
        });
        ratingLabel.textContent = ratingDescriptions[score] || 'Select your rating';
      }

      function dismissModal() {
        try {
          sessionStorage.setItem('dpg_responsiveness_dismissed', 'true');
        } catch(e) {}
        modalContainer.style.opacity = '0';
        modalContainer.style.transform = 'translateX(-50%) translateY(30px)';
        setTimeout(() => modalContainer.remove(), 400);
      }

      closeBtn.addEventListener('click', dismissModal);
      dismissBtn.addEventListener('click', dismissModal);

      // Submit Rating and Feedback to Firestore
      submitBtn.addEventListener('click', async () => {
        if (!currentRating) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span style="display:inline-block; animation:dpgSpin 0.8s linear infinite;">⏳</span> Submitting...';

        try {
          const [isIncognito, geo] = await Promise.all([
            detectIncognito(),
            resolveGeoLocation()
          ]);

          let userUid = '';
          try {
            userUid = localStorage.getItem('dpgActiveUserUid') || (window.dpgAuth && window.dpgAuth.currentUser ? window.dpgAuth.currentUser.uid : '');
          } catch(e) {}
          const userMode = userUid ? 'Contributor' : 'Guest';

          const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
          const { getFirestore, collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');

          const firebaseConfig = {
            apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
            authDomain: "dpgnotes.firebaseapp.com",
            projectId: "dpgnotes",
            storageBucket: "dpgnotes.firebasestorage.app",
            messagingSenderId: "910494426039",
            appId: "1:910494426039:web:adeae5315caaf846c43e32"
          };

          const app = getApps().find(a => a.name === "dpgnotes") || (!getApps().length ? initializeApp(firebaseConfig, "dpgnotes") : getApps()[0]);
          const db = getFirestore(app);

          const feedbackData = {
            rating: currentRating,
            feedback: (feedbackInput && feedbackInput.value) ? feedbackInput.value.trim() : '',
            activePageUrl: window.location.href,
            pathname: window.location.pathname,
            deviceType: deviceType,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            orientation: window.innerWidth > window.innerHeight ? 'Landscape' : 'Portrait',
            isIncognito: Boolean(isIncognito),
            userMode: userMode,
            userId: userUid || 'Guest',
            ip: geo.ip || 'Unknown',
            country: geo.country || 'Unknown',
            city: geo.city || 'N/A',
            gmtOffset: getGmtOffsetString(),
            timezone: (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
            userAgent: navigator.userAgent,
            timestamp: serverTimestamp()
          };

          await addDoc(collection(db, "responsiveness_feedback"), feedbackData);

          try {
            localStorage.setItem('dpg_responsiveness_rated', Date.now().toString());
          } catch(e) {}

          modalContainer.innerHTML = `
            <div style="text-align:center; padding:0.5rem 0;">
              <div style="font-size:2.2rem; color:#10b981; margin-bottom:0.4rem;">✓</div>
              <h4 style="margin:0 0 0.3rem 0; font-size:1.05rem; color:#ffffff; font-weight:700;">Thank You!</h4>
              <p style="margin:0; font-size:0.82rem; color:#94a3b8;">Your feedback helps us make DPGNotes mobile and tablet responsive for everyone.</p>
            </div>
          `;

          setTimeout(() => {
            modalContainer.style.opacity = '0';
            modalContainer.style.transform = 'translateX(-50%) translateY(30px)';
            setTimeout(() => modalContainer.remove(), 400);
          }, 2500);

        } catch(err) {
          console.error('[dpg-params] Error saving responsiveness feedback:', err);
          modalContainer.remove();
        }
      });
    }
  }

  // Initialize responsiveness rating modal
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initResponsivenessRatingModal);
  } else {
    initResponsivenessRatingModal();
  }

  // ==========================================================================
  // 9. SIGN-IN TRIGGER & REDIRECT-TO FLOW
  // ==========================================================================
  const isSignInRequested = params.get('isSignIn') === 'true' ||
                            params.get('is-sign-in') === 'true' ||
                            params.get('signIn') === 'true' ||
                            params.get('sign-in') === 'true' ||
                            params.get('login') === 'true';

  const rawRedirectTo = params.get('redirect-to') ||
                        params.get('redirect_to') ||
                        params.get('redirectTo') ||
                        params.get('returnUrl') ||
                        params.get('next');

  function sanitizeRedirectUrl(urlStr) {
    if (!urlStr) return null;
    const trimmed = urlStr.trim();
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    if (/^[a-zA-Z0-9_\-\.\/]+(\?[^#]*)?(#.*)?$/.test(trimmed) && !trimmed.includes(':')) {
      return trimmed;
    }
    try {
      const parsed = new URL(trimmed, window.location.origin);
      const host = parsed.hostname;
      if (host === window.location.hostname ||
          host === 'dpgnotes.web.app' ||
          host === 'dpgnotes.firebaseapp.com' ||
          host === 'localhost' ||
          host === '127.0.0.1') {
        return parsed.pathname + parsed.search + parsed.hash;
      }
    } catch(e) {}
    return null;
  }

  const sanitizedRedirect = sanitizeRedirectUrl(rawRedirectTo);
  if (sanitizedRedirect) {
    try {
      sessionStorage.setItem('dpg_auth_redirect', sanitizedRedirect);
      localStorage.setItem('dpg_auth_redirect', sanitizedRedirect);
    } catch(e) {}
  }

  if (isSignInRequested && !isCrawler) {
    const isAlreadyAuthenticated = Boolean(
      localStorage.getItem('dpgActiveUserUid') ||
      (window.dpgAuth && window.dpgAuth.currentUser)
    );

    if (isAlreadyAuthenticated) {
      if (sanitizedRedirect) {
        window.location.href = sanitizedRedirect;
        return;
      } else {
        cleanUrlParam(['isSignIn', 'is-sign-in', 'signIn', 'sign-in', 'login', 'redirect-to', 'redirect_to', 'redirectTo', 'returnUrl', 'next']);
      }
    } else {
      const triggerAuthModal = function() {
        if (typeof window.openSignInModal === 'function') {
          window.openSignInModal();
        } else {
          window.addEventListener('dpg-auth-component-ready', function() {
            if (typeof window.openSignInModal === 'function') window.openSignInModal();
          }, { once: true });

          let attempts = 0;
          const retryTimer = setInterval(function() {
            attempts++;
            if (typeof window.openSignInModal === 'function') {
              clearInterval(retryTimer);
              window.openSignInModal();
            } else if (attempts > 30) {
              clearInterval(retryTimer);
            }
          }, 100);
        }
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', triggerAuthModal);
      } else {
        triggerAuthModal();
      }
    }
  }

  window.addEventListener('dpg-auth-success', function() {
    try {
      const destination = sessionStorage.getItem('dpg_auth_redirect') || localStorage.getItem('dpg_auth_redirect');
      if (destination) {
        sessionStorage.removeItem('dpg_auth_redirect');
        localStorage.removeItem('dpg_auth_redirect');
        window.location.href = destination;
      }
    } catch(e) {}
  });

  // ==========================================================================
  // 10. SMART SHARE LINK RESOLUTION & REDIRECTION (?share=TOKEN or ?token=TOKEN)
  // ==========================================================================
  const rawShareParam = params.get('share') || (!window.location.pathname.includes('dpgnotes-video.html') ? params.get('token') : null);
  const shareToken = rawShareParam ? rawShareParam.trim() : null;

  if (shareToken) {
    // Fast path: If the token is unambiguously a video share token (VSH_ or VSH_AD_)
    if (shareToken.startsWith('VSH_') || shareToken.startsWith('VSH_AD_')) {
      if (!window.location.pathname.includes('dpgnotes-video.html')) {
        window.location.replace(`https://dpgnotes.web.app/dpgnotes-video.html?token=${encodeURIComponent(shareToken)}`);
        return;
      }
    }

    const isAlreadyViewingPdf = window.location.pathname.includes('dpgnotes-pdf-viewer.html') && params.get('pdf');
    const isAlreadyViewingVideo = window.location.pathname.includes('dpgnotes-video.html');

    if (!isAlreadyViewingPdf && !isAlreadyViewingVideo && !isCrawler) {
      let overlay = document.getElementById('dpgShareRedirectOverlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'dpgShareRedirectOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#030712;z-index:9999999;display:flex;align-items:center;justify-content:center;flex-direction:column;font-family:\'Inter\',system-ui,-apple-system,sans-serif;color:#f8fafc;transition:opacity 0.25s ease;';
        overlay.innerHTML = `
          <div style="text-align:center;padding:2rem;max-width:440px;">
            <div style="width:48px;height:48px;border:3px solid rgba(99,102,241,0.25);border-top-color:#6366f1;border-radius:50%;animation:dpgSpin 0.8s linear infinite;margin:0 auto 1.5rem;"></div>
            <h2 style="font-size:1.35rem;font-weight:700;margin:0 0 0.5rem 0;color:#ffffff;letter-spacing:-0.02em;">Opening Shared Resource...</h2>
            <p style="color:#94a3b8;font-size:0.9rem;margin:0;line-height:1.5;">Resolving Smart Link via DPGNotes...</p>
          </div>
          <style>@keyframes dpgSpin{to{transform:rotate(360deg)}}</style>
        `;
        if (document.body) {
          document.body.appendChild(overlay);
        } else {
          document.addEventListener('DOMContentLoaded', () => document.body.appendChild(overlay));
        }
      }

      (async function resolveShareLink() {
        const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL)
          ? window.API_BASE_URL.replace(/\/+$/, '')
          : 'https://dpgnotes.onrender.com';

        let visitorUid = 'Guest';
        try {
          visitorUid = localStorage.getItem('dpgActiveUserUid') || localStorage.getItem('dpg_guest_id') || 'Guest';
        } catch(e) {}

        try {
          const endpoint = `${apiBase}/api/share/click?token=${encodeURIComponent(shareToken)}&openedBy=${encodeURIComponent(visitorUid)}`;
          const res = await fetch(endpoint);
          const data = await res.json();

          if (res.ok && data && data.documentData) {
            const d = data.documentData;

            // 1. Legal Document
            if (d.docId && d.docId.startsWith('legal_')) {
              window.location.replace(`/legal/index.html#${encodeURIComponent(d.docId.replace('legal_', ''))}`);
              return;
            }

            // 2. Educational Video or Sponsored Video Ad
            if (d.type === 'video' || d.type === 'ad_video' || (d.token && (d.token.startsWith('VSH_') || d.token.startsWith('VSH_AD_'))) || d.videoId) {
              const videoTargetUrl = new URL('/dpgnotes-video.html', window.location.origin);
              videoTargetUrl.searchParams.set('token', d.token || shareToken);
              if (d.type === 'ad_video') {
                videoTargetUrl.searchParams.set('adId', d.videoId || d.targetId || '');
              } else if (d.videoId) {
                videoTargetUrl.searchParams.set('id', d.videoId || d.targetId || '');
              }
              window.location.replace(videoTargetUrl.toString());
              return;
            }

            // 3. Practical Solution
            if (d.type === 'practical_solution' || d.subType === 'practical') {
              const solTargetUrl = new URL('/PracticalSolution/index.html', window.location.origin);
              solTargetUrl.searchParams.set('id', d.docId || d.solutionId || d.targetId || '');
              solTargetUrl.searchParams.set('share_token', d.token || shareToken);
              window.location.replace(solTargetUrl.toString());
              return;
            }

            // 4. Assignment Solution
            if (d.type === 'assignment_solution' || d.type === 'solution') {
              const solTargetUrl = new URL('/AssignmentSolution/index.html', window.location.origin);
              solTargetUrl.searchParams.set('id', d.docId || d.solutionId || d.targetId || '');
              solTargetUrl.searchParams.set('share_token', d.token || shareToken);
              window.location.replace(solTargetUrl.toString());
              return;
            }

            // 5. Standard PDF Document
            const viewerUrl = new URL('/dpgnotes-pdf-viewer.html', window.location.origin);
            if (d.pdfUrl) viewerUrl.searchParams.set('pdf', d.pdfUrl);
            if (d.title) viewerUrl.searchParams.set('title', d.title);
            if (d.category) viewerUrl.searchParams.set('category', d.category);
            if (d.discipline) viewerUrl.searchParams.set('discipline', d.discipline);
            if (d.uploader) viewerUrl.searchParams.set('uploader', d.uploader);
            if (d.docId) viewerUrl.searchParams.set('docid', d.docId);
            if (d.description) viewerUrl.searchParams.set('description', d.description);
            const tagsStr = Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || '');
            if (tagsStr) viewerUrl.searchParams.set('tags', tagsStr);
            viewerUrl.searchParams.set('share', shareToken);

            window.location.replace(viewerUrl.toString());
            return;
          } else {
            if (overlay) overlay.remove();
            cleanUrlParam(['share', 'token']);
            const msg = (data && data.error) ? data.error : 'Share link has expired or is invalid.';
            if (window.customAlert) {
              window.customAlert(msg, { title: 'Share Link Expired' });
            } else {
              alert(msg);
            }
          }
        } catch(netErr) {
          console.error('[dpg-params] Network error resolving share token:', netErr);
          if (overlay) overlay.remove();
          cleanUrlParam(['share', 'token']);
        }
      })();
    }
  }
    }
  }

  function cleanUrlParam(paramKeys) {
    try {
      const currentUrl = new URL(window.location.href);
      let changed = false;
      paramKeys.forEach(key => {
        if (currentUrl.searchParams.has(key)) {
          currentUrl.searchParams.delete(key);
          changed = true;
        }
      });
      if (changed) {
        window.history.replaceState({}, document.title, currentUrl.pathname + (currentUrl.search || '') + (currentUrl.hash || ''));
      }
    } catch(e) {}
  }

})();

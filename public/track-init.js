(function() {
  try {
    // 1. Identify script source & extract parameters
    const scriptEl = document.currentScript || document.querySelector('script[src*="track-init.js"]');
    if (!scriptEl) return;

    const scriptSrc = scriptEl.src || '';
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1] || '');
    const refererTo = urlParams.get('referer-to') || urlParams.get('referer_to') || '';
    const usedBy = urlParams.get('used-by') || urlParams.get('used_by') || '';

    if (!refererTo) {
      console.warn("[DPGNotes Analytics] Access Denied: Missing compulsory 'referer-to' parameter.");
      return;
    }

    const hostOrigin = location.origin || (location.protocol + '//' + location.hostname);
    const pageTitle = document.title || 'External Website';
    const userAgent = navigator.userAgent || '';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const gmtOffset = 'GMT' + (new Date().getTimezoneOffset() > 0 ? '-' : '+') + Math.abs(Math.floor(new Date().getTimezoneOffset() / 60));

    let visitorSessionId = localStorage.getItem('dpg_web_visitor_id');
    if (!visitorSessionId) {
      visitorSessionId = 'web_vis_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('dpg_web_visitor_id', visitorSessionId);
    }

    // Live Render Express API Backend
    const backendBase = (typeof window !== 'undefined' && window.DPGNOTES_BACKEND_URL) 
      ? window.DPGNOTES_BACKEND_URL 
      : 'https://dpgnotes.onrender.com';

    // 2. Phishing & Malicious Activity Heuristic Detection
    let phishingDetected = false;
    let phishingReason = "";

    const pwdFields = document.querySelectorAll('input[type="password"]');
    if (pwdFields.length > 0) {
      const forms = document.querySelectorAll('form');
      forms.forEach(f => {
        const act = f.action || '';
        if (act && !act.includes(location.hostname) && act.startsWith('http')) {
          phishingDetected = true;
          phishingReason = "External password form submission detected: " + act;
        }
      });
    }

    const reportPhishingThreat = (reason) => {
      fetch(`${backendBase}/api/website/report-phishing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId: refererTo,
          contributorUid: usedBy,
          domain: location.hostname,
          pageUrl: location.href,
          reason: reason,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {});
    };

    if (phishingDetected) {
      reportPhishingThreat(phishingReason);
    }

    // 3. Send Telemetry Ping to DPGNotes Analytics Engine
    const sendTelemetryPing = (actionType, screentimeSecs = 15, extra = {}) => {
      const payload = {
        websiteId: refererTo,
        contributorUid: usedBy,
        visitorId: visitorSessionId,
        pageUrl: location.href,
        pageTitle: pageTitle,
        hostOrigin: hostOrigin,
        action: actionType,
        screentimeSeconds: screentimeSecs,
        timezone: timezone,
        gmtOffset: gmtOffset,
        userAgent: userAgent,
        phishingAlert: phishingDetected,
        ...extra
      };

      fetch(`${backendBase}/api/website/track-telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(err => console.warn("[DPGNotes Telemetry] Ping error:", err));
    };

    // Initial View Log
    sendTelemetryPing('view', 15);

    // 15-second Periodic Screentime Tracker
    setInterval(() => {
      if (!document.hidden) {
        sendTelemetryPing('screentime', 15);
      }
    }, 15000);

    // Track Outbound Link Clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && !link.href.includes(location.hostname) && link.href.startsWith('http')) {
        sendTelemetryPing('outbound_click', 0, { outboundUrl: link.href });
      }
    });

  } catch(err) {
    console.warn("[DPGNotes Analytics Script Error]:", err);
  }
})();

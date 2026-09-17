/**
 * DPGNotes Universal URL Parameter, Share Redirect & Attribution Engine
 * ============================================================================
 * Handles:
 *  1. Smart Share Link resolution & instant redirection (?share=TOKEN)
 *  2. Standard UTM & Referrer parameter extraction and multi-tier persistence:
 *     - utm_source / utm-source
 *     - utm_medium / utm-medium
 *     - utm_campaign / utm-campaign
 *     - utm_term / utm-term
 *     - utm_content / utm-content
 *     - utm_referrer / utm-referrer / ref / referrer
 *  3. Sign-In trigger with destination redirection:
 *     - isSignIn=true & redirect-to=...
 *     - Post-login auto-routing
 *  4. Search Crawler Transparency:
 *     - Headless crawlers (Googlebot, Bingbot, Lighthouse) are never blocked by
 *       redirect overlays or modal auto-triggers.
 * ============================================================================
 */
(function() {
  'use strict';

  // 1. Crawler / Bot Detection
  const isCrawler = /bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool|lighthouse/i.test(navigator.userAgent);

  // Parse search parameters
  const searchStr = window.location.search;
  if (!searchStr && !document.referrer) {
    // Expose default attribution helper even if no params
    setupAttributionHelper({});
    return;
  }

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

      // Flat compatibility keys (both kebab-case and snake_case)
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
  // 3. SIGN-IN TRIGGER & REDIRECT-TO FLOW
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

  // Sanitize redirect target to prevent open redirect vulnerabilities
  function sanitizeRedirectUrl(urlStr) {
    if (!urlStr) return null;
    const trimmed = urlStr.trim();
    // Relative paths are safe
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
      return trimmed;
    }
    if (/^[a-zA-Z0-9_\-\.\/]+(\?[^#]*)?(#.*)?$/.test(trimmed) && !trimmed.includes(':')) {
      return trimmed;
    }
    // Absolute URLs must belong to trusted DPGNotes domains
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
        // Clean URL parameter without reload
        cleanUrlParam(['isSignIn', 'is-sign-in', 'signIn', 'sign-in', 'login', 'redirect-to', 'redirect_to', 'redirectTo', 'returnUrl', 'next']);
      }
    } else {
      // Auto-trigger sign-in modal as soon as Auth Component is ready
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

  // Global listener for successful authentication to trigger post-login redirection
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
  // 4. SMART SHARE LINK RESOLUTION & REDIRECTION (?share=TOKEN)
  // ==========================================================================
  const shareToken = params.get('share');
  if (shareToken) {
    // If the visitor is already on dpgnotes-pdf-viewer.html with a loaded PDF, let the viewer handle it natively
    const isAlreadyViewingPdf = window.location.pathname.includes('dpgnotes-pdf-viewer.html') && params.get('pdf');

    if (!isAlreadyViewingPdf && !isCrawler) {
      // Show elegant loader overlay to provide instant feedback and prevent flash of un-redirected home page
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

      // Resolve Share Token
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

            // Legal Document Redirect
            if (d.docId && d.docId.startsWith('legal_')) {
              window.location.replace(`/legal/index.html#${encodeURIComponent(d.docId.replace('legal_', ''))}`);
              return;
            }

            // Academic PDF Viewer Redirect
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
            // Share link not found or expired
            if (overlay) overlay.remove();
            cleanUrlParam(['share']);
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
          cleanUrlParam(['share']);
        }
      })();
    }
  }

  // Helper to remove specified parameters from URL without reloading
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

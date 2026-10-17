// ============================================================================
// DPGNOTES EXTERNAL REDIRECT WARNING COMPONENT
// ============================================================================
(function() {
  document.addEventListener('DOMContentLoaded', () => {
    // Dynamically inject professional styling for the redirect warning modal
    const style = document.createElement('style');
    style.innerHTML = `
      .redirect-modal-overlay {
        position: fixed;
        inset: 0;
        width: 100%; height: 100%;
        background: rgba(2, 6, 23, 0.78);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999999;
        opacity: 0; pointer-events: none;
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        padding: 1rem;
        box-sizing: border-box;
      }
      .redirect-modal-overlay.active {
        opacity: 1; pointer-events: auto;
      }
      .redirect-modal-card {
        position: relative;
        background: var(--sol-surface, var(--r-surface, #0f172a));
        border: 1px solid var(--sol-border, var(--r-border, rgba(255, 255, 255, 0.12)));
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55), 0 0 1px 1px rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        padding: 2.2rem 2.2rem 1.8rem;
        max-width: 520px; width: 100%;
        text-align: center;
        transform: scale(0.95) translateY(12px);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        color: var(--sol-text, var(--r-text, #f8fafc));
        font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-sizing: border-box;
      }
      .redirect-modal-overlay.active .redirect-modal-card {
        transform: scale(1) translateY(0);
      }
      .redirect-modal-close {
        position: absolute;
        top: 1.1rem; right: 1.1rem;
        width: 34px; height: 34px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .redirect-modal-close:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.3);
        transform: rotate(90deg);
      }
      .redirect-icon-container {
        position: relative;
        width: 64px; height: 64px;
        margin: 0 auto 1.1rem;
        display: flex; align-items: center; justify-content: center;
      }
      .redirect-icon-glow {
        position: absolute;
        inset: 0;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%);
        animation: redirectGlow 2.5s infinite ease-in-out;
      }
      .redirect-icon-shield {
        position: relative;
        width: 56px; height: 56px;
        border-radius: 16px;
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(234, 88, 12, 0.12));
        border: 1.5px solid rgba(245, 158, 11, 0.4);
        color: #f59e0b;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px rgba(245, 158, 11, 0.2);
      }
      @keyframes redirectGlow {
        0%, 100% { transform: scale(1); opacity: 0.7; }
        50% { transform: scale(1.18); opacity: 1; }
      }
      .redirect-title {
        font-size: 1.35rem; font-weight: 800;
        color: #ffffff;
        margin-bottom: 0.35rem;
        letter-spacing: -0.01em;
      }
      .redirect-subtitle {
        font-size: 0.88rem;
        color: #94a3b8;
        line-height: 1.45;
        margin-bottom: 1.25rem;
      }
      .redirect-domain-row {
        display: flex; align-items: center; justify-content: space-between;
        gap: 8px; margin-bottom: 0.75rem; flex-wrap: wrap;
      }
      .redirect-domain-badge {
        display: inline-flex; align-items: center; gap: 6px;
        background: rgba(56, 189, 248, 0.12);
        border: 1px solid rgba(56, 189, 248, 0.3);
        padding: 4px 12px; border-radius: 999px;
        font-size: 0.82rem; font-weight: 600; color: #38bdf8;
      }
      .redirect-protocol-badge {
        display: inline-flex; align-items: center; gap: 5px;
        background: rgba(16, 185, 129, 0.12);
        border: 1px solid rgba(16, 185, 129, 0.25);
        padding: 3px 10px; border-radius: 999px;
        font-size: 0.74rem; font-weight: 600; color: #34d399;
      }
      .redirect-url-container {
        display: flex; align-items: center; gap: 8px;
        background: rgba(0, 0, 0, 0.35);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 0.65rem 0.85rem;
        margin-bottom: 0.95rem;
        position: relative;
      }
      .redirect-url-box {
        font-family: 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.8rem;
        color: #a5b4fc;
        word-break: break-all;
        text-align: left;
        max-height: 68px;
        overflow-y: auto;
        flex: 1;
        line-height: 1.4;
        padding-right: 4px;
      }
      .redirect-copy-btn {
        display: inline-flex; align-items: center; gap: 5px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #e2e8f0;
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 0.76rem;
        font-weight: 600;
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }
      .redirect-copy-btn:hover {
        background: rgba(255, 255, 255, 0.15);
        color: #ffffff;
      }
      .redirect-notice-banner {
        display: flex; align-items: flex-start; gap: 9px;
        background: rgba(99, 102, 241, 0.08);
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 10px;
        padding: 0.65rem 0.85rem;
        font-size: 0.78rem;
        line-height: 1.45;
        color: #cbd5e1;
        text-align: left;
        margin-bottom: 1.35rem;
      }
      .redirect-notice-banner code {
        background: rgba(255, 255, 255, 0.1);
        padding: 1px 4px;
        border-radius: 4px;
        font-size: 0.75rem;
        color: #38bdf8;
      }
      .redirect-actions {
        display: flex; gap: 0.85rem; margin-bottom: 1.15rem;
      }
      .redirect-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        border: none; padding: 0.78rem 1.2rem; border-radius: 12px;
        font-weight: 700; font-size: 0.88rem; cursor: pointer;
        transition: all 0.2s ease;
        min-height: 44px;
        box-sizing: border-box;
      }
      .redirect-btn-proceed {
        flex: 1.15;
        background: linear-gradient(135deg, #6366f1, #8b5cf6);
        color: #ffffff;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
      }
      .redirect-btn-proceed:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 22px rgba(99, 102, 241, 0.55);
        filter: brightness(1.05);
      }
      .redirect-btn-cancel {
        flex: 1;
        background: rgba(255, 255, 255, 0.06);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.12);
      }
      .redirect-btn-cancel:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
      }
      .redirect-footer {
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        padding-top: 0.9rem;
        display: flex; justify-content: center;
      }
      .redirect-learn-more {
        display: inline-flex; align-items: center; gap: 6px;
        font-size: 0.78rem; color: #a78bfa; text-decoration: none;
        transition: color 0.2s;
      }
      .redirect-learn-more:hover {
        color: #c4b5fd; text-decoration: underline;
      }

      /* Theme Compliance: Light Mode Overrides */
      html[data-theme="light"] .redirect-modal-overlay,
      body[data-theme="light"] .redirect-modal-overlay,
      .theme-light .redirect-modal-overlay {
        background: rgba(15, 23, 42, 0.45);
      }
      html[data-theme="light"] .redirect-modal-card,
      body[data-theme="light"] .redirect-modal-card,
      .theme-light .redirect-modal-card {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.18), 0 0 1px 1px rgba(0, 0, 0, 0.06) !important;
        color: #0f172a !important;
      }
      html[data-theme="light"] .redirect-modal-close,
      body[data-theme="light"] .redirect-modal-close,
      .theme-light .redirect-modal-close {
        background: #f1f5f9 !important;
        color: #64748b !important;
        border-color: #cbd5e1 !important;
      }
      html[data-theme="light"] .redirect-title,
      body[data-theme="light"] .redirect-title,
      .theme-light .redirect-title {
        color: #0f172a !important;
      }
      html[data-theme="light"] .redirect-subtitle,
      body[data-theme="light"] .redirect-subtitle,
      .theme-light .redirect-subtitle {
        color: #475569 !important;
      }
      html[data-theme="light"] .redirect-domain-badge,
      body[data-theme="light"] .redirect-domain-badge,
      .theme-light .redirect-domain-badge {
        background: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
        color: #0284c7 !important;
      }
      html[data-theme="light"] .redirect-url-container,
      body[data-theme="light"] .redirect-url-container,
      .theme-light .redirect-url-container {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
      }
      html[data-theme="light"] .redirect-url-box,
      body[data-theme="light"] .redirect-url-box,
      .theme-light .redirect-url-box {
        color: #1e293b !important;
      }
      html[data-theme="light"] .redirect-copy-btn,
      body[data-theme="light"] .redirect-copy-btn,
      .theme-light .redirect-copy-btn {
        background: #e2e8f0 !important;
        color: #0f172a !important;
        border-color: #cbd5e1 !important;
      }
      html[data-theme="light"] .redirect-notice-banner,
      body[data-theme="light"] .redirect-notice-banner,
      .theme-light .redirect-notice-banner {
        background: rgba(99, 102, 241, 0.08) !important;
        border-color: rgba(99, 102, 241, 0.2) !important;
        color: #334155 !important;
      }
      html[data-theme="light"] .redirect-btn-cancel,
      body[data-theme="light"] .redirect-btn-cancel,
      .theme-light .redirect-btn-cancel {
        background: #f1f5f9 !important;
        color: #334155 !important;
        border-color: #cbd5e1 !important;
      }
      html[data-theme="light"] .redirect-footer,
      body[data-theme="light"] .redirect-footer,
      .theme-light .redirect-footer {
        border-color: #e2e8f0 !important;
      }
      html[data-theme="light"] .redirect-learn-more,
      body[data-theme="light"] .redirect-learn-more,
      .theme-light .redirect-learn-more {
        color: #4f46e5 !important;
      }

      /* Multi-Device Media Responsiveness */
      @media (max-width: 540px) {
        .redirect-modal-card {
          padding: 1.4rem 1.15rem 1.25rem;
          border-radius: 16px;
        }
        .redirect-title {
          font-size: 1.18rem;
        }
        .redirect-subtitle {
          font-size: 0.82rem;
          margin-bottom: 1rem;
        }
        .redirect-actions {
          flex-direction: column-reverse;
          gap: 0.65rem;
        }
        .redirect-btn {
          width: 100%;
        }
        .redirect-domain-row {
          gap: 6px;
        }
      }
    `;
    document.head.appendChild(style);

    // Create Modal Element structure with professional icons & accessible layout
    const overlay = document.createElement('div');
    overlay.className = 'redirect-modal-overlay';
    overlay.innerHTML = `
      <div class="redirect-modal-card" role="dialog" aria-modal="true" aria-labelledby="redirectModalTitle">
        <button type="button" class="redirect-modal-close" id="redirectCloseXBtn" aria-label="Close dialog">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div class="redirect-header">
          <div class="redirect-icon-container">
            <div class="redirect-icon-glow"></div>
            <div class="redirect-icon-shield">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M12 8v4"/>
                <path d="M12 16h.01"/>
              </svg>
            </div>
          </div>
          <div class="redirect-title" id="redirectModalTitle">External Link Confirmation</div>
          <div class="redirect-subtitle">You are navigating outside the verified DPGNotes Academic Network</div>
        </div>

        <div class="redirect-body">
          <div class="redirect-domain-row">
            <div class="redirect-domain-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span id="redirectDestHost">external-site.com</span>
            </div>
            <div class="redirect-protocol-badge" id="redirectProtocolBadge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span id="redirectProtocolText">HTTPS Secure</span>
            </div>
          </div>

          <div class="redirect-url-container">
            <div class="redirect-url-box" id="redirectDestUrl">https://example.com</div>
            <button type="button" class="redirect-copy-btn" id="redirectCopyUrlBtn" title="Copy destination URL">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              <span id="redirectCopyText">Copy</span>
            </button>
          </div>

          <div class="redirect-notice-banner">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0; margin-top:2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span>DPGNotes applies an isolated <code>no-referrer</code> policy and academic UTM campaign tags. Third-party content is governed by external terms.</span>
          </div>
        </div>

        <div class="redirect-actions">
          <button type="button" class="redirect-btn redirect-btn-cancel" id="redirectCancelBtn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Stay on DPGNotes
          </button>
          <button type="button" class="redirect-btn redirect-btn-proceed" id="redirectProceedBtn">
            <span>Proceed to Site</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </button>
        </div>

        <div class="redirect-footer">
          <a href="https://dpgnotes.web.app/legal/index.html#links-policy" class="redirect-learn-more" id="redirectLearnMoreLink" target="_blank" rel="noopener noreferrer">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Learn more about our External Links &amp; Referrer Policy
          </a>
        </div>
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

    // Helper: Enrich external URLs with UTM parameters and runtime referrer URL
    function enrichExternalUrl(targetUrlStr) {
      try {
        const url = new URL(targetUrlStr, window.location.href);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return targetUrlStr;

        const activePage = window.location.href;
        let campaign = 'dpgnotes_academic_portal';
        const path = window.location.pathname.toLowerCase();
        if (path.includes('assignmentsolution')) {
          campaign = 'dpgnotes_assignment_solution_viewer';
        } else if (path.includes('practicalsolution')) {
          campaign = 'dpgnotes_practical_solution_viewer';
        } else if (path.includes('dpgnotes-pdf-viewer') || path.includes('pdf-viewer')) {
          campaign = 'dpgnotes_pdf_viewer';
        } else if (path.includes('serp') || path.includes('search')) {
          campaign = 'dpgnotes_search_engine';
        }

        url.searchParams.set('utm_source', 'dpgnotes');
        url.searchParams.set('utm_medium', 'referral');
        url.searchParams.set('utm_campaign', campaign);
        url.searchParams.set('utm_referrer', activePage);
        url.searchParams.set('utm_referrer_url', activePage);

        return url.href;
      } catch (err) {
        return targetUrlStr;
      }
    }

    function closeRedirectModal() {
      overlay.classList.remove('active');
      pendingUrl = '';
    }

    function proceedRedirect() {
      if (pendingUrl) {
        window.open(pendingUrl, '_blank', 'noopener,noreferrer');
      }
      closeRedirectModal();
    }

    // Bind event handlers
    const cancelBtn = document.getElementById('redirectCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', closeRedirectModal);

    const closeXBtn = document.getElementById('redirectCloseXBtn');
    if (closeXBtn) closeXBtn.addEventListener('click', closeRedirectModal);

    const proceedBtn = document.getElementById('redirectProceedBtn');
    if (proceedBtn) proceedBtn.addEventListener('click', proceedRedirect);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeRedirectModal();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (!overlay.classList.contains('active')) return;
      if (e.key === 'Escape') {
        closeRedirectModal();
      } else if (e.key === 'Enter') {
        proceedRedirect();
      }
    });

    const copyBtn = document.getElementById('redirectCopyUrlBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!pendingUrl) return;
        const copyText = document.getElementById('redirectCopyText');
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(pendingUrl).then(() => {
            if (copyText) {
              copyText.textContent = 'Copied!';
              setTimeout(() => { copyText.textContent = 'Copy'; }, 2000);
            }
          }).catch(() => {
            fallbackCopy(pendingUrl, copyText);
          });
        } else {
          fallbackCopy(pendingUrl, copyText);
        }
      });
    }

    function fallbackCopy(text, copyTextEl) {
      const tempInp = document.createElement('textarea');
      tempInp.value = text;
      tempInp.style.position = 'fixed';
      tempInp.style.opacity = '0';
      document.body.appendChild(tempInp);
      tempInp.select();
      try {
        document.execCommand('copy');
        if (copyTextEl) {
          copyTextEl.textContent = 'Copied!';
          setTimeout(() => { copyTextEl.textContent = 'Copy'; }, 2000);
        }
      } catch(e) {}
      document.body.removeChild(tempInp);
    }

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
          'akshatpsd2005',
          'codagenda.akshatpsd2005.workers.dev',
          'akshat-145609.github.io',
          'akshat-881236.github.io',
          'akshatnetworkhub',
          'github.io',
          'digiindia-student-platform.onrender.com',
          'digiindia'
        ];
        
        // If it is external (not in trusted internal hosts)
        if (!internalHosts.some(host => host && url.hostname.toLowerCase().includes(host.toLowerCase()))) {
          e.preventDefault();
          const enriched = enrichExternalUrl(url.href);
          pendingUrl = enriched;

          // Ensure anchor element in DOM is updated with enriched URL and no-referrer
          anchor.href = enriched;
          anchor.setAttribute('referrerpolicy', 'no-referrer');
          anchor.setAttribute('rel', 'noopener noreferrer');

          // Populate modal details
          const destEl = document.getElementById('redirectDestUrl');
          if (destEl) destEl.textContent = pendingUrl;

          const hostEl = document.getElementById('redirectDestHost');
          if (hostEl) hostEl.textContent = url.hostname;

          const protocolText = document.getElementById('redirectProtocolText');
          if (protocolText) protocolText.textContent = url.protocol === 'https:' ? 'HTTPS Secure' : 'HTTP External';

          const copyText = document.getElementById('redirectCopyText');
          if (copyText) copyText.textContent = 'Copy';

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
      // 0. Search Engine Crawlers & Bot Inspection Transparency (Googlebot, Bingbot, Google-InspectionTool, etc.)
      const isCrawler = /bot|googlebot|crawler|spider|robot|crawling|google-inspectiontool|chrome-lighthouse|lighthouse|slurp|duckduckbot|baiduspider|yandexbot|bingbot|facebookexternalhit|whatsapp|telegram/i.test(navigator.userAgent);
      if (isCrawler) return;

      // 1. Authenticated Users have Unlimited Access
      const activeUid = localStorage.getItem("dpgActiveUserUid");
      if (activeUid) return;

      // 2. Search Engines, SERP, Public Portals, Legal Policy Pages, Quota Lockdown Screen, and Contributor Creator Studios are strictly Exempt from Guest Quota
      const p = window.location.pathname.toLowerCase();
      if (p === '' || p === '/' || p.includes('index.html') || 
          p.includes('dpgnotes-serp.html') || 
          p.includes('dpgnotes-search-engine.html') || 
          p.includes('study-hub.html') || 
          p.includes('overview') || 
          p.includes('/legal') || 
          p.includes('quota-lockdown.html') ||
          p.includes('admin') || 
          p.includes('dashboard') || 
          p.includes('train_model')) {
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
        if (isCrawler) return;
        const curPath = window.location.pathname.toLowerCase();
        if (curPath.includes('quota-lockdown.html') || curPath.includes('dpgnotes-serp.html') || curPath.includes('dpgnotes-search-engine.html') || curPath.includes('index.html')) {
          return;
        }

        // Enforce lock across all 3 storage layers
        localStorage.setItem("dpg_quota_locked", "true");
        sessionStorage.setItem("dpg_quota_locked", "true");
        setCookie("dpg_quota_locked", "true");

        // Always redirect user to quota-lockdown.html with complete absolute URL
        window.location.href = "https://dpgnotes.web.app/quota-lockdown.html?returnUrl=" + encodeURIComponent(window.location.href);
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

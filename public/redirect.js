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
  });
})();

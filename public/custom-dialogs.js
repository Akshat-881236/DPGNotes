// Premium DPGNotes Custom Dialogs & Modal Overlays
(function() {
  // Inject remixicon if not present
  if (!document.querySelector('link[href*="remixicon"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css';
    document.head.appendChild(link);
  }

  // Create style sheet
  const style = document.createElement('style');
  style.textContent = `
    .dpg-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10, 11, 20, 0.85);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100000;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .dpg-modal-overlay.active {
      opacity: 1;
    }
    .dpg-modal-box {
      background: #141827;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 2.2rem;
      width: 90%;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
      transform: scale(0.9);
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .dpg-modal-overlay.active .dpg-modal-box {
      transform: scale(1);
    }
    .dpg-modal-icon {
      font-size: 3rem;
      margin-bottom: 1.2rem;
      display: inline-block;
      animation: dpgPulse 2s infinite;
    }
    .dpg-modal-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 0.8rem 0;
      font-family: 'Outfit', sans-serif;
    }
    .dpg-modal-text {
      font-size: 0.95rem;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 1.8rem 0;
      font-family: 'Outfit', sans-serif;
    }
    .dpg-modal-btn {
      width: 100%;
      padding: 0.85rem;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      border: none;
      border-radius: 12px;
      color: #ffffff;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
      font-family: 'Outfit', sans-serif;
    }
    .dpg-modal-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 18px rgba(139, 92, 246, 0.4);
    }
    .dpg-modal-btn:active {
      transform: translateY(0);
    }
    
    .dpg-confirm-actions {
      display: flex;
      gap: 1rem;
    }
    .dpg-modal-btn.cancel {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f8fafc;
      box-shadow: none;
    }
    .dpg-modal-btn.cancel:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    .dpg-modal-btn.danger {
      background: #ef4444;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }
    .dpg-modal-btn.danger:hover {
      box-shadow: 0 6px 18px rgba(239, 68, 68, 0.4);
    }

    /* Light Theme Support */
    html[data-theme="light"] .dpg-modal-box {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.15) !important;
    }
    html[data-theme="light"] .dpg-modal-title {
      color: #0f172a !important;
    }
    html[data-theme="light"] .dpg-modal-text {
      color: #334155 !important;
    }
    html[data-theme="light"] .dpg-modal-btn.cancel {
      background: #f1f5f9 !important;
      border: 1px solid #cbd5e1 !important;
      color: #0f172a !important;
    }
    html[data-theme="light"] .dpg-modal-btn.cancel:hover {
      background: #e2e8f0 !important;
      color: #020617 !important;
    }

    @keyframes dpgPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
  
    /* ========================================================
       Specialized Quiz URL Export Modal Styling (Scenario-Specific)
       ======================================================== */
    .dpg-url-export-box {
      max-width: 580px !important;
      width: 92% !important;
      padding: 2rem 2.2rem !important;
      text-align: left !important;
      border-radius: 24px !important;
    }
    .dpg-url-export-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 0.75rem;
    }
    .dpg-url-export-icon-ring {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: rgba(99, 102, 241, 0.15);
      border: 1px solid rgba(99, 102, 241, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      color: #818cf8;
      flex-shrink: 0;
    }
    .dpg-url-export-titles {
      flex: 1;
      min-width: 0;
    }
    .dpg-url-export-title {
      font-size: 1.35rem;
      font-weight: 700;
      color: #f8fafc;
      margin: 0 0 4px 0;
      font-family: 'Outfit', sans-serif;
    }
    .dpg-url-export-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 0.76rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 999px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.35);
      color: #34d399;
    }
    .dpg-url-export-subtext {
      font-size: 0.9rem;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0 0 1rem 0;
      font-family: 'Outfit', sans-serif;
    }
    .dpg-url-card {
      background: #0b0f19;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 1rem;
    }
    .dpg-url-card-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.72rem;
      color: #94a3b8;
      margin-bottom: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dpg-url-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
      color: #cbd5e1;
      word-break: break-all;
      max-height: 85px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 10px 12px;
      line-height: 1.45;
      user-select: all;
    }
    .dpg-url-code::-webkit-scrollbar {
      width: 5px;
      height: 5px;
    }
    .dpg-url-code::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }
    .dpg-url-card-actions {
      display: flex;
      gap: 10px;
      margin-top: 10px;
    }
    .dpg-url-action-btn {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s ease;
      font-family: 'Outfit', sans-serif;
    }
    .dpg-url-action-btn.copy {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.5);
      color: #e0e7ff;
    }
    .dpg-url-action-btn.copy:hover {
      background: #6366f1;
      color: #ffffff;
    }
    .dpg-url-action-btn.copy.copied {
      background: rgba(16, 185, 129, 0.25) !important;
      border-color: #10b981 !important;
      color: #34d399 !important;
    }
    .dpg-url-action-btn.test {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.14);
      color: #e2e8f0;
    }
    .dpg-url-action-btn.test:hover {
      background: rgba(255, 255, 255, 0.14);
      color: #ffffff;
    }
    .dpg-url-security-box {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      background: rgba(245, 158, 11, 0.08);
      border: 1px solid rgba(245, 158, 11, 0.28);
      border-radius: 12px;
      padding: 10px 14px;
      margin-bottom: 1.3rem;
      font-size: 0.8rem;
      color: #fde68a;
      line-height: 1.45;
    }
    .dpg-url-security-icon {
      color: #fbbf24;
      font-size: 1.3rem;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .dpg-url-security-content strong {
      color: #ffffff;
    }
    .dpg-url-done-btn {
      width: 100%;
      padding: 0.85rem;
      border-radius: 12px;
      font-size: 0.95rem;
      font-weight: 600;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border: none;
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35);
      transition: all 0.2s ease;
    }
    .dpg-url-done-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(99, 102, 241, 0.45);
    }

    /* Light Theme Support for Export Modal */
    html[data-theme="light"] .dpg-url-export-box,
    body[data-theme="light"] .dpg-url-export-box,
    body.theme-light .dpg-url-export-box {
      background: #ffffff !important;
      border: 1px solid #cbd5e1 !important;
      box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(226, 232, 240, 0.9) !important;
    }
    html[data-theme="light"] .dpg-url-export-icon-ring,
    body[data-theme="light"] .dpg-url-export-icon-ring,
    body.theme-light .dpg-url-export-icon-ring {
      background: #eef2ff !important;
      border-color: #c7d2fe !important;
      color: #4f46e5 !important;
    }
    html[data-theme="light"] .dpg-url-export-title,
    body[data-theme="light"] .dpg-url-export-title,
    body.theme-light .dpg-url-export-title {
      color: #0f172a !important;
    }
    html[data-theme="light"] .dpg-url-export-badge,
    body[data-theme="light"] .dpg-url-export-badge,
    body.theme-light .dpg-url-export-badge {
      background: #ecfdf5 !important;
      border-color: #a7f3d0 !important;
      color: #047857 !important;
      font-weight: 700 !important;
    }
    html[data-theme="light"] .dpg-url-export-subtext,
    body[data-theme="light"] .dpg-url-export-subtext,
    body.theme-light .dpg-url-export-subtext {
      color: #475569 !important;
    }
    html[data-theme="light"] .dpg-url-card,
    body[data-theme="light"] .dpg-url-card,
    body.theme-light .dpg-url-card {
      background: #f8fafc !important;
      border-color: #cbd5e1 !important;
    }
    html[data-theme="light"] .dpg-url-card-bar,
    body[data-theme="light"] .dpg-url-card-bar,
    body.theme-light .dpg-url-card-bar {
      color: #64748b !important;
    }
    html[data-theme="light"] .dpg-url-code,
    body[data-theme="light"] .dpg-url-code,
    body.theme-light .dpg-url-code {
      background: #ffffff !important;
      border-color: #cbd5e1 !important;
      color: #0f172a !important;
    }
    html[data-theme="light"] .dpg-url-action-btn.copy,
    body[data-theme="light"] .dpg-url-action-btn.copy,
    body.theme-light .dpg-url-action-btn.copy {
      background: #e0e7ff !important;
      border-color: #6366f1 !important;
      color: #3730a3 !important;
      font-weight: 700 !important;
    }
    html[data-theme="light"] .dpg-url-action-btn.copy:hover,
    body[data-theme="light"] .dpg-url-action-btn.copy:hover,
    body.theme-light .dpg-url-action-btn.copy:hover {
      background: #4f46e5 !important;
      color: #ffffff !important;
      border-color: #4f46e5 !important;
    }
    html[data-theme="light"] .dpg-url-action-btn.copy.copied,
    body[data-theme="light"] .dpg-url-action-btn.copy.copied,
    body.theme-light .dpg-url-action-btn.copy.copied {
      background: #dcfce7 !important;
      border-color: #22c55e !important;
      color: #15803d !important;
    }
    html[data-theme="light"] .dpg-url-action-btn.test,
    body[data-theme="light"] .dpg-url-action-btn.test,
    body.theme-light .dpg-url-action-btn.test {
      background: #f1f5f9 !important;
      border-color: #cbd5e1 !important;
      color: #1e293b !important;
      font-weight: 600 !important;
    }
    html[data-theme="light"] .dpg-url-action-btn.test:hover,
    body[data-theme="light"] .dpg-url-action-btn.test:hover,
    body.theme-light .dpg-url-action-btn.test:hover {
      background: #e2e8f0 !important;
      color: #000000 !important;
    }
    html[data-theme="light"] .dpg-url-security-box,
    body[data-theme="light"] .dpg-url-security-box,
    body.theme-light .dpg-url-security-box {
      background: #fffbeb !important;
      border-color: #fde68a !important;
      color: #92400e !important;
    }
    html[data-theme="light"] .dpg-url-security-icon,
    body[data-theme="light"] .dpg-url-security-icon,
    body.theme-light .dpg-url-security-icon {
      color: #d97706 !important;
    }
    html[data-theme="light"] .dpg-url-security-content strong,
    body[data-theme="light"] .dpg-url-security-content strong,
    body.theme-light .dpg-url-security-content strong {
      color: #78350f !important;
      font-weight: 700 !important;
    }
    html[data-theme="light"] .dpg-url-security-content span,
    body[data-theme="light"] .dpg-url-security-content span,
    body.theme-light .dpg-url-security-content span {
      color: #92400e !important;
    }
    html[data-theme="light"] .dpg-url-done-btn,
    body[data-theme="light"] .dpg-url-done-btn,
    body.theme-light .dpg-url-done-btn {
      background: linear-gradient(135deg, #4f46e5, #7c3aed) !important;
      color: #ffffff !important;
      box-shadow: 0 4px 14px rgba(79, 70, 229, 0.3) !important;
    }

  `;
  document.head.appendChild(style);

  // Global humanizer converting raw technical/Firebase errors into empathetic student copy
  window.humanizeErrorMessage = function(err) {
    if (!err) return "An unexpected event occurred. Please refresh the page and try again.";
    let msg = typeof err === "string" ? err : (err.message || String(err));
    
    // Strip technical wrappers and prefixes
    msg = msg.replace(/^Firebase:\s*Error\s*\(([^)]+)\)\.?/i, '$1');
    msg = msg.replace(/^Sign\s*In\s*Error:\s*/i, '');
    msg = msg.replace(/^Registration\s*Failed:\s*/i, '');
    msg = msg.replace(/^Registration\s*Error:\s*/i, '');
    msg = msg.replace(/^Error:\s*/i, '');
    msg = msg.trim();

    const lower = msg.toLowerCase();

    if (lower.includes("auth/invalid-credential") || lower.includes("auth/wrong-password") || lower.includes("invalid-credential")) {
      return "The email, Student/Employee ID, or password you entered doesn't match our records. Please verify your details or use 'Forgot Password' if you need to reset it.";
    }
    if (lower.includes("auth/user-not-found") || lower.includes("user-not-found")) {
      return "We couldn't find an active contributor account matching those details. Would you like to create a free account?";
    }
    if (lower.includes("auth/email-already-in-use") || lower.includes("email-already-in-use")) {
      return "An account with this email address is already registered. Please sign in with your password or use 'Forgot Password'.";
    }
    if (lower.includes("auth/too-many-requests") || lower.includes("too-many-requests")) {
      return "Too many recent sign-in attempts detected. For your account security, please wait a moment before trying again.";
    }
    if (lower.includes("auth/popup-closed-by-user") || lower.includes("popup-closed-by-user")) {
      return "The authentication window was closed before signing in. You can try again whenever you're ready.";
    }
    if (lower.includes("auth/network-request-failed") || lower.includes("network-request-failed")) {
      return "Network connection issue detected. Please check your internet connection and retry.";
    }
    if (lower.includes("auth/weak-password") || lower.includes("weak-password")) {
      return "Please choose a stronger password with at least 6 characters.";
    }
    if (lower.includes("auth/requires-recent-login") || lower.includes("requires-recent-login")) {
      return "For your security, please sign out and sign back in before modifying sensitive account settings.";
    }
    if (lower.includes("permission-denied") || lower.includes("permission_denied")) {
      return "You do not currently have authorization to access or modify this resource.";
    }
    if (lower.includes("cannot read properties of null") || lower.includes("typeerror")) {
      return "A temporary interface element could not be loaded. Please refresh the page.";
    }

    return msg;
  };

  // Safe element attacher supporting pre-DOM execution
  function attachOverlay(overlay) {
    const show = () => {
      if (document.body) {
        document.body.appendChild(overlay);
        setTimeout(() => overlay.classList.add('active'), 10);
      }
    };
    if (document.body) {
      show();
    } else {
      document.addEventListener('DOMContentLoaded', show, { once: true });
    }
  }

  // Helper for alert dialogs (Promise-based)
  window.customAlert = function(message, options = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dpg-modal-overlay';
      
      const rawMsg = typeof message === 'string' ? message : (message?.message || String(message));
      
      // Scenario Detection: Quiz URL Exported Dialog (Special Auto-Styling for this Scenario Only)
      const isUrlExport = options.isUrlExport ||
        options.title === 'Quiz URL Exported' ||
        (typeof rawMsg === 'string' && (
          rawMsg.includes('Quiz URL Exported') ||
          (rawMsg.includes('quiz-generator.html?') && rawMsg.includes('Shareable URL')) ||
          (rawMsg.includes('quiz questions and settings has been generated') && rawMsg.includes('http'))
        ));

      if (isUrlExport) {
        let targetUrl = options.url || '';
        if (!targetUrl && typeof rawMsg === 'string') {
          const match = rawMsg.match(/https?:\/\/[^\s\n"']+/i);
          if (match) targetUrl = match[0];
        }

        const safeUrl = targetUrl ? targetUrl.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') : '';
        const titleText = options.title || 'Quiz URL Exported';

        overlay.innerHTML = `
          <div class="dpg-modal-box dpg-url-export-box">
            <div class="dpg-url-export-header">
              <div class="dpg-url-export-icon-ring">
                <i class="ri-links-line"></i>
              </div>
              <div class="dpg-url-export-titles">
                <h3 class="dpg-modal-title dpg-url-export-title">${titleText}</h3>
                <div class="dpg-url-export-badge">
                  <i class="ri-checkbox-circle-fill"></i> Copied to Clipboard
                </div>
              </div>
            </div>

            <p class="dpg-url-export-subtext">
              Shareable URL with all current quiz questions, marking schemes, and answer keys has been generated and copied to your clipboard.
            </p>

            <div class="dpg-url-card">
              <div class="dpg-url-card-bar">
                <span><i class="ri-link-m"></i> Configuration URL</span>
                <span>${targetUrl.length} characters</span>
              </div>
              <div class="dpg-url-code" id="dpgExportUrlText">${safeUrl}</div>
              <div class="dpg-url-card-actions">
                <button type="button" class="dpg-url-action-btn copy" id="dpgUrlCopyAgainBtn" title="Copy URL again">
                  <i class="ri-file-copy-line"></i> <span>Copy Link</span>
                </button>
                <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="dpg-url-action-btn test" title="Test quiz in a new tab">
                  <i class="ri-external-link-line"></i> <span>Open Link</span>
                </a>
              </div>
            </div>

            <div class="dpg-url-security-box">
              <i class="ri-shield-keyhole-line dpg-url-security-icon"></i>
              <div class="dpg-url-security-content">
                <strong>Security Notice:</strong>
                <span>URLs appear in browser histories, proxy logs, and HTTP Referrer headers. Share pre-fill links only with trusted instructors and verify questions before publishing.</span>
              </div>
            </div>

            <button class="dpg-modal-btn dpg-url-done-btn" id="dpgAlertOkBtn">Done</button>
          </div>
        `;

        attachOverlay(overlay);

        const okBtn = overlay.querySelector('#dpgAlertOkBtn');
        const copyAgainBtn = overlay.querySelector('#dpgUrlCopyAgainBtn');

        if (copyAgainBtn && targetUrl) {
          copyAgainBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(targetUrl);
              }
              copyAgainBtn.classList.add('copied');
              copyAgainBtn.innerHTML = '<i class="ri-check-line"></i> <span>Copied!</span>';
              setTimeout(() => {
                copyAgainBtn.classList.remove('copied');
                copyAgainBtn.innerHTML = '<i class="ri-file-copy-line"></i> <span>Copy Link</span>';
              }, 2500);
            } catch (err) {
              console.error('Clipboard copy error:', err);
            }
          });
        }

        const closeAlert = () => {
          overlay.classList.remove('active');
          document.removeEventListener('keydown', keyHandler);
          setTimeout(() => {
            overlay.remove();
            resolve();
          }, 300);
        };

        const keyHandler = (e) => {
          if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            closeAlert();
          }
        };

        okBtn.addEventListener('click', closeAlert);
        document.addEventListener('keydown', keyHandler);
        setTimeout(() => okBtn.focus(), 50);
        return;
      }

      // Default Standard Alert Dialog Handling
      const humanMessage = window.humanizeErrorMessage(message);
      let iconClass = 'ri-notification-3-line';
      let titleText = options.title || 'Notice';
      const isDanger = options.isDanger || false;
      
      const msgLower = String(humanMessage).toLowerCase();
      if (!options.title) {
        if (msgLower.includes('success') || msgLower.includes('complete') || msgLower.includes('saved') || msgLower.includes('congratulations') || msgLower.includes('welcome') || msgLower.includes('restored')) {
          iconClass = 'ri-checkbox-circle-line';
          titleText = 'Success';
        } else if (isDanger || msgLower.includes('fail') || msgLower.includes('error') || msgLower.includes('invalid') || msgLower.includes('record') || msgLower.includes('password') || msgLower.includes('denied') || msgLower.includes('suspended') || msgLower.includes('blocked') || msgLower.includes('restriction')) {
          iconClass = 'ri-error-warning-line';
          titleText = 'Account Notice';
        }
      } else {
        if (isDanger || msgLower.includes('fail') || msgLower.includes('error') || msgLower.includes('restriction') || msgLower.includes('invalid')) {
          iconClass = 'ri-error-warning-line';
        } else if (msgLower.includes('success') || msgLower.includes('welcome') || msgLower.includes('restored')) {
          iconClass = 'ri-checkbox-circle-line';
        }
      }
      
      const themeColor = isDanger || titleText === 'Account Notice' || titleText === 'Oops!' ? '#ef4444' : (titleText === 'Success' ? '#10b981' : '#8b5cf6');
      
      overlay.innerHTML = `
        <div class="dpg-modal-box">
          <i class="${iconClass} dpg-modal-icon" style="color: ${themeColor}"></i>
          <h3 class="dpg-modal-title">${titleText}</h3>
          <p class="dpg-modal-text">${humanMessage}</p>
          <button class="dpg-modal-btn" id="dpgAlertOkBtn" style="background: linear-gradient(135deg, ${themeColor}, #6366f1); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);">OK</button>
        </div>
      `;
      
      attachOverlay(overlay);
      
      const okBtn = overlay.querySelector('#dpgAlertOkBtn');
      const closeAlert = () => {
        overlay.classList.remove('active');
        document.removeEventListener('keydown', keyHandler);
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 300);
      };

      const keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          closeAlert();
        }
      };

      okBtn.addEventListener('click', closeAlert);
      document.addEventListener('keydown', keyHandler);
      setTimeout(() => okBtn.focus(), 50);
    });
  };

  // Overwrite native window.alert globally with custom modal
  window.alert = function(message, options) {
    return window.customAlert(message, options);
  };

  // Overwrite native window.confirm globally with custom modal
  window.confirm = function(message, options) {
    return window.customConfirm(message, options);
  };

  // Overwrite native window.prompt globally with custom modal
  window.prompt = function(message, defaultValue) {
    return window.customPrompt(message, defaultValue);
  };

  // Helper for confirm dialogs (Promise-based)
  window.customConfirm = function(message, options = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dpg-modal-overlay';
      
      const humanMessage = window.humanizeErrorMessage(message);
      const titleText = options.title || 'Are you sure?';
      const isDanger = options.isDanger || false;
      const confirmText = options.confirmText || 'Yes, Proceed';
      const cancelText = options.cancelText || 'Cancel';
      
      overlay.innerHTML = `
        <div class="dpg-modal-box">
          <i class="ri-question-line dpg-modal-icon" style="color: ${isDanger ? '#ef4444' : '#8b5cf6'}"></i>
          <h3 class="dpg-modal-title">${titleText}</h3>
          <p class="dpg-modal-text">${humanMessage}</p>
          <div class="dpg-confirm-actions">
            <button class="dpg-modal-btn cancel" id="dpgConfirmCancelBtn">${cancelText}</button>
            <button class="dpg-modal-btn ${isDanger ? 'danger' : ''}" id="dpgConfirmYesBtn">${confirmText}</button>
          </div>
        </div>
      `;
      
      attachOverlay(overlay);
      
      const cancelBtn = overlay.querySelector('#dpgConfirmCancelBtn');
      const yesBtn = overlay.querySelector('#dpgConfirmYesBtn');

      const finish = (result) => {
        overlay.classList.remove('active');
        document.removeEventListener('keydown', keyHandler);
        setTimeout(() => {
          overlay.remove();
          resolve(result);
        }, 300);
      };

      const keyHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        }
      };

      cancelBtn.addEventListener('click', () => finish(false));
      yesBtn.addEventListener('click', () => finish(true));
      document.addEventListener('keydown', keyHandler);
      setTimeout(() => yesBtn.focus(), 50);
    });
  };

  // Helper for prompt dialogs (Promise-based)
  window.customPrompt = function(message, defaultValue = "") {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dpg-modal-overlay';
      
      overlay.innerHTML = `
        <div class="dpg-modal-box" style="text-align:left;">
          <h3 class="dpg-modal-title" style="text-align:center; margin-bottom:1.5rem;">Action Required</h3>
          <p class="dpg-modal-text" style="margin-bottom:1rem;">${message}</p>
          <input type="text" id="dpgPromptInput" value="${defaultValue}" style="width:100%; padding:0.85rem; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2); color:#f8fafc; font-family:'Outfit', sans-serif; font-size:1rem; margin-bottom:1.5rem; box-sizing:border-box;" />
          <div class="dpg-confirm-actions">
            <button class="dpg-modal-btn cancel" id="dpgPromptCancelBtn">Cancel</button>
            <button class="dpg-modal-btn" id="dpgPromptOkBtn">Submit</button>
          </div>
        </div>
      `;
      
      attachOverlay(overlay);
      
      const input = overlay.querySelector('#dpgPromptInput');
      if (input) {
        input.focus();
        input.select();
      }
      
      overlay.querySelector('#dpgPromptCancelBtn').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(null);
        }, 300);
      });
      
      overlay.querySelector('#dpgPromptOkBtn').addEventListener('click', () => {
        const val = input.value;
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(val);
        }, 300);
      });

      // Handle Enter key
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          overlay.querySelector('#dpgPromptOkBtn').click();
        }
      });
    });
  };
})();

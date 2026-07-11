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

    @keyframes dpgPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // Overwrite window.alert globally
  window.alert = function(message) {
    const overlay = document.createElement('div');
    overlay.className = 'dpg-modal-overlay';
    
    let iconClass = 'ri-notification-3-line';
    let titleText = 'Alert';
    
    const msgLower = String(message).toLowerCase();
    if (msgLower.includes('success') || msgLower.includes('complete') || msgLower.includes('saved') || msgLower.includes('congratulations')) {
      iconClass = 'ri-checkbox-circle-line';
      titleText = 'Success';
    } else if (msgLower.includes('fail') || msgLower.includes('error') || msgLower.includes('invalid') || msgLower.includes('denied') || msgLower.includes('suspended')) {
      iconClass = 'ri-error-warning-line';
      titleText = 'Oops!';
    }
    
    const themeColor = titleText === 'Success' ? '#10b981' : (titleText === 'Oops!' ? '#ef4444' : '#8b5cf6');
    
    overlay.innerHTML = `
      <div class="dpg-modal-box">
        <i class="${iconClass} dpg-modal-icon" style="color: ${themeColor}"></i>
        <h3 class="dpg-modal-title">${titleText}</h3>
        <p class="dpg-modal-text">${message}</p>
        <button class="dpg-modal-btn" id="dpgAlertOkBtn" style="background: linear-gradient(135deg, ${themeColor}, #6366f1); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);">OK</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    setTimeout(() => overlay.classList.add('active'), 10);
    
    overlay.querySelector('#dpgAlertOkBtn').addEventListener('click', () => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    });
  };

  // Helper for confirm dialogs (Promise-based)
  window.customConfirm = function(message, options = {}) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'dpg-modal-overlay';
      
      const titleText = options.title || 'Are you sure?';
      const isDanger = options.isDanger || false;
      const confirmText = options.confirmText || 'Yes, Proceed';
      const cancelText = options.cancelText || 'Cancel';
      
      overlay.innerHTML = `
        <div class="dpg-modal-box">
          <i class="ri-question-line dpg-modal-icon" style="color: ${isDanger ? '#ef4444' : '#8b5cf6'}"></i>
          <h3 class="dpg-modal-title">${titleText}</h3>
          <p class="dpg-modal-text">${message}</p>
          <div class="dpg-confirm-actions">
            <button class="dpg-modal-btn cancel" id="dpgConfirmCancelBtn">${cancelText}</button>
            <button class="dpg-modal-btn ${isDanger ? 'danger' : ''}" id="dpgConfirmYesBtn">${confirmText}</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      setTimeout(() => overlay.classList.add('active'), 10);
      
      overlay.querySelector('#dpgConfirmCancelBtn').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(false);
        }, 300);
      });
      
      overlay.querySelector('#dpgConfirmYesBtn').addEventListener('click', () => {
        overlay.classList.remove('active');
        setTimeout(() => {
          overlay.remove();
          resolve(true);
        }, 300);
      });
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
      
      document.body.appendChild(overlay);
      
      const input = overlay.querySelector('#dpgPromptInput');
      input.focus();
      input.select();
      
      setTimeout(() => overlay.classList.add('active'), 10);
      
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

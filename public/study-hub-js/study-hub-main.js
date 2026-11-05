/** DPGNotes NOVA - Main Application Bootstrap */
(function(window) {
  'use strict';
  function initNova() {
    console.log('[DPGNotes NOVA] Initializing Academic Assistant & Agent...');
    if (window.StudyHubChat && typeof window.StudyHubChat.init === 'function') {
      window.StudyHubChat.init();
    }
    renderSuggestedChips();
    const resetBtn = document.getElementById('novaResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Start a fresh conversation? This will clear temporary active messages.')) {
          window.StudyHubContext.clearSession();
          const threadEl = document.getElementById('novaThread');
          if (threadEl) {
            threadEl.innerHTML = '';
            window.StudyHubChat.init();
          }
        }
      });
    }
    const printBtn = document.getElementById('novaPrintBtn');
    if (printBtn) {
      printBtn.addEventListener('click', function(e) {
        e.preventDefault();
        window.print();
      });
    }
    checkBackendHealth();
  }
  function renderSuggestedChips() {
    const container = document.getElementById('novaChipsContainer');
    if (!container || !window.StudyHubConfig) return;
    const prompts = window.StudyHubConfig.defaultPrompts || [];
    container.innerHTML = '';
    prompts.forEach(p => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'nova-chip';
      chip.innerHTML = `<i class="${p.icon || 'ri-sparkling-line'}"></i> ${p.text}`;
      chip.addEventListener('click', function() {
        if (window.StudyHubChat) {
          window.StudyHubChat.sendQuickPrompt(p.text);
        }
      });
      container.appendChild(chip);
    });
  }
  async function checkBackendHealth() {
    try {
      const endpoint = window.StudyHubConfig?.endpoints?.health || '/api/study-hub/health';
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        console.log('[NOVA Health] Service active:', data.service, '| Providers:', data.providers);
      }
    } catch (e) {
      console.log('[NOVA Health] Backend unreachable, operational in local fallback mode.');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNova);
  } else {
    initNova();
  }
  window.initNova = initNova;
})(window);

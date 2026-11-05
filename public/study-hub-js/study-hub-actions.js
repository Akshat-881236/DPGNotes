/** DPGNotes NOVA - Action Dispatcher & Card Builder */
(function(window) {
  'use strict';
  const StudyHubActions = {
    /**
     * Renders an interactive action card element based on an executed tool.
     * @param {object} actionObj 
     * @returns {string} htmlString
     */
    buildActionCardHtml: function(actionObj) {
      if (!actionObj || !actionObj.name) return '';
      const name = actionObj.name;
      const res = actionObj.result || {};
      const url = actionObj.url || res.url || '';
      switch (name) {
        case 'search_resources': {
          const query = res.query || actionObj.arguments?.query || 'Academic Materials';
          const tab = res.tab || actionObj.arguments?.tab || 'all';
          const safeUrl = url || `/dpgnotes-serp.html?q=${encodeURIComponent(query)}`;
          return `
            <div class="nova-action-card">
              <div class="nova-action-header">
                <span class="nova-action-title">
                  <i class="ri-search-2-line"></i> DPGNotes Academic Search
                </span>
                <span class="nova-status-pill">SERP Ready</span>
              </div>
              <div class="nova-action-body">
                Search query: <strong>${StudyHubActions.escapeHtml(query)}</strong> (Tab: <em>${StudyHubActions.escapeHtml(tab)}</em>)
              </div>
              <a href="${StudyHubActions.escapeHtml(safeUrl)}" class="nova-action-btn" target="_blank" rel="noopener">
                <i class="ri-external-link-line"></i> Open in DPGNotes SERP
              </a>
            </div>
          `;
        }
        case 'generate_quiz':
        case 'generate_quiz_url': {
          const title = res.summary?.quizTitle || actionObj.arguments?.quizTitle || 'Quiz Assessment';
          const count = res.summary?.totalQuestionCount || res.summary?.questionCount || actionObj.arguments?.questionCount || 10;
          const mins = res.summary?.timeAlloted || res.summary?.timeMinutes || actionObj.arguments?.timeMinutes || 30;
          const sub = res.summary?.subName || actionObj.arguments?.subject || '';
          const safeUrl = url || '/Quizes/quiz-generator.html';
          return `
            <div class="nova-action-card">
              <div class="nova-action-header">
                <span class="nova-action-title">
                  <i class="ri-magic-line"></i> DPGNotes Quiz Studio
                </span>
                <span class="nova-status-pill">Prefilled &amp; Ready</span>
              </div>
              <div class="nova-action-body">
                <div><strong>${StudyHubActions.escapeHtml(title)}</strong></div>
                <div style="font-size:0.8rem; color:#94a3b8; margin-top:3px;">
                  ${sub ? `<span>Subject: ${StudyHubActions.escapeHtml(sub)} • </span>` : ''}
                  <span>${count} Questions</span> • <span>${mins} Minutes</span>
                </div>
                <div style="font-size:0.75rem; color:#64748b; margin-top:5px;">
                  <em>Review question keys, marking scheme, and manually publish when ready.</em>
                </div>
              </div>
              <a href="${StudyHubActions.escapeHtml(safeUrl)}" class="nova-action-btn" target="_blank" rel="noopener">
                <i class="ri-play-circle-line"></i> Open in Quiz Studio
              </a>
            </div>
          `;
        }
        case 'get_legal_section': {
          const docTitle = res.title || 'DPGNotes Legal Policy';
          const safeUrl = url || res.url || '/legal/index.html';
          return `
            <div class="nova-action-card">
              <div class="nova-action-header">
                <span class="nova-action-title">
                  <i class="ri-shield-keyhole-line"></i> ${StudyHubActions.escapeHtml(docTitle)}
                </span>
                <span class="nova-status-pill">Official Policy</span>
              </div>
              <div class="nova-action-body">
                Verified platform policy documentation and academic compliance guidelines.
              </div>
              <a href="${StudyHubActions.escapeHtml(safeUrl)}" class="nova-action-btn" target="_blank" rel="noopener">
                <i class="ri-article-line"></i> Read Full Policy Document
              </a>
            </div>
          `;
        }
        case 'navigate_platform': {
          const dest = res.destination || actionObj.arguments?.destination || 'Destination';
          const safeUrl = url || '/index.html';
          return `
            <div class="nova-action-card">
              <div class="nova-action-header">
                <span class="nova-action-title">
                  <i class="ri-compass-3-line"></i> Platform Destination
                </span>
                <span class="nova-status-pill">Internal Route</span>
              </div>
              <div class="nova-action-body">
                Navigate to: <strong>${StudyHubActions.escapeHtml(dest)}</strong>
              </div>
              <a href="${StudyHubActions.escapeHtml(safeUrl)}" class="nova-action-btn">
                <i class="ri-arrow-right-line"></i> Navigate Now
              </a>
            </div>
          `;
        }
        case 'query_academic_resources': {
          const count = res.count || 0;
          const searchUrl = res.searchUrl || '/dpgnotes-serp.html';
          return `
            <div class="nova-action-card">
              <div class="nova-action-header">
                <span class="nova-action-title">
                  <i class="ri-file-list-3-line"></i> Verified Academic Materials
                </span>
                <span class="nova-status-pill">${count} Results</span>
              </div>
              <div class="nova-action-body">
                Explore verified lecture notes, question papers, and solutions.
              </div>
              <a href="${StudyHubActions.escapeHtml(searchUrl)}" class="nova-action-btn" target="_blank" rel="noopener">
                <i class="ri-search-line"></i> View Matching Documents
              </a>
            </div>
          `;
        }
        default:
          return '';
      }
    },
    escapeHtml: function(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };
  window.StudyHubActions = StudyHubActions;
})(window);

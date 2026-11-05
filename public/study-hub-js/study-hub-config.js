/** DPGNotes NOVA - Frontend Configuration */
(function(window) {
  'use strict';
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const defaultBackend = isLocal ? 'http://localhost:5000' : 'https://dpgnotes.onrender.com';
  const baseUrl = window.API_BASE_URL || window.RENDER_BACKEND_URL || defaultBackend;
  const StudyHubConfig = {
    appName: 'DPGNotes NOVA',
    tagline: 'Chat, Search , Find',
    version: '2.0.0',
    iconClass: 'ri-book-open-line',
    baseUrl: baseUrl.replace(/\/+$/, ''),
    endpoints: {
      health: `${baseUrl.replace(/\/+$/, '')}/api/study-hub/health`,
      knowledge: `${baseUrl.replace(/\/+$/, '')}/api/study-hub/knowledge`,
      chat: `${baseUrl.replace(/\/+$/, '')}/api/study-hub/chat`,
      agent: `${baseUrl.replace(/\/+$/, '')}/api/study-hub/agent`,
      actions: `${baseUrl.replace(/\/+$/, '')}/api/study-hub/actions/execute`,
      quiz: `${baseUrl.replace(/\/+$/, '')}/api/study-hub/quiz/prepare`,
      legal: `${baseUrl.replace(/\/+$/, '')}/api/study-hub/legal`
    },
    defaultPrompts: [
      { text: "Explain database normalization with examples", icon: "ri-database-2-line" },
      { text: "Find Cloud Computing notes", icon: "ri-cloud-line" },
      { text: "I need 15 MCQs on Software Engineering Unit 1", icon: "ri-survey-line" },
      { text: "Explain the DPGNotes Privacy Policy", icon: "ri-shield-check-line" },
      { text: "Find practical files related to JavaScript", icon: "ri-code-line" }
    ],
    maxContextTurns: 8,
    requestTimeoutMs: 25000
  };
  window.StudyHubConfig = StudyHubConfig;
})(window);

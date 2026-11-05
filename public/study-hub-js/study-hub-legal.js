/** DPGNotes NOVA - Legal Documentation Agent Client */
(function(window) {
  'use strict';
  const StudyHubLegal = {
    /**
     * Fetches legal guidance for a query or specific document.
     * @param {string} query 
     * @param {string} documentId 
     * @returns {Promise<object>}
     */
    queryLegalDocument: async function(query = '', documentId = 'auto') {
      try {
        const baseEndpoint = window.StudyHubConfig ? window.StudyHubConfig.endpoints.legal : '/api/study-hub/legal';
        const url = new URL(baseEndpoint, window.location.origin);
        if (query) url.searchParams.set('query', query);
        if (documentId && documentId !== 'auto') url.searchParams.set('documentId', documentId);
        const res = await fetch(url.toString(), {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            return data;
          }
        }
      } catch (err) {
        console.warn('[NOVA Legal] Server legal query fallback:', err.message);
      }
      return {
        success: true,
        documentId: 'privacy-policy',
        title: 'DPGNotes Privacy & Integrity Policy',
        url: '/legal/privacy-policy.html',
        disclaimer: 'Guidance provided for platform transparency. Not legal counsel.',
        sections: [
          {
            heading: 'Academic & Data Privacy Commitment',
            content: 'DPGNotes operates an ephemeral zero-retention architecture for AI Study Hub interactions and protects uploaded academic records under standard university guidelines.'
          }
        ]
      };
    }
  };
  window.StudyHubLegal = StudyHubLegal;
})(window);

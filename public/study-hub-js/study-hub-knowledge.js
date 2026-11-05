/** DPGNotes NOVA - Knowledge Trainee Client */
(function(window) {
  'use strict';
  let clientCachedKnowledge = null;
  let isFetching = false;
  const StudyHubKnowledge = {
    /**
     * Retrieves or refreshes platform knowledge from backend.
     * @returns {Promise<object>}
     */
    getKnowledge: async function() {
      if (clientCachedKnowledge) return clientCachedKnowledge;
      if (isFetching) {
        await new Promise(r => setTimeout(r, 300));
        if (clientCachedKnowledge) return clientCachedKnowledge;
      }
      isFetching = true;
      try {
        const url = window.StudyHubConfig ? window.StudyHubConfig.endpoints.knowledge : '/api/study-hub/knowledge';
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.knowledge) {
            clientCachedKnowledge = data.knowledge;
            console.log('[NOVA Knowledge] Platform knowledge retrieved successfully.');
            return clientCachedKnowledge;
          }
        }
      } catch (err) {
        console.warn('[NOVA Knowledge] Knowledge fetch error, using local fallback:', err.message);
      } finally {
        isFetching = false;
      }
      clientCachedKnowledge = {
        platform: 'DPGNotes',
        features: {
          search: { destination: '/dpgnotes-serp.html', tabs: ['all', 'ai', 'website', 'videos', 'solutions', 'quizzes', 'contributors'] },
          quizStudio: { destination: '/Quizes/quiz-generator.html' }
        }
      };
      return clientCachedKnowledge;
    },
    /**
     * Resolves relevant knowledge for a specific user query.
     * @param {string} query 
     * @returns {Promise<object>}
     */
    findRelevantContext: async function(query = '') {
      const k = await this.getKnowledge();
      const q = query.toLowerCase();
      return {
        matchedFeature: q.includes('quiz') ? 'quizStudio' : q.includes('search') || q.includes('notes') ? 'search' : 'general',
        platform: 'DPGNotes',
        assistant: 'DPGNotes NOVA'
      };
    }
  };
  window.StudyHubKnowledge = StudyHubKnowledge;
})(window);

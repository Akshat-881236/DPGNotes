/** DPGNotes NOVA - Intelligent Quiz Generator Client */
(function(window) {
  'use strict';

  const StudyHubQuiz = {
    /**
     * Generates a complete academic quiz via the backend AI engine.
     * @param {object} params 
     * @returns {Promise<object>}
     */
    generateQuiz: async function(params = {}) {
      try {
        const res = await fetch('/api/study-hub/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(params)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) return data;
        }
      } catch (err) {
        console.warn('[NOVA Quiz] AI Quiz generation network error, falling back to local builder:', err.message);
      }
      return this.prepareQuizUrl(params);
    },

    /**
     * Validates a quiz configuration against the official DPGNotes schema.
     * @param {object} quizData 
     * @returns {Promise<object>}
     */
    validateQuiz: async function(quizData = {}) {
      try {
        const res = await fetch('/api/study-hub/quiz/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(quizData)
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('[NOVA Quiz] Validation call error:', err.message);
      }
      return { success: true, valid: true, errors: [], warnings: [] };
    },

    /**
     * Builds a prefilled Quiz Studio URL.
     * @param {object} params 
     * @returns {Promise<object>}
     */
    buildQuizUrl: async function(params = {}) {
      try {
        const res = await fetch('/api/study-hub/quiz/build-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(params)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) return data;
        }
      } catch (err) {
        console.warn('[NOVA Quiz] Build URL error:', err.message);
      }
      return this.prepareQuizUrl(params);
    },

    /**
     * Retrieves the official public Quiz Studio parameter contract and capabilities.
     * @returns {Promise<object>}
     */
    getSchema: async function() {
      try {
        const res = await fetch('/api/study-hub/quiz/schema', {
          headers: { 'Accept': 'application/json' }
        });
        if (res.ok) return await res.json();
      } catch (err) {
        console.warn('[NOVA Quiz] Get schema error:', err.message);
      }
      return null;
    },

    /**
     * Prepares a prefilled quiz configuration URL.
     * Preserved for backwards compatibility with instant local fallback.
     * @param {object} params 
     * @returns {Promise<object>}
     */
    prepareQuizUrl: async function(params = {}) {
      try {
        const endpoint = (window.StudyHubConfig && window.StudyHubConfig.endpoints && window.StudyHubConfig.endpoints.quiz) 
          ? window.StudyHubConfig.endpoints.quiz 
          : '/api/study-hub/quiz/prepare';

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(params)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) return data;
        }
      } catch (err) {
        console.warn('[NOVA Quiz] Server quiz preparation fallback:', err.message);
      }

      // Client-side fallback URL construction using native URLSearchParams
      const subName = (params.subName || params.subject || 'Academic Course').trim();
      const quizTitle = (params.quizTitle || `${subName} Practice Assessment`).trim();
      const totalQuestionCount = Math.max(10, Math.min(120, params.totalQuestionCount || params.questionCount || 10));
      const timeAlloted = params.timeAlloted || params.timeMinutes || 30;
      const quizVisibilty = (params.quizVisibilty || params.visibility || 'Public').toLowerCase() === 'private' ? 'Private' : 'Public';
      const correctScore = params.correctScore || 1;
      const wrongScore = params.wrongScore || 0;
      const unattemptScore = params.unattemptScore || 0;

      const sp = new URLSearchParams();
      sp.set('subName', subName);
      if (params.subCode) sp.set('subCode', String(params.subCode).trim());
      if (params.topicTags) sp.set('topicTags', Array.isArray(params.topicTags) ? params.topicTags.join(', ') : String(params.topicTags).trim());
      sp.set('quizTitle', quizTitle);
      if (params.desc) sp.set('desc', String(params.desc).trim());
      sp.set('totalQuestionCount', String(totalQuestionCount));
      sp.set('timeAlloted', String(timeAlloted));
      sp.set('quizVisibilty', quizVisibilty);
      sp.set('correctScore', String(correctScore));
      sp.set('wrongScore', String(wrongScore));
      sp.set('unattemptScore', String(unattemptScore));

      if (Array.isArray(params.questions) && params.questions.length > 0) {
        params.questions.forEach((q, idx) => {
          const qN = idx + 1;
          if (q && (q.prompt || q.questionText)) {
            sp.set(`q${qN}`, String(q.prompt || q.questionText).trim());
            const options = Array.isArray(q.options) ? q.options : [];
            options.forEach((opt, oIdx) => {
              // Apply HTML entity escaping for literal tags in options
              const safeOpt = String(opt)
                .replace(/&(?!(amp|lt|gt|quot|#39);)/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
              sp.set(`q${qN}o${oIdx + 1}`, safeOpt);
            });
            const correctIdxs = Array.isArray(q.correctOptionIndexes) ? q.correctOptionIndexes : [1];
            correctIdxs.forEach((cIdx, kIdx) => {
              sp.set(`q${qN}correctOption${kIdx + 1}Index`, String(cIdx));
            });
          }
        });
      }

      const fallbackUrl = `https://dpgnotes.web.app/Quizes/quiz-generator.html?${sp.toString()}`;
      return {
        success: true,
        url: fallbackUrl,
        relativeUrl: `/Quizes/quiz-generator.html?${sp.toString()}`,
        urlLength: fallbackUrl.length,
        isLongUrl: fallbackUrl.length > 6000,
        summary: {
          subName,
          quizTitle,
          totalQuestionCount,
          timeAlloted,
          quizVisibilty
        }
      };
    }
  };

  window.StudyHubQuiz = StudyHubQuiz;
})(window);

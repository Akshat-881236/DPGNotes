/** DPGNotes NOVA - Instant Quiz Generator Agent Client */
(function(window) {
  'use strict';
  const StudyHubQuiz = {
    /**
     * Prepares a prefilled quiz configuration URL.
     * @param {object} params 
     * @returns {Promise<object>}
     */
    prepareQuizUrl: async function(params = {}) {
      try {
        const endpoint = window.StudyHubConfig ? window.StudyHubConfig.endpoints.quiz : '/api/study-hub/quiz/prepare';
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
          if (data.success) {
            return data;
          }
        }
      } catch (err) {
        console.warn('[NOVA Quiz] Server quiz preparation fallback:', err.message);
      }
      const subName = (params.subName || 'Academic Course').trim();
      const quizTitle = (params.quizTitle || `${subName} Assessment`).trim();
      const questionCount = params.questionCount || 10;
      const timeMinutes = params.timeMinutes || 30;
      const sp = new URLSearchParams();
      sp.set('subName', subName);
      sp.set('quizTitle', quizTitle);
      sp.set('totalQuestionCount', String(questionCount));
      sp.set('timeMinutes', String(timeMinutes));
      sp.set('quizVisibilty', 'public');
      const fallbackUrl = `/Quizes/quiz-generator.html?${sp.toString()}`;
      return {
        success: true,
        url: fallbackUrl,
        summary: {
          subName,
          quizTitle,
          questionCount,
          timeMinutes
        }
      };
    }
  };
  window.StudyHubQuiz = StudyHubQuiz;
})(window);

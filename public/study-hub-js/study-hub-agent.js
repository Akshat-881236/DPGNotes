/** DPGNotes NOVA - Frontend Agent Orchestrator */
(function(window) {
  'use strict';
  const StudyHubAgent = {
    /**
     * Executes the conversational agent workflow for a user message.
     * @param {string} userText 
     * @param {HTMLElement} threadEl 
     * @param {Function} onStatusChange 
     * @returns {Promise<object>}
     */
    processUserTurn: async function(userText, threadEl, onStatusChange = null) {
      if (!userText || !userText.trim()) return null;
      const userMsg = window.StudyHubContext.addMessage('user', userText.trim());
      window.StudyHubRenderer.appendMessageElement(threadEl, userMsg);
      window.StudyHubRenderer.showTypingIndicator(threadEl);
      if (onStatusChange) onStatusChange('NOVA is thinking...');
      try {
        const knowledgeContext = await window.StudyHubKnowledge.findRelevantContext(userText);
        const recentTurns = window.StudyHubContext.getRecentTurns(8);
        const chatEndpoint = window.StudyHubConfig ? window.StudyHubConfig.endpoints.chat : '/api/study-hub/chat';
        const headers = {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        };
        if (window.dpgAuth && window.dpgAuth.currentUser) {
          headers['x-user-uid'] = window.dpgAuth.currentUser.uid;
          headers['x-user-email'] = window.dpgAuth.currentUser.email || '';
          headers['x-user-role'] = 'student';
        }
        const res = await fetch(chatEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            message: userText.trim(),
            messages: recentTurns,
            knowledgeContext
          })
        });
        window.StudyHubRenderer.hideTypingIndicator(threadEl);
        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Unable to process request.');
        }
        const assistantMsg = window.StudyHubContext.addMessage('assistant', data.message, data.actions || []);
        window.StudyHubRenderer.appendMessageElement(threadEl, assistantMsg);
        if (onStatusChange) onStatusChange('Ready');
        return data;
      } catch (err) {
        console.error('[NOVA Agent] Error during interaction:', err);
        window.StudyHubRenderer.hideTypingIndicator(threadEl);
        const errorMsg = window.StudyHubContext.addMessage(
          'assistant',
          "I experienced a temporary difficulty connecting with the platform engine. You can ask me your question again, or explore our [Main Course Library](index.html) or [Search SERP](dpgnotes-serp.html)."
        );
        window.StudyHubRenderer.appendMessageElement(threadEl, errorMsg);
        if (onStatusChange) onStatusChange('Ready');
        return null;
      }
    }
  };
  window.StudyHubAgent = StudyHubAgent;
})(window);

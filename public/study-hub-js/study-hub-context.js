/** DPGNotes NOVA - Ephemeral Session Context */
(function(window) {
  'use strict';
  let activeMessages = [];
  const StudyHubContext = {
    /**
     * Adds a message to temporary session memory.
     * @param {'user'|'assistant'} role 
     * @param {string} content 
     * @param {Array<object>} actions 
     * @returns {object} createdMessage
     */
    addMessage: function(role, content, actions = []) {
      const msgObj = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        role: role === 'user' ? 'user' : 'assistant',
        content: String(content || ''),
        actions: Array.isArray(actions) ? actions : [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      activeMessages.push(msgObj);
      if (activeMessages.length > 20) {
        activeMessages.shift();
      }
      return msgObj;
    },
    /**
     * Retrieves recent messages formatted for API payload.
     * @param {number} limit 
     * @returns {Array<{ role: string, content: string }>}
     */
    getRecentTurns: function(limit = 8) {
      const sliceCount = Math.min(limit, activeMessages.length);
      const recent = activeMessages.slice(-sliceCount);
      return recent.map(m => ({
        role: m.role,
        content: m.content
      }));
    },
    /**
     * Retrieves all active messages for printing or inspection.
     * @returns {Array<object>}
     */
    getAllMessages: function() {
      return [...activeMessages];
    },
    /**
     * Checks if any messages exist in current session.
     * @returns {boolean}
     */
    hasMessages: function() {
      return activeMessages.length > 0;
    },
    /**
     * Clears all session messages from memory entirely.
     */
    clearSession: function() {
      activeMessages = [];
      console.log('[NOVA Context] Ephemeral session memory cleared.');
    }
  };
  window.StudyHubContext = StudyHubContext;
})(window);

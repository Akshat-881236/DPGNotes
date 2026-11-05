/** DPGNotes NOVA - Chat Interface Controller */
(function(window) {
  'use strict';
  const StudyHubChat = {
    isSending: false,
    /**
     * Initializes chat listeners and elements.
     */
    init: function() {
      const threadEl = document.getElementById('novaThread');
      const inputEl = document.getElementById('novaInput');
      const sendBtn = document.getElementById('novaSendBtn');
      const statusPill = document.getElementById('novaStatusPill');
      if (!threadEl || !inputEl || !sendBtn) {
        console.warn('[NOVA Chat] Required chat elements not found.');
        return;
      }
      inputEl.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = `${Math.min(this.scrollHeight, 140)}px`;
      });
      inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          StudyHubChat.sendMessage();
        }
      });
      sendBtn.addEventListener('click', function(e) {
        e.preventDefault();
        StudyHubChat.sendMessage();
      });
      if (!window.StudyHubContext.hasMessages()) {
        const welcomeMsg = window.StudyHubContext.addMessage(
          'assistant',
          `Hello! I'm **DPGNotes NOVA** — your academic companion and platform guide.

I can help you:
- **Understand concepts**: Computer Science, DBMS, Cloud Computing, Operating Systems, Java, Web Dev, Physical Education & Aptitude.
- **Find resources**: Locate lecture notes, syllabus guides, and previous year examination papers.
- **Create assessments**: Prepare quizzes and MCQs for any unit directly in the DPGNotes Quiz Studio.
- **Explore platform rules**: Answer questions regarding DPGNotes Privacy, Terms, and Contributor policies.

What would you like to explore today?`
        );
        window.StudyHubRenderer.appendMessageElement(threadEl, welcomeMsg);
      }
    },
    /**
     * Sends user input to the agent engine.
     */
    sendMessage: async function() {
      if (this.isSending) return;
      const threadEl = document.getElementById('novaThread');
      const inputEl = document.getElementById('novaInput');
      const sendBtn = document.getElementById('novaSendBtn');
      const statusPill = document.getElementById('novaStatusPill');
      if (!inputEl) return;
      const text = inputEl.value.trim();
      if (!text) return;
      this.isSending = true;
      inputEl.value = '';
      inputEl.style.height = 'auto';
      if (sendBtn) sendBtn.disabled = true;
      try {
        await window.StudyHubAgent.processUserTurn(text, threadEl, function(statusText) {
          if (statusPill) statusPill.innerText = statusText;
        });
      } finally {
        this.isSending = false;
        if (sendBtn) sendBtn.disabled = false;
        if (inputEl) inputEl.focus();
      }
    },
    /**
     * Sends a suggested quick prompt into the conversation.
     * @param {string} promptText 
     */
    sendQuickPrompt: function(promptText) {
      const inputEl = document.getElementById('novaInput');
      if (inputEl) {
        inputEl.value = promptText;
        this.sendMessage();
      }
    }
  };
  window.StudyHubChat = StudyHubChat;
})(window);

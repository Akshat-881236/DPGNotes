/** DPGNotes NOVA - Content & Markdown Renderer */
(function(window) {
  'use strict';
  if (typeof window.marked !== 'undefined') {
    window.marked.setOptions({
      gfm: true,
      breaks: true
    });
  }
  const StudyHubRenderer = {
    /**
     * Sanitizes and parses markdown text into clean HTML.
     * @param {string} rawText 
     * @returns {string} html
     */
    renderMarkdown: function(rawText = '') {
      if (!rawText) return '';
      let text = String(rawText);
      if (typeof window.katex !== 'undefined') {
        text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
          try {
            return window.katex.renderToString(formula, { displayMode: true });
          } catch (e) {
            return match;
          }
        });
        text = text.replace(/\\?\(([\s\S]+?)\\?\)/g, (match, formula) => {
          try {
            return window.katex.renderToString(formula, { displayMode: false });
          } catch (e) {
            return match;
          }
        });
      }
      let parsed = '';
      if (typeof window.marked !== 'undefined' && typeof window.marked.parse === 'function') {
        parsed = window.marked.parse(text);
      } else {
        parsed = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n/g, '<br>');
      }
      if (typeof window.DOMPurify !== 'undefined' && typeof window.DOMPurify.sanitize === 'function') {
        return window.DOMPurify.sanitize(parsed, {
          ADD_ATTR: ['target', 'rel']
        });
      }
      return parsed;
    },
    /**
     * Appends a user or assistant message to the chat thread DOM.
     * @param {HTMLElement} threadEl 
     * @param {object} msg 
     */
    appendMessageElement: function(threadEl, msg) {
      if (!threadEl) return;
      const isUser = msg.role === 'user';
      const row = document.createElement('div');
      row.className = `nova-msg-row ${isUser ? 'user-row' : 'assistant-row'}`;
      row.id = msg.id || `msg_${Date.now()}`;
      const iconDiv = document.createElement('div');
      iconDiv.className = 'nova-msg-icon';
      iconDiv.innerHTML = isUser ? '<i class="ri-user-line"></i>' : '<i class="ri-book-open-line"></i>';
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'nova-bubble';
      let contentHtml = this.renderMarkdown(msg.content);
      if (Array.isArray(msg.actions) && msg.actions.length > 0 && window.StudyHubActions) {
        let cardsHtml = '';
        msg.actions.forEach(act => {
          cardsHtml += window.StudyHubActions.buildActionCardHtml(act);
        });
        contentHtml += cardsHtml;
      }
      bubbleDiv.innerHTML = contentHtml;
      const footerDiv = document.createElement('div');
      footerDiv.className = 'nova-bubble-footer';
      footerDiv.innerHTML = `
        <span>${msg.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        ${!isUser ? `<button type="button" class="nova-btn-copy" onclick="window.StudyHubRenderer.copyMessageText('${row.id}')" title="Copy message"><i class="ri-file-copy-line"></i> Copy</button>` : ''}
      `;
      bubbleDiv.appendChild(footerDiv);
      row.appendChild(iconDiv);
      row.appendChild(bubbleDiv);
      threadEl.appendChild(row);
      threadEl.scrollTop = threadEl.scrollHeight;
    },
    /**
     * Renders typing/thinking indicator in thread.
     * @param {HTMLElement} threadEl 
     * @returns {HTMLElement} indicatorEl
     */
    showTypingIndicator: function(threadEl) {
      if (!threadEl) return null;
      this.hideTypingIndicator(threadEl);
      const row = document.createElement('div');
      row.className = 'nova-msg-row assistant-row nova-typing-row';
      row.id = 'novaTypingRow';
      const iconDiv = document.createElement('div');
      iconDiv.className = 'nova-msg-icon';
      iconDiv.innerHTML = '<i class="ri-book-open-line"></i>';
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'nova-bubble nova-typing-indicator';
      bubbleDiv.innerHTML = `
        <span class="nova-typing-dot"></span>
        <span class="nova-typing-dot"></span>
        <span class="nova-typing-dot"></span>
      `;
      row.appendChild(iconDiv);
      row.appendChild(bubbleDiv);
      threadEl.appendChild(row);
      threadEl.scrollTop = threadEl.scrollHeight;
      return row;
    },
    /**
     * Removes typing indicator from thread.
     * @param {HTMLElement} threadEl 
     */
    hideTypingIndicator: function(threadEl) {
      if (!threadEl) return;
      const existing = threadEl.querySelector('#novaTypingRow');
      if (existing) existing.remove();
    },
    /**
     * Copies message content to clipboard.
     * @param {string} rowId 
     */
    copyMessageText: function(rowId) {
      const row = document.getElementById(rowId);
      if (!row) return;
      const bubble = row.querySelector('.nova-bubble');
      if (!bubble) return;
      const clone = bubble.cloneNode(true);
      const footer = clone.querySelector('.nova-bubble-footer');
      if (footer) footer.remove();
      const text = clone.innerText || clone.textContent || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.trim()).then(() => {
          const btn = row.querySelector('.nova-btn-copy');
          if (btn) {
            btn.innerHTML = '<i class="ri-check-line"></i> Copied!';
            setTimeout(() => {
              btn.innerHTML = '<i class="ri-file-copy-line"></i> Copy';
            }, 2000);
          }
        });
      }
    }
  };
  window.StudyHubRenderer = StudyHubRenderer;
})(window);

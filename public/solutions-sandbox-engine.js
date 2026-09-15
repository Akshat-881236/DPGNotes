/**
 * DPGNotes Academic Solutions Suite - Advanced Sandbox & Code Engine
 * Provides live per-question preview, HTML/CSS/JS container linking,
 * syntax container rendering, and interactive sandbox execution with console logs.
 */

(function() {
  'use strict';

  let currentActiveSandboxData = {
    html: '',
    css: '',
    js: '',
    groupId: '',
    title: ''
  };

  let isMobileDeviceView = false;
  let consoleLogCount = 0;

  // Initialize modal in DOM
  function ensureSandboxModalInDom() {
    if (typeof document === 'undefined' || !document.body || typeof document.getElementById !== 'function' || typeof document.createElement !== 'function' || document.getElementById('advancedSandboxModal')) return;

    const modalHtml = `
      <div id="advancedSandboxModal" class="sol-modal-overlay sol-sandbox-modal-overlay" style="display:none; z-index:99999;">
        <div class="sol-sandbox-modal-card">
          <div class="sol-sandbox-topbar">
            <div class="sol-sandbox-topbar-left">
              <div class="sol-sandbox-title">
                <i class="ri-play-circle-fill" style="color:#10b981; font-size:1.3rem;"></i>
                <span id="sandboxModalTitle">Interactive Code Sandbox</span>
              </div>
              <div class="sol-sandbox-tabs">
                <button type="button" class="sol-sandbox-tab-btn active" id="tabBtnPreview" onclick="window.switchSandboxTab('preview')">
                  <i class="ri-layout-masonry-line"></i> Browser View
                </button>
                <button type="button" class="sol-sandbox-tab-btn" id="tabBtnConsole" onclick="window.switchSandboxTab('console')">
                  <i class="ri-terminal-box-line"></i> Console <span id="consoleBadge" style="background:#ef4444; color:white; font-size:0.7rem; padding:1px 6px; border-radius:999px; display:none; margin-left:4px;">0</span>
                </button>
              </div>
            </div>
            <div class="sol-sandbox-topbar-actions">
              <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" onclick="window.toggleSandboxDeviceView()" title="Toggle Mobile/Desktop View">
                <i class="ri-smartphone-line" id="deviceViewIcon"></i> <span id="deviceViewText">Device</span>
              </button>
              <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" onclick="window.rerunCurrentSandbox()" title="Re-run code execution">
                <i class="ri-refresh-line"></i> Re-run
              </button>
              <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" onclick="window.closeAdvancedSandboxModal()" title="Close Sandbox">
                <i class="ri-close-line"></i> Close
              </button>
            </div>
          </div>

          <div class="sol-sandbox-body-area" id="sandboxBodyArea">
            <div id="sandboxIframeWrapper" style="width:100%; height:100%; display:flex; justify-content:center; background:#f8fafc; transition:all 0.25s ease;">
              <iframe id="advancedSandboxIframe" class="sol-sandbox-iframe-pane" sandbox="allow-scripts allow-modals allow-forms"></iframe>
            </div>
            <div id="advancedSandboxConsole" class="sol-sandbox-console-pane">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.1);">
                <span style="color:#94a3b8; font-size:0.75rem; font-weight:700;">LIVE BROWSER CONSOLE LOGS &amp; ERRORS</span>
                <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" style="font-size:0.72rem; padding:2px 8px;" onclick="window.clearSandboxConsole()">
                  <i class="ri-delete-bin-7-line"></i> Clear Console
                </button>
              </div>
              <div id="consoleLogsContainer" style="display:flex; flex-direction:column; gap:4px;"></div>
            </div>
          </div>

          <div class="sol-sandbox-statusbar">
            <span><i class="ri-shield-check-fill" style="color:#10b981;"></i> Sandboxed in-memory environment &bull; No server execution</span>
            <span id="sandboxActiveGroupId" style="font-family:'Fira Code', monospace; color:#38bdf8;">group: default</span>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Listen for postMessage from sandbox iframe
    window.addEventListener('message', function(evt) {
      if (!evt.data || evt.data.type !== 'DPG_SANDBOX_CONSOLE') return;
      handleSandboxConsoleMessage(evt.data);
    });
  }

  function handleSandboxConsoleMessage(data) {
    const container = document.getElementById('consoleLogsContainer');
    const badge = document.getElementById('consoleBadge');
    if (!container) return;

    consoleLogCount++;
    if (badge) {
      badge.textContent = consoleLogCount;
      badge.style.display = 'inline-block';
    }

    const item = document.createElement('div');
    const levelClass = data.level === 'error' ? 'log-error' : (data.level === 'warn' ? 'log-warn' : 'log-info');
    item.className = 'sol-console-item ' + levelClass;

    const icon = data.level === 'error' ? '<i class="ri-close-circle-fill" style="color:#ef4444;"></i>' : (data.level === 'warn' ? '<i class="ri-alert-fill" style="color:#f59e0b;"></i>' : '<i class="ri-information-fill" style="color:#38bdf8;"></i>');

    item.innerHTML = `
      <span class="timestamp">[${data.time || new Date().toLocaleTimeString()}]</span>
      <span>${icon}</span>
      <span style="word-break:break-all;">${escapeHtml(data.message || '')}</span>
    `;

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  // Switch tabs between Browser View and Console Output
  window.switchSandboxTab = function(tab) {
    const tabPreview = document.getElementById('tabBtnPreview');
    const tabConsole = document.getElementById('tabBtnConsole');
    const iframeWrapper = document.getElementById('sandboxIframeWrapper');
    const consolePane = document.getElementById('advancedSandboxConsole');

    if (!tabPreview || !tabConsole || !iframeWrapper || !consolePane) return;

    if (tab === 'console') {
      tabPreview.classList.remove('active');
      tabConsole.classList.add('active');
      iframeWrapper.style.display = 'none';
      consolePane.style.display = 'block';
    } else {
      tabConsole.classList.remove('active');
      tabPreview.classList.add('active');
      consolePane.style.display = 'none';
      iframeWrapper.style.display = 'flex';
    }
  };

  // Toggle responsive smartphone viewport (375px) vs 100% desktop
  window.toggleSandboxDeviceView = function() {
    const wrapper = document.getElementById('sandboxIframeWrapper');
    const iframe = document.getElementById('advancedSandboxIframe');
    const textEl = document.getElementById('deviceViewText');
    const iconEl = document.getElementById('deviceViewIcon');
    if (!wrapper || !iframe) return;

    isMobileDeviceView = !isMobileDeviceView;
    if (isMobileDeviceView) {
      iframe.style.width = (window.innerWidth <= 480) ? '100%' : '375px';
      iframe.style.maxWidth = '100%';
      iframe.style.border = '8px solid #334155';
      iframe.style.borderRadius = '24px';
      iframe.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
      iframe.style.margin = '20px auto';
      iframe.style.height = 'calc(100% - 40px)';
      if (textEl) textEl.textContent = (window.innerWidth <= 480) ? 'Mobile (100%)' : 'Mobile (375px)';
      if (iconEl) iconEl.className = 'ri-computer-line';
    } else {
      iframe.style.width = '100%';
      iframe.style.maxWidth = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '0';
      iframe.style.boxShadow = 'none';
      iframe.style.margin = '0';
      iframe.style.height = '100%';
      if (textEl) textEl.textContent = 'Desktop';
      if (iconEl) iconEl.className = 'ri-smartphone-line';
    }
  };

  window.clearSandboxConsole = function() {
    const container = document.getElementById('consoleLogsContainer');
    const badge = document.getElementById('consoleBadge');
    if (container) container.innerHTML = '';
    consoleLogCount = 0;
    if (badge) {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
  };

  window.closeAdvancedSandboxModal = function() {
    const modal = document.getElementById('advancedSandboxModal');
    if (modal) modal.style.display = 'none';
    const iframe = document.getElementById('advancedSandboxIframe');
    if (iframe) iframe.src = 'about:blank';
  };

  window.rerunCurrentSandbox = function() {
    if (!currentActiveSandboxData) return;
    executeSandbox(currentActiveSandboxData.html, currentActiveSandboxData.css, currentActiveSandboxData.js, currentActiveSandboxData.title, currentActiveSandboxData.groupId);
  };

  // Execute Sandbox Runner
  function executeSandbox(htmlCode, cssCode, jsCode, title, groupId) {
    ensureSandboxModalInDom();
    currentActiveSandboxData = { html: htmlCode, css: cssCode, js: jsCode, title: title, groupId: groupId };

    window.clearSandboxConsole();
    window.switchSandboxTab('preview');

    const modal = document.getElementById('advancedSandboxModal');
    const titleEl = document.getElementById('sandboxModalTitle');
    const groupEl = document.getElementById('sandboxActiveGroupId');
    const iframe = document.getElementById('advancedSandboxIframe');

    if (titleEl) titleEl.textContent = title || 'Interactive Code Sandbox';
    if (groupEl) groupEl.textContent = 'group: ' + (groupId || 'default');
    if (modal) modal.style.display = 'flex';

    // Build the compiled, isolated document
    const assembledDoc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title || 'Sandbox Output')}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 1.25rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.5;
    }
    ${cssCode || ''}
  </style>
  <script>
    (function() {
      function emit(level, args) {
        try {
          var parts = Array.prototype.slice.call(args).map(function(item) {
            if (typeof item === 'object' && item !== null) {
              try { return JSON.stringify(item); } catch(e) { return String(item); }
            }
            return String(item);
          });
          window.parent.postMessage({
            type: 'DPG_SANDBOX_CONSOLE',
            level: level,
            message: parts.join(' '),
            time: new Date().toLocaleTimeString()
          }, '*');
        } catch(e) {}
      }
      var _log = console.log, _warn = console.warn, _err = console.error, _info = console.info;
      console.log = function() { _log.apply(console, arguments); emit('log', arguments); };
      console.warn = function() { _warn.apply(console, arguments); emit('warn', arguments); };
      console.error = function() { _err.apply(console, arguments); emit('error', arguments); };
      console.info = function() { _info.apply(console, arguments); emit('info', arguments); };
      window.onerror = function(msg, url, line) {
        emit('error', ['Runtime Error: ' + msg + (line ? ' (Line ' + line + ')' : '')]);
        return true; // Prevents error leaking to host browser console
      };
    })();
  <\/script>
</head>
<body>
  ${htmlCode || '<div style="color:#64748b; font-style:italic;">No HTML markup provided.</div>'}
  <script id="dpg-user-script" type="text/plain">${encodeURIComponent(jsCode || '')}<\/script>
  <script>
    (function() {
      try {
        var raw = document.getElementById('dpg-user-script').textContent;
        if (raw && raw.trim()) {
          var userCode = decodeURIComponent(raw);
          var s = document.createElement('script');
          s.textContent = userCode;
          document.body.appendChild(s);
        }
      } catch (err) {
        console.error("Execution Error: " + err.message);
      }
    })();
  <\/script>
</body>
</html>`;

    if (iframe) {
      iframe.srcdoc = assembledDoc;
    }
  }

  // Multi-stage Sandbox Code Extractor: guarantees locating executable code even across prefixed or scoped IDs
  function extractSandboxCodeForGroup(groupId) {
    let htmlCode = '';
    let cssCode = '';
    let jsCode = '';

    if (!groupId) return { html: '', css: '', js: '' };

    // 1. Search for explicit ID elements first
    const htmlEl = document.getElementById('code-html-' + groupId);
    const cssEl = document.getElementById('code-css-' + groupId);
    const jsEl = document.getElementById('code-js-' + groupId);

    if (htmlEl) htmlCode = extractCodeFromElement(htmlEl);
    if (cssEl) cssCode = extractCodeFromElement(cssEl);
    if (jsEl) jsCode = extractCodeFromElement(jsEl);

    // 2. Exact match on data-sandbox-group or data-code-group
    const exactGroupContainers = document.querySelectorAll(`[data-sandbox-group="${groupId}"], [data-code-group="${groupId}"]`);
    exactGroupContainers.forEach(container => {
      const lang = (container.getAttribute('data-lang') || '').toLowerCase();
      const code = extractCodeFromElement(container);
      if (!htmlCode && (lang === 'html' || lang === 'markup')) htmlCode = code;
      else if (!cssCode && (lang === 'css' || lang === 'scss')) cssCode = code;
      else if (!jsCode && (lang === 'js' || lang === 'javascript')) jsCode = code;
    });

    // 3. Prefix match if groupId was indexed (e.g. prac_1 matching prac_1_1, prac_1_2)
    if (!htmlCode || !cssCode || !jsCode) {
      const prefixContainers = document.querySelectorAll(`[data-sandbox-group^="${groupId}"], [data-code-group^="${groupId}"]`);
      prefixContainers.forEach(container => {
        const lang = (container.getAttribute('data-lang') || '').toLowerCase();
        const code = extractCodeFromElement(container);
        if (!htmlCode && (lang === 'html' || lang === 'markup')) htmlCode = code;
        else if (!cssCode && (lang === 'css' || lang === 'scss')) cssCode = code;
        else if (!jsCode && (lang === 'js' || lang === 'javascript')) jsCode = code;
      });
    }

    // 4. Card / Article scope search (e.g., experiment_1, question_1, prac_1)
    if (!htmlCode && !cssCode && !jsCode) {
      let scopeEl = document.getElementById(groupId);
      if (!scopeEl) {
        const numMatch = groupId.match(/\d+/);
        if (numMatch) {
          const num = numMatch[0];
          scopeEl = document.getElementById('experiment_' + num) ||
                    document.getElementById('question_' + num) ||
                    document.getElementById('prac_' + num) ||
                    document.getElementById('exp_' + num);
        }
      }

      if (scopeEl) {
        const codeNodes = scopeEl.querySelectorAll('.sol-code-block-container, .code-container, pre');
        codeNodes.forEach(node => {
          const lang = (node.getAttribute('data-lang') || '').toLowerCase();
          const code = extractCodeFromElement(node);
          if (!code) return;

          if (!htmlCode && (lang === 'html' || lang === 'markup' || /<(!DOCTYPE|html|head|body|div|button|p|form|span)/i.test(code))) {
            htmlCode = code;
          } else if (!cssCode && (lang === 'css' || lang === 'scss' || (/\{[\s\S]*:[^;]+;/i.test(code) && !code.includes('function')))) {
            cssCode = code;
          } else if (!jsCode && (lang === 'js' || lang === 'javascript' || /function\b|console\.log|addEventListener|document\./i.test(code))) {
            jsCode = code;
          }
        });
      }
    }

    // 5. Global fallback if only 1 code block exists in active document
    if (!htmlCode && !cssCode && !jsCode) {
      const allContainers = document.querySelectorAll('.sol-code-block-container, .code-container');
      if (allContainers.length === 1) {
        const singleNode = allContainers[0];
        const lang = (singleNode.getAttribute('data-lang') || '').toLowerCase();
        const code = extractCodeFromElement(singleNode);
        if (lang === 'html' || lang === 'markup') htmlCode = code;
        else if (lang === 'css') cssCode = code;
        else jsCode = code;
      }
    }

    return { html: htmlCode, css: cssCode, js: jsCode };
  }
  window.extractSandboxCodeForGroup = extractSandboxCodeForGroup;

  // Run Sandbox from Linked Group ID
  window.runSandboxFromGroup = function(groupId, optionalTitle) {
    const extracted = extractSandboxCodeForGroup(groupId);
    const htmlCode = extracted.html;
    const cssCode = extracted.css;
    const jsCode = extracted.js;

    if (!htmlCode && !cssCode && !jsCode) {
      if (typeof window.customAlert === 'function') {
        window.customAlert("No executable HTML, CSS, or JavaScript code was found for group '" + groupId + "'.", { title: "Sandbox Notice" });
      } else {
        alert("No code found for group " + groupId);
      }
      return;
    }

    executeSandbox(htmlCode, cssCode, jsCode, optionalTitle || `Group: ${groupId}`, groupId);
  };

  // Helper to extract clean code text from pre/code or textarea or div
  function extractCodeFromElement(el) {
    if (!el) return '';
    const codeTag = el.querySelector('code');
    if (codeTag) return codeTag.textContent.trim();
    const preTag = el.querySelector('pre');
    if (preTag) return preTag.textContent.trim();
    return el.value !== undefined ? el.value.trim() : el.textContent.trim();
  }
  window.extractCodeFromElement = extractCodeFromElement;

  // Copy Code to Clipboard with feedback
  window.copyCodeFromContainer = function(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = extractCodeFromElement(el);
    navigator.clipboard.writeText(text).then(() => {
      if (typeof window.customAlert === 'function') {
        window.customAlert("Code copied to clipboard!", { title: "Copied" });
      } else {
        alert("Code copied to clipboard!");
      }
    });
  };

  // Language Metadata Registry with Official Logos & Colors
  function getLanguageMeta(lang) {
    const raw = (lang || '').toLowerCase().trim();
    let l = raw;
    if (l === 'c++') l = 'cpp';
    else if (l === 'c#' || l === 'cs') l = 'csharp';
    else if (l === 'js') l = 'javascript';
    else if (l === 'py') l = 'python';
    else if (l === 'rb') l = 'ruby';
    else if (l === 'sh' || l === 'shell' || l === 'zsh') l = 'bash';
    else if (l === 'golang') l = 'go';
    else if (l === 'rs') l = 'rust';
    else if (l === 'kt') l = 'kotlin';
    else if (l === 'markup' || l === 'htm') l = 'html';
    else if (l === 'scss' || l === 'sass') l = 'css';

    const registry = {
      html: {
        canonical: 'html',
        name: 'HTML',
        color: '#E44D26',
        isWeb: true,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M4.2 2.5L5.7 19.5L12 21.3L18.3 19.5L19.8 2.5H4.2Z" fill="#E44D26"/><path d="M12 4.1V19.7L16.9 18.3L18.1 4.1H12Z" fill="#F16529"/><path d="M8.2 7.1H15.8L15.6 9.3H10.6L10.9 12H15.3L14.9 16.5L12 17.3L9.1 16.5L8.9 14.2H10.8L10.9 15.2L12 15.5L13.1 15.2L13.3 13.5H8.7L8.2 7.1Z" fill="#FFFFFF"/></svg>`
      },
      css: {
        canonical: 'css',
        name: 'CSS',
        color: '#1572B6',
        isWeb: true,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M4.2 2.5L5.7 19.5L12 21.3L18.3 19.5L19.8 2.5H4.2Z" fill="#1572B6"/><path d="M12 4.1V19.7L16.9 18.3L18.1 4.1H12Z" fill="#33A9DC"/><path d="M8.2 7.1H15.8L15.6 9.3H10.6L10.9 12H15.3L14.9 16.5L12 17.3L9.1 16.5L8.9 14.2H10.8L10.9 15.2L12 15.5L13.1 15.2L13.3 13.5H8.7L8.2 7.1Z" fill="#FFFFFF"/></svg>`
      },
      javascript: {
        canonical: 'javascript',
        name: 'JavaScript',
        color: '#EAB308',
        isWeb: true,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><rect width="24" height="24" rx="4" fill="#F7DF1E"/><path d="M6 17.5V13.5H8V17.5C8 18.5 7.5 19 6.2 19C5.5 19 4.8 18.7 4.5 18.3L5.3 17C5.5 17.2 5.8 17.4 6.2 17.4C6.6 17.4 6.8 17.2 6.8 16.8V13.5H8.8V17.5C8.8 19.5 7.6 20.5 5.8 20.5C4.6 20.5 3.5 19.8 3 18.9L4.8 17.8C5.1 18.4 5.5 18.7 6 18.7C6.4 18.7 6.6 18.5 6.6 18.2V17.5H6ZM14.5 17.2C15.2 17.2 15.7 16.8 15.7 16.2C15.7 14.5 12.3 14.8 12.3 12.2C12.3 10.7 13.5 9.8 15.2 9.8C16.3 9.8 17.2 10.2 17.8 11L16.2 12.1C15.8 11.6 15.5 11.4 15 11.4C14.5 11.4 14.1 11.7 14.1 12.1C14.1 13.6 17.5 13.3 17.5 16C17.5 17.6 16.2 18.7 14.4 18.7C13 18.7 12 18 11.4 17L13.1 15.9C13.5 16.6 14 17.2 14.5 17.2Z" fill="#000000"/></svg>`
      },
      python: {
        canonical: 'python',
        name: 'Python',
        color: '#38BDF8',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M11.9 2C6.9 2 7.2 4.2 7.2 4.2L7.3 6.4H12.1V7.1H5.3C5.3 7.1 2 6.7 2 11.8C2 16.9 4.9 16.6 4.9 16.6H6.5V14.3C6.5 11.6 8.8 11.6 8.8 11.6H13.6C13.6 11.6 15.8 11.6 15.8 9.3V4.4C15.8 4.4 16.3 2 11.9 2ZM9.5 3.7C10.1 3.7 10.5 4.1 10.5 4.7C10.5 5.3 10.1 5.7 9.5 5.7C8.9 5.7 8.5 5.3 8.5 4.7C8.5 4.1 8.9 3.7 9.5 3.7Z" fill="#3776AB"/><path d="M12.1 22C17.1 22 16.8 19.8 16.8 19.8L16.7 17.6H11.9V16.9H18.7C18.7 16.9 22 17.3 22 12.2C22 7.1 19.1 7.4 19.1 7.4H17.5V9.7C17.5 12.4 15.2 12.4 15.2 12.4H10.4C10.4 12.4 8.2 12.4 8.2 14.7V19.6C8.2 19.6 7.7 22 12.1 22ZM14.5 20.3C13.9 20.3 13.5 19.9 13.5 19.3C13.5 18.7 13.9 18.3 14.5 18.3C15.1 18.3 15.5 18.7 15.5 19.3C15.5 19.9 15.1 20.3 14.5 20.3Z" fill="#FFD438"/></svg>`
      },
      cpp: {
        canonical: 'cpp',
        name: 'C++',
        color: '#60A5FA',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#00599C"/><path d="M9.5 15.5C7.6 15.5 6.2 14 6.2 12C6.2 10 7.6 8.5 9.5 8.5C10.6 8.5 11.5 9 12 9.8L10.8 10.8C10.5 10.4 10 10.1 9.5 10.1C8.5 10.1 7.7 10.9 7.7 12C7.7 13.1 8.5 13.9 9.5 13.9C10 13.9 10.5 13.6 10.8 13.2L12 14.2C11.5 15 10.6 15.5 9.5 15.5ZM14.5 11V9.8H15.7V11H16.9V12.2H15.7V13.4H14.5V12.2H13.3V11H14.5ZM18.5 11V9.8H19.7V11H20.9V12.2H19.7V13.4H18.5V12.2H17.3V11H18.5Z" fill="#FFFFFF"/></svg>`
      },
      c: {
        canonical: 'c',
        name: 'C Language',
        color: '#93C5FD',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#659AD2"/><path d="M12 16.5C9.5 16.5 7.5 14.5 7.5 12C7.5 9.5 9.5 7.5 12 7.5C13.5 7.5 14.8 8.2 15.5 9.3L13.8 10.5C13.4 9.9 12.7 9.5 12 9.5C10.6 9.5 9.5 10.6 9.5 12C9.5 13.4 10.6 14.5 12 14.5C12.7 14.5 13.4 14.1 13.8 13.5L15.5 14.7C14.8 15.8 13.5 16.5 12 16.5Z" fill="#FFFFFF"/></svg>`
      },
      csharp: {
        canonical: 'csharp',
        name: 'C#',
        color: '#4ADE80',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M12 2L2 7V17L12 22L22 17V7L12 2Z" fill="#239120"/><path d="M9.5 15.5C7.6 15.5 6.2 14 6.2 12C6.2 10 7.6 8.5 9.5 8.5C10.6 8.5 11.5 9 12 9.8L10.8 10.8C10.5 10.4 10 10.1 9.5 10.1C8.5 10.1 7.7 10.9 7.7 12C7.7 13.1 8.5 13.9 9.5 13.9C10 13.9 10.5 13.6 10.8 13.2L12 14.2C11.5 15 10.6 15.5 9.5 15.5ZM16.5 9.5H15.5L15.2 11H14L13.7 12.2H14.9L14.6 13.5H13.4L13.1 14.7H14.3L14 16H15.2L15.5 14.7H16.7L16.4 16H17.6L17.9 14.7H19.1L19.4 13.5H18.2L18.5 12.2H19.7L20 11H18.8L19.1 9.5H17.9L17.6 11H16.4L16.7 9.5H15.5ZM15.8 13.5L16.1 12.2H17.3L17 13.5H15.8Z" fill="#FFFFFF"/></svg>`
      },
      java: {
        canonical: 'java',
        name: 'Java',
        color: '#FB923C',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M7 19C11 20 15 20 19 19C17 18 9 18 7 19ZM6 16C11 17 16 17 20 16C16 15 10 15 6 16ZM12 3C10 6 13 8 13 11C13 13 11 14 10 14C11 14 13 13 13.5 11.5C14 9.5 11.5 7.5 12 3ZM14.5 5C13.5 7.5 15.5 9 15.5 11.5C15.5 13 14 14 13 14C14.5 14 16.5 13 16.5 11C16.5 9 14 7 14.5 5Z" fill="#ED8B00"/></svg>`
      },
      dart: {
        canonical: 'dart',
        name: 'Dart',
        color: '#38BDF8',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M12 2L4 10L14 20L20 20L20 14L12 2Z" fill="#0175C2"/><path d="M4 10L12 18L10 20L2 12L4 10Z" fill="#02569B"/><path d="M14 20L20 20L22 14L16 8L14 20Z" fill="#29B6F6"/></svg>`
      },
      ruby: {
        canonical: 'ruby',
        name: 'Ruby',
        color: '#F43F5E',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M7 3L2 9L12 21L22 9L17 3H7Z" fill="#CC342D"/><path d="M7 3L12 9L17 3H7ZM2 9L12 9L7 3L2 9ZM12 21L7 9H17L12 21Z" fill="#E53935"/></svg>`
      },
      node: {
        canonical: 'node',
        name: 'Node.js',
        color: '#4ADE80',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M12 2L3 7.2V17.5L12 22.8L21 17.5V7.2L12 2Z" fill="#5FA04E"/><path d="M12 4.5L18.5 8.2V15.8L12 19.5L5.5 15.8V8.2L12 4.5Z" fill="#333333"/><path d="M12 7L16 9.3V14.7L12 17L8 14.7V9.3L12 7Z" fill="#5FA04E"/></svg>`
      },
      sql: {
        canonical: 'sql',
        name: 'SQL',
        color: '#FBBF24',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M12 3C7.58 3 4 4.34 4 6V18C4 19.66 7.58 21 12 21C16.42 21 20 19.66 20 18V6C20 4.34 16.42 3 12 3ZM12 5C15.87 5 18 6.07 18 6C18 5.93 15.87 7 12 7C8.13 7 6 5.93 6 6C6 6.07 8.13 5 12 5ZM18 10C18 9.93 15.87 11 12 11C8.13 11 6 9.93 6 10V7.87C7.54 8.56 9.68 9 12 9C14.32 9 16.46 8.56 18 7.87V10ZM18 14C18 13.93 15.87 15 12 15C8.13 15 6 13.93 6 14V11.87C7.54 12.56 9.68 13 12 13C14.32 13 16.46 12.56 18 11.87V14ZM18 18C18 17.93 15.87 19 12 19C8.13 19 6 17.93 6 18V15.87C7.54 16.56 9.68 17 12 17C14.32 17 16.46 16.56 18 15.87V18Z" fill="#E38C00"/></svg>`
      },
      go: {
        canonical: 'go',
        name: 'Go',
        color: '#38BDF8',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><rect width="24" height="24" rx="4" fill="#00ADD8"/><path d="M5 12C5 9.8 6.8 8 9 8C10.5 8 11.8 8.8 12.4 10.1L10.8 10.9C10.4 10.1 9.8 9.6 9 9.6C7.7 9.6 6.6 10.7 6.6 12C6.6 13.3 7.7 14.4 9 14.4C9.9 14.4 10.6 13.8 10.9 13H9V11.5H12.5V13.3C12.1 14.9 10.7 16 9 16C6.8 16 5 14.2 5 12ZM13.5 12C13.5 9.8 15.3 8 17.5 8C19.7 8 21.5 9.8 21.5 12C21.5 14.2 19.7 16 17.5 16C15.3 16 13.5 14.2 13.5 12ZM15.1 12C15.1 13.3 16.2 14.4 17.5 14.4C18.8 14.4 19.9 13.3 19.9 12C19.9 10.7 18.8 9.6 17.5 9.6C16.2 9.6 15.1 10.7 15.1 12Z" fill="#FFFFFF"/></svg>`
      },
      rust: {
        canonical: 'rust',
        name: 'Rust',
        color: '#FDBA74',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><circle cx="12" cy="12" r="10" fill="#DEA584"/><path d="M8 8H13C14.7 8 16 9.3 16 11C16 12.3 15.2 13.3 14 13.8L16.5 17H14.5L12.3 14H10V17H8V8ZM10 10V12H13C13.6 12 14 11.6 14 11C14 10.4 13.6 10 13 10H10Z" fill="#241C1A"/></svg>`
      },
      php: {
        canonical: 'php',
        name: 'PHP',
        color: '#A78BFA',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><ellipse cx="12" cy="12" rx="11" ry="8" fill="#777BB4"/><path d="M6 14.5L6.8 10H8.5C9.5 10 10.1 10.5 9.9 11.4C9.7 12.3 8.9 12.8 7.9 12.8H7.1L6.8 14.5H6ZM7.4 11.8H8C8.5 11.8 8.8 11.6 8.9 11.2C9 10.8 8.7 10.6 8.2 10.6H7.6L7.4 11.8ZM11 14.5L11.8 10H12.7L12.4 11.8H13.8L14.1 10H15L14.2 14.5H13.3L13.6 12.7H12.2L11.9 14.5H11ZM16 14.5L16.8 10H18.5C19.5 10 20.1 10.5 19.9 11.4C19.7 12.3 18.9 12.8 17.9 12.8H17.1L16.8 14.5H16ZM17.4 11.8H18C18.5 11.8 18.8 11.6 18.9 11.2C19 10.8 18.7 10.6 18.2 10.6H17.6L17.4 11.8Z" fill="#FFFFFF"/></svg>`
      },
      kotlin: {
        canonical: 'kotlin',
        name: 'Kotlin',
        color: '#C084FC',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M22 2H2V22H22L12 12L22 2Z" fill="#7F52FF"/><path d="M2 22L12 12L22 22H2Z" fill="#C711E1"/><path d="M2 2H12L2 12V2Z" fill="#E24462"/></svg>`
      },
      swift: {
        canonical: 'swift',
        name: 'Swift',
        color: '#FB923C',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><path d="M20.5 5.5C18.5 8 16 10 12.5 11.5C15 10 17 8 18 5.5C15 8 11.5 10 8 11C11.5 9 14 6 15 3C9 7.5 5.5 13.5 7 19C4 15 4 10 6 7C2 12 3 18 7.5 21C14 24 21 18 21.5 11C21.7 9 21.3 7.2 20.5 5.5Z" fill="#F05138"/></svg>`
      },
      bash: {
        canonical: 'bash',
        name: 'Bash/Shell',
        color: '#4ADE80',
        isWeb: false,
        svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><rect width="24" height="24" rx="4" fill="#2B303A"/><path d="M5 7L10 12L5 17" stroke="#4EAA25" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="17" x2="19" y2="17" stroke="#4EAA25" stroke-width="2" stroke-linecap="round"/></svg>`
      }
    };

    if (registry[l]) return registry[l];
    return {
      canonical: l || 'code',
      name: (l ? l.toUpperCase() : 'CODE'),
      color: '#94A3B8',
      isWeb: false,
      svgIcon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;"><rect width="24" height="24" rx="4" fill="#334155"/><path d="M8 9L5 12L8 15M16 9L19 12L16 15M13 7L11 17" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    };
  }
  window.getLanguageMeta = getLanguageMeta;

  // Language Syntax Tokenizer Configuration
  const LANG_KEYWORD_CONFIGS = {
    cpp: {
      keywords: new Set(['public', 'private', 'protected', 'class', 'struct', 'enum', 'static', 'const', 'constexpr', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'default', 'try', 'catch', 'throw', 'new', 'delete', 'namespace', 'using', 'auto', 'template', 'typename', 'virtual', 'override', 'nullptr', 'friend', 'inline']),
      types: new Set(['int', 'float', 'double', 'char', 'void', 'bool', 'long', 'short', 'string', 'size_t', 'uint32_t', 'int64_t', 'vector', 'map', 'set', 'pair', 'unordered_map'])
    },
    c: {
      keywords: new Set(['struct', 'enum', 'union', 'static', 'const', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'default', 'typedef', 'sizeof', 'extern', 'volatile', 'register', 'goto']),
      types: new Set(['int', 'float', 'double', 'char', 'void', 'long', 'short', 'signed', 'unsigned', 'size_t', 'FILE', 'NULL'])
    },
    csharp: {
      keywords: new Set(['abstract', 'as', 'async', 'await', 'base', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delegate', 'do', 'else', 'enum', 'event', 'false', 'finally', 'fixed', 'for', 'foreach', 'goto', 'if', 'in', 'interface', 'internal', 'is', 'lock', 'namespace', 'new', 'null', 'operator', 'out', 'override', 'params', 'private', 'protected', 'public', 'readonly', 'record', 'ref', 'return', 'sealed', 'sizeof', 'static', 'struct', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'using', 'var', 'virtual', 'void', 'while', 'yield']),
      types: new Set(['bool', 'byte', 'char', 'decimal', 'double', 'float', 'int', 'long', 'object', 'short', 'string', 'uint', 'ulong', 'Task', 'List', 'Dictionary'])
    },
    java: {
      keywords: new Set(['abstract', 'assert', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'else', 'enum', 'extends', 'final', 'finally', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'interface', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null']),
      types: new Set(['boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'String', 'Integer', 'Double', 'List', 'ArrayList', 'Map', 'HashMap', 'Set', 'HashSet', 'Object'])
    },
    python: {
      keywords: new Set(['and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'True', 'False', 'None', 'self', 'cls']),
      types: new Set(['int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'bytes', 'object'])
    },
    dart: {
      keywords: new Set(['abstract', 'as', 'assert', 'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'dynamic', 'else', 'enum', 'export', 'extends', 'factory', 'false', 'final', 'finally', 'for', 'get', 'if', 'implements', 'import', 'in', 'is', 'late', 'new', 'null', 'operator', 'return', 'set', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typedef', 'var', 'void', 'while', 'with', 'yield']),
      types: new Set(['int', 'double', 'num', 'String', 'bool', 'List', 'Map', 'Set', 'Future', 'Stream', 'Widget'])
    },
    ruby: {
      keywords: new Set(['alias', 'and', 'begin', 'break', 'case', 'class', 'def', 'do', 'else', 'elsif', 'end', 'ensure', 'false', 'for', 'if', 'in', 'module', 'next', 'nil', 'not', 'or', 'redo', 'rescue', 'retry', 'return', 'self', 'super', 'then', 'true', 'unless', 'until', 'when', 'while', 'yield', 'require', 'attr_accessor', 'attr_reader']),
      types: new Set(['Integer', 'Float', 'String', 'Array', 'Hash', 'Symbol', 'Boolean'])
    },
    node: {
      keywords: new Set(['break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'delete', 'do', 'else', 'export', 'extends', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'let', 'static', 'await', 'async', 'true', 'false', 'null', 'undefined', 'require', 'module', 'exports', 'process', 'Buffer']),
      types: new Set(['Promise', 'Array', 'Object', 'String', 'Number', 'Boolean', 'Function', 'Symbol', 'BigInt', 'Error'])
    },
    sql: {
      keywords: new Set(['select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table', 'drop', 'alter', 'index', 'view', 'join', 'inner', 'left', 'right', 'full', 'outer', 'on', 'group', 'by', 'order', 'having', 'limit', 'offset', 'union', 'all', 'distinct', 'as', 'and', 'or', 'not', 'in', 'between', 'like', 'is', 'null', 'primary', 'key', 'foreign', 'references', 'check', 'count', 'sum', 'avg', 'min', 'max', 'case', 'when', 'then', 'else', 'end', 'exists']),
      types: new Set(['int', 'integer', 'varchar', 'char', 'text', 'boolean', 'date', 'datetime', 'timestamp', 'decimal', 'numeric', 'float', 'double', 'blob'])
    },
    go: {
      keywords: new Set(['break', 'default', 'func', 'interface', 'select', 'case', 'defer', 'go', 'map', 'struct', 'chan', 'else', 'goto', 'package', 'switch', 'const', 'fallthrough', 'if', 'range', 'type', 'continue', 'for', 'import', 'return', 'var', 'nil', 'true', 'false', 'iota']),
      types: new Set(['bool', 'string', 'int', 'int8', 'int16', 'int32', 'int64', 'uint', 'uint8', 'uint16', 'uint32', 'uint64', 'byte', 'rune', 'float32', 'float64', 'error'])
    },
    rust: {
      keywords: new Set(['as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while']),
      types: new Set(['i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64', 'usize', 'isize', 'f32', 'f64', 'bool', 'char', 'str', 'String', 'Vec', 'Option', 'Result', 'Box', 'Rc', 'Arc'])
    },
    php: {
      keywords: new Set(['abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class', 'clone', 'const', 'continue', 'declare', 'default', 'die', 'do', 'echo', 'else', 'elseif', 'empty', 'eval', 'exit', 'extends', 'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global', 'if', 'implements', 'include', 'include_once', 'instanceof', 'interface', 'isset', 'list', 'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public', 'readonly', 'require', 'require_once', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var', 'while']),
      types: new Set(['int', 'float', 'string', 'bool', 'array', 'object', 'iterable', 'void', 'mixed', 'never'])
    },
    kotlin: {
      keywords: new Set(['as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var', 'when', 'while', 'by', 'catch', 'finally', 'get', 'import', 'init', 'open', 'operator', 'override', 'private', 'protected', 'public', 'sealed', 'suspend']),
      types: new Set(['Int', 'Long', 'Short', 'Byte', 'Double', 'Float', 'Boolean', 'Char', 'String', 'Array', 'List', 'Map', 'Set', 'Unit', 'Any'])
    },
    swift: {
      keywords: new Set(['class', 'deinit', 'enum', 'extension', 'fileprivate', 'func', 'import', 'init', 'inout', 'internal', 'let', 'open', 'operator', 'private', 'protocol', 'public', 'static', 'struct', 'subscript', 'typealias', 'var', 'break', 'case', 'catch', 'continue', 'default', 'defer', 'do', 'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return', 'throw', 'switch', 'where', 'while', 'as', 'false', 'is', 'nil', 'super', 'self', 'Self', 'true', 'try']),
      types: new Set(['Int', 'Double', 'Float', 'Bool', 'String', 'Character', 'Optional', 'Array', 'Dictionary', 'Set', 'Void'])
    },
    bash: {
      keywords: new Set(['case', 'do', 'done', 'elif', 'else', 'esac', 'fi', 'for', 'function', 'if', 'in', 'select', 'then', 'until', 'while', 'echo', 'printf', 'read', 'cd', 'pwd', 'export', 'local', 'source', 'alias', 'exit', 'return', 'shift', 'test']),
      types: new Set([])
    }
  };

  // Syntax Highlighter for Clean Code Auto-Formatting across All Major Languages
  function highlightCodeSyntax(code, lang) {
    if (!code) return '';
    const meta = getLanguageMeta(lang);
    const l = meta.canonical;

    // HTML / XML formatting
    if (l === 'html' || l === 'xml') {
      let esc = escapeHtml(code);
      esc = esc.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color:#64748b; font-style:italic;">$1</span>');
      esc = esc.replace(/\s([a-zA-Z0-9_-]+)=(&quot;[^&]*&quot;|&#39;[^&#]*&#39;)/g, ' <span style="color:#38bdf8;">$1</span>=<span style="color:#34d399;">$2</span>');
      esc = esc.replace(/(&lt;\/?)([a-zA-Z0-9_-]+)/g, '$1<span style="color:#f43f5e; font-weight:600;">$2</span>');
      return esc;
    }

    // CSS / SCSS formatting
    if (l === 'css') {
      let esc = escapeHtml(code);
      esc = esc.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#64748b; font-style:italic;">$1</span>');
      esc = esc.replace(/([a-zA-Z0-9_-]+)\s*:/g, '<span style="color:#38bdf8;">$1</span>:');
      esc = esc.replace(/:\s*([^;{}]+);/g, ': <span style="color:#34d399;">$1</span>;');
      return esc;
    }

    const conf = LANG_KEYWORD_CONFIGS[l] || LANG_KEYWORD_CONFIGS[l === 'javascript' ? 'node' : 'cpp'] || LANG_KEYWORD_CONFIGS['cpp'];
    const keywords = conf.keywords || new Set();
    const types = conf.types || new Set();

    // Single-pass atomic token regex
    const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|#[^\n]*|--[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`[\s\S]*?`|\b0x[0-9a-fA-F]+\b|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b|[^\s\w]+|\s+)/g;

    let out = '';
    let m;
    while ((m = re.exec(code)) !== null) {
      const t = m[0];
      if (/^\s+$/.test(t)) {
        out += t;
      } else if (t.startsWith('//') || t.startsWith('/*')) {
        out += `<span style="color:#64748b; font-style:italic;">${escapeHtml(t)}</span>`;
      } else if (t.startsWith('--') && (l === 'sql')) {
        out += `<span style="color:#64748b; font-style:italic;">${escapeHtml(t)}</span>`;
      } else if (t.startsWith('#')) {
        if (l === 'python' || l === 'ruby' || l === 'bash') {
          out += `<span style="color:#64748b; font-style:italic;">${escapeHtml(t)}</span>`;
        } else {
          // Preprocessor directive for C/C++/C# e.g. #include, #define
          out += `<span style="color:#f472b6; font-weight:600;">${escapeHtml(t)}</span>`;
        }
      } else if (t.startsWith('"') || t.startsWith("'") || t.startsWith('`')) {
        out += `<span style="color:#34d399;">${escapeHtml(t)}</span>`;
      } else if (/^(?:0x[0-9a-fA-F]+|\d+(?:\.\d+)?)$/.test(t)) {
        out += `<span style="color:#fb923c;">${t}</span>`;
      } else {
        const lower = t.toLowerCase();
        if (types.has(t)) {
          out += `<span style="color:#38bdf8; font-weight:600;">${escapeHtml(t)}</span>`;
        } else if (keywords.has(t) || (l === 'sql' && keywords.has(lower))) {
          out += `<span style="color:#c084fc; font-weight:600;">${escapeHtml(t)}</span>`;
        } else {
          out += escapeHtml(t);
        }
      }
    }
    return out;
  }
  window.highlightCodeSyntax = highlightCodeSyntax;

  // Smart Content Formatter: Transforms raw contributor text into advanced academic HTML with linked code containers
  window.formatSolutionContent = function(rawContent, contextId) {
    if (!rawContent) return '';

    let content = rawContent;

    function renderCodeBlock(attrs, extraClasses, codeBody, index) {
      const idMatch = (attrs || '').match(/id=["']([^"']+)["']/i);
      const groupMatch = (attrs || '').match(/data-code-group=["']([^"']+)["']/i) || (attrs || '').match(/data-sandbox-group=["']([^"']+)["']/i);
      const langMatch = (attrs || '').match(/data-lang=["']([^"']+)["']/i);

      let lang = (langMatch ? langMatch[1] : (extraClasses || '')).toLowerCase().trim();
      if (!lang) {
        if (codeBody.includes('<html') || codeBody.includes('<div') || codeBody.includes('<button') || codeBody.includes('<p') || codeBody.includes('<!DOCTYPE')) lang = 'html';
        else if (codeBody.includes('{') && codeBody.includes(':') && codeBody.includes(';')) lang = 'css';
        else if (codeBody.includes('def ') || codeBody.includes('import ') || codeBody.includes('print(')) lang = 'python';
        else if (codeBody.includes('#include') || codeBody.includes('cout <<') || codeBody.includes('std::')) lang = 'cpp';
        else if (codeBody.includes('public class ') || codeBody.includes('System.out.')) lang = 'java';
        else if (codeBody.includes('SELECT ') || codeBody.includes('CREATE TABLE ')) lang = 'sql';
        else lang = 'javascript';
      }

      const meta = getLanguageMeta(lang);
      const groupId = groupMatch ? groupMatch[1] : (contextId || 'grp_' + Math.random().toString(36).substring(2, 7));
      const codeId = idMatch ? idMatch[1] : `code-${meta.canonical}-${groupId}${index > 1 ? '_' + index : ''}`;

      // Extract raw code text without stripping HTML tags
      let codeText = codeBody;
      const codeMatch = codeText.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
      if (codeMatch) codeText = codeMatch[1];
      const preMatch = codeText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch) codeText = preMatch[1];

      return buildInteractiveCodeContainerHtml(lang, codeId, groupId, codeText.trim());
    }

    // 1. Transform custom structured code-container blocks with <pre><code>...</code></pre>
    let containerIndex = 0;
    const codeContainerWithPreRegex = /<div\s+class=["']code-container(?:\s+([^"']*))?["']([^>]*)>\s*<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>\s*<\/div>/gi;
    content = content.replace(codeContainerWithPreRegex, function(match, extraClasses, attrs, innerCode) {
      containerIndex++;
      return renderCodeBlock(attrs, extraClasses, innerCode, containerIndex);
    });

    // 1b. Fallback: Transform code-container with <code>...</code> or direct inner content
    const codeContainerRegex = /<div\s+class=["']code-container(?:\s+([^"']*))?["']([^>]*)>([\s\S]*?)<\/div>/gi;
    content = content.replace(codeContainerRegex, function(match, extraClasses, attrs, innerContent) {
      containerIndex++;
      return renderCodeBlock(attrs, extraClasses, innerContent, containerIndex);
    });

    // 2. Transform standard <pre><code class="language-xyz"> blocks
    const preCodeRegex = /<pre><code(?:\s+class=["'](?:language-)?([a-zA-Z0-9_+-]+)["'])?>([\s\S]*?)<\/code><\/pre>/gi;
    let preIndex = 0;
    content = content.replace(preCodeRegex, function(match, langClass, codeBody) {
      preIndex++;
      const lang = (langClass || '').toLowerCase().trim() || 'code';
      const meta = getLanguageMeta(lang);
      const groupId = contextId || 'code';
      const codeId = `code-${meta.canonical}-${groupId}${preIndex > 1 ? '_' + preIndex : ''}`;

      return buildInteractiveCodeContainerHtml(lang, codeId, groupId, codeBody);
    });

    return content;
  };

  function buildInteractiveCodeContainerHtml(lang, codeId, groupId, codeText) {
    const meta = getLanguageMeta(lang);
    const isHtml = (meta.canonical === 'html');
    const isWeb = meta.isWeb;

    // Run and Try It buttons are shown for interactive web languages (Run & Try It on HTML)
    const runButtonHtml = isHtml ? `
      <button type="button" class="sol-code-run-btn" onclick="window.runSandboxFromGroup('${groupId}', '${escapeHtml(meta.name)} Demo')" title="Run interactive sandbox preview">
        <i class="ri-play-circle-fill"></i> Run
      </button>
      <button type="button" class="sol-code-try-btn" onclick="window.openTryItModal('${groupId}', '${escapeHtml(meta.name)} Demo')" title="Try and edit code in playground">
        <i class="ri-terminal-box-line"></i> Try it
      </button>
    ` : '';

    // Auto format code in code interface with syntax styling
    const highlightedCode = highlightCodeSyntax(codeText, lang);

    return `
      <div class="sol-code-block-container" data-sandbox-group="${groupId}" data-code-group="${groupId}" data-lang="${meta.canonical}">
        <div class="sol-code-block-header">
          <div class="sol-code-block-lang" style="display:flex; align-items:center; gap:8px;">
            ${meta.svgIcon}
            <span style="font-weight:700; color:${meta.color};">${meta.name}</span>
            <span class="sol-code-block-id-tag">id="${codeId}"</span>
          </div>
          <div class="sol-code-block-actions">
            <button type="button" class="sol-code-copy-btn" onclick="window.copyCodeFromContainer('${codeId}')">
              <i class="ri-file-copy-line"></i> Copy
            </button>
            ${runButtonHtml}
          </div>
        </div>
        <pre class="sol-code-block-body" id="${codeId}"><code>${highlightedCode}</code></pre>
      </div>
    `;
  }

  // Quick Tools Palette Snippet Inserters with Intelligent Group ID Connection
  window.insertSandboxSnippet = function(textareaId, type, contextId) {
    const el = document.getElementById(textareaId);
    if (!el) return;

    let uniqueId = null;
    const val = el.value || '';

    // Check existing groups in current textarea
    const existingGroupMatches = [...val.matchAll(/data-code-group=["']([^"']+)["']/g)];
    if (existingGroupMatches.length > 0) {
      const candidateGroup = existingGroupMatches[existingGroupMatches.length - 1][1];
      const targetType = (type === 'javascript' || type === 'js') ? 'js' : type;
      const hasThisType = val.includes(`id="code-${targetType}-${candidateGroup}"`);
      if (!hasThisType && type !== 'all') {
        uniqueId = candidateGroup;
      }
    }

    if (!uniqueId) {
      const storedGroup = localStorage.getItem('dpg_active_sandbox_group_' + contextId);
      if (storedGroup && type !== 'all') {
        const targetType = (type === 'javascript' || type === 'js') ? 'js' : type;
        if (!val.includes(`id="code-${targetType}-${storedGroup}"`)) {
          uniqueId = storedGroup;
        }
      }
    }

    if (!uniqueId) {
      uniqueId = contextId + '_' + Date.now().toString(36).substring(2, 6);
    }

    localStorage.setItem('dpg_active_sandbox_group_' + contextId, uniqueId);

    // Record container IDs in localStorage for drafting and group merging
    try {
      const storageKey = 'dpg_code_containers_' + contextId;
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (type === 'all') {
        existingData['html'] = { id: `code-html-${uniqueId}`, groupId: uniqueId, lang: 'html' };
        existingData['css'] = { id: `code-css-${uniqueId}`, groupId: uniqueId, lang: 'css' };
        existingData['js'] = { id: `code-js-${uniqueId}`, groupId: uniqueId, lang: 'javascript' };
      } else {
        const normalizedType = (type === 'javascript' || type === 'js') ? 'js' : type;
        existingData[normalizedType] = {
          id: `code-${normalizedType}-${uniqueId}`,
          groupId: uniqueId,
          lang: type
        };
      }
      localStorage.setItem(storageKey, JSON.stringify(existingData));
    } catch(e) {}

    let snippet = '';

    if (type === 'html') {
      snippet = `\n<div class="code-container" id="code-html-${uniqueId}" data-code-group="${uniqueId}" data-lang="html">\n<pre><code><!-- HTML Code Container -->\n<div class="demo-box">\n  <h3>Interactive Demo</h3>\n  <button id="btnAction">Click Action</button>\n  <p id="outputMsg">Ready...</p>\n</div></code></pre>\n</div>\n`;
    } else if (type === 'css') {
      snippet = `\n<div class="code-container" id="code-css-${uniqueId}" data-code-group="${uniqueId}" data-lang="css">\n<pre><code>/* CSS Code Container */\n.demo-box {\n  padding: 1.5rem;\n  background: #f8fafc;\n  border: 2px solid #38bdf8;\n  border-radius: 8px;\n}\n#btnAction {\n  background: #38bdf8;\n  color: #0f172a;\n  font-weight: bold;\n  border: none;\n  padding: 8px 16px;\n  border-radius: 6px;\n  cursor: pointer;\n}</code></pre>\n</div>\n`;
    } else if (type === 'js') {
      snippet = `\n<div class="code-container" id="code-js-${uniqueId}" data-code-group="${uniqueId}" data-lang="javascript">\n<pre><code>// JavaScript Code Container\ndocument.getElementById('btnAction').addEventListener('click', function() {\n  console.log("Action button clicked in sandbox!");\n  document.getElementById('outputMsg').textContent = "Ran successfully at " + new Date().toLocaleTimeString();\n});</code></pre>\n</div>\n`;
    } else if (type === 'all') {
      // Complete linked HTML + CSS + JS package
      snippet = `\n<!-- Linked Code Sandbox Package (Group: ${uniqueId}) -->\n<div class="code-container" id="code-html-${uniqueId}" data-code-group="${uniqueId}" data-lang="html">\n<pre><code><div class="demo-card">\n  <h2>Interactive Academic Component</h2>\n  <button id="runBtn_${uniqueId}">Execute Component</button>\n  <div id="result_${uniqueId}" style="margin-top:10px; font-weight:bold;">Output awaits trigger...</div>\n</div></code></pre>\n</div>\n\n<div class="code-container" id="code-css-${uniqueId}" data-code-group="${uniqueId}" data-lang="css">\n<pre><code>.demo-card {\n  padding: 1.25rem;\n  background: #ffffff;\n  border: 2px solid #10b981;\n  border-radius: 10px;\n  color: #1e293b;\n}\n#runBtn_${uniqueId} {\n  background: #10b981;\n  color: white;\n  border: none;\n  padding: 8px 18px;\n  border-radius: 6px;\n  font-weight: 600;\n  cursor: pointer;\n}</code></pre>\n</div>\n\n<div class="code-container" id="code-js-${uniqueId}" data-code-group="${uniqueId}" data-lang="javascript">\n<pre><code>document.getElementById('runBtn_${uniqueId}').addEventListener('click', function() {\n  console.log("Component executed with group ID: ${uniqueId}");\n  document.getElementById('result_${uniqueId}').textContent = "Live script output updated at " + new Date().toLocaleTimeString();\n});</code></pre>\n</div>\n`;
    }

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const valStr = el.value;
    el.value = valStr.substring(0, start) + snippet + valStr.substring(end);
    el.focus();
    el.selectionStart = start + snippet.length;
    el.selectionEnd = start + snippet.length;

    // Trigger input event to update live preview
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  function stripHtmlTags(str) {
    return (str || '').replace(/<[^>]*>/g, '').trim();
  }

  function escapeHtml(s) {
    return (s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==========================================
  // AUTO MINIFY ENGINE FOR SOLUTIONS
  // Automatically optimizes HTML, CSS, JS and text before publishing
  // ==========================================
  window.autoMinifySolutionContent = function(rawContent) {
    if (!rawContent || typeof rawContent !== 'string') return rawContent;

    // Protect <pre><code> blocks so code indentations/formatting are strictly preserved
    const protectedBlocks = [];
    let counter = 0;

    let text = rawContent.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>/gi, function(match) {
      const token = `___DPG_PRE_BLOCK_${counter++}___`;
      // Within pre, safely trim trailing whitespace from lines
      const cleaned = match.replace(/[ \t]+$/gm, '');
      protectedBlocks.push({ token: token, content: cleaned });
      return token;
    });

    // 1. Remove HTML comments (except conditional comments)
    text = text.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');

    // 2. Collapse multi-spaces outside pre tags
    text = text.replace(/[ \t]+/g, ' ');

    // 3. Remove spaces around tag boundaries where safe
    text = text.replace(/>\s+</g, '><');

    // 4. Remove empty paragraph tags <p></p> or <p>&nbsp;</p>
    text = text.replace(/<p>\s*(?:&nbsp;)?\s*<\/p>/gi, '');

    // 5. Restore protected <pre><code> blocks
    protectedBlocks.forEach(function(item) {
      text = text.replace(item.token, item.content);
    });

    return text.trim();
  };

  window.autoMinifySolutionPayload = function(payload) {
    if (!payload || typeof payload !== 'object') return { payload: payload, stats: {} };

    const rawStr = JSON.stringify(payload);
    const originalSize = rawStr.length;

    // Minify questions if assignment
    if (Array.isArray(payload.questions)) {
      payload.questions.forEach(function(q) {
        if (q.title) q.title = q.title.trim().replace(/\s+/g, ' ');
        if (q.answer) q.answer = window.autoMinifySolutionContent(q.answer);
      });
    }

    // Minify practicals if practical solution
    if (Array.isArray(payload.practicals)) {
      payload.practicals.forEach(function(p) {
        if (p.title) p.title = p.title.trim().replace(/\s+/g, ' ');
        if (p.code) p.code = window.autoMinifySolutionContent(p.code);
      });
    }

    // Minify metadata fields
    ['subjectName', 'subjectCode', 'studentName', 'studentId', 'profName'].forEach(function(key) {
      if (payload[key] && typeof payload[key] === 'string') {
        payload[key] = payload[key].trim().replace(/\s+/g, ' ');
      }
    });

    const minStr = JSON.stringify(payload);
    const minifiedSize = minStr.length;
    const savedBytes = originalSize - minifiedSize;
    const percent = originalSize > 0 ? ((savedBytes / originalSize) * 100).toFixed(1) : '0';

    console.log(`[DPG Auto-Minify] Original: ${originalSize}B | Minified: ${minifiedSize}B | Saved: ${savedBytes}B (${percent}%)`);

    return {
      payload: payload,
      stats: {
        originalBytes: originalSize,
        minifiedBytes: minifiedSize,
        savedBytes: savedBytes,
        percentSaved: percent
      }
    };
  };

  // ==========================================
  // INTERACTIVE "TRY IT" CODE PLAYGROUND ENGINE
  // (Available in index.html and generate.html for HTML Sandboxes)
  // ==========================================
  let activeTryItGroupId = null;
  let activeTryItTitle = '';
  let activeTryItOriginal = { html: '', css: '', js: '' };
  let tryitConsoleCount = 0;

  function ensureTryItModalInDom() {
    if (typeof document === 'undefined' || !document.body || typeof document.getElementById !== 'function' || typeof document.createElement !== 'function' || document.getElementById('advancedTryItModal')) return;

    const modalHtml = `
      <div class="sol-sandbox-modal-overlay" id="advancedTryItModal" style="display:none; z-index:99999;">
        <div class="sol-sandbox-modal-card" style="max-width:1150px; height:92vh; max-height:890px;">
          <div class="sol-sandbox-topbar">
            <div class="sol-sandbox-topbar-left" style="flex-wrap:wrap; gap:10px;">
              <div class="sol-sandbox-title">
                <i class="ri-terminal-box-line" style="color:#818cf8; font-size:1.3rem;"></i>
                <span id="tryitModalTitle">Try It Code Playground</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <label for="tryitTestCaseSelect" style="font-size:0.75rem; color:#94a3b8; font-weight:600;">Test Case:</label>
                <select id="tryitTestCaseSelect" class="sol-input" style="padding:3px 8px; font-size:0.78rem; width:auto; min-width:180px; height:auto; background:#1e293b; color:white; border-color:rgba(255,255,255,0.15);" onchange="window.switchTryItTestCase(this.value)">
                  <option value="__official__">Official Solution (Default)</option>
                </select>
              </div>
            </div>
            <div class="sol-sandbox-topbar-actions">
              <button type="button" class="sol-btn sol-btn-primary sol-btn-sm" onclick="window.runTryItCode()" title="Execute code in sandbox preview">
                <i class="ri-play-fill"></i> Run Code
              </button>
              <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" onclick="window.resetTryItCode()" title="Reset to original author code">
                <i class="ri-restart-line"></i> Reset
              </button>
              <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" onclick="window.closeTryItModal()" title="Close Try It Playground">
                <i class="ri-close-line"></i> Close
              </button>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 1fr 1fr; flex:1; min-height:0; overflow:hidden; background:#0f172a;" id="tryitWorkspaceGrid">
            <!-- Left: Code Editor Pane -->
            <div style="display:flex; flex-direction:column; border-right:1px solid rgba(255,255,255,0.08); min-height:0;">
              <div style="display:flex; align-items:center; justify-content:space-between; background:#111827; padding:6px 12px; border-bottom:1px solid rgba(255,255,255,0.08);">
                <div class="sol-sandbox-tabs" style="margin:0;">
                  <button type="button" class="sol-sandbox-tab-btn active" id="tryitTabBtnHtml" onclick="window.switchTryItTab('html')">
                    <i class="ri-html5-fill" style="color:#f97316;"></i> HTML
                  </button>
                  <button type="button" class="sol-sandbox-tab-btn" id="tryitTabBtnCss" onclick="window.switchTryItTab('css')">
                    <i class="ri-css3-fill" style="color:#38bdf8;"></i> CSS
                  </button>
                  <button type="button" class="sol-sandbox-tab-btn" id="tryitTabBtnJs" onclick="window.switchTryItTab('js')">
                    <i class="ri-javascript-fill" style="color:#facc15;"></i> JavaScript
                  </button>
                </div>
                <span style="font-size:0.72rem; color:#64748b;">Live In-Memory Editor</span>
              </div>
              <div style="flex:1; position:relative; min-height:0;">
                <textarea id="tryitEditorHtml" spellcheck="false" style="position:absolute; inset:0; width:100%; height:100%; background:#090d16; color:#f8fafc; font-family:'Fira Code', monospace; font-size:0.83rem; padding:12px; border:none; resize:none; outline:none; line-height:1.5; box-sizing:border-box;" placeholder="<!-- HTML code here -->"></textarea>
                <textarea id="tryitEditorCss" spellcheck="false" style="position:absolute; inset:0; width:100%; height:100%; background:#090d16; color:#f8fafc; font-family:'Fira Code', monospace; font-size:0.83rem; padding:12px; border:none; resize:none; outline:none; line-height:1.5; box-sizing:border-box; display:none;" placeholder="/* CSS code here */"></textarea>
                <textarea id="tryitEditorJs" spellcheck="false" style="position:absolute; inset:0; width:100%; height:100%; background:#090d16; color:#f8fafc; font-family:'Fira Code', monospace; font-size:0.83rem; padding:12px; border:none; resize:none; outline:none; line-height:1.5; box-sizing:border-box; display:none;" placeholder="// JavaScript code here"></textarea>
              </div>
            </div>

            <!-- Right: Live Preview & Console Pane -->
            <div style="display:flex; flex-direction:column; min-height:0; background:#f8fafc; position:relative;">
              <div style="display:flex; align-items:center; justify-content:space-between; background:#111827; padding:6px 12px; border-bottom:1px solid rgba(255,255,255,0.08);">
                <div class="sol-sandbox-tabs" style="margin:0;">
                  <button type="button" class="sol-sandbox-tab-btn active" id="tryitPreviewTabBtn" onclick="window.switchTryItRightTab('preview')">
                    <i class="ri-layout-masonry-line"></i> Preview
                  </button>
                  <button type="button" class="sol-sandbox-tab-btn" id="tryitConsoleTabBtn" onclick="window.switchTryItRightTab('console')">
                    <i class="ri-terminal-box-line"></i> Console <span id="tryitConsoleBadge" style="background:#ef4444; color:white; font-size:0.68rem; padding:1px 5px; border-radius:999px; display:none; margin-left:3px;">0</span>
                  </button>
                </div>
                <span id="tryitLiveStatusBadge" style="font-size:0.72rem; color:#10b981; display:flex; align-items:center; gap:4px;">
                  <span style="width:7px; height:7px; border-radius:50%; background:#10b981; display:inline-block;"></span> Sandbox Ready
                </span>
              </div>

              <div style="flex:1; position:relative; min-height:0;">
                <iframe id="tryitSandboxIframe" class="sol-sandbox-iframe-pane" sandbox="allow-scripts allow-modals allow-forms" style="position:absolute; inset:0; width:100%; height:100%; border:none; background:#ffffff;"></iframe>
                <div id="tryitConsoleLogsPane" class="sol-sandbox-console-pane" style="position:absolute; inset:0; display:none; background:#0b1120; z-index:5;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.8rem; padding-bottom:0.5rem; border-bottom:1px solid rgba(255,255,255,0.1);">
                    <span style="color:#94a3b8; font-size:0.75rem; font-weight:700;">PLAYGROUND CONSOLE</span>
                    <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" style="font-size:0.72rem; padding:2px 8px;" onclick="window.clearTryItConsole()">
                      <i class="ri-delete-bin-7-line"></i> Clear
                    </button>
                  </div>
                  <div id="tryitConsoleItems" style="display:flex; flex-direction:column; gap:4px;"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom: Contributor Save Test Case Card -->
          <div style="background:#111827; border-top:1px solid rgba(255,255,255,0.08); padding:10px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px; flex:1; min-width:260px;">
              <span style="font-size:0.78rem; color:#94a3b8; white-space:nowrap;">
                <i class="ri-user-star-line" style="color:#38bdf8;"></i> <span id="tryitLoggedUserLabel">Logged in</span>:
              </span>
              <input type="text" id="tryitDraftTitleInput" class="sol-input" placeholder="Draft Test Case Name (e.g. Edge Case with 0 items)" style="padding:5px 10px; font-size:0.8rem; flex:1; max-width:320px; height:auto;">
              <select id="tryitDraftModeSelect" class="sol-input" style="padding:5px 10px; font-size:0.8rem; width:auto; height:auto; cursor:pointer;" title="Public: shared with community; Private: encrypted mode">
                <option value="public">🌐 Public (Community)</option>
                <option value="private">🔒 Private (Encrypted Mode)</option>
              </select>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <span id="tryitSaveStatusMsg" style="font-size:0.78rem; color:#10b981; display:none;"></span>
              <button type="button" class="sol-btn sol-btn-primary sol-btn-sm" id="btnSaveTryItDraft" onclick="window.saveCurrentTryItDraft()">
                <i class="ri-save-line"></i> Save Test Case
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Responsive media rule for 1-column on small screens
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @media (max-width: 768px) {
        #tryitWorkspaceGrid {
          grid-template-columns: 1fr !important;
          grid-template-rows: 1fr 1fr;
        }
      }
      .sol-code-try-btn {
        background: linear-gradient(135deg, #6366f1, #4f46e5);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 4px 12px;
        font-size: 0.78rem;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        transition: all 0.2s ease;
      }
      .sol-code-try-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(99, 102, 241, 0.5);
        background: linear-gradient(135deg, #4f46e5, #4338ca);
      }
    `;
    document.head.appendChild(styleEl);

    // Tab key support in editors
    ['tryitEditorHtml', 'tryitEditorCss', 'tryitEditorJs'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Tab') {
            e.preventDefault();
            const s = this.selectionStart, end = this.selectionEnd;
            this.value = this.value.substring(0, s) + "  " + this.value.substring(end);
            this.selectionStart = this.selectionEnd = s + 2;
          }
        });
      }
    });

    // Listen for messages from tryit iframe
    window.addEventListener('message', function(evt) {
      if (!evt.data || evt.data.type !== 'DPG_TRYIT_CONSOLE') return;
      handleTryItConsoleMessage(evt.data);
    });
  }

  function handleTryItConsoleMessage(data) {
    const container = document.getElementById('tryitConsoleItems');
    const badge = document.getElementById('tryitConsoleBadge');
    if (!container) return;

    tryitConsoleCount++;
    if (badge) {
      badge.textContent = tryitConsoleCount;
      badge.style.display = 'inline-block';
    }

    const item = document.createElement('div');
    const levelClass = data.level === 'error' ? 'log-error' : (data.level === 'warn' ? 'log-warn' : 'log-info');
    item.className = 'sol-console-item ' + levelClass;

    const icon = data.level === 'error' ? '<i class="ri-close-circle-fill" style="color:#ef4444;"></i>' : (data.level === 'warn' ? '<i class="ri-alert-fill" style="color:#f59e0b;"></i>' : '<i class="ri-information-fill" style="color:#38bdf8;"></i>');

    item.innerHTML = `
      <span class="timestamp">[${data.time || new Date().toLocaleTimeString()}]</span>
      <span>${icon}</span>
      <span style="word-break:break-all;">${escapeHtml(data.message || '')}</span>
    `;

    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  window.clearTryItConsole = function() {
    const container = document.getElementById('tryitConsoleItems');
    const badge = document.getElementById('tryitConsoleBadge');
    if (container) container.innerHTML = '';
    if (badge) {
      badge.textContent = '0';
      badge.style.display = 'none';
    }
    tryitConsoleCount = 0;
  };

  window.switchTryItTab = function(tab) {
    ['Html', 'Css', 'Js'].forEach(t => {
      const btn = document.getElementById('tryitTabBtn' + t);
      const editor = document.getElementById('tryitEditor' + t);
      if (btn) btn.classList.remove('active');
      if (editor) editor.style.display = 'none';
    });

    const activeBtn = document.getElementById('tryitTabBtn' + (tab.charAt(0).toUpperCase() + tab.slice(1)));
    const activeEditor = document.getElementById('tryitEditor' + (tab.charAt(0).toUpperCase() + tab.slice(1)));
    if (activeBtn) activeBtn.classList.add('active');
    if (activeEditor) {
      activeEditor.style.display = 'block';
      activeEditor.focus();
    }
  };

  window.switchTryItRightTab = function(tab) {
    const pBtn = document.getElementById('tryitPreviewTabBtn');
    const cBtn = document.getElementById('tryitConsoleTabBtn');
    const iframe = document.getElementById('tryitSandboxIframe');
    const consolePane = document.getElementById('tryitConsoleLogsPane');

    if (tab === 'preview') {
      if (pBtn) pBtn.classList.add('active');
      if (cBtn) cBtn.classList.remove('active');
      if (iframe) iframe.style.display = 'block';
      if (consolePane) consolePane.style.display = 'none';
    } else {
      if (cBtn) cBtn.classList.add('active');
      if (pBtn) pBtn.classList.remove('active');
      if (iframe) iframe.style.display = 'none';
      if (consolePane) consolePane.style.display = 'block';
    }
  };

  window.closeTryItModal = function() {
    const modal = document.getElementById('advancedTryItModal');
    if (modal) modal.style.display = 'none';
  };

  window.resetTryItCode = function() {
    window.switchTryItTestCase('__official__');
  };

  window.runTryItCode = function() {
    const htmlCode = document.getElementById('tryitEditorHtml') ? document.getElementById('tryitEditorHtml').value : '';
    const cssCode = document.getElementById('tryitEditorCss') ? document.getElementById('tryitEditorCss').value : '';
    const jsCode = document.getElementById('tryitEditorJs') ? document.getElementById('tryitEditorJs').value : '';
    const iframe = document.getElementById('tryitSandboxIframe');
    if (!iframe) return;

    window.clearTryItConsole();

    const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 1rem;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b; background-color: #ffffff; line-height: 1.5;
    }
    ${cssCode || ''}
  </style>
  <script>
    (function() {
      function emit(level, args) {
        try {
          var parts = Array.prototype.slice.call(args).map(function(item) {
            if (typeof item === 'object' && item !== null) {
              try { return JSON.stringify(item); } catch(e) { return String(item); }
            }
            return String(item);
          });
          window.parent.postMessage({
            type: 'DPG_TRYIT_CONSOLE',
            level: level,
            message: parts.join(' '),
            time: new Date().toLocaleTimeString()
          }, '*');
        } catch(e) {}
      }
      var _log = console.log, _warn = console.warn, _err = console.error, _info = console.info;
      console.log = function() { _log.apply(console, arguments); emit('log', arguments); };
      console.warn = function() { _warn.apply(console, arguments); emit('warn', arguments); };
      console.error = function() { _err.apply(console, arguments); emit('error', arguments); };
      console.info = function() { _info.apply(console, arguments); emit('info', arguments); };
      window.onerror = function(msg, url, line) {
        emit('error', ['Runtime Error: ' + msg + (line ? ' (Line ' + line + ')' : '')]);
        return true;
      };
    })();
  <\/script>
</head>
<body>
  ${htmlCode || '<div style="color:#64748b; font-style:italic;">No HTML markup provided.</div>'}
  <script id="dpg-tryit-script" type="text/plain">${encodeURIComponent(jsCode || '')}<\/script>
  <script>
    (function() {
      try {
        var raw = document.getElementById('dpg-tryit-script').textContent;
        if (raw && raw.trim()) {
          var code = decodeURIComponent(raw);
          var s = document.createElement('script');
          s.textContent = code;
          document.body.appendChild(s);
        }
      } catch (err) {
        console.error("Execution Error: " + err.message);
      }
    })();
  <\/script>
</body>
</html>`;

    iframe.srcdoc = doc;
    if (typeof window.recordCodeRunMetric === 'function') {
      window.recordCodeRunMetric(activeTryItGroupId);
    }
  };

  // Auth Prompt Modal for Guest Try It Access
  let pendingTryItGroup = null;
  let pendingTryItTitle = null;

  function ensureTryItAuthModalInDom() {
    if (typeof document === 'undefined' || !document.body || document.getElementById('tryItAuthPromptModal')) return;

    const modalHtml = `
      <div class="sol-modal-overlay sol-sandbox-modal-overlay" id="tryItAuthPromptModal" style="display:none; z-index:999999;">
        <div class="sol-auth-prompt-card">
          <div class="sol-auth-prompt-icon">
            <i class="ri-terminal-box-line"></i>
          </div>
          <h2 style="color:white; font-size:1.35rem; font-weight:800; margin-bottom:0.4rem;">Sign In Required for Try It</h2>
          <p style="color:#94a3b8; font-size:0.86rem; line-height:1.55; margin-bottom:1.2rem;">
            <strong>Try It</strong> is an interactive developer playground. Sign in with your Google account to run live experiments, customize code, test edge cases, and save community drafts in real-time.
          </p>

          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:12px 14px; text-align:left; margin-bottom:1.25rem; font-size:0.8rem; color:#cbd5e1; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ri-flashlight-line" style="color:#facc15;"></i>
              <span><strong>Live In-Memory Sandbox:</strong> Edit HTML, CSS, JS with zero setup.</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ri-global-line" style="color:#38bdf8;"></i>
              <span><strong>Public &amp; Private Test Cases:</strong> Save drafts or share with community.</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <i class="ri-shield-keyhole-line" style="color:#10b981;"></i>
              <span><strong>Zero-Knowledge Encryption:</strong> Secure private mode test suites.</span>
            </div>
          </div>

          <button type="button" class="sol-auth-prompt-btn-google" id="btnGoogleSignInTryIt" onclick="window.triggerGoogleSignInForTryIt()">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Sign in with Google</span>
          </button>

          <button type="button" class="sol-btn sol-btn-secondary sol-btn-sm" style="margin-top:0.8rem; width:100%; justify-content:center;" onclick="window.closeTryItAuthPromptModal()">
            Continue as Guest (Read Only)
          </button>
        </div>
      </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);
  }

  function showTryItAuthPromptModal(groupId, optionalTitle) {
    pendingTryItGroup = groupId;
    pendingTryItTitle = optionalTitle;
    ensureTryItAuthModalInDom();
    const modal = document.getElementById('tryItAuthPromptModal');
    if (modal) modal.style.display = 'flex';
  }

  window.closeTryItAuthPromptModal = function() {
    const modal = document.getElementById('tryItAuthPromptModal');
    if (modal) modal.style.display = 'none';
    pendingTryItGroup = null;
    pendingTryItTitle = null;
  };

  window.triggerGoogleSignInForTryIt = async function() {
    const btn = document.getElementById('btnGoogleSignInTryIt');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="ri-loader-4-line" style="animation:spin 1s linear infinite;"></i> Connecting to Google...';
    }

    try {
      const auth = window.solAuth || (typeof getAuth === 'function' ? getAuth() : null);
      const ProviderClass = window.GoogleAuthProvider || (typeof GoogleAuthProvider !== 'undefined' ? GoogleAuthProvider : null);
      const signInFn = window.solSignInWithPopup || (typeof signInWithPopup === 'function' ? signInWithPopup : null);

      if (!auth || !ProviderClass || !signInFn) {
        throw new Error("Authentication module is initializing. Please refresh and try again.");
      }

      const provider = new ProviderClass();
      if (typeof provider.setCustomParameters === 'function') {
        provider.setCustomParameters({ prompt: 'select_account' });
      }

      const result = await signInFn(auth, provider);
      const user = result.user;

      if (user) {
        localStorage.setItem("dpgActiveUserUid", user.uid);
        localStorage.setItem("dpgActiveUserName", user.displayName || 'Contributor');
        localStorage.setItem("dpgActiveUserEmail", user.email || '');
        localStorage.setItem("dpgActiveUser", JSON.stringify({
          uid: user.uid,
          name: user.displayName || 'Contributor',
          email: user.email || '',
          photoURL: user.photoURL || ''
        }));

        // Close modal
        window.closeTryItAuthPromptModal();

        // Update role badge in solution header if present
        if (typeof window.checkUserRoleAndSmartAccess === 'function') {
          window.checkUserRoleAndSmartAccess();
        }

        // Resume requested Try It session
        const grp = pendingTryItGroup;
        const ttl = pendingTryItTitle;
        pendingTryItGroup = null;
        pendingTryItTitle = null;

        if (grp) {
          window.openTryItModal(grp, ttl);
        }
      }
    } catch (err) {
      console.error("Google Sign-In Error for Try It:", err);
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>Sign in with Google</span>`;
      }
      if (typeof window.customAlert === 'function') {
        await window.customAlert("Sign in notice: " + (err.message || 'Cancelled or popup closed.'), { title: "Authentication Notice" });
      } else {
        alert("Sign in notice: " + (err.message || 'Cancelled or popup closed.'));
      }
    }
  };

  // Open Interactive Try It Playground (for Login Users)
  window.openTryItModal = function(groupId, optionalTitle) {
    const userUid = localStorage.getItem("dpgActiveUserUid") || (window.solAuth && window.solAuth.currentUser && window.solAuth.currentUser.uid);
    const userRaw = localStorage.getItem("dpgActiveUser");

    if (!userUid) {
      showTryItAuthPromptModal(groupId, optionalTitle);
      return;
    }

    ensureTryItModalInDom();
    activeTryItGroupId = groupId;
    activeTryItTitle = optionalTitle || `Group: ${groupId}`;

    const userObj = userRaw ? JSON.parse(userRaw) : { uid: userUid, name: 'Contributor' };
    const userLabel = document.getElementById('tryitLoggedUserLabel');
    if (userLabel) userLabel.textContent = userObj.name || userObj.email || 'Contributor';

    // Extract current group code
    const extracted = extractSandboxCodeForGroup(groupId);
    const htmlCode = extracted.html;
    const cssCode = extracted.css;
    const jsCode = extracted.js;

    activeTryItOriginal = { html: htmlCode, css: cssCode, js: jsCode };

    document.getElementById('tryitEditorHtml').value = htmlCode;
    document.getElementById('tryitEditorCss').value = cssCode;
    document.getElementById('tryitEditorJs').value = jsCode;
    document.getElementById('tryitModalTitle').textContent = `Try It: ${activeTryItTitle}`;

    // Populate test cases select dropdown
    loadCommunityTestCasesForGroup(groupId);

    const modal = document.getElementById('advancedTryItModal');
    if (modal) modal.style.display = 'flex';

    window.switchTryItTab('html');
    window.switchTryItRightTab('preview');
    window.runTryItCode();
  };

  window.saveCurrentTryItDraft = async function() {
    const userUid = localStorage.getItem("dpgActiveUserUid") || (window.solAuth && window.solAuth.currentUser && window.solAuth.currentUser.uid);
    const userRaw = localStorage.getItem("dpgActiveUser");
    const userObj = userRaw ? JSON.parse(userRaw) : { uid: userUid, name: 'Contributor', email: '' };

    if (!userUid) return;

    const titleInput = document.getElementById('tryitDraftTitleInput');
    const modeSelect = document.getElementById('tryitDraftModeSelect');
    const statusMsg = document.getElementById('tryitSaveStatusMsg');
    const saveBtn = document.getElementById('btnSaveTryItDraft');

    const title = (titleInput && titleInput.value.trim()) || ('Test Case ' + new Date().toLocaleTimeString());
    const mode = (modeSelect && modeSelect.value) || 'public';
    const isEnc = (mode === 'private');

    const html = document.getElementById('tryitEditorHtml').value;
    const css = document.getElementById('tryitEditorCss').value;
    const js = document.getElementById('tryitEditorJs').value;

    const draftId = 'tc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const urlParams = new URLSearchParams(window.location.search);
    const solutionId = urlParams.get('id') || ('sol_' + activeTryItGroupId);
    const solType = window.location.pathname.includes('Practical') ? 'practical' : 'assignment';

    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Saving...';
    }

    const testCaseRecord = {
      draftId: draftId,
      solutionId: solutionId,
      solutionType: solType,
      groupId: activeTryItGroupId,
      sandboxMetadataInfoId: `${solutionId}_${activeTryItGroupId}`,
      title: title,
      mode: mode,
      isEncrypted: isEnc,
      htmlCode: html,
      cssCode: css,
      jsCode: js,
      contributorUid: userUid,
      contributorName: userObj.name || 'Contributor',
      contributorEmail: userObj.email || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Save to local cache
    try {
      const storageKey = 'dpg_testcases_' + activeTryItGroupId;
      const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
      list.unshift(testCaseRecord);
      localStorage.setItem(storageKey, JSON.stringify(list));
    } catch(e) {}

    // 2. Save to Firestore if available
    try {
      if (window.solDb && window.solSetDoc && window.solDoc) {
        // A: Under code-blocks/codes/sandboxes/{groupId}/drafts/{draftId}
        const draftDocRef = window.solDoc(window.solDb, "code-blocks", "codes", "sandboxes", `${solutionId}_${activeTryItGroupId}`, "drafts", draftId);
        await window.solSetDoc(draftDocRef, testCaseRecord);

        // B: In top-level solution_test_cases collection for Admin Dashboard tab indexing!
        const globalRef = window.solDoc(window.solDb, "solution_test_cases", draftId);
        await window.solSetDoc(globalRef, testCaseRecord);
      }
    } catch (err) {
      console.warn("Firestore test case save error (saved locally):", err);
    }

    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="ri-save-line"></i> Save Test Case';
    }
    if (statusMsg) {
      statusMsg.style.display = 'inline';
      statusMsg.style.color = '#10b981';
      statusMsg.textContent = isEnc ? 'Saved in Private (Encrypted) mode!' : 'Saved in Public mode!';
      setTimeout(() => { statusMsg.style.display = 'none'; }, 4000);
    }

    // Refresh select dropdown
    loadCommunityTestCasesForGroup(activeTryItGroupId, draftId);
  };

  // Telemetry & Engagement: Real-time Code Run Recorder
  window.recordCodeRunMetric = function(groupId, optTestCaseId) {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const solutionId = urlParams.get('id');
      const contribUid = urlParams.get('contributor');
      const isPractical = window.location.pathname.includes('Practical');
      const colName = isPractical ? "practical_solutions" : "assignment_solutions";

      // 1. Increment runs on the solution document in Firestore
      if (solutionId && contribUid && window.solDb && window.solDoc && window.solUpdateDoc && window.solIncrement) {
        const docRef = window.solDoc(window.solDb, colName, contribUid, "solutions", solutionId);
        window.solUpdateDoc(docRef, { runs: window.solIncrement(1) }).catch(() => {});
      }

      // 2. Increment runs on the specific test case document in Firestore if active
      const sel = document.getElementById('tryitTestCaseSelect');
      const caseId = optTestCaseId || (sel ? sel.value : null);
      if (caseId && caseId !== '__official__' && window.solDb && window.solDoc && window.solUpdateDoc && window.solIncrement) {
        const tcRef = window.solDoc(window.solDb, "solution_test_cases", caseId);
        window.solUpdateDoc(tcRef, { runs: window.solIncrement(1) }).catch(() => {});
      }

      // 3. Increment UI counters on page
      const runsCountEl = document.getElementById('totalRunsText');
      if (runsCountEl) {
        const current = parseInt(runsCountEl.textContent.replace(/,/g, '') || '0', 10);
        runsCountEl.textContent = (current + 1).toLocaleString();
      }

      if (caseId && caseId !== '__official__') {
        const tcRunsEl = document.getElementById(`tc_runs_${caseId}`);
        if (tcRunsEl) {
          const tcCurrent = parseInt(tcRunsEl.textContent.replace(/,/g, '') || '0', 10);
          tcRunsEl.textContent = tcCurrent + 1;
        }
      }
    } catch (e) {
      console.warn("recordCodeRunMetric notice:", e);
    }
  };

  async function loadCommunityTestCasesForGroup(groupId, selectDraftId = null) {
    const sel = document.getElementById('tryitTestCaseSelect');
    if (!sel) return;

    sel.innerHTML = '<option value="__official__">Official Solution (Default)</option>';

    const testCasesMap = new Map();

    // 1. Load from localStorage: scan current group + all cached testcases
    try {
      const localList = JSON.parse(localStorage.getItem('dpg_testcases_' + groupId) || '[]');
      localList.forEach(item => {
        const dId = item.draftId || item.id;
        if (dId) testCasesMap.set(dId, item);
      });

      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('dpg_testcases_')) {
          const raw = localStorage.getItem(k);
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              list.forEach(item => {
                const dId = item.draftId || item.id;
                if (dId && (!groupId || item.groupId === groupId)) {
                  testCasesMap.set(dId, item);
                }
              });
            }
          }
        }
      }
    } catch(e) {}

    // 2. Load from Firestore: top-level collection + subcollections
    try {
      if (window.solDb && window.solGetDocs && window.solCollection) {
        const urlParams = new URLSearchParams(window.location.search);
        const solutionId = urlParams.get('id') || ('sol_' + groupId);

        // A. Top-level solution_test_cases collection
        try {
          const tcCol = window.solCollection(window.solDb, "solution_test_cases");
          let snap;
          if (window.solQuery && window.solWhere) {
            const q = window.solQuery(tcCol, window.solWhere("solutionId", "==", solutionId));
            snap = await window.solGetDocs(q);
          } else {
            snap = await window.solGetDocs(tcCol);
          }
          snap.forEach(docSnap => {
            const d = docSnap.data();
            if (!groupId || d.groupId === groupId || d.solutionId === solutionId) {
              testCasesMap.set(docSnap.id, { id: docSnap.id, draftId: docSnap.id, ...d });
            }
          });
        } catch(topErr) {
          console.warn("Firestore top-level test cases query notice:", topErr);
        }

        // B. Subcollection under code-blocks/codes/sandboxes/{solutionId}_{groupId}/drafts
        try {
          const colRef = window.solCollection(window.solDb, "code-blocks", "codes", "sandboxes", `${solutionId}_${groupId}`, "drafts");
          const snap = await window.solGetDocs(colRef);
          snap.forEach(docSnap => {
            testCasesMap.set(docSnap.id, { id: docSnap.id, draftId: docSnap.id, ...docSnap.data() });
          });
        } catch(subErr) {}
      }
    } catch(e) {}

    const currentUid = localStorage.getItem("dpgActiveUserUid") || (window.solAuth && window.solAuth.currentUser && window.solAuth.currentUser.uid);

    testCasesMap.forEach(tc => {
      const isOwner = currentUid && (tc.contributorUid === currentUid);
      const isPublic = (tc.mode === 'public' || (!tc.isEncrypted && tc.mode !== 'private'));
      // Public test cases are visible to ALL users (guests, contributors, owners)
      // Private test cases are visible only to the author/owner
      if (isPublic || isOwner) {
        const opt = document.createElement('option');
        opt.value = tc.draftId || tc.id;
        const icon = isPublic ? '🌐' : '🔒';
        const ownerSuffix = isOwner ? ' (Mine)' : ` (${tc.contributorName || 'Community'})`;
        opt.textContent = `${icon} ${tc.title || 'Test Case'}${ownerSuffix}`;
        sel.appendChild(opt);
      }
    });

    window.__currentTestCasesMap = testCasesMap;

    if (selectDraftId) {
      sel.value = selectDraftId;
    }
  }

  window.switchTryItTestCase = function(caseId) {
    if (caseId === '__official__') {
      document.getElementById('tryitEditorHtml').value = activeTryItOriginal.html;
      document.getElementById('tryitEditorCss').value = activeTryItOriginal.css;
      document.getElementById('tryitEditorJs').value = activeTryItOriginal.js;
    } else if (window.__currentTestCasesMap && window.__currentTestCasesMap.has(caseId)) {
      const tc = window.__currentTestCasesMap.get(caseId);
      document.getElementById('tryitEditorHtml').value = tc.htmlCode || '';
      document.getElementById('tryitEditorCss').value = tc.cssCode || '';
      document.getElementById('tryitEditorJs').value = tc.jsCode || '';
    }
    window.runTryItCode();
  };

  // Auto-init modals when DOM is ready
  if (typeof document !== 'undefined' && document.readyState) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        ensureSandboxModalInDom();
        ensureTryItModalInDom();
      });
    } else {
      ensureSandboxModalInDom();
      ensureTryItModalInDom();
    }
  }

})();

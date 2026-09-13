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
    if (document.getElementById('advancedSandboxModal')) return;

    const modalHtml = `
      <div id="advancedSandboxModal" class="sol-modal-overlay" style="display:none; z-index:9999;">
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
              <iframe id="advancedSandboxIframe" class="sol-sandbox-iframe-pane" sandbox="allow-scripts allow-modals allow-same-origin"></iframe>
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
      iframe.style.width = '375px';
      iframe.style.border = '8px solid #334155';
      iframe.style.borderRadius = '24px';
      iframe.style.boxShadow = '0 10px 30px rgba(0,0,0,0.4)';
      iframe.style.margin = '20px auto';
      iframe.style.height = 'calc(100% - 40px)';
      if (textEl) textEl.textContent = 'Mobile (375px)';
      if (iconEl) iconEl.className = 'ri-computer-line';
    } else {
      iframe.style.width = '100%';
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
      };
    })();
  <\/script>
</head>
<body>
  ${htmlCode || '<div style="color:#64748b; font-style:italic;">No HTML markup provided.</div>'}
  <script>
    try {
      ${jsCode || ''}
    } catch (e) {
      console.error(e.message);
    }
  <\/script>
</body>
</html>`;

    if (iframe) {
      iframe.srcdoc = assembledDoc;
    }
  }

  // Run Sandbox from Linked Group ID
  window.runSandboxFromGroup = function(groupId, optionalTitle) {
    let htmlCode = '';
    let cssCode = '';
    let jsCode = '';

    // Search for explicit id elements first
    const htmlEl = document.getElementById('code-html-' + groupId);
    const cssEl = document.getElementById('code-css-' + groupId);
    const jsEl = document.getElementById('code-js-' + groupId);

    if (htmlEl) htmlCode = extractCodeFromElement(htmlEl);
    if (cssEl) cssCode = extractCodeFromElement(cssEl);
    if (jsEl) jsCode = extractCodeFromElement(jsEl);

    // If not found by direct ID, search by data-code-group
    if (!htmlCode) {
      const groupContainers = document.querySelectorAll(`[data-code-group="${groupId}"]`);
      groupContainers.forEach(container => {
        const lang = (container.getAttribute('data-lang') || '').toLowerCase();
        const code = extractCodeFromElement(container);
        if (lang === 'html' || lang === 'markup') htmlCode = code;
        else if (lang === 'css') cssCode = code;
        else if (lang === 'js' || lang === 'javascript') jsCode = code;
      });
    }

    // Fallback: If no htmlCode found yet, search any container with class lang-html or containing groupId
    if (!htmlCode) {
      const anyHtml = document.querySelector(`.sol-code-block-container[data-sandbox-group="${groupId}"] .sol-code-block-body`);
      if (anyHtml) htmlCode = anyHtml.textContent;
    }

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

  // Smart Content Formatter: Transforms raw contributor text into advanced academic HTML with linked code containers
  window.formatSolutionContent = function(rawContent, contextId) {
    if (!rawContent) return '';

    let content = rawContent;

    // 1. Transform custom structured code-container blocks
    // Pattern: <div class="code-container" (attributes)>...</div>
    const codeContainerRegex = /<div\s+class=["']code-container(?:\s+([^"']*))?["']([^>]*)>([\s\S]*?)<\/div>/gi;
    content = content.replace(codeContainerRegex, function(match, extraClasses, attrs, innerContent) {
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      const groupMatch = attrs.match(/data-code-group=["']([^"']+)["']/i);
      const langMatch = attrs.match(/data-lang=["']([^"']+)["']/i);

      let lang = (langMatch ? langMatch[1] : (extraClasses || '')).toLowerCase().trim();
      if (!lang) {
        if (innerContent.includes('<html') || innerContent.includes('<div') || innerContent.includes('<button') || innerContent.includes('<p')) lang = 'html';
        else if (innerContent.includes('{') && innerContent.includes(':') && innerContent.includes(';')) lang = 'css';
        else lang = 'js';
      }

      const groupId = groupMatch ? groupMatch[1] : (contextId || 'grp_' + Math.random().toString(36).substring(2, 7));
      const codeId = idMatch ? idMatch[1] : `code-${lang}-${groupId}`;

      // Extract raw code text
      let codeText = innerContent;
      // Strip style or script tags if present
      codeText = codeText.replace(/<\/?style[^>]*>/gi, '').replace(/<\/?script[^>]*>/gi, '');
      const codeMatch = codeText.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
      if (codeMatch) codeText = codeMatch[1];
      const preMatch = codeText.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch) codeText = preMatch[1];

      // Decode entities to render in pre code safely
      const cleanCode = stripHtmlTags(codeText);

      return buildInteractiveCodeContainerHtml(lang, codeId, groupId, cleanCode);
    });

    // 2. Transform standard <pre><code class="language-xyz"> blocks
    const preCodeRegex = /<pre><code(?:\s+class=["'](?:language-)?([a-zA-Z0-9_-]+)["'])?>([\s\S]*?)<\/code><\/pre>/gi;
    let preIndex = 0;
    content = content.replace(preCodeRegex, function(match, langClass, codeBody) {
      preIndex++;
      const lang = (langClass || '').toLowerCase().trim() || 'code';
      const isWebLang = (lang === 'html' || lang === 'css' || lang === 'js' || lang === 'javascript');
      const groupId = `${contextId || 'code'}_${preIndex}`;
      const codeId = `code-${lang === 'javascript' ? 'js' : lang}-${groupId}`;

      if (isWebLang) {
        return buildInteractiveCodeContainerHtml(lang, codeId, groupId, codeBody);
      }

      // Default syntax pre block with copy button
      return `
        <div class="sol-code-block-container" data-sandbox-group="${groupId}">
          <div class="sol-code-block-header">
            <div class="sol-code-block-lang">
              <i class="ri-code-s-slash-line"></i> ${lang.toUpperCase()}
            </div>
            <div class="sol-code-block-actions">
              <button type="button" class="sol-code-copy-btn" onclick="window.copyCodeFromContainer('${codeId}')">
                <i class="ri-file-copy-line"></i> Copy
              </button>
            </div>
          </div>
          <pre class="sol-code-block-body" id="${codeId}"><code>${codeBody}</code></pre>
        </div>
      `;
    });

    return content;
  };

  function buildInteractiveCodeContainerHtml(lang, codeId, groupId, codeText) {
    const isHtml = (lang === 'html' || lang === 'markup');
    const isCss = (lang === 'css');
    const isJs = (lang === 'js' || lang === 'javascript');

    let langIcon = 'ri-code-line';
    let langLabel = lang.toUpperCase();
    let langClass = 'lang-html';

    if (isHtml) {
      langIcon = 'ri-html5-fill';
      langLabel = 'HTML';
      langClass = 'lang-html';
    } else if (isCss) {
      langIcon = 'ri-css3-fill';
      langLabel = 'CSS';
      langClass = 'lang-css';
    } else if (isJs) {
      langIcon = 'ri-javascript-fill';
      langLabel = 'JavaScript';
      langClass = 'lang-js';
    }

    // Run button is present in HTML container header (or if it's the primary executable block)
    const runButtonHtml = isHtml ? `
      <button type="button" class="sol-code-run-btn" onclick="window.runSandboxFromGroup('${groupId}', '${langLabel} Demo')">
        <i class="ri-play-circle-fill"></i> Run in Sandbox
      </button>
    ` : '';

    return `
      <div class="sol-code-block-container" data-sandbox-group="${groupId}" data-lang="${lang}">
        <div class="sol-code-block-header">
          <div class="sol-code-block-lang ${langClass}">
            <i class="${langIcon}"></i> ${langLabel}
            <span class="sol-code-block-id-tag">id="${codeId}"</span>
          </div>
          <div class="sol-code-block-actions">
            <button type="button" class="sol-code-copy-btn" onclick="window.copyCodeFromContainer('${codeId}')">
              <i class="ri-file-copy-line"></i> Copy
            </button>
            ${runButtonHtml}
          </div>
        </div>
        <pre class="sol-code-block-body" id="${codeId}"><code>${escapeHtml(codeText)}</code></pre>
      </div>
    `;
  }

  // Quick Tools Palette Snippet Inserters
  window.insertSandboxSnippet = function(textareaId, type, contextId) {
    const el = document.getElementById(textareaId);
    if (!el) return;

    const uniqueId = contextId + '_' + Date.now().toString(36).substring(2, 6);
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
    const val = el.value;
    el.value = val.substring(0, start) + snippet + val.substring(end);
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

  // Auto-init modal when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureSandboxModalInDom);
  } else {
    ensureSandboxModalInDom();
  }

})();

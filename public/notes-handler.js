/** DPGNotes In-Document Notes Handler (notes-handler.js) */
(function () {
  'use strict';
  window.dpgResourceNotesCache = [];
  window.dpgResourceNotesLoaded = false;
  function injectNotesStyles() {
    if (document.getElementById('added-notes-styles')) return;
    const style = document.createElement('style');
    style.id = 'added-notes-styles';
    style.textContent = `
      .added-notes {
        width: 100%;
        max-width: 830px;
        margin: 1.15rem auto;
        padding: 1.75rem 2rem;
        background: linear-gradient(145deg, #0b0f19 0%, #131728 50%, #1e1b4b 100%);
        border: 1px solid rgba(139, 92, 246, 0.35);
        border-left: 5px solid #8b5cf6;
        border-radius: 16px;
        box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6), 0 0 24px rgba(139, 92, 246, 0.12);
        backdrop-filter: blur(16px);
        color: #f8fafc;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        overflow-wrap: anywhere;
        word-break: break-word;
        flex-shrink: 0 !important;
        flex-grow: 0 !important;
        height: auto !important;
        min-height: fit-content !important;
        animation: fadeInNote 0.35s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes fadeInNote {
        from { opacity: 0; transform: translateY(12px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .added-notes::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 140px;
        height: 140px;
        background: radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%);
        pointer-events: none;
      }
      .added-notes-header {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
        padding-bottom: 1.1rem;
        margin-bottom: 1.3rem;
      }
      .added-notes-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        flex-wrap: wrap;
        gap: 0.75rem 1rem;
        width: 100%;
      }
      .added-notes-title-wrap {
        flex: 1 1 auto;
        min-width: 0;
      }
      .added-notes-title {
        font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: clamp(1.2rem, 2.5vw, 1.7rem);
        font-weight: 750;
        line-height: 1.32;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin: 0;
        padding: 0;
        border: none;
        white-space: normal !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
      }
      .added-notes-tags-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .added-notes-tags-label {
        color: #a5b4fc;
        font-size: 0.82rem;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        opacity: 0.9;
      }
      .added-notes-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }
      .added-notes-tag {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.18);
        color: #e2e8f0;
        font-size: 0.75rem;
        padding: 3px 10px;
        border-radius: 6px;
        font-weight: 500;
        text-decoration: none;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .added-notes-tag:hover {
        background: rgba(99, 102, 241, 0.35);
        border-color: rgba(167, 139, 250, 0.65);
        color: #ffffff;
        text-decoration: none;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
      }
      .added-notes-tag:focus-visible {
        outline: 2px solid #a855f7;
        outline-offset: 2px;
      }
      .added-notes-actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
        margin-top: 2px;
      }
      .note-like-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #f1f5f9;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .note-like-btn:hover {
        background: rgba(244, 63, 94, 0.18);
        border-color: rgba(244, 63, 94, 0.5);
        color: #f43f5e;
        transform: scale(1.03);
      }
      .note-like-btn.liked {
        background: rgba(244, 63, 94, 0.25);
        border-color: #f43f5e;
        color: #f43f5e;
      }
      .note-like-btn.liked .like-icon {
        color: #f43f5e;
      }
      .note-like-btn:focus-visible {
        outline: 2px solid #f43f5e;
        outline-offset: 2px;
      }
      .note-share-btn {
        background: rgba(99, 102, 241, 0.22);
        border: 1px solid rgba(139, 92, 246, 0.45);
        color: #ede9fe;
        padding: 5px 12px;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-height: 34px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .note-share-btn:hover {
        background: rgba(99, 102, 241, 0.4);
        color: #ffffff;
        border-color: #a78bfa;
        transform: scale(1.03);
      }
      .note-share-btn:focus-visible {
        outline: 2px solid #818cf8;
        outline-offset: 2px;
      }
      .added-notes-body {
        font-size: 0.96rem;
        line-height: 1.75;
        color: #f1f5f9;
        word-break: break-word;
      }
      .added-notes-body h2 {
        font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 1.25rem;
        font-weight: 700;
        color: #c4b5fd;
        margin: 1.1rem 0 0.5rem 0;
        letter-spacing: -0.01em;
      }
      .added-notes-body h3 {
        font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 1.08rem;
        font-weight: 600;
        color: #93c5fd;
        margin: 0.9rem 0 0.4rem 0;
      }
      .added-notes-body p {
        margin: 0.6rem 0 0.9rem 0;
        color: #e2e8f0;
      }
      .added-notes-body ul, .added-notes-body ol {
        margin: 0.6rem 0 1rem 1.4rem;
        padding-left: 0.5rem;
      }
      .added-notes-body li {
        margin-bottom: 0.4rem;
        color: #f1f5f9;
      }
      .added-notes-body a {
        color: #38bdf8;
        text-decoration: underline;
        text-underline-offset: 3px;
        transition: color 0.2s;
        font-weight: 600;
      }
      .added-notes-body a:hover {
        color: #a5b4fc;
      }
      .added-notes-body code {
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(139, 92, 246, 0.35);
        padding: 2px 7px;
        border-radius: 4px;
        font-size: 0.88em;
        color: #f472b6;
        font-family: 'Fira Code', 'Courier New', monospace;
      }
      .note-adsense-unit {
        margin: 1.2rem auto;
        padding: 0.8rem;
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        text-align: center;
        max-width: 100%;
        min-height: 90px;
        box-sizing: border-box;
      }
      .dpg-native-ad-block {
        margin: 1.4rem 0;
        padding: 1.1rem 1.4rem;
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.75), rgba(15, 23, 42, 0.85));
        border: 1px solid rgba(99, 102, 241, 0.4);
        border-radius: 12px;
        position: relative;
        overflow: hidden;
      }
      .dpg-native-ad-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.72rem;
        color: #a5b4fc;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 700;
        margin-bottom: 6px;
      }
      @keyframes noteHighlightPulse {
        0% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.8); border-color: #a855f7; }
        50% { box-shadow: 0 0 35px 12px rgba(168, 85, 247, 0.9); border-color: #c084fc; transform: scale(1.01); }
        100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); border-color: rgba(99, 102, 241, 0.3); }
      }
      .note-target-highlight {
        animation: noteHighlightPulse 2.8s ease-in-out;
      }
      .note-copy-toast {
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: #0f172a;
        color: #e2e8f0;
        border: 1px solid #8b5cf6;
        padding: 10px 18px;
        border-radius: 10px;
        font-size: 0.85rem;
        box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      @media (max-width: 1024px) {
        .added-notes {
          width: 100% !important;
          max-width: 96% !important;
          margin: 1rem auto !important;
          padding: 1.35rem 1.25rem !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          height: auto !important;
          min-height: fit-content !important;
        }
      }
      @media (max-width: 768px) {
        .added-notes {
          width: calc(100% - 16px) !important;
          max-width: calc(100% - 16px) !important;
          margin: 0.85rem auto !important;
          padding: 1.15rem 1rem !important;
          border-radius: 12px !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          height: auto !important;
          min-height: fit-content !important;
        }
        .added-notes-header {
          gap: 0.75rem !important;
          padding-bottom: 0.85rem !important;
          margin-bottom: 1rem !important;
        }
        .added-notes-header-top {
          display: flex !important;
          flex-direction: row !important;
          justify-content: space-between !important;
          align-items: flex-start !important;
          flex-wrap: nowrap !important;
          gap: 0.55rem !important;
          width: 100% !important;
        }
        .added-notes-title-wrap {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          width: auto !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .added-notes-actions {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 6px !important;
          flex-shrink: 0 !important;
          width: auto !important;
          margin: 0 !important;
        }
        .added-notes-title {
          font-size: 1.18rem !important;
          line-height: 1.32 !important;
          margin: 0 !important;
          padding: 0 !important;
          white-space: normal !important;
          overflow-wrap: anywhere !important;
          word-break: break-word !important;
        }
        .added-notes-body {
          font-size: 0.92rem !important;
          line-height: 1.68 !important;
          max-width: 100% !important;
          overflow-x: auto !important;
          overflow-wrap: break-word !important;
          word-break: break-word !important;
        }
        .added-notes-body img,
        .added-notes-body table,
        .added-notes-body pre {
          max-width: 100% !important;
          height: auto !important;
        }
        .added-notes-body h2 {
          font-size: 1.12rem !important;
        }
        .added-notes-body h3 {
          font-size: 0.98rem !important;
        }
      }
      @media (max-width: 480px) {
        .added-notes {
          width: calc(100% - 12px) !important;
          max-width: calc(100% - 12px) !important;
          margin: 0.75rem auto 1rem !important;
          padding: 0.95rem 0.75rem !important;
          border-radius: 10px !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          height: auto !important;
          min-height: fit-content !important;
        }
        .added-notes-title {
          font-size: 1.16rem !important;
          line-height: 1.32 !important;
        }
        .added-notes-actions {
          gap: 6px !important;
        }
        .note-like-btn, .note-share-btn {
          padding: 4px 10px !important;
          font-size: 0.76rem !important;
          min-height: 30px !important;
        }
        .added-notes-tags {
          gap: 5px !important;
        }
        .added-notes-tag {
          font-size: 0.72rem !important;
          padding: 2px 8px !important;
          border-radius: 6px !important;
        }
        .added-notes-body {
          font-size: 0.9rem !important;
          line-height: 1.62 !important;
        }
        .added-notes-body h2 {
          font-size: 1.08rem !important;
          margin: 0.85rem 0 0.4rem 0 !important;
        }
        .added-notes-body h3 {
          font-size: 0.95rem !important;
          margin: 0.75rem 0 0.35rem 0 !important;
        }
      }
      @media (max-width: 440px) {
        .added-notes-header-top {
          gap: 0.45rem !important;
        }
        .added-notes-title {
          font-size: 1.08rem !important;
          line-height: 1.28 !important;
        }
        .added-notes-actions {
          gap: 5px !important;
          width: auto !important;
          margin: 0 !important;
          flex-shrink: 0 !important;
        }
        .note-like-btn, .note-share-btn {
          padding: 3px 8px !important;
          font-size: 0.72rem !important;
          min-height: 28px !important;
          gap: 4px !important;
        }
      }
      @media (max-width: 310px) {
        .added-notes-header-top {
          flex-wrap: wrap !important;
          gap: 0.4rem !important;
        }
      }
      @media (max-width: 380px) {
        .added-notes {
          width: calc(100% - 10px) !important;
          max-width: calc(100% - 10px) !important;
          margin: 0.65rem auto 0.95rem !important;
          padding: 0.85rem 0.65rem !important;
          border-radius: 10px !important;
          flex-shrink: 0 !important;
          flex-grow: 0 !important;
          height: auto !important;
          min-height: fit-content !important;
        }
        .added-notes-title {
          font-size: 1.12rem !important;
          line-height: 1.3 !important;
        }
        .added-notes-header {
          gap: 0.6rem !important;
          padding-bottom: 0.65rem !important;
          margin-bottom: 0.85rem !important;
        }
        .added-notes-header-top {
          gap: 0.5rem !important;
        }
        .added-notes-tags {
          gap: 4px !important;
        }
        .added-notes-tag {
          font-size: 0.68rem !important;
          padding: 2px 6px !important;
          border-radius: 5px !important;
        }
        .added-notes-body {
          font-size: 0.88rem !important;
          line-height: 1.6 !important;
        }
        .added-notes-body h2 {
          font-size: 1.02rem !important;
          margin: 0.75rem 0 0.35rem 0 !important;
        }
        .added-notes-body p, .added-notes-body li {
          font-size: 0.86rem !important;
          line-height: 1.58 !important;
        }
      }
      /* Theme overrides for In-Document Notes */
      html[data-theme="light"] .added-notes,
      body[data-theme="light"] .added-notes {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        border-left: 5px solid #4338ca !important;
        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(67, 56, 202, 0.06) !important;
        color: #0f172a !important;
      }
      html[data-theme="light"] .added-notes::before,
      body[data-theme="light"] .added-notes::before {
        background: radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%) !important;
      }
      html[data-theme="light"] .added-notes-header,
      body[data-theme="light"] .added-notes-header {
        border-bottom: 1px solid #e2e8f0 !important;
      }
      html[data-theme="light"] .added-notes-title,
      body[data-theme="light"] .added-notes-title {
        color: #0f172a !important;
        text-shadow: none !important;
      }
      html[data-theme="light"] .added-notes-tags-label,
      body[data-theme="light"] .added-notes-tags-label {
        color: #4338ca !important;
      }
      html[data-theme="light"] .added-notes-tag,
      body[data-theme="light"] .added-notes-tag {
        background: #eef2ff !important;
        border: 1px solid #c7d2fe !important;
        color: #4338ca !important;
      }
      html[data-theme="light"] .added-notes-tag:hover,
      body[data-theme="light"] .added-notes-tag:hover {
        background: #e0e7ff !important;
        color: #312e81 !important;
      }
      html[data-theme="light"] .note-like-btn,
      body[data-theme="light"] .note-like-btn {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
        color: #334155 !important;
      }
      html[data-theme="light"] .note-share-btn,
      body[data-theme="light"] .note-share-btn {
        background: #eef2ff !important;
        border-color: #c7d2fe !important;
        color: #4338ca !important;
      }
      html[data-theme="light"] .added-notes-body,
      body[data-theme="light"] .added-notes-body {
        color: #1e293b !important;
      }
      html[data-theme="light"] .added-notes-body h1,
      html[data-theme="light"] .added-notes-body h2,
      body[data-theme="light"] .added-notes-body h1,
      body[data-theme="light"] .added-notes-body h2 {
        color: #0f172a !important;
      }
      html[data-theme="light"] .added-notes-body h3,
      html[data-theme="light"] .added-notes-body h4,
      body[data-theme="light"] .added-notes-body h3,
      body[data-theme="light"] .added-notes-body h4 {
        color: #1e1b4b !important;
      }
      html[data-theme="light"] .added-notes-body p,
      html[data-theme="light"] .added-notes-body li,
      body[data-theme="light"] .added-notes-body p,
      body[data-theme="light"] .added-notes-body li {
        color: #334155 !important;
      }
      html[data-theme="light"] .added-notes-body code,
      body[data-theme="light"] .added-notes-body code {
        background: #f1f5f9 !important;
        border: 1px solid #cbd5e1 !important;
        color: #be185d !important;
      }
      html[data-theme="light"] .dpg-native-ad-block,
      body[data-theme="light"] .dpg-native-ad-block {
        background: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
      }
      html[data-theme="light"] .dpg-native-ad-badge,
      body[data-theme="light"] .dpg-native-ad-badge {
        color: #4338ca !important;
      }
      /* Dark Theme overrides */
      html[data-theme="dark"] .added-notes,
      body[data-theme="dark"] .added-notes {
        background: linear-gradient(145deg, #05070f 0%, #0d1222 50%, #151a30 100%) !important;
        border: 1px solid rgba(139, 92, 246, 0.4) !important;
        border-left: 5px solid #a855f7 !important;
        color: #f8fafc !important;
      }
      html[data-theme="dark"] .added-notes-title,
      body[data-theme="dark"] .added-notes-title {
        color: #ffffff !important;
      }
      html[data-theme="dark"] .added-notes-body h1,
      html[data-theme="dark"] .added-notes-body h2,
      body[data-theme="dark"] .added-notes-body h1,
      body[data-theme="dark"] .added-notes-body h2 {
        color: #e0e7ff !important;
      }
      html[data-theme="dark"] .added-notes-body h3,
      body[data-theme="dark"] .added-notes-body h3 {
        color: #c4b5fd !important;
      }
      html[data-theme="dark"] .added-notes-body p,
      html[data-theme="dark"] .added-notes-body li,
      body[data-theme="dark"] .added-notes-body p,
      body[data-theme="dark"] .added-notes-body li {
        color: #f1f5f9 !important;
      }
    `;
    document.head.appendChild(style);
  }
  window.loadResourceNotes = async function (resourceId) {
    if (!resourceId || resourceId === '—') return [];
    injectNotesStyles();
    try {
      const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';
      const res = await fetch(`${apiBase}/api/resource-notes/${encodeURIComponent(resourceId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.notes)) {
          window.dpgResourceNotesCache = data.notes;
          window.dpgResourceNotesLoaded = true;
          return data.notes;
        }
      }
    } catch (apiErr) {
      console.warn("Backend notes API fetch failed, trying Firestore client fallback:", apiErr.message);
    }
    try {
      if (window.dpgDb && window.collection && window.getDocs) {
        let snap = null;
        try {
          const subCol = window.collection(window.dpgDb, "resource-notes", resourceId, "notes");
          snap = await window.getDocs(subCol);
        } catch (fsErr) {
          const subCol2 = window.collection(window.dpgDb, "resource_notes", resourceId, "notes");
          snap = await window.getDocs(subCol2);
        }
        const notes = [];
        if (snap) {
          snap.forEach(d => {
            notes.push({ id: d.id, ...d.data() });
          });
        }
        notes.sort((a, b) => {
          if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
          return a.rendering === 'before' ? -1 : 1;
        });
        window.dpgResourceNotesCache = notes;
        window.dpgResourceNotesLoaded = true;
        return notes;
      }
    } catch (fbErr) {
      console.warn("Firestore client notes fetch error:", fbErr.message);
    }
    return window.dpgResourceNotesCache;
  };
  window.getNoteForSlot = function (pageNumber, rendering) {
    const pg = parseInt(pageNumber, 10);
    const rend = String(rendering || '').toLowerCase();
    return window.dpgResourceNotesCache.find(n => 
      parseInt(n.pageNumber, 10) === pg && String(n.rendering || '').toLowerCase() === rend
    );
  };
  function extractNoteTitleAndBody(htmlContent, fallbackTitle) {
    if (!htmlContent) return { title: fallbackTitle || 'Study Note', body: '' };
    try {
      const temp = document.createElement('div');
      temp.innerHTML = htmlContent;
      const allH1 = temp.querySelectorAll('h1');
      let title = fallbackTitle || 'Study Note';
      if (allH1.length > 0) {
        const extracted = allH1[0].innerHTML.trim() || allH1[0].textContent.trim() || '';
        const cleaned = extracted.replace(/^(?:<br\s*\/?>|&nbsp;|\s)+|(?:<br\s*\/?>|&nbsp;|\s)+$/gi, '').trim();
        if (cleaned) title = cleaned;
        allH1.forEach(el => el.remove());
      }
      title = String(title || '').replace(/^(?:<br\s*\/?>|&nbsp;|\s)+|(?:<br\s*\/?>|&nbsp;|\s)+$/gi, '').trim() || 'Study Note';
      return {
        title,
        body: temp.innerHTML
      };
    } catch (e) {
      return { title: fallbackTitle || 'Study Note', body: htmlContent };
    }
  }
  window.extractNoteTitleAndBody = extractNoteTitleAndBody;
  window.renderNoteElement = function (note) {
    if (!note) return null;
    injectNotesStyles();
    const noteDiv = document.createElement('div');
    noteDiv.className = 'added-notes';
    const rend = (String(note.rendering || '').toLowerCase() === 'before') ? 'before' : 'after';
    const pageNum = parseInt(note.pageNumber, 10) || 1;
    const resId = note.resourceId || '';
    const noteId = note.notesId || note.id || 'default';
    const pageId = note.pageId || `${resId}-${pageNum}`;
    const elementId = note.elementId || `${rend === 'before' ? 'be' : 'af'}-${noteId}`;
    noteDiv.setAttribute('type', rend);
    noteDiv.setAttribute('page-id', pageId);
    noteDiv.setAttribute('id', elementId);
    noteDiv.setAttribute('role', 'article');
    noteDiv.setAttribute('aria-labelledby', `note-title-${noteId}`);
    const tagsArr = Array.isArray(note.tags)
      ? note.tags
      : String(note.tags || '').split(',').map(s => s.trim()).filter(Boolean);
    const tagsHtml = tagsArr.map(t => {
      const cleanTag = String(t).trim();
      if (!cleanTag) return '';
      const digiIndiaUrl = `https://digiindia-student-platform.onrender.com/search.html?q=${encodeURIComponent(cleanTag)}`;
      return `<a href="${digiIndiaUrl}" target="_blank" rel="noopener noreferrer" class="added-notes-tag" role="listitem" title="Search '${escapeHtml(cleanTag)}' on DigiIndia Student Platform" aria-label="Search tag ${escapeHtml(cleanTag)} on DigiIndia"><i class="ri-search-line" aria-hidden="true" style="font-size:0.68rem; opacity:0.8;"></i> ${escapeHtml(cleanTag)}</a>`;
    }).filter(Boolean).join('');
    const visitorId = getOrCreateVisitorId();
    const storedLiked = localStorage.getItem('dpg_liked_note_' + noteId) === 'true';
    const likedByArr = Array.isArray(note.likedBy) ? note.likedBy : [];
    const isLiked = storedLiked || (visitorId && likedByArr.includes(visitorId));
    const likesCount = typeof note.likesCount === 'number' ? note.likesCount : (likedByArr.length || 0);
    const parsed = extractNoteTitleAndBody(note.htmlContent, note.title || (note.pageNumber ? `Study Note • Page ${note.pageNumber}` : 'Study Note'));
    noteDiv.innerHTML = `
      <div class="added-notes-header">
        <div class="added-notes-header-top">
          <div class="added-notes-title-wrap">
            <h1 class="added-notes-title" id="note-title-${noteId}">${parsed.title}</h1>
          </div>
          <div class="added-notes-actions" role="toolbar" aria-label="Note interaction controls">
            <button type="button" class="note-like-btn ${isLiked ? 'liked' : ''}" id="like-btn-${noteId}" onclick="window.toggleNoteLike('${resId}', '${noteId}', this)" aria-label="${isLiked ? 'Unlike this note' : 'Like this note'}" title="${isLiked ? 'Unlike this note' : 'Like this note'}">
              <i class="${isLiked ? 'ri-heart-fill' : 'ri-heart-line'} like-icon" aria-hidden="true"></i>
              <span class="like-count">${likesCount}</span>
            </button>
            <button type="button" class="note-share-btn" onclick="window.shareInDocumentNote('${resId}', '${noteId}', '${elementId}', ${pageNum}, '${rend}', this)" aria-label="Share this note" title="Share this contributor note via WhatsApp, Web Share, or Link">
              <i class="ri-share-forward-line" aria-hidden="true"></i>
              <span>Share</span>
            </button>
          </div>
        </div>
        ${tagsHtml ? `
        <div class="added-notes-tags-row">
          <span class="added-notes-tags-label" aria-hidden="true"><i class="ri-price-tag-3-line"></i></span>
          <div class="added-notes-tags" role="list" aria-label="Study topics">${tagsHtml}</div>
        </div>` : ''}
      </div>
      <div class="added-notes-body">
        ${parsed.body || ''}
      </div>
    `;
    const isAfterDivBy3 = (rend === 'after' && pageNum % 3 === 0);
    if (isAfterDivBy3) {
      noteDiv.querySelectorAll('.native-ads, .dpg-native-ad-block, .note-adsense-unit, ins.adsbygoogle').forEach(adEl => adEl.remove());
    } else {
      const adBlocks = noteDiv.querySelectorAll('.native-ads, .dpg-native-ad-block');
      if (adBlocks.length > 0) {
        adBlocks.forEach(ad => {
          if (!ad.classList.contains('native-ads')) ad.classList.add('native-ads');
          if (!ad.dataset.adVariant) ad.dataset.adVariant = 'feed';
          if (!ad.dataset.adCount) ad.dataset.adCount = '1';
        });
        if (typeof window.renderNativeDPGAds === 'function') {
          setTimeout(() => {
            try { window.renderNativeDPGAds(); } catch(e) {}
          }, 150);
        }
      }
      const adsenseBlocks = noteDiv.querySelectorAll('ins.adsbygoogle');
      if (adsenseBlocks.length > 0) {
        setTimeout(() => {
          adsenseBlocks.forEach(ins => {
            if (!ins.dataset.adsenseInjected) {
              ins.dataset.adsenseInjected = "true";
              try { (adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
            }
          });
        }, 150);
      }
    }
    return noteDiv;
  };
  function getOrCreateVisitorId() {
    let vid = localStorage.getItem('dpg_visitor_id');
    if (!vid) {
      vid = 'v_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('dpg_visitor_id', vid);
    }
    return vid;
  }
  function showNoteToast(message) {
    const existing = document.getElementById('noteToastEl');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'noteToastEl';
    toast.className = 'note-copy-toast';
    toast.innerHTML = `<i class="ri-checkbox-circle-fill" style="color:#10b981;"></i> <span>${escapeHtml(message)}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }
  window.toggleNoteLike = async function (resourceId, noteId, btnEl) {
    if (!resourceId || !noteId) return;
    const visitorId = getOrCreateVisitorId();
    const userId = window.activeUid || localStorage.getItem('dpgUserId') || '';
    const icon = btnEl ? btnEl.querySelector('.like-icon') : null;
    const countEl = btnEl ? btnEl.querySelector('.like-count') : null;
    let currentLikes = countEl ? parseInt(countEl.textContent, 10) || 0 : 0;
    const wasLiked = btnEl ? btnEl.classList.contains('liked') : false;
    const willBeLiked = !wasLiked;
    if (btnEl) {
      if (willBeLiked) {
        btnEl.classList.add('liked');
        if (icon) { icon.className = 'ri-heart-fill like-icon'; }
        if (countEl) countEl.textContent = currentLikes + 1;
      } else {
        btnEl.classList.remove('liked');
        if (icon) { icon.className = 'ri-heart-line like-icon'; }
        if (countEl) countEl.textContent = Math.max(0, currentLikes - 1);
      }
    }
    localStorage.setItem('dpg_liked_note_' + noteId, willBeLiked ? 'true' : 'false');
    try {
      const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';
      const res = await fetch(`${apiBase}/api/resource-notes/${encodeURIComponent(resourceId)}/${encodeURIComponent(noteId)}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId, userId })
      });
      const data = await res.json();
      if (data && data.success) {
        if (countEl && typeof data.likesCount === 'number') {
          countEl.textContent = data.likesCount;
        }
        if (btnEl) {
          if (data.liked) {
            btnEl.classList.add('liked');
            if (icon) icon.className = 'ri-heart-fill like-icon';
          } else {
            btnEl.classList.remove('liked');
            if (icon) icon.className = 'ri-heart-line like-icon';
          }
        }
      }
    } catch (err) {
      console.warn("Like toggle failed, reverting:", err);
      if (btnEl) {
        if (wasLiked) {
          btnEl.classList.add('liked');
          if (icon) icon.className = 'ri-heart-fill like-icon';
          if (countEl) countEl.textContent = currentLikes;
        } else {
          btnEl.classList.remove('liked');
          if (icon) icon.className = 'ri-heart-line like-icon';
          if (countEl) countEl.textContent = currentLikes;
        }
      }
      localStorage.setItem('dpg_liked_note_' + noteId, wasLiked ? 'true' : 'false');
    }
  };
  window.shareInDocumentNote = async function (resourceId, noteId, elementId, pageNum, rend, btnEl) {
    const origHtml = btnEl ? btnEl.innerHTML : '';
    if (btnEl) {
      btnEl.innerHTML = `<i class="ri-loader-4-line spin-icon"></i> <span>Sharing...</span>`;
      btnEl.disabled = true;
    }
    try {
      const apiBase = (typeof window.API_BASE_URL === 'string' && window.API_BASE_URL !== 'undefined') ? window.API_BASE_URL : '';
      const res = await fetch(`${apiBase}/api/share/generate-note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceId,
          noteId,
          elementId,
          pageNumber: pageNum,
          rendering: rend,
          createdBy: window.activeUid || localStorage.getItem('dpgUserId') || 'guest'
        })
      });
      const data = await res.json();
      let shareUrl = '';
      if (data && data.success && data.shareUrl) {
        shareUrl = data.shareUrl;
      } else {
        const origin = window.location.origin;
        shareUrl = `${origin}/dpgnotes-pdf-viewer.html?id=${encodeURIComponent(resourceId)}&note=${encodeURIComponent(elementId)}#note-${encodeURIComponent(elementId)}`;
      }
      const shareTitle = `DPGNotes: In-Document Note (Page ${pageNum})`;
      const shareText = `Explore this verified academic note on DPGNotes (Page ${pageNum})!`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: shareTitle,
            text: `${shareText}\n`,
            url: shareUrl
          });
          showNoteToast(`Shared successfully! Auto-scrolls to Page ${pageNum}.`);
          if (btnEl) {
            btnEl.innerHTML = `<i class="ri-check-line" style="color:#10b981;"></i> <span>Shared!</span>`;
            setTimeout(() => {
              btnEl.innerHTML = origHtml;
              btnEl.disabled = false;
            }, 2000);
          }
          return;
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            if (btnEl) {
              btnEl.innerHTML = origHtml;
              btnEl.disabled = false;
            }
            return;
          }
          console.warn("navigator.share failed, falling back to clipboard:", shareErr);
        }
      }
      await navigator.clipboard.writeText(shareUrl);
      showNoteToast(`Note share link copied! Clicking will auto-scroll directly to Page ${pageNum}.`);
      if (btnEl) {
        btnEl.innerHTML = `<i class="ri-check-line" style="color:#10b981;"></i> <span>Copied!</span>`;
        setTimeout(() => {
          btnEl.innerHTML = origHtml;
          btnEl.disabled = false;
        }, 2200);
      }
    } catch (err) {
      console.warn("Share note error:", err);
      const origin = window.location.origin;
      const shareUrl = `${origin}/dpgnotes-pdf-viewer.html?id=${encodeURIComponent(resourceId)}&note=${encodeURIComponent(elementId)}#note-${encodeURIComponent(elementId)}`;
      try {
        if (navigator.share) {
          await navigator.share({
            title: `DPGNotes Note (Page ${pageNum})`,
            text: `Explore this verified academic note on DPGNotes (Page ${pageNum}):\n`,
            url: shareUrl
          });
        } else {
          await navigator.clipboard.writeText(shareUrl);
          showNoteToast(`Note share link copied!`);
        }
      } catch(e) {
        if (e.name !== 'AbortError') {
          prompt("Copy note share URL:", shareUrl);
        }
      }
      if (btnEl) {
        btnEl.innerHTML = origHtml;
        btnEl.disabled = false;
      }
    }
  };
  window.scrollToNote = function (targetNoteId) {
    if (!targetNoteId) return;
    const cleanId = String(targetNoteId).replace(/^note-/, '').trim();
    let el = document.getElementById(cleanId) ||
             document.getElementById('note-' + cleanId) ||
             document.getElementById('be-' + cleanId) ||
             document.getElementById('af-' + cleanId) ||
             document.querySelector(`[id*="${cleanId}"]`) ||
             document.querySelector(`[page-id="${cleanId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('note-target-highlight');
      setTimeout(() => el.classList.remove('note-target-highlight'), 3000);
      console.log("Successfully auto-scrolled to shared note:", cleanId);
    } else {
      let attempts = 0;
      const retryInterval = setInterval(() => {
        attempts++;
        el = document.getElementById(cleanId) ||
             document.getElementById('be-' + cleanId) ||
             document.getElementById('af-' + cleanId) ||
             document.querySelector(`[id*="${cleanId}"]`) ||
             document.querySelector(`[page-id="${cleanId}"]`);
        if (el) {
          clearInterval(retryInterval);
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('note-target-highlight');
          setTimeout(() => el.classList.remove('note-target-highlight'), 3000);
        } else if (attempts >= 10) {
          clearInterval(retryInterval);
        }
      }, 400);
    }
  };
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  window.injectNoteForPage = function (pageNumber, rendering, container) {
    if (!container) return null;
    const note = window.getNoteForSlot(pageNumber, rendering);
    if (!note) return null;
    const el = window.renderNoteElement(note);
    if (el) {
      container.appendChild(el);
    }
    return el;
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNotesStyles);
  } else {
    injectNotesStyles();
  }
})();

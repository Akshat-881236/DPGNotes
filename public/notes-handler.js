/**
 * DPGNotes In-Document Notes Handler (notes-handler.js)
 * Manages fetching, rendering, and lifecycle of contributor in-document notes
 * embedded before/after specific PDF pages.
 */

(function () {
  'use strict';

  window.dpgResourceNotesCache = [];
  window.dpgResourceNotesLoaded = false;

  // Inject CSS Styles for In-Document Notes
  function injectNotesStyles() {
    if (document.getElementById('added-notes-styles')) return;
    const style = document.createElement('style');
    style.id = 'added-notes-styles';
    style.textContent = `
      .added-notes {
        width: 100%;
        max-width: 860px;
        margin: 2rem auto;
        padding: 1.6rem 2rem;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 27, 75, 0.9));
        border: 1px solid rgba(99, 102, 241, 0.35);
        border-left: 5px solid #8b5cf6;
        border-radius: 16px;
        box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.15);
        backdrop-filter: blur(16px);
        color: #f1f5f9;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
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
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 0.9rem;
        margin-bottom: 1.2rem;
      }
      .added-notes-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.3));
        color: #c4b5fd;
        border: 1px solid rgba(167, 139, 250, 0.3);
        padding: 4px 12px;
        border-radius: 9999px;
        font-size: 0.8rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }
      .added-notes-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .added-notes-tag {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #94a3b8;
        font-size: 0.72rem;
        padding: 2px 9px;
        border-radius: 6px;
        font-weight: 500;
      }
      .added-notes-body {
        font-size: 0.95rem;
        line-height: 1.7;
        color: #e2e8f0;
      }
      .added-notes-body h1 {
        font-family: 'Outfit', sans-serif;
        font-size: 1.6rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0.8rem 0 1rem 0;
        border-bottom: 2px solid rgba(139, 92, 246, 0.4);
        padding-bottom: 0.5rem;
        display: block;
        letter-spacing: -0.015em;
        line-height: 1.3;
      }
      .added-notes-body h2 {
        font-family: 'Outfit', sans-serif;
        font-size: 1.22rem;
        font-weight: 600;
        color: #a5b4fc;
        margin: 0.8rem 0 0.5rem 0;
      }
      .added-notes-body h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 1.05rem;
        font-weight: 600;
        color: #cbd5e1;
        margin: 0.6rem 0 0.4rem 0;
      }
      .added-notes-body p {
        margin: 0.5rem 0 0.8rem 0;
        color: #cbd5e1;
      }
      .added-notes-body ul, .added-notes-body ol {
        margin: 0.6rem 0 1rem 1.4rem;
        padding-left: 0.5rem;
      }
      .added-notes-body li {
        margin-bottom: 0.35rem;
        color: #e2e8f0;
      }
      .added-notes-body a {
        color: #38bdf8;
        text-decoration: underline;
        text-underline-offset: 3px;
        transition: color 0.2s;
        font-weight: 500;
      }
      .added-notes-body a:hover {
        color: #818cf8;
      }
      .added-notes-body code {
        background: rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.85em;
        color: #f472b6;
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
    `;
    document.head.appendChild(style);
  }

  // Load all notes for a specific resource
  window.loadResourceNotes = async function (resourceId) {
    if (!resourceId || resourceId === '—') return [];
    injectNotesStyles();

    try {
      // 1. Try Backend API
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

    // 2. Client Firestore Fallback
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

  // Find note by pageNumber and rendering
  window.getNoteForSlot = function (pageNumber, rendering) {
    const pg = parseInt(pageNumber, 10);
    const rend = String(rendering || '').toLowerCase();
    return window.dpgResourceNotesCache.find(n => 
      parseInt(n.pageNumber, 10) === pg && String(n.rendering || '').toLowerCase() === rend
    );
  };

  // Create HTML Node for a Note adhering to exact formula
  window.renderNoteElement = function (note) {
    if (!note) return null;
    injectNotesStyles();

    const noteDiv = document.createElement('div');
    noteDiv.className = 'added-notes';
    const rend = (String(note.rendering || '').toLowerCase() === 'before') ? 'before' : 'after';
    const pageNum = parseInt(note.pageNumber, 10) || 1;
    const resId = note.resourceId || '';
    const noteId = note.notesId || note.id || 'default';
    
    // Exact user formula:
    // page-id= {firebase-id of target resource}-{Page No}
    // id = "be-{firebase-id-of-notes-in-firestore}" where be = before and af = after
    const pageId = note.pageId || `${resId}-${pageNum}`;
    const elementId = note.elementId || `${rend === 'before' ? 'be' : 'af'}-${noteId}`;

    noteDiv.setAttribute('type', rend);
    noteDiv.setAttribute('page-id', pageId);
    noteDiv.setAttribute('id', elementId);

    const tagsArr = Array.isArray(note.tags)
      ? note.tags
      : String(note.tags || '').split(',').map(s => s.trim()).filter(Boolean);

    const tagsHtml = tagsArr.map(t => `<span class="added-notes-tag">${escapeHtml(t)}</span>`).join('');
    const rendLabel = rend === 'before' ? 'Before Page' : 'After Page';

    noteDiv.innerHTML = `
      <div class="added-notes-header">
        <div class="added-notes-badge">
          <i class="ri-file-text-line"></i>
          <span>Contributor Notes • Page ${pageNum} (${rendLabel})</span>
        </div>
        ${tagsHtml ? `<div class="added-notes-tags">${tagsHtml}</div>` : ''}
      </div>
      <div class="added-notes-body">
        ${note.htmlContent || ''}
      </div>
    `;

    // Hydrate native ad blocks if present
    const adBlocks = noteDiv.querySelectorAll('.dpg-native-ad-block');
    adBlocks.forEach(ad => {
      if (!ad.innerHTML.trim()) {
        ad.innerHTML = `
          <div class="dpg-native-ad-badge"><i class="ri-advertisement-line"></i> DPGNotes Academic Partner Block</div>
          <div style="font-weight:600; font-size:0.95rem; color:white; margin-bottom:4px;">Recommended Academic Tools & Learning Resources</div>
          <div style="font-size:0.82rem; color:#94a3b8; line-height:1.4;">Explore student-verified study datasets, mock test series, and textbook companion vector indices on DPGNotes.</div>
        `;
      }
    });

    return noteDiv;
  };

  // Helper: Escape HTML for tags
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Inject Note into PDF Area before or after a page
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

  // Auto-run style injection on script load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectNotesStyles);
  } else {
    injectNotesStyles();
  }
})();

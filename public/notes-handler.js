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
        gap: 1.2rem;
        width: 100%;
      }
      .added-notes-title-wrap {
        flex: 1 1 auto;
        min-width: 0;
      }
      .added-notes-title {
        font-family: 'Outfit', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: clamp(1.25rem, 2.4vw, 1.7rem);
        font-weight: 750;
        line-height: 1.32;
        letter-spacing: -0.02em;
        color: #ffffff;
        margin: 0;
        padding: 0;
        border: none;
        word-break: break-word;
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
      @media (max-width: 640px) {
        .added-notes {
          padding: 1.2rem 1rem;
          margin: 1.2rem auto;
          border-radius: 12px;
        }
        .added-notes-header {
          gap: 0.75rem;
          padding-bottom: 0.9rem;
          margin-bottom: 1.1rem;
        }
        .added-notes-header-top {
          flex-direction: column;
          align-items: stretch;
          gap: 0.75rem;
        }
        .added-notes-actions {
          justify-content: flex-end;
          width: 100%;
        }
        .added-notes-title {
          font-size: 1.22rem;
          line-height: 1.35;
        }
        .added-notes-body {
          font-size: 0.92rem;
          line-height: 1.68;
        }
        .added-notes-body h2 {
          font-size: 1.12rem;
        }
        .added-notes-body h3 {
          font-size: 0.98rem;
        }
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

  // Extract main H1 title and remaining body from htmlContent to ensure strictly ONE H1 tag
  function extractNoteTitleAndBody(htmlContent, fallbackTitle) {
    if (!htmlContent) return { title: fallbackTitle || 'Study Note', body: '' };
    try {
      const temp = document.createElement('div');
      temp.innerHTML = htmlContent;
      const allH1 = temp.querySelectorAll('h1');
      let title = fallbackTitle || 'Study Note';
      if (allH1.length > 0) {
        title = allH1[0].innerHTML.trim() || allH1[0].textContent.trim() || title;
        allH1.forEach(el => el.remove());
      }
      return {
        title,
        body: temp.innerHTML
      };
    } catch (e) {
      return { title: fallbackTitle || 'Study Note', body: htmlContent };
    }
  }
  window.extractNoteTitleAndBody = extractNoteTitleAndBody;

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
    noteDiv.setAttribute('role', 'article');
    noteDiv.setAttribute('aria-labelledby', `note-title-${noteId}`);

    const tagsArr = Array.isArray(note.tags)
      ? note.tags
      : String(note.tags || '').split(',').map(s => s.trim()).filter(Boolean);

    // All Notes Card Tags point to DigiIndia Search Engine
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

    // Ads System Support & Restriction Rule:
    // NOT allow / disable rendering in After Notes of Page 3, 6, 9, 12... (divisible by 3) as they already have Google AdSense and Native Ads
    const isAfterDivBy3 = (rend === 'after' && pageNum % 3 === 0);
    if (isAfterDivBy3) {
      // Disallow / strip all ad blocks from After notes of pages divisible by 3
      noteDiv.querySelectorAll('.native-ads, .dpg-native-ad-block, .note-adsense-unit, ins.adsbygoogle').forEach(adEl => adEl.remove());
    } else {
      // 1. Support DPGNotes Common Native Ads System across notes
      const adBlocks = noteDiv.querySelectorAll('.native-ads, .dpg-native-ad-block');
      if (adBlocks.length > 0) {
        adBlocks.forEach(ad => {
          if (!ad.classList.contains('native-ads')) ad.classList.add('native-ads');
          if (!ad.dataset.adVariant) ad.dataset.adVariant = 'feed';
          if (!ad.dataset.adCount) ad.dataset.adCount = '1';
        });
        // Hydrate random approved ads using common engine
        if (typeof window.renderNativeDPGAds === 'function') {
          setTimeout(() => {
            try { window.renderNativeDPGAds(); } catch(e) {}
          }, 150);
        }
      }

      // 2. Support Google AdSense Ads across notes
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

  // Like / Unlike Note Hierarchy (single like -> no like -> like, default not like)
  window.toggleNoteLike = async function (resourceId, noteId, btnEl) {
    if (!resourceId || !noteId) return;
    const visitorId = getOrCreateVisitorId();
    const userId = window.activeUid || localStorage.getItem('dpgUserId') || '';

    const icon = btnEl ? btnEl.querySelector('.like-icon') : null;
    const countEl = btnEl ? btnEl.querySelector('.like-count') : null;
    let currentLikes = countEl ? parseInt(countEl.textContent, 10) || 0 : 0;
    const wasLiked = btnEl ? btnEl.classList.contains('liked') : false;

    // Optimistic UI update
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
      // Revert on error
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

  // Generate and copy note share link
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
        // Fallback direct URL
        const origin = window.location.origin;
        shareUrl = `${origin}/dpgnotes-pdf-viewer.html?id=${encodeURIComponent(resourceId)}&note=${encodeURIComponent(elementId)}#note-${encodeURIComponent(elementId)}`;
      }

      const shareTitle = `DPGNotes: In-Document Note (Page ${pageNum})`;
      const shareText = `Explore this verified academic note on DPGNotes (Page ${pageNum})!`;

      // Advanced Web Share Feature (WhatsApp, Telegram, System Sheet, etc.)
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
            // User closed share sheet without completing
            if (btnEl) {
              btnEl.innerHTML = origHtml;
              btnEl.disabled = false;
            }
            return;
          }
          console.warn("navigator.share failed, falling back to clipboard:", shareErr);
        }
      }

      // Fallback: Copy to clipboard
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
      // Fallback copy
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

  // Auto-scroll and highlight target shared note
  window.scrollToNote = function (targetNoteId) {
    if (!targetNoteId) return;
    const cleanId = String(targetNoteId).replace(/^note-/, '').trim();

    // Look for matching element
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
      // Retry after DOM settles if pdf pages are rendering asynchronously
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

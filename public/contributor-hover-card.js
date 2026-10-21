/**
 * DPGNotes Contributor Hover Card Engine (contributor-hover-card.js)
 * High-performance, universal contributor avatar & 4-second hover profile card component.
 * Supports: index.html, dashboard.html, dpgnotes-serp.html, AssignmentSolution, PracticalSolution.
 */
(function() {
  // 1. Ensure Bootstrap Icons CSS is loaded
  if (!document.getElementById("bootstrap-icons-css")) {
    const biLink = document.createElement("link");
    biLink.id = "bootstrap-icons-css";
    biLink.rel = "stylesheet";
    biLink.href = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
    document.head.appendChild(biLink);
  }

  // 2. Global Profiles and Relationship Caches
  window.__dpgUserCache = window.__dpgUserCache || {};
  window.__dpgFollowingCache = window.__dpgFollowingCache || {};
  window.__dpgConnectedCache = window.__dpgConnectedCache || {};

  // Inject Hover Card Styles
  const styleEl = document.createElement("style");
  styleEl.id = "dpg-contributor-hover-styles";
  styleEl.textContent = `
    .contributor-photo-trigger {
      cursor: pointer !important;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease !important;
      vertical-align: middle !important;
      object-fit: cover !important;
      flex-shrink: 0 !important;
    }
    .contributor-photo-trigger:hover {
      transform: scale(1.12) !important;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.6) !important;
    }
    .contributor-name-link {
      cursor: pointer !important;
      color: inherit !important;
      text-decoration: none !important;
      transition: color 0.2s ease !important;
    }
    .contributor-name-link:hover {
      color: #38bdf8 !important;
      text-decoration: underline !important;
    }

    /* Floating 4-Second Profile Hover Card */
    #dpgContributorHoverCard {
      position: fixed;
      z-index: 999999;
      width: 310px;
      max-width: calc(100vw - 24px);
      background: linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.98));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(99, 102, 241, 0.35);
      border-radius: 16px;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.75), 0 0 20px rgba(99, 102, 241, 0.25);
      padding: 16px;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      box-sizing: border-box;
      opacity: 0;
      visibility: hidden;
      transform: translateY(6px) scale(0.97);
      transition: opacity 0.12s ease, transform 0.12s ease, visibility 0.12s ease;
      pointer-events: none;
    }
    #dpgContributorHoverCard.dpg-hover-active {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    #dpgContributorHoverCard::before {
      content: '';
      position: absolute;
      top: -12px;
      left: 0;
      right: 0;
      height: 12px;
    }
    #dpgContributorHoverCard.flipped-top::before {
      top: auto;
      bottom: -12px;
      height: 12px;
    }

    /* Light Theme Adaptive Styling */
    html[data-theme="light"] #dpgContributorHoverCard {
      background: linear-gradient(145deg, #ffffff, #f1f5f9) !important;
      border-color: rgba(99, 102, 241, 0.4) !important;
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.22), 0 0 15px rgba(99, 102, 241, 0.2) !important;
      color: #0f172a !important;
    }
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio {
      color: #475569 !important;
    }
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-btn-profile {
      background: rgba(99, 102, 241, 0.12) !important;
      color: #4338ca !important;
      border-color: rgba(99, 102, 241, 0.3) !important;
    }

    .dpg-hover-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .dpg-hover-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #6366f1;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.4);
      flex-shrink: 0;
      background: #1e293b;
    }
    .dpg-hover-avatar-fallback {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      font-weight: 800;
      font-size: 1.25rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #6366f1;
      flex-shrink: 0;
    }
    .dpg-hover-user-meta {
      min-width: 0;
      flex: 1;
    }
    .dpg-hover-name {
      font-size: 0.98rem;
      font-weight: 700;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    html[data-theme="light"] .dpg-hover-name {
      color: #0f172a !important;
    }
    .dpg-hover-badge {
      font-size: 0.7rem;
      color: #38bdf8;
      display: inline-flex;
      align-items: center;
    }
    .dpg-hover-role {
      font-size: 0.74rem;
      color: #94a3b8;
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dpg-hover-bio {
      font-size: 0.82rem;
      line-height: 1.5;
      color: #cbd5e1;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      min-height: 2.4rem;
      word-break: break-word;
    }
    .dpg-hover-bio p {
      margin: 0;
      display: inline;
    }
    .dpg-hover-bio strong,
    .dpg-hover-bio b {
      color: #ffffff !important;
      font-weight: 700;
    }
    .dpg-hover-bio em,
    .dpg-hover-bio i {
      color: #93c5fd;
      font-style: italic;
    }
    .dpg-hover-bio code,
    .dpg-hover-bio .dpg-hover-code {
      background: rgba(99, 102, 241, 0.25);
      color: #a5b4fc;
      padding: 1px 5px;
      border-radius: 4px;
      font-size: 0.76rem;
      font-family: monospace;
    }
    .dpg-hover-bio a,
    .dpg-hover-bio .dpg-hover-bio-link {
      color: #38bdf8;
      text-decoration: underline;
    }

    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio {
      color: #334155 !important;
    }
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio strong,
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio b {
      color: #0f172a !important;
    }
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio em,
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio i {
      color: #4338ca !important;
    }
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio code,
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio .dpg-hover-code {
      background: rgba(99, 102, 241, 0.12) !important;
      color: #3730a3 !important;
    }
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio a,
    html[data-theme="light"] #dpgContributorHoverCard .dpg-hover-bio .dpg-hover-bio-link {
      color: #0284c7 !important;
    }

    .dpg-hover-social-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    html[data-theme="light"] .dpg-hover-social-row {
      border-bottom-color: rgba(0, 0, 0, 0.08);
    }
    .dpg-hover-social-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #cbd5e1;
      text-decoration: none;
      transition: all 0.2s ease;
      font-size: 0.95rem;
    }
    html[data-theme="light"] .dpg-hover-social-btn {
      background: rgba(0, 0, 0, 0.04);
      border-color: rgba(0, 0, 0, 0.1);
      color: #334155;
    }
    .dpg-hover-social-btn:hover {
      transform: translateY(-2px);
    }
    .dpg-hover-social-btn.btn-linkedin:hover {
      background: #0077b5;
      color: white;
      border-color: #0077b5;
    }
    .dpg-hover-social-btn.btn-github:hover {
      background: #24292e;
      color: white;
      border-color: #24292e;
    }

    .dpg-hover-actions-row {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px;
    }
    .dpg-hover-action-btn {
      padding: 6px 4px;
      border-radius: 8px;
      font-size: 0.72rem;
      font-weight: 700;
      text-align: center;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border: none;
      transition: all 0.2s ease;
      white-space: nowrap;
    }
    .dpg-hover-btn-profile {
      background: rgba(99, 102, 241, 0.18);
      color: #c4b5fd;
      border: 1px solid rgba(99, 102, 241, 0.35);
      text-decoration: none;
    }
    .dpg-hover-btn-profile:hover {
      background: #6366f1;
      color: #ffffff;
      border-color: #6366f1;
    }
    .dpg-hover-btn-connect {
      background: rgba(16, 185, 129, 0.18);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.35);
    }
    .dpg-hover-btn-connect:hover {
      background: #10b981;
      color: #ffffff;
      border-color: #10b981;
    }
    .dpg-hover-btn-connect.is-disconnect {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border-color: rgba(239, 68, 68, 0.35);
    }
    .dpg-hover-btn-connect.is-disconnect:hover {
      background: #ef4444;
      color: white;
    }
    .dpg-hover-btn-follow {
      background: rgba(56, 189, 248, 0.18);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.35);
    }
    .dpg-hover-btn-follow:hover {
      background: #0284c7;
      color: #ffffff;
      border-color: #0284c7;
    }
    .dpg-hover-btn-follow.is-unfollow {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border-color: rgba(245, 158, 11, 0.35);
    }
    .dpg-hover-btn-follow.is-unfollow:hover {
      background: #f59e0b;
      color: white;
    }
    .dpg-hover-self-badge {
      grid-column: span 2;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94a3b8;
      font-size: 0.72rem;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
    }
  `;
  document.head.appendChild(styleEl);

  // 3. Inject Singleton Hover Card Container
  let hoverCard = document.getElementById("dpgContributorHoverCard");
  if (!hoverCard) {
    hoverCard = document.createElement("div");
    hoverCard.id = "dpgContributorHoverCard";
    hoverCard.setAttribute("role", "dialog");
    hoverCard.setAttribute("aria-label", "Contributor Profile Preview");
    hoverCard.innerHTML = `
      <div class="dpg-hover-header">
        <div id="dpgHoverAvatarWrap"></div>
        <div class="dpg-hover-user-meta">
          <h4 class="dpg-hover-name">
            <span id="dpgHoverName">Contributor</span>
            <span class="dpg-hover-badge" title="Verified DPGNotes Contributor"><i class="bi bi-patch-check-fill text-primary"></i></span>
          </h4>
          <div class="dpg-hover-role" id="dpgHoverRole">Verified Contributor</div>
        </div>
      </div>
      <div class="dpg-hover-bio" id="dpgHoverBio">Passionate academic educator and resource contributor on DPGNotes.</div>
      <div class="dpg-hover-social-row" id="dpgHoverSocials">
        <a id="dpgHoverLinkedin" href="#" target="_blank" rel="noopener noreferrer" class="dpg-hover-social-btn btn-linkedin" title="LinkedIn Profile">
          <i class="bi bi-linkedin"></i>
        </a>
        <a id="dpgHoverGithub" href="#" target="_blank" rel="noopener noreferrer" class="dpg-hover-social-btn btn-github" title="GitHub Repository">
          <i class="bi bi-github"></i>
        </a>
        <span id="dpgHoverSocialsEmpty" style="font-size:0.75rem; color:#94a3b8; display:none;">Verified Profile on DPGNotes</span>
      </div>
      <div class="dpg-hover-actions-row">
        <a id="dpgHoverBtnProfile" href="#" class="dpg-hover-action-btn dpg-hover-btn-profile" title="Visit Profile Page">
          <i class="bi bi-person-badge"></i>Profile
        </a>
        <button type="button" id="dpgHoverBtnConnect" class="dpg-hover-action-btn dpg-hover-btn-connect">
          <i class="bi bi-person-plus-fill"></i> Connect
        </button>
        <button type="button" id="dpgHoverBtnFollow" class="dpg-hover-action-btn dpg-hover-btn-follow">
          <i class="bi bi-bell-fill"></i> Follow
        </button>
        <span id="dpgHoverSelfBadge" class="dpg-hover-self-badge" style="display:none;">
          <i class="bi bi-person-check-fill" style="color:#10b981; margin-right:4px;"></i> My Account
        </span>
      </div>
    `;
    document.body.appendChild(hoverCard);
  }

  // 4. Hover Logic and 4-Second Dwell Engine
  let activeTrigger = null;
  let currentTargetUid = "";
  let hoverTimer = null;
  let closeTimer = null;
  let isMouseOverCard = false;
  let isMouseOverTrigger = false;

  const DWELL_SHOW_DELAY = 120; // Fast dwell detection when arrow is kept on photo
  const HOVER_STAY_DURATION = 4000; // 4 seconds persistent view duration

  function getActiveUserUid() {
    try {
      return localStorage.getItem("dpgActiveUserUid") || (window.currentUser && window.currentUser.uid) || "";
    } catch (e) {
      return "";
    }
  }

  function getActiveUserData() {
    try {
      const stored = localStorage.getItem("dpgActiveUser");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return window.currentUser || null;
  }

  // Position Hover Card nicely relative to the hovered avatar
  function positionHoverCard(triggerEl) {
    const rect = triggerEl.getBoundingClientRect();
    const cardRect = hoverCard.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = rect.bottom + 4;
    let left = rect.left - 20;

    // Flip to top if close to bottom
    if (top + cardRect.height > viewportHeight - 16) {
      top = rect.top - cardRect.height - 4;
      hoverCard.classList.add("flipped-top");
    } else {
      hoverCard.classList.remove("flipped-top");
    }
    if (top < 10) top = 10;

    // Flip horizontally if overflow right
    if (left + cardRect.width > viewportWidth - 12) {
      left = viewportWidth - cardRect.width - 12;
    }
    if (left < 10) left = 10;

    hoverCard.style.top = `${top}px`;
    hoverCard.style.left = `${left}px`;
  }

  // Helper: Parse Firestore REST API document format to clean JavaScript object
  function parseFirestoreDoc(doc) {
    if (!doc || !doc.fields) return null;
    const obj = {};
    for (const [key, val] of Object.entries(doc.fields)) {
      if (val.stringValue !== undefined) obj[key] = val.stringValue;
      else if (val.booleanValue !== undefined) obj[key] = val.booleanValue;
      else if (val.integerValue !== undefined) obj[key] = Number(val.integerValue);
      else if (val.doubleValue !== undefined) obj[key] = Number(val.doubleValue);
      else if (val.timestampValue !== undefined) obj[key] = val.timestampValue;
      else if (val.nullValue !== undefined) obj[key] = null;
    }
    obj.uid = doc.name ? doc.name.split('/').pop() : '';
    return obj;
  }

  // Universal profile resolver with multi-layer fallback (Memory Cache -> Firestore SDK -> Firestore REST -> Render API)
  async function resolveUserProfile(uid, nameFallback) {
    // 1. If valid user in window.__dpgUserCache with bio, return immediately
    if (uid && window.__dpgUserCache[uid] && window.__dpgUserCache[uid].bio) {
      return window.__dpgUserCache[uid];
    }

    // 2. Try match by name if UID missing or in cache
    if (!uid && nameFallback && window.__dpgUserCache) {
      const match = Object.values(window.__dpgUserCache).find(u => u && u.name && u.name.toLowerCase() === nameFallback.toLowerCase() && u.bio);
      if (match) return match;
    }

    // 3. Try Firestore SDK if present on page
    if (uid) {
      try {
        const db = window.solDb || window.db || (typeof firebase !== 'undefined' && firebase.firestore ? firebase.firestore() : null);
        if (db && window.solGetDoc && window.solDoc) {
          const snap = await window.solGetDoc(window.solDoc(db, "users", uid));
          if (snap && snap.exists()) {
            const data = snap.data();
            const fullUser = {
              uid: uid,
              ...data,
              photoURL: data.avatarUrl || data.profilePic || data.photoURL || data.avatar || "",
              name: data.name || data.displayName || nameFallback || "Verified Contributor"
            };
            window.__dpgUserCache[uid] = fullUser;
            return fullUser;
          }
        } else if (db && typeof db.collection === 'function') {
          const snap = await db.collection("users").doc(uid).get();
          if (snap && snap.exists) {
            const data = snap.data();
            const fullUser = {
              uid: uid,
              ...data,
              photoURL: data.avatarUrl || data.profilePic || data.photoURL || data.avatar || "",
              name: data.name || data.displayName || nameFallback || "Verified Contributor"
            };
            window.__dpgUserCache[uid] = fullUser;
            return fullUser;
          }
        }
      } catch(e) {}

      // 4. Try Firestore REST API (Works universally on all static and dynamic pages with zero dependencies)
      try {
        const res = await fetch(`https://firestore.googleapis.com/v1/projects/dpgnotes/databases/(default)/documents/users/${encodeURIComponent(uid)}`);
        if (res.ok) {
          const raw = await res.json();
          const data = parseFirestoreDoc(raw);
          if (data) {
            const fullUser = {
              uid: uid,
              ...data,
              photoURL: data.avatarUrl || data.profilePic || data.photoURL || data.avatar || "",
              name: data.name || data.displayName || nameFallback || "Verified Contributor"
            };
            window.__dpgUserCache[uid] = fullUser;
            return fullUser;
          }
        }
      } catch(e) {}
    }

    // 5. Fallback: Query render social list-profiles or by name lookup
    try {
      const res = await fetch((window.API_BASE_URL || 'https://dpgnotes.onrender.com') + '/api/social/list-profiles');
      if (res.ok) {
        const list = await res.json();
        list.forEach(p => {
          window.__dpgUserCache[p.uid] = { ...(window.__dpgUserCache[p.uid] || {}), ...p };
        });
        if (uid && window.__dpgUserCache[uid] && window.__dpgUserCache[uid].bio) return window.__dpgUserCache[uid];
        if (nameFallback) {
          const match = Object.values(window.__dpgUserCache).find(u => u && u.name && u.name.toLowerCase() === nameFallback.toLowerCase());
          if (match) return match;
        }
      }
    } catch(e) {}

    return (uid && window.__dpgUserCache[uid]) || null;
  }

  // Format rich bio markup and HTML
  function formatHoverBioMarkup(rawBio) {
    if (!rawBio) return "Verified academic author & study material contributor on DPGNotes.";
    let s = String(rawBio).trim();

    // 1. Sanitize dangerous HTML tags and script handlers while preserving safe formatting tags
    s = s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
         .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
         .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
         .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
         .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
         .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
         .replace(/\son\w+\s*=\s*[^>\s]+/gi, '')
         .replace(/javascript:/gi, '');

    // 2. Unify paragraph tags to clean inline line breaks without excessive vertical whitespace
    s = s.replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
         .replace(/<p[^>]*>/gi, '')
         .replace(/<\/p>/gi, '<br>');

    // 3. Parse Markdown Bold: **text** or __text__
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');

    // 4. Parse Markdown Italic: *text* or _text_
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    s = s.replace(/_([^_]+)_/g, '<em>$1</em>');

    // 5. Parse Inline Code: `code`
    s = s.replace(/`([^`]+)`/g, '<code class="dpg-hover-code">$1</code>');

    // 6. Parse Markdown Links: [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="dpg-hover-bio-link">$1</a>');

    // 7. Ensure existing HTML <a> tags open safely in a new tab
    s = s.replace(/<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '<a href="$1" target="_blank" rel="noopener noreferrer" class="dpg-hover-bio-link">$2</a>');

    // 8. Clean line breaks
    s = s.replace(/\r\n|\r|\n/g, '<br>');
    s = s.replace(/(<br\s*\/?>\s*){2,}/gi, '<br>');
    s = s.replace(/^(<br\s*\/?>)+|(<br\s*\/?>)+$/gi, '').trim();

    return s;
  }

  // Populate data into the card with optimistic paint + asynchronous enrichment
  async function populateCardData(uid, nameFallback, photoFallback) {
    currentTargetUid = uid || "";
    const activeUid = getActiveUserUid();

    let existingCached = (uid && window.__dpgUserCache[uid]) || null;
    if (!existingCached && nameFallback && window.__dpgUserCache) {
      existingCached = Object.values(window.__dpgUserCache).find(u => u && u.name && u.name.toLowerCase() === nameFallback.toLowerCase());
    }

    // A. Instant Optimistic Render
    const initialName = (existingCached && (existingCached.name || existingCached.displayName)) || nameFallback || "Verified Contributor";
    const initialPhoto = (existingCached && (existingCached.avatarUrl || existingCached.profilePic || existingCached.photoURL)) || photoFallback || "";
    const initialBio = (existingCached && existingCached.bio) || "Verified academic author & study material contributor on DPGNotes.";
    const initialRole = (existingCached && (existingCached.discipline || existingCached.role)) || 
                        (existingCached && existingCached.userType && existingCached.college ? `${existingCached.userType} · ${existingCached.college}` :
                        (existingCached && existingCached.userType === 'Student' ? 'BCA Student · Academic Contributor' : 
                        (existingCached && existingCached.userType ? `${existingCached.userType} · Academic Contributor` : "Academic Contributor")));

    document.getElementById("dpgHoverName").textContent = initialName;
    document.getElementById("dpgHoverRole").textContent = initialRole;
    document.getElementById("dpgHoverBio").innerHTML = formatHoverBioMarkup(initialBio);

    const avatarWrap = document.getElementById("dpgHoverAvatarWrap");
    if (initialPhoto) {
      avatarWrap.innerHTML = `<img src="${initialPhoto}" alt="${initialName}" class="dpg-hover-avatar" onerror="this.onerror=null; this.src='https://dpgnotes.web.app/ANH.png';">`;
    } else {
      const initial = (initialName || "C").charAt(0).toUpperCase();
      avatarWrap.innerHTML = `<div class="dpg-hover-avatar-fallback">${initial}</div>`;
    }

    renderCardSocials(existingCached);
    renderCardActionButtons(uid, activeUid);

    // B. Asynchronous Enrichment: Resolve complete profile from Firestore if missing rich fields
    if (!existingCached || !existingCached.bio || !existingCached.discipline) {
      const fullUser = await resolveUserProfile(uid, nameFallback);
      if (fullUser && currentTargetUid === (uid || "")) {
        const finalName = fullUser.name || fullUser.displayName || initialName;
        const finalPhoto = fullUser.avatarUrl || fullUser.profilePic || fullUser.photoURL || initialPhoto;
        const finalBio = fullUser.bio || initialBio;
        const finalRole = fullUser.discipline || fullUser.role || 
                          (fullUser.userType && fullUser.college ? `${fullUser.userType} · ${fullUser.college}` :
                          (fullUser.userType === 'Student' ? 'BCA Student · Academic Contributor' : 
                          (fullUser.userType ? `${fullUser.userType} · Academic Contributor` : initialRole)));

        document.getElementById("dpgHoverName").textContent = finalName;
        document.getElementById("dpgHoverRole").textContent = finalRole;
        document.getElementById("dpgHoverBio").innerHTML = formatHoverBioMarkup(finalBio);

        if (finalPhoto && finalPhoto !== initialPhoto) {
          avatarWrap.innerHTML = `<img src="${finalPhoto}" alt="${finalName}" class="dpg-hover-avatar" onerror="this.onerror=null; this.src='https://dpgnotes.web.app/ANH.png';">`;
        }

        renderCardSocials(fullUser);
        renderCardActionButtons(fullUser.uid || uid, activeUid);
      }
    }
  }

  function renderCardSocials(user) {
    const liEl = document.getElementById("dpgHoverLinkedin");
    const ghEl = document.getElementById("dpgHoverGithub");
    const emptySocials = document.getElementById("dpgHoverSocialsEmpty");

    const linkedin = user && user.linkedin;
    const github = user && user.github;
    let hasSocial = false;

    const isUserVerifiedContributor = !!(user && (user.isVerified || user.verified || user.tier === 'contributor' || user.role === 'contributor' || user.status === 'verified' || user.status === 'active' || (user.uploadedCount && Number(user.uploadedCount) > 0)));

    if (linkedin && linkedin.startsWith("http")) {
      liEl.href = linkedin;
      liEl.style.display = "inline-flex";
      if (isUserVerifiedContributor) {
        liEl.setAttribute('data-contributor-verified', 'true');
        liEl.setAttribute('data-bypass-redirect', 'true');
        if (window.__dpgRegisterVerifiedSocial) window.__dpgRegisterVerifiedSocial(linkedin);
      } else {
        liEl.removeAttribute('data-contributor-verified');
        liEl.removeAttribute('data-bypass-redirect');
      }
      hasSocial = true;
    } else {
      liEl.style.display = "none";
    }

    if (github && github.startsWith("http")) {
      ghEl.href = github;
      ghEl.style.display = "inline-flex";
      if (isUserVerifiedContributor) {
        ghEl.setAttribute('data-contributor-verified', 'true');
        ghEl.setAttribute('data-bypass-redirect', 'true');
        if (window.__dpgRegisterVerifiedSocial) window.__dpgRegisterVerifiedSocial(github);
      } else {
        ghEl.removeAttribute('data-contributor-verified');
        ghEl.removeAttribute('data-bypass-redirect');
      }
      hasSocial = true;
    } else {
      ghEl.style.display = "none";
    }

    emptySocials.style.display = hasSocial ? "none" : "inline";
  }

  function renderCardActionButtons(uid, activeUid) {
    const profBtn = document.getElementById("dpgHoverBtnProfile");
    const baseUrl = window.location.origin || "https://dpgnotes.web.app";
    profBtn.href = uid ? `${baseUrl}/profile.html?uid=${encodeURIComponent(uid)}` : `${baseUrl}/profile.html`;

    const connBtn = document.getElementById("dpgHoverBtnConnect");
    const followBtn = document.getElementById("dpgHoverBtnFollow");
    const selfBadge = document.getElementById("dpgHoverSelfBadge");

    if (activeUid && uid && activeUid === uid) {
      // Current User hovering on self
      connBtn.style.display = "none";
      followBtn.style.display = "none";
      selfBadge.style.display = "inline-flex";
    } else {
      selfBadge.style.display = "none";
      connBtn.style.display = "inline-flex";
      followBtn.style.display = "inline-flex";

      const isFollowing = window.__dpgFollowingCache[uid] || false;
      const isConnected = window.__dpgConnectedCache[uid] || false;

      updateFollowBtnUI(isFollowing);
      updateConnectBtnUI(isConnected);

      if (activeUid && uid) {
        checkRelationshipState(activeUid, uid);
      }
    }
  }

  function updateFollowBtnUI(isFollowing) {
    const btn = document.getElementById("dpgHoverBtnFollow");
    if (!btn) return;
    if (isFollowing) {
      btn.innerHTML = `<i class="bi bi-bell-slash"></i> Unfollow`;
      btn.className = "dpg-hover-action-btn dpg-hover-btn-follow is-unfollow";
    } else {
      btn.innerHTML = `<i class="bi bi-bell-fill"></i> Follow`;
      btn.className = "dpg-hover-action-btn dpg-hover-btn-follow";
    }
  }

  function updateConnectBtnUI(isConnected) {
    const btn = document.getElementById("dpgHoverBtnConnect");
    if (!btn) return;
    if (isConnected === true || isConnected === "connected") {
      btn.innerHTML = `<i class="bi bi-person-dash-fill"></i> Disconnect`;
      btn.className = "dpg-hover-action-btn dpg-hover-btn-connect is-disconnect";
    } else if (isConnected === "pending") {
      btn.innerHTML = `<i class="bi bi-hourglass-split"></i> Pending`;
      btn.className = "dpg-hover-action-btn dpg-hover-btn-connect";
    } else {
      btn.innerHTML = `<i class="bi bi-person-plus-fill"></i> Connect`;
      btn.className = "dpg-hover-action-btn dpg-hover-btn-connect";
    }
  }

  async function checkRelationshipState(myUid, theirUid) {
    try {
      const res = await fetch((window.API_BASE_URL || 'https://dpgnotes.onrender.com') + '/api/social/connections-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: myUid, receiverId: theirUid })
      });
      if (res.ok) {
        const state = await res.json();
        const isFollowing = Boolean(state.isFollowing);
        window.__dpgFollowingCache[theirUid] = isFollowing;
        updateFollowBtnUI(isFollowing);

        let connStatus = false;
        if (state.connection && state.connection.status === 'accepted') {
          connStatus = true;
        } else if (state.connection && state.connection.status === 'pending') {
          connStatus = 'pending';
        }
        window.__dpgConnectedCache[theirUid] = connStatus;
        updateConnectBtnUI(connStatus);
      }
    } catch (e) {
      // Graceful fallback
    }
  }

  // Immediate dismiss helper
  function hideHoverCard() {
    clearTimeout(hoverTimer);
    clearTimeout(closeTimer);
    isMouseOverTrigger = false;
    isMouseOverCard = false;
    hoverCard.classList.remove("dpg-hover-active");
    activeTrigger = null;
  }

  // Show hover card
  function showHoverCard(triggerEl) {
    if (!triggerEl) return;
    activeTrigger = triggerEl;

    // Detect UID, Name, and Photo from element or nearby avatar/meta
    let uid = triggerEl.getAttribute("data-contrib-uid") || triggerEl.dataset.contribUid || "";
    let name = triggerEl.getAttribute("data-contrib-name") || triggerEl.dataset.contribName || "";
    let photo = triggerEl.getAttribute("src") || triggerEl.getAttribute("data-contrib-photo") || "";

    if (!uid) {
      const nearTrigger = triggerEl.parentElement?.querySelector(".contributor-photo-trigger, [data-contrib-uid]");
      if (nearTrigger) {
        uid = nearTrigger.getAttribute("data-contrib-uid") || nearTrigger.dataset.contribUid || "";
        if (!photo) photo = nearTrigger.getAttribute("src") || nearTrigger.getAttribute("data-contrib-photo") || "";
        if (!name) name = nearTrigger.getAttribute("data-contrib-name") || nearTrigger.dataset.contribName || "";
      }
    }

    if (!name && triggerEl.classList.contains("contributor-name-link")) {
      name = triggerEl.textContent.trim();
    }

    populateCardData(uid, name, photo);
    positionHoverCard(triggerEl);
    hoverCard.classList.add("dpg-hover-active");
  }

  // Card mouse events - Keep card active while user moves within it
  hoverCard.addEventListener("mouseenter", () => {
    isMouseOverCard = true;
    clearTimeout(closeTimer);
  });
  hoverCard.addEventListener("mouseover", () => {
    isMouseOverCard = true;
    clearTimeout(closeTimer);
  });

  hoverCard.addEventListener("mouseleave", (e) => {
    isMouseOverCard = false;
    // If moving directly back to trigger, retain
    if (e.relatedTarget && activeTrigger && (activeTrigger.contains(e.relatedTarget) || e.relatedTarget === activeTrigger)) {
      return;
    }
    // Remove if moving anywhere outside the card and trigger
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!isMouseOverCard && !isMouseOverTrigger) {
        hideHoverCard();
      }
    }, 220);
  });

  // Action Buttons Click Handlers
  document.getElementById("dpgHoverBtnConnect").addEventListener("click", async (e) => {
    e.stopPropagation();
    const activeUid = getActiveUserUid();
    if (!activeUid) {
      if (typeof window.openSignInModal === "function") {
        window.openSignInModal(true);
      } else {
        alert("Please sign in as a student or contributor to connect.");
      }
      return;
    }

    const theirUid = currentTargetUid;
    if (!theirUid || theirUid === activeUid) return;

    const isConnected = window.__dpgConnectedCache[theirUid];
    const btn = document.getElementById("dpgHoverBtnConnect");
    btn.disabled = true;

    try {
      if (isConnected === true || isConnected === "connected") {
        // Disconnect
        await fetch((window.API_BASE_URL || 'https://dpgnotes.onrender.com') + '/api/social/connect-respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: theirUid, receiverId: activeUid, status: 'rejected' })
        });
        window.__dpgConnectedCache[theirUid] = false;
        updateConnectBtnUI(false);
      } else {
        // Connect Request
        const myData = getActiveUserData();
        await fetch((window.API_BASE_URL || 'https://dpgnotes.onrender.com') + '/api/social/connect-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: activeUid,
            senderName: (myData && (myData.name || myData.displayName)) || "Contributor",
            senderEmail: (myData && myData.email) || "",
            receiverId: theirUid,
            receiverName: document.getElementById("dpgHoverName").textContent
          })
        });
        window.__dpgConnectedCache[theirUid] = "pending";
        updateConnectBtnUI("pending");
      }
    } catch (err) {
      console.error("[HoverCard] Connect error:", err);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("dpgHoverBtnFollow").addEventListener("click", async (e) => {
    e.stopPropagation();
    const activeUid = getActiveUserUid();
    if (!activeUid) {
      if (typeof window.openSignInModal === "function") {
        window.openSignInModal(true);
      } else {
        alert("Please sign in as a student or contributor to follow.");
      }
      return;
    }

    const theirUid = currentTargetUid;
    if (!theirUid || theirUid === activeUid) return;

    const isFollowing = window.__dpgFollowingCache[theirUid] || false;
    const btn = document.getElementById("dpgHoverBtnFollow");
    btn.disabled = true;

    try {
      const myData = getActiveUserData();
      await fetch((window.API_BASE_URL || 'https://dpgnotes.onrender.com') + '/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followerId: activeUid,
          followerName: (myData && (myData.name || myData.displayName)) || "Contributor",
          followingId: theirUid,
          followingName: document.getElementById("dpgHoverName").textContent
        })
      });

      const nextFollow = !isFollowing;
      window.__dpgFollowingCache[theirUid] = nextFollow;
      updateFollowBtnUI(nextFollow);
    } catch (err) {
      console.error("[HoverCard] Follow error:", err);
    } finally {
      btn.disabled = false;
    }
  });

  // Global Event Delegation for Contributor Photo & Name Link Hover
  // Triggers smoothly when hovering over contributor avatar or contributor name
  document.addEventListener("mouseover", (e) => {
    const trigger = e.target.closest(".contributor-photo-trigger, [data-contributor-photo='true'], .author-avatar-mini, .contributor-name-link, [data-contrib-uid]");
    if (!trigger) return;

    isMouseOverTrigger = true;
    clearTimeout(closeTimer);

    // If card is already showing for this exact trigger, keep it active
    if (hoverCard.classList.contains("dpg-hover-active") && activeTrigger === trigger) {
      return;
    }

    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      showHoverCard(trigger);
    }, DWELL_SHOW_DELAY);
  });

  document.addEventListener("mouseout", (e) => {
    const trigger = e.target.closest(".contributor-photo-trigger, [data-contributor-photo='true'], .author-avatar-mini, .contributor-name-link, [data-contrib-uid]");
    if (!trigger) return;

    isMouseOverTrigger = false;
    clearTimeout(hoverTimer);

    // Check if moving into the hover card itself
    if (e.relatedTarget && (hoverCard.contains(e.relatedTarget) || e.relatedTarget === hoverCard)) {
      return;
    }

    // Give a grace window so cursor can smoothly transition into the hover card
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
      if (!isMouseOverCard && !isMouseOverTrigger) {
        hideHoverCard();
      }
    }, 220);
  });

  // Re-position on resize
  window.addEventListener("resize", () => {
    if (hoverCard.classList.contains("dpg-hover-active") && activeTrigger) {
      positionHoverCard(activeTrigger);
    }
  });

  // 5. Expose Global Helper
  window.dpgRenderContributorBadge = function(opt) {
    opt = opt || {};
    const uid = opt.uid || "";
    const name = opt.name || "Verified Contributor";
    const photo = opt.photo || "https://dpgnotes.web.app/ANH.png";
    const size = opt.size || 22;
    const baseUrl = window.location.origin || "https://dpgnotes.web.app";
    const profileUrl = uid ? `${baseUrl}/profile.html?uid=${encodeURIComponent(uid)}` : `${baseUrl}/profile.html`;

    return `
      <span class="contributor-badge-unit" style="display:inline-flex; align-items:center; gap:5px; vertical-align:middle;">
        <a href="${profileUrl}" target="_blank" style="display:inline-flex; align-items:center; text-decoration:none;">
          <img src="${photo}" 
               alt="${name}" 
               class="contributor-photo-trigger author-avatar-mini" 
               data-contrib-uid="${uid}" 
               data-contrib-name="${name}" 
               style="width:${size}px; height:${size}px; border-radius:50%; object-fit:cover; border:1px solid #38bdf8;" 
               onerror="this.onerror=null; this.src='https://dpgnotes.web.app/ANH.png';">
        </a>
        <a href="${profileUrl}" target="_blank" class="contributor-name-link" style="font-weight:600; font-size:0.85rem;">
          ${name}
        </a>
      </span>
    `;
  };
})();
/**
 * DPGNotes Native Sponsored Ads Injector & Management Engine (v2.5)
 * Features:
 * - Smart Unique Ad Sampling per page (no duplicate ads across containers)
 * - 30-Second Automatic Ad Cycling for image & text ads
 * - Video Ads Lifecycle: Video completion -> Wait badge (2s) -> Thumbnail wait (3s) -> Auto-swap next ad
 * - Manual Close button (✕) with instant unique ad swap
 * - Area-specific UI Layout Variants: "feed", "sidebar", "header", "footer"
 */
(function() {
  window.DPG_APPROVED_ADS = window.DPG_APPROVED_ADS || [];
  window.DPG_USED_AD_IDS = window.DPG_USED_AD_IDS || new Set();
  let isFetching = false;

  async function getOrInitFirestore() {
    if (window.dpgDb && window.collection && window.getDocs) {
      return { db: window.dpgDb, collection: window.collection, getDocs: window.getDocs };
    }
    try {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js");
      const { getFirestore, collection, getDocs } = await import("https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js");
      
      const cfg = {
        apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
        authDomain: "dpgnotes.firebaseapp.com",
        projectId: "dpgnotes",
        storageBucket: "dpgnotes.firebasestorage.app",
        messagingSenderId: "910494426039",
        appId: "1:910494426039:web:adeae5315caaf846c43e32"
      };

      const app = getApps().find(a => a.name === "dpgnotes") || initializeApp(cfg, "dpgnotes");
      const db = getFirestore(app);

      window.dpgDb = window.dpgDb || db;
      window.collection = window.collection || collection;
      window.getDocs = window.getDocs || getDocs;

      return { db, collection, getDocs };
    } catch(err) {
      console.warn("Native ads Firebase init error:", err);
      return null;
    }
  }

  const DEFAULT_APPROVED_ADS = [
    {
      id: "def_ad_search_01",
      title: "DPGNotes Academic Search Engine",
      description: "Search sessional notes, PYQs, and syllabus files across all DPG College disciplines with instant AI recommendations.",
      targetLink: "dpgnotes-search-engine.html",
      platform: "dpgnotes",
      category: "Academic",
      tags: ["notes", "search", "pyq", "dpgnotes", "sessional"],
      status: "Approved",
      thumbnailUrl: ""
    },
    {
      id: "def_ad_legal_02",
      title: "DRASA Legal & Copyright Portal",
      description: "Learn about DPGNotes Copyright Policies, Terms of Service, and DRASA Compliance guidelines.",
      targetLink: "legal/index.html",
      platform: "dpgnotes",
      category: "Legal",
      tags: ["legal", "policy", "drasa", "terms", "copyright"],
      status: "Approved",
      thumbnailUrl: ""
    },
    {
      id: "def_ad_ai_03",
      title: "DPGNotes AI Assistant & Document Analyzer",
      description: "Ask questions, generate exam summaries, and solve complex problems with DPGNotes 14k-Token Gemini AI Engine.",
      targetLink: "index.html",
      platform: "dpgnotes",
      category: "AI",
      tags: ["ai", "gemini", "analysis", "tutor", "study"],
      status: "Approved",
      thumbnailUrl: ""
    },
    {
      id: "def_ad_youtube_04",
      title: "Promote Your Notes & Channels on DPGNotes",
      description: "Upload your custom YouTube videos, GitHub repositories, or Medium blogs to reach thousands of DPG College students daily.",
      targetLink: "dashboard.html",
      platform: "youtube",
      category: "Promotion",
      tags: ["youtube", "github", "medium", "promote", "contributor"],
      status: "Approved",
      thumbnailUrl: ""
    }
  ];

  async function fetchApprovedAds() {
    if (window.DPG_APPROVED_ADS && window.DPG_APPROVED_ADS.length > 0) return window.DPG_APPROVED_ADS;
    if (isFetching) return DEFAULT_APPROVED_ADS;
    isFetching = true;

    try {
      const fb = await getOrInitFirestore();
      if (fb) {
        const snap = await fb.getDocs(fb.collection(fb.db, "user_ads"));
        const ads = [];
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (data.status === "Approved") {
            ads.push({ id: docSnap.id, ...data });
          }
        });
        
        if (ads.length > 0) {
          window.DPG_APPROVED_ADS = ads;
          return ads;
        }
      }
    } catch(e) {
      console.warn("Native ads Firestore fetch error:", e);
    } finally {
      isFetching = false;
    }
    
    window.DPG_APPROVED_ADS = DEFAULT_APPROVED_ADS;
    return DEFAULT_APPROVED_ADS;
  }

  function extractYouTubeId(url) {
    if (!url) return "";
    const match = url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : "";
  }

  function createCloseButton(onCloseCallback) {
  function createAdHeaderControls(onCloseCallback) {
    const box = document.createElement("div");
    box.className = "dpg-ad-header-controls";
    box.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
      display: flex;
      align-items: center;
      gap: 5px;
      z-index: 15;
    `;

    const infoBtn = document.createElement("a");
    infoBtn.href = "legal/index.html#ads-policy";
    infoBtn.target = "_blank";
    infoBtn.title = "View DPGNotes Advertising Policy & Safety Guidelines";
    infoBtn.innerHTML = '<i class="ri-information-line"></i>';
    infoBtn.style.cssText = `
      background: rgba(15, 23, 42, 0.75);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #94a3b8;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      text-decoration: none;
      transition: all 0.2s ease;
    `;
    infoBtn.onmouseenter = () => { infoBtn.style.color = "#60a5fa"; infoBtn.style.borderColor = "#60a5fa"; };
    infoBtn.onmouseleave = () => { infoBtn.style.color = "#94a3b8"; infoBtn.style.borderColor = "rgba(255, 255, 255, 0.25)"; };
    infoBtn.onclick = (e) => e.stopPropagation();

    const closeBtn = document.createElement("button");
    closeBtn.className = "dpg-ad-close-btn";
    closeBtn.innerHTML = '<i class="ri-close-line"></i>';
    closeBtn.title = "Dismiss Ad for 2 Minutes";
    closeBtn.style.cssText = `
      background: rgba(0, 0, 0, 0.65);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #94a3b8;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      transition: all 0.2s ease;
      padding: 0;
      outline: none;
    `;

    closeBtn.onmouseenter = () => { closeBtn.style.color = "#fff"; closeBtn.style.background = "#ef4444"; closeBtn.style.borderColor = "#ef4444"; };
    closeBtn.onmouseleave = () => { closeBtn.style.color = "#94a3b8"; closeBtn.style.background = "rgba(0, 0, 0, 0.65)"; closeBtn.style.borderColor = "rgba(255, 255, 255, 0.25)"; };
    closeBtn.onclick = (e) => {
      e.stopPropagation();
      onCloseCallback();
    };

    box.appendChild(infoBtn);
    box.appendChild(closeBtn);
    return box;
  }

  const PLATFORM_ICONS = {
    linkedin: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#0a66c2" style="vertical-align:middle; flex-shrink:0;"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/></svg>`,
    github: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff" style="vertical-align:middle; flex-shrink:0;"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.1-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z"/></svg>`,
    medium: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff" style="vertical-align:middle; flex-shrink:0;"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42c1.87 0 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>`,
    youtube: `<svg viewBox="0 0 24 24" width="16" height="16" fill="#ff0000" style="vertical-align:middle; flex-shrink:0;"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
  };

  function getPlatformBadgeHtml(platform, adCategory) {
    if (platform === "linkedin") {
      const cat = adCategory === "blog" ? "LINKEDIN BLOG" : "LINKEDIN POST";
      return `<span style="background:linear-gradient(135deg,#0a66c2,#004182); color:white; font-size:0.58rem; font-weight:800; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">${PLATFORM_ICONS.linkedin} ${cat}</span>`;
    }
    if (platform === "github") {
      return `<span style="background:linear-gradient(135deg,#1f2937,#111827); border:1px solid rgba(255,255,255,0.2); color:white; font-size:0.58rem; font-weight:800; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">${PLATFORM_ICONS.github} GITHUB REPO</span>`;
    }
    if (platform === "medium") {
      return `<span style="background:linear-gradient(135deg,#12100e,#2b2927); border:1px solid rgba(255,255,255,0.2); color:white; font-size:0.58rem; font-weight:800; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">${PLATFORM_ICONS.medium} MEDIUM STORY</span>`;
    }
    if (platform === "youtube") {
      return `<span style="background:linear-gradient(135deg,#991b1b,#7f1d1d); border:1px solid rgba(239,68,68,0.4); color:white; font-size:0.58rem; font-weight:800; padding:2px 6px; border-radius:6px; display:inline-flex; align-items:center; gap:4px; flex-shrink:0;">${PLATFORM_ICONS.youtube} YOUTUBE VIDEO</span>`;
    }
    return `<span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; font-size:0.58rem; font-weight:800; padding:2px 6px; border-radius:6px; flex-shrink:0;">SPONSORED</span>`;
  }

  function generateAdTrackId(adId) {
    if (!adId) return Math.floor(10000000 + Math.random() * 90000000).toString();
    let hash = 0;
    for (let i = 0; i < adId.length; i++) {
      hash = (hash << 5) - hash + adId.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    const eightDigit = (positiveHash % 90000000 + 10000000).toString();
    return eightDigit;
  }

  function buildTrackedAdTargetLink(targetUrl, adId, customTrackId) {
    const trackId = customTrackId || generateAdTrackId(adId);
    let base = (targetUrl && typeof targetUrl === "string" && targetUrl.trim() !== "" && targetUrl.trim() !== "#") 
      ? targetUrl.trim() 
      : "index.html";
    
    try {
      const map = JSON.parse(localStorage.getItem('dpg_ad_track_map') || '{}');
      map[trackId] = { adId: adId || "global", timestamp: Date.now() };
      localStorage.setItem('dpg_ad_track_map', JSON.stringify(map));
    } catch(e) {}

    try {
      const urlObj = new URL(base, window.location.href);
      urlObj.searchParams.set("track_id", trackId);
      return urlObj.toString();
    } catch(e) {
      const sep = base.includes("?") ? "&" : "?";
      return `${base}${sep}track_id=${trackId}`;
    }
  }

  function createAdCardElement(ad, containerId, variant = "feed") {
    const card = document.createElement("div");
    card.className = `dpg-native-ad-card dpg-ad-variant-${variant}`;

    const vidId = extractYouTubeId(ad.videoUrl);
    const profileUid = ad.userId || ad.uid || ad.userUid || ad.createdBy || "";
    const profileUrl = profileUid ? `profile.html?uid=${encodeURIComponent(profileUid)}` : "profile.html";
    const trackId = ad.trackId || generateAdTrackId(ad.id);
    const finalTargetLink = buildTrackedAdTargetLink(ad.targetLink, ad.id, trackId);
    card.dataset.trackId = trackId;

    let rotationTimeout = null;
    let videoPlaybackTimeout = null;
    let videoLifecycleActive = false;

    function cleanupTimers() {
      if (rotationTimeout) clearTimeout(rotationTimeout);
      if (videoPlaybackTimeout) clearTimeout(videoPlaybackTimeout);
    }

    function dismissAdCard() {
      cleanupTimers();
      const parentBox = card.parentElement;
      const placementKey = variant || "global";
      try {
        sessionStorage.setItem("dpg_ad_muted_" + placementKey, (Date.now() + 120000).toString());
      } catch(e) {}

      card.style.transition = "opacity 0.35s ease, transform 0.35s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.95)";

      setTimeout(() => {
        card.style.display = "none";
        if (parentBox) {
          const visibleChildren = Array.from(parentBox.children).filter(c => c.style.display !== "none");
          if (visibleChildren.length === 0) {
            parentBox.style.display = "none";
          }
        }
      }, 350);

      // Re-enable ad placement after 2 minutes (120,000 ms)
      setTimeout(async () => {
        if (parentBox) parentBox.style.display = "";
        swapToNextAd();
      }, 120000);
    }

    async function swapToNextAd() {
      cleanupTimers();
      const parentBox = card.parentElement;
      card.style.transition = "opacity 0.35s ease, transform 0.35s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.95)";

      setTimeout(async () => {
        card.style.display = "none";
        if (parentBox) {
          const visibleChildren = Array.from(parentBox.children).filter(c => c.style.display !== "none");
          if (visibleChildren.length === 0) parentBox.style.display = "none";
        }

        // 2-Minute Gap Engine between ad rotations (120,000 ms)
        setTimeout(async () => {
          if (parentBox) parentBox.style.display = "";
          const approvedAds = await fetchApprovedAds();
          if (!approvedAds || approvedAds.length === 0) {
            card.remove();
            return;
          }

          const nextAd = selectAdForVariant(approvedAds, variant, new Set([ad.id])) || approvedAds[Math.floor(Math.random() * approvedAds.length)];
          if (!nextAd) {
            card.remove();
            return;
          }

          const newCard = createAdCardElement(nextAd, "elem_" + Date.now(), variant);
          newCard.style.opacity = "0";
          newCard.style.transform = "scale(0.95)";
          if (card.parentElement) {
            card.replaceWith(newCard);
          } else if (parentBox) {
            parentBox.appendChild(newCard);
          }

          requestAnimationFrame(() => {
            newCard.style.transition = "opacity 0.35s ease, transform 0.35s ease";
            newCard.style.opacity = "1";
            newCard.style.transform = "scale(1)";
          });
        }, 120000);
      }, 350);
    }

    const headerControls = createAdHeaderControls(dismissAdCard);
    card.appendChild(headerControls);

    function getProfileLinkHtml(imgSize = "26px", fontSize = "0.78rem") {
      return `
        <a href="${profileUrl}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none; color:inherit; cursor:pointer;" title="View ${ad.userName || 'Advertiser'}'s Profile">
          <img src="${ad.userAvatar || 'ANH.png'}" style="width:${imgSize}; height:${imgSize}; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.25); flex-shrink:0; transition:transform 0.2s;" onmouseenter="this.style.transform='scale(1.15)'" onmouseleave="this.style.transform='scale(1)'">
          <span style="font-size:${fontSize}; font-weight:700; color:white; transition:color 0.2s; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" onmouseenter="this.style.color='#a5b4fc'" onmouseleave="this.style.color='white'">${ad.userName || 'Advertiser'}</span>
        </a>
      `;
    }    // Apply Area-Specific UI Layout Variants
    if (variant === "header" || variant === "top") {
      card.style.cssText = `
        position: relative;
        width: 100%;
        background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
        border: 1px solid rgba(245, 158, 11, 0.35);
        border-radius: 12px;
        padding: 0.5rem 2.2rem 0.5rem 0.6rem;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
        margin: 0.5rem 0;
        box-sizing: border-box;
        color: white;
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: nowrap;
      `;
      card.innerHTML = `
        <a href="${profileUrl}" target="_blank" title="View ${ad.userName || 'Advertiser'}'s Profile" style="flex-shrink:0; text-decoration:none;">
          <img src="${ad.userAvatar || ad.thumbnailUrl || 'ANH.png'}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(245,158,11,0.6); flex-shrink:0;">
        </a>
        <div style="flex:1; min-width:0; overflow:hidden;">
          <div style="display:flex; align-items:center; gap:5px; margin-bottom:1px; flex-wrap:nowrap; overflow:hidden;">
            ${getPlatformBadgeHtml(ad.platform, ad.adCategory)}
            <a href="${profileUrl}" target="_blank" style="font-size:0.72rem; font-weight:700; color:#a5b4fc; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="View Profile">${ad.userName || 'Promoted'}</a>
          </div>
          <h4 style="font-size:0.78rem; font-weight:700; color:white; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${ad.title || 'Promoted Content'}</h4>
        </div>
        <a href="${finalTargetLink}" target="_blank" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:5px 9px; border-radius:6px; text-decoration:none; font-size:0.7rem; font-weight:700; flex-shrink:0; white-space:nowrap;">View <i class="ri-arrow-right-s-line"></i></a>
      `;
    } else if (variant === "footer" || variant === "bottom") {
      card.style.cssText = `
        position: relative;
        width: 100%;
        background: linear-gradient(90deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98));
        border-top: 2px solid #f59e0b;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 0.5rem 2.2rem 0.5rem 0.6rem;
        box-shadow: 0 -5px 25px rgba(0, 0, 0, 0.6);
        margin: 0.5rem 0;
        box-sizing: border-box;
        color: white;
        font-family: inherit;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: nowrap;
      `;
      card.innerHTML = `
        <a href="${profileUrl}" target="_blank" title="View ${ad.userName || 'Advertiser'}'s Profile" style="flex-shrink:0; text-decoration:none;">
          <img src="${ad.userAvatar || ad.thumbnailUrl || 'ANH.png'}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(245,158,11,0.6); flex-shrink:0;">
        </a>
        <div style="flex:1; min-width:0; overflow:hidden;">
          <div style="display:flex; align-items:center; gap:5px; margin-bottom:1px; flex-wrap:nowrap; overflow:hidden;">
            ${getPlatformBadgeHtml(ad.platform, ad.adCategory)}
            <a href="${profileUrl}" target="_blank" style="font-size:0.72rem; font-weight:700; color:#a5b4fc; text-decoration:none; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="View Profile">${ad.userName || 'Advertiser'}</a>
          </div>
          <h4 style="font-size:0.78rem; font-weight:700; color:white; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${ad.title || 'Promoted Content'}</h4>
        </div>
        <a href="${finalTargetLink}" target="_blank" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:5px 9px; border-radius:6px; text-decoration:none; font-size:0.7rem; font-weight:700; flex-shrink:0; white-space:nowrap;">Learn More <i class="ri-external-link-line"></i></a>
      `;
    } else if (variant === "sidebar") {
      card.style.cssText = `
        position: relative;
        width: 100%;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 12px;
        padding: 0.75rem;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        margin: 0.75rem 0;
        box-sizing: border-box;
        color: white;
        font-family: inherit;
        overflow: hidden;
      `;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-right:24px;">
          ${getProfileLinkHtml('22px', '0.72rem')}
          ${getPlatformBadgeHtml(ad.platform, ad.adCategory)}
        </div>

        <div class="ad-media-box" id="adMediaBox_${containerId}" style="position:relative; width:100%; height:110px; border-radius:8px; overflow:hidden; margin-bottom:6px; background:#000; cursor:pointer;">
          <img id="adThumbImg_${containerId}" src="${ad.thumbnailUrl || 'ANH.png'}" style="width:100%; height:100%; object-fit:cover;">
          ${vidId ? `<div id="adPlayBtn_${containerId}" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:36px; height:36px; background:rgba(0,0,0,0.7); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:1.1rem; z-index:2; cursor:pointer;"><i class="ri-play-fill"></i></div>` : ''}
          <div id="adWaitOverlay_${containerId}" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.85); color:#f59e0b; font-size:0.75rem; font-weight:700; align-items:center; justify-content:center; gap:6px; z-index:3;"><i class="ri-loader-4-line spin-icon"></i> <span id="adWaitText_${containerId}">Please wait...</span></div>
          <div id="adPlayerDiv_${containerId}" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></div>
        </div>

        <h4 style="font-size:0.84rem; font-weight:700; color:white; margin-bottom:4px; line-height:1.2; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${ad.title || 'Promoted Content'}</h4>
        <a href="${finalTargetLink}" target="_blank" style="display:block; text-align:center; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:5px; border-radius:6px; text-decoration:none; font-size:0.72rem; font-weight:700;">Explore Now <i class="ri-external-link-line"></i></a>
      `;
    } else {
      // Default / Feed Variant
      card.style.cssText = `
        position: relative;
        width: 100%;
        background: rgba(15, 23, 42, 0.95);
        border: 1px solid rgba(245, 158, 11, 0.3);
        border-radius: 14px;
        padding: 1rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        margin: 1rem 0;
        box-sizing: border-box;
        color: white;
        font-family: inherit;
        overflow: hidden;
      `;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-right:24px;">
          ${getProfileLinkHtml('26px', '0.78rem')}
          ${getPlatformBadgeHtml(ad.platform, ad.adCategory)}
        </div>

        <div class="ad-media-box" id="adMediaBox_${containerId}" style="position:relative; width:100%; height:150px; border-radius:10px; overflow:hidden; margin-bottom:8px; background:#000; cursor:pointer;">
          <img id="adThumbImg_${containerId}" src="${ad.thumbnailUrl || 'ANH.png'}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.3s ease;">
          ${vidId ? `<div id="adPlayBtn_${containerId}" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:42px; height:42px; background:rgba(0,0,0,0.7); border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; font-size:1.3rem; z-index:2; cursor:pointer;"><i class="ri-play-fill"></i></div>` : ''}
          <div id="adWaitOverlay_${containerId}" style="display:none; position:absolute; inset:0; background:rgba(0,0,0,0.85); color:#f59e0b; font-size:0.78rem; font-weight:700; align-items:center; justify-content:center; gap:6px; z-index:3;"><i class="ri-loader-4-line spin-icon"></i> <span id="adWaitText_${containerId}">Please wait...</span></div>
          <div id="adPlayerDiv_${containerId}" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></div>
        </div>

        <h4 style="font-size:0.9rem; font-weight:700; color:white; margin-bottom:4px; line-height:1.3;">${ad.title || 'Promoted Content'}</h4>
        <p style="font-size:0.78rem; color:#94a3b8; margin-bottom:10px; line-height:1.4; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${ad.description || ''}</p>
        <a href="${finalTargetLink}" target="_blank" style="display:block; text-align:center; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:7px; border-radius:8px; text-decoration:none; font-size:0.78rem; font-weight:700;">Explore Now <i class="ri-external-link-line"></i></a>
      `;
    }

    // Attach Close Button (✕) with instant ad swap
    const closeBtn = createCloseButton(() => {
      swapToNextAd();
    });
    card.appendChild(closeBtn);

    // Smart Rotation & Video Lifecycle Engine
    const isVideoMediaVariant = (variant === "feed" || variant === "sidebar" || variant === "main") && !!vidId;

    if (isVideoMediaVariant) {
      const mediaBox = card.querySelector(`#adMediaBox_${containerId}`);
      const playerDiv = card.querySelector(`#adPlayerDiv_${containerId}`);
      const playBtn = card.querySelector(`#adPlayBtn_${containerId}`);
      const waitOverlay = card.querySelector(`#adWaitOverlay_${containerId}`);
      const waitText = card.querySelector(`#adWaitText_${containerId}`);

      // Fallback 30s timer in case video is never started
      rotationTimeout = setTimeout(() => {
        if (!videoLifecycleActive) {
          swapToNextAd();
        }
      }, 30000);

      function startVideo(muted = true) {
        if (!playerDiv || videoLifecycleActive) return;
        videoLifecycleActive = true;
        if (rotationTimeout) clearTimeout(rotationTimeout);

        playerDiv.innerHTML = `<iframe id="ytFrame_${containerId}" src="https://www.youtube.com/embed/${vidId}?autoplay=1&mute=${muted ? 1 : 0}&enablejsapi=1" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%;"></iframe>`;
        playerDiv.style.display = "block";
        if (playBtn) playBtn.style.display = "none";

        // Video playback sequence (20 seconds duration timer)
        videoPlaybackTimeout = setTimeout(() => {
          // 1. Video completed -> show Wait overlay on video container (2 seconds)
          if (waitOverlay) {
            waitOverlay.style.display = "flex";
            if (waitText) waitText.innerText = "Video Completed. Please wait...";
          }

          setTimeout(() => {
            // 2. Hide video, restore thumbnail, show thumbnail wait (3 seconds)
            if (playerDiv) playerDiv.style.display = "none";
            if (waitText) waitText.innerText = "Loading next sponsored ad...";

            setTimeout(() => {
              // 3. Auto-swap to next unique approved ad
              swapToNextAd();
            }, 3000);
          }, 2000);
        }, 20000);
      }

      let autoPlayTimer = setTimeout(() => {
        if (!videoLifecycleActive) startVideo(true);
      }, 5000);

      if (mediaBox) {
        mediaBox.onmouseenter = function() {
          if (!videoLifecycleActive) {
            clearTimeout(autoPlayTimer);
            startVideo(true);
          }
        };
        mediaBox.onclick = function(e) {
          e.stopPropagation();
          if (!videoLifecycleActive) {
            clearTimeout(autoPlayTimer);
            startVideo(false);
          }
        };
      }
    } else {
      // Non-Video Ads OR Header/Footer Variant Ads -> 30-Second Automatic Rotation
      rotationTimeout = setTimeout(() => {
        swapToNextAd();
      }, 30000);
    }

    return card;
  }

  /**
   * Selects an ad according to asset composition & placement rules, prioritizing unique unused ads:
   */
  function selectAdForVariant(ads, variant = "feed", usedAdIds = new Set()) {
    if (!ads || ads.length === 0) return null;

    // Filter candidate ads not used globally on page nor in current container
    let candidates = ads.filter(a => !usedAdIds.has(a.id) && !window.DPG_USED_AD_IDS.has(a.id));
    if (candidates.length === 0) {
      // If unique pool exhausted, fallback to unused in container
      candidates = ads.filter(a => !usedAdIds.has(a.id));
    }
    if (candidates.length === 0) candidates = ads; // Allow repetition if required

    // Contextual PDF Resource & User Interest Tag-Matching Preference Engine
    const urlParams = new URLSearchParams(window.location.search);
    const pageContextStr = [
      urlParams.get("tags"),
      urlParams.get("category"),
      urlParams.get("discipline"),
      urlParams.get("title"),
      urlParams.get("description")
    ].filter(Boolean).join(" ").toLowerCase();

    const pageTags = pageContextStr.split(/[\s,]+/).map(t => t.trim()).filter(t => t.length > 2);
    const userInterests = typeof window.getDPGUserInterests === "function" ? window.getDPGUserInterests().map(i => String(i).toLowerCase()) : [];
    const activeKeywords = [...new Set([...pageTags, ...userInterests])];

    if (activeKeywords.length > 0) {
      const scoredCandidates = candidates.map(ad => {
        const adTitle = (ad.title || "").toLowerCase();
        const adDesc = (ad.description || "").toLowerCase();
        const adTags = Array.isArray(ad.tags) ? ad.tags.map(t => String(t).toLowerCase()) : [];
        
        let score = 0;
        activeKeywords.forEach(kw => {
          if (adTags.some(t => t.includes(kw) || kw.includes(t))) score += 5;
          if (adTitle.includes(kw)) score += 3;
          if (adDesc.includes(kw)) score += 1;
        });
        return { ad, score };
      });

      const matchedCandidates = scoredCandidates.filter(item => item.score > 0);
      if (matchedCandidates.length > 0) {
        matchedCandidates.sort((a, b) => b.score - a.score);
        candidates = matchedCandidates.map(item => item.ad);
      }
    }

    let priorityPool = [];

    if (variant === "header" || variant === "footer" || variant === "top" || variant === "bottom") {
      const noThumbnailAds = candidates.filter(a => !a.thumbnailUrl || (a.targetPlacement && a.targetPlacement.includes("header")));
      priorityPool = noThumbnailAds.length > 0 ? noThumbnailAds : candidates;
    } else if (variant === "sidebar") {
      const sidebarImageAds = candidates.filter(a => a.thumbnailUrl && !a.videoUrl);
      priorityPool = sidebarImageAds.length > 0 ? sidebarImageAds : candidates;
    } else if (variant === "feed" || variant === "main") {
      const richVideoThumbAds = candidates.filter(a => a.thumbnailUrl && a.videoUrl);
      if (richVideoThumbAds.length > 0) {
        priorityPool = richVideoThumbAds;
      } else {
        const thumbAds = candidates.filter(a => a.thumbnailUrl);
        priorityPool = thumbAds.length > 0 ? thumbAds : candidates;
      }
    } else {
      priorityPool = candidates;
    }

    const selected = priorityPool[Math.floor(Math.random() * priorityPool.length)];
    if (selected && selected.id) {
      usedAdIds.add(selected.id);
      window.DPG_USED_AD_IDS.add(selected.id);
    }
    return selected;
  }

  function collapseUnfilledAdSenseSlots() {
    document.querySelectorAll('.ad-banner-section, ins.adsbygoogle').forEach(unit => {
      const ins = unit.tagName.toLowerCase() === 'ins' ? unit : unit.querySelector('ins.adsbygoogle');
      if (ins) {
        const status = ins.getAttribute('data-ad-status');
        const hasIframe = ins.getElementsByTagName('iframe').length > 0;
        if (status === 'unfilled' || (!hasIframe && status !== 'filled')) {
          if (unit.tagName.toLowerCase() === 'ins') {
            unit.style.display = 'none';
            if (unit.parentElement && unit.parentElement.classList.contains('ad-banner-section')) {
              unit.parentElement.style.display = 'none';
            }
          } else {
            unit.style.display = 'none';
          }
        }
      }
    });
  }

  async function renderAllNativeAds() {
    collapseUnfilledAdSenseSlots();

    const containers = document.querySelectorAll(".native-ads, #native-ads");
    if (containers.length === 0) return;

    const ads = await fetchApprovedAds();
    if (!ads || ads.length === 0) return;

    containers.forEach((box, boxIdx) => {
      if (box.dataset.adInjected) return;

      const variant = box.dataset.adVariant || (box.id.includes("header") ? "header" : box.id.includes("footer") ? "footer" : box.id.includes("sidebar") || box.classList.contains("sidebar") ? "sidebar" : "feed");

      // Separation Rule: Avoid rendering consecutive Native Ads
      const prevSib = box.previousElementSibling;
      if (prevSib && (prevSib.classList.contains("native-ads") || prevSib.classList.contains("dpg-native-ad-card") || prevSib.classList.contains("ad-banner-section"))) {
        box.style.marginTop = "1.5rem";
      }

      box.dataset.adInjected = "true";

      // PDF Viewer Sidebar restriction: Always show exactly 1 Ad
      const isPdfViewerSidebar = window.location.pathname.includes("pdf-viewer") && (variant === "sidebar" || box.id.includes("sidebar"));
      const count = isPdfViewerSidebar ? 1 : parseInt(box.dataset.adCount || "1", 10);

      const usedAdIds = new Set();
      for (let i = 0; i < count; i++) {
        const selectedAd = selectAdForVariant(ads, variant, usedAdIds);
        if (selectedAd) {
          const cardEl = createAdCardElement(selectedAd, "elem_" + boxIdx + "_" + i + "_" + Date.now(), variant);
          box.appendChild(cardEl);
        }
      }
    });
  }

  window.renderNativeDPGAds = renderAllNativeAds;
  window.createDPGAdCard = createAdCardElement;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(renderAllNativeAds, 400);
      setTimeout(renderAllNativeAds, 2000);
      setInterval(collapseUnfilledAdSenseSlots, 1500);
    });
  } else {
    setTimeout(renderAllNativeAds, 400);
    setTimeout(renderAllNativeAds, 2000);
    setInterval(collapseUnfilledAdSenseSlots, 1500);
  }
})();

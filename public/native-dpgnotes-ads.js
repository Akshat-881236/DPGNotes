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

  async function fetchApprovedAds() {
    if (window.DPG_APPROVED_ADS.length > 0) return window.DPG_APPROVED_ADS;
    if (isFetching) return [];
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
        window.DPG_APPROVED_ADS = ads;
        return ads;
      }
    } catch(e) {
      console.warn("Native ads Firestore fetch error:", e);
    } finally {
      isFetching = false;
    }
    return window.DPG_APPROVED_ADS || [];
  }

  function extractYouTubeId(url) {
    if (!url) return "";
    const match = url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : "";
  }

  function createCloseButton(onCloseCallback) {
    const btn = document.createElement("button");
    btn.className = "dpg-ad-close-btn";
    btn.innerHTML = '<i class="ri-close-line"></i>';
    btn.title = "Close ad (load new ad)";
    btn.style.cssText = `
      position: absolute;
      top: 6px;
      right: 6px;
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
      z-index: 10;
      transition: all 0.2s ease;
      padding: 0;
      outline: none;
    `;

    btn.onmouseenter = () => { btn.style.color = "#fff"; btn.style.background = "#ef4444"; btn.style.borderColor = "#ef4444"; };
    btn.onmouseleave = () => { btn.style.color = "#94a3b8"; btn.style.background = "rgba(0, 0, 0, 0.65)"; btn.style.borderColor = "rgba(255, 255, 255, 0.25)"; };
    btn.onclick = (e) => {
      e.stopPropagation();
      onCloseCallback();
    };

    return btn;
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

    async function swapToNextAd() {
      cleanupTimers();
      card.style.transition = "opacity 0.35s ease, transform 0.35s ease";
      card.style.opacity = "0";
      card.style.transform = "scale(0.95)";

      setTimeout(async () => {
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
        card.replaceWith(newCard);

        requestAnimationFrame(() => {
          newCard.style.transition = "opacity 0.35s ease, transform 0.35s ease";
          newCard.style.opacity = "1";
          newCard.style.transform = "scale(1)";
        });
      }, 350);
    }

    function getProfileLinkHtml(imgSize = "26px", fontSize = "0.78rem") {
      return `
        <a href="${profileUrl}" target="_blank" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none; color:inherit; cursor:pointer;" title="View ${ad.userName || 'Advertiser'}'s Profile">
          <img src="${ad.userAvatar || 'ANH.png'}" style="width:${imgSize}; height:${imgSize}; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.25); flex-shrink:0; transition:transform 0.2s;" onmouseenter="this.style.transform='scale(1.15)'" onmouseleave="this.style.transform='scale(1)'">
          <span style="font-size:${fontSize}; font-weight:700; color:white; transition:color 0.2s; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" onmouseenter="this.style.color='#a5b4fc'" onmouseleave="this.style.color='white'">${ad.userName || 'Advertiser'}</span>
        </a>
      `;
    }

    // Apply Area-Specific UI Layout Variants
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
            <span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; font-size:0.55rem; font-weight:800; padding:1px 5px; border-radius:4px; flex-shrink:0;">SPONSORED</span>
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
            <span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; font-size:0.55rem; font-weight:800; padding:1px 5px; border-radius:4px; flex-shrink:0;">SPONSORED</span>
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
          <span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; font-size:0.58rem; font-weight:800; padding:1px 6px; border-radius:8px;">SPONSORED</span>
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
          <span style="background:linear-gradient(135deg,#f59e0b,#d97706); color:white; font-size:0.62rem; font-weight:800; padding:2px 8px; border-radius:10px; letter-spacing:0.5px;">SPONSORED</span>
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

    // Cookie Interest Matching Personalization
    const userInterests = typeof window.getDPGUserInterests === "function" ? window.getDPGUserInterests().map(i => String(i).toLowerCase()) : [];
    if (userInterests.length > 0) {
      const cookieMatched = candidates.filter(a => {
        const title = (a.title || "").toLowerCase();
        const desc = (a.description || "").toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.map(t => String(t).toLowerCase()) : [];
        return userInterests.some(kw => title.includes(kw) || desc.includes(kw) || tags.some(t => t.includes(kw)));
      });
      if (cookieMatched.length > 0) {
        candidates = cookieMatched;
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

  async function renderAllNativeAds() {
    const containers = document.querySelectorAll(".native-ads, #native-ads");
    if (containers.length === 0) return;

    const ads = await fetchApprovedAds();
    if (!ads || ads.length === 0) return;

    containers.forEach((box, boxIdx) => {
      if (box.dataset.adInjected) return;
      box.dataset.adInjected = "true";

      const count = parseInt(box.dataset.adCount || "1", 10);
      const variant = box.dataset.adVariant || (box.id.includes("header") ? "header" : box.id.includes("footer") ? "footer" : box.id.includes("sidebar") || box.classList.contains("sidebar") ? "sidebar" : "feed");

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
    });
  } else {
    setTimeout(renderAllNativeAds, 400);
    setTimeout(renderAllNativeAds, 2000);
  }
})();

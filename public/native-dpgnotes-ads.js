/**
 * DPGNotes Native Sponsored Ads Injector & Management Engine (v2.0)
 * Features:
 * - Truly randomized non-sequential ad sampling
 * - Close button (✕) with instant replacement by another random approved ad
 * - Multiple Ads Rendering per container (data-ad-count="1|2|3...")
 * - Area-specific UI Layout Variants: "feed", "sidebar", "header", "footer"
 * - Auto-plays YouTube preview after 5s hover
 */
(function() {
  window.DPG_APPROVED_ADS = window.DPG_APPROVED_ADS || [];
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

  function createAdCardElement(ad, containerId, variant = "feed") {
    const card = document.createElement("div");
    card.className = `dpg-native-ad-card dpg-ad-variant-${variant}`;

    const vidId = extractYouTubeId(ad.videoUrl);
    const profileUid = ad.userId || ad.uid || ad.userUid || ad.createdBy || "";
    const profileUrl = profileUid ? `profile.html?uid=${encodeURIComponent(profileUid)}` : "profile.html";

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
        ${ad.targetLink ? `<a href="${ad.targetLink}" target="_blank" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:5px 9px; border-radius:6px; text-decoration:none; font-size:0.7rem; font-weight:700; flex-shrink:0; white-space:nowrap;">View <i class="ri-arrow-right-s-line"></i></a>` : ''}
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
        ${ad.targetLink ? `<a href="${ad.targetLink}" target="_blank" style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:5px 9px; border-radius:6px; text-decoration:none; font-size:0.7rem; font-weight:700; flex-shrink:0; white-space:nowrap;">Learn More <i class="ri-external-link-line"></i></a>` : ''}
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
          <div id="adPlayerDiv_${containerId}" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></div>
        </div>

        <h4 style="font-size:0.84rem; font-weight:700; color:white; margin-bottom:4px; line-height:1.2; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${ad.title || 'Promoted Content'}</h4>
        ${ad.targetLink ? `<a href="${ad.targetLink}" target="_blank" style="display:block; text-align:center; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:5px; border-radius:6px; text-decoration:none; font-size:0.72rem; font-weight:700;">Explore Now <i class="ri-external-link-line"></i></a>` : ''}
      `;
    } else {
      // Default / Feed / Div Variant
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
          <div id="adPlayerDiv_${containerId}" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; z-index:1;"></div>
        </div>

        <h4 style="font-size:0.9rem; font-weight:700; color:white; margin-bottom:4px; line-height:1.3;">${ad.title || 'Promoted Content'}</h4>
        <p style="font-size:0.78rem; color:#94a3b8; margin-bottom:10px; line-height:1.4; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">${ad.description || ''}</p>
        ${ad.targetLink ? `<a href="${ad.targetLink}" target="_blank" style="display:block; text-align:center; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:7px; border-radius:8px; text-decoration:none; font-size:0.78rem; font-weight:700;">Explore Now <i class="ri-external-link-line"></i></a>` : ''}
      `;
    }

    // Attach Close Button (✕) with instant random ad replacement
    const closeBtn = createCloseButton(async () => {
      card.style.transition = "opacity 0.25s ease, transform 0.25s ease";
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
          newCard.style.transition = "opacity 0.25s ease, transform 0.25s ease";
          newCard.style.opacity = "1";
          newCard.style.transform = "scale(1)";
        });
      }, 250);
    });
    card.appendChild(closeBtn);

    // 5-Second Video Auto-Play Logic & Touch Play Listener
    if (vidId) {
      const mediaBox = card.querySelector(`#adMediaBox_${containerId}`);
      const playerDiv = card.querySelector(`#adPlayerDiv_${containerId}`);
      const playBtn = card.querySelector(`#adPlayBtn_${containerId}`);

      function startVideo(muted = true) {
        if (!playerDiv) return;
        playerDiv.innerHTML = `<iframe src="https://www.youtube.com/embed/${vidId}?autoplay=1&mute=${muted ? 1 : 0}" frameborder="0" allow="autoplay; encrypted-media" style="width:100%; height:100%;"></iframe>`;
        playerDiv.style.display = "block";
        if (playBtn) playBtn.style.display = "none";
      }

      let autoPlayTimer = setTimeout(() => {
        startVideo(true);
      }, 5000);

      if (mediaBox) {
        mediaBox.onmouseenter = function() {
          clearTimeout(autoPlayTimer);
          startVideo(true);
        };
        mediaBox.onmouseleave = function() {
          if (playerDiv) {
            playerDiv.style.display = "none";
            playerDiv.innerHTML = "";
          }
          if (playBtn) playBtn.style.display = "flex";
        };
        mediaBox.onclick = function(e) {
          e.stopPropagation();
          clearTimeout(autoPlayTimer);
          startVideo(false);
        };
      }
    }

    return card;
  }

  /**
   * Selects an ad according to asset composition & area placement rules:
   * 1. Absence of thumbnail -> target header and footer ads only (primary).
   * 2. Thumbnail uploaded but NO video -> heavily preferred for Sidebar. Fallback includes video.
   * 3. Main content area -> prefer BOTH video and thumbnail ads.
   */
  function selectAdForVariant(ads, variant = "feed", usedAdIds = new Set()) {
    if (!ads || ads.length === 0) return null;

    let candidates = ads.filter(a => !usedAdIds.has(a.id));
    if (candidates.length === 0) candidates = ads;

    let priorityPool = [];

    if (variant === "header" || variant === "footer" || variant === "top" || variant === "bottom") {
      // 1. Absence of thumbnail -> target header and footer ads
      const noThumbnailAds = candidates.filter(a => !a.thumbnailUrl || (a.targetPlacement && a.targetPlacement.includes("header")));
      priorityPool = noThumbnailAds.length > 0 ? noThumbnailAds : candidates;
    } else if (variant === "sidebar") {
      // 2. Thumbnail uploaded but NO video -> heavily preferred for Sidebar
      const sidebarImageAds = candidates.filter(a => a.thumbnailUrl && !a.videoUrl);
      if (sidebarImageAds.length > 0) {
        priorityPool = sidebarImageAds;
      } else {
        // Fallback: In lack of image-only ads, include video ads as well
        priorityPool = candidates;
      }
    } else if (variant === "feed" || variant === "main") {
      // 3. Main content area -> prefer BOTH video and thumbnail ads
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
    if (selected && selected.id) usedAdIds.add(selected.id);
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
      setTimeout(renderAllNativeAds, 500);
      setTimeout(renderAllNativeAds, 2500);
    });
  } else {
    setTimeout(renderAllNativeAds, 500);
    setTimeout(renderAllNativeAds, 2500);
  }
})();

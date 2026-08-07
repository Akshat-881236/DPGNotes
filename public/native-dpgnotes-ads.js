/**
 * DPGNotes Native Sponsored Ads Injector & Management Engine
 * Auto-injects responsive rectangular Sponsored Ads into <div class="native-ads"> containers.
 * Auto-plays muted YouTube video preview after 5 seconds of thumbnail display.
 */
(function() {
  window.DPG_APPROVED_ADS = window.DPG_APPROVED_ADS || [];
  let isFetching = false;

  async function fetchApprovedAds() {
    if (window.DPG_APPROVED_ADS.length > 0) return window.DPG_APPROVED_ADS;
    if (isFetching) return [];
    isFetching = true;

    try {
      if (window.dpgDb && window.collection && window.getDocs) {
        const snap = await window.getDocs(window.collection(window.dpgDb, "user_ads"));
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
    return window.DPG_APPROVED_ADS;
  }

  function extractYouTubeId(url) {
    if (!url) return "";
    const match = url.match(/(?:watch\?v=|embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : "";
  }

  function createAdCardElement(ad, containerId) {
    const card = document.createElement("div");
    card.className = "dpg-native-ad-card";
    card.style.cssText = `
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
    `;

    const vidId = extractYouTubeId(ad.videoUrl);

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${ad.userAvatar || 'ANH.png'}" style="width:26px; height:26px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.2);">
          <span style="font-size:0.78rem; font-weight:700; color:white;">${ad.userName || 'Advertiser'}</span>
        </div>
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

      // Auto-play video 5 seconds after thumbnail display
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

  async function renderAllNativeAds() {
    const containers = document.querySelectorAll(".native-ads, #native-ads");
    if (containers.length === 0) return;

    const ads = await fetchApprovedAds();
    if (ads.length === 0) return;

    containers.forEach((box, idx) => {
      if (box.dataset.adInjected) return;
      box.dataset.adInjected = "true";

      const randomAd = ads[Math.floor(Math.random() * ads.length)];
      const cardEl = createAdCardElement(randomAd, "elem_" + idx + "_" + Date.now());
      box.appendChild(cardEl);
    });
  }

  window.renderNativeDPGAds = renderAllNativeAds;

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(renderAllNativeAds, 1000);
    setTimeout(renderAllNativeAds, 3000);
  });
})();

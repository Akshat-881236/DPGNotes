/**
 * DPGNotes Universal Utility Tools Quota & Anti-Bypass System
 * (Image to PDF Converter, PDF Meta Adder, PDF Meta Analyzer)
 * 
 * Enforces:
 * - 1 Token / Day for Guests
 * - 2 Tokens / Day for Registered Contributors
 * - Hardware Canvas Fingerprint + UID + Date stored in Firestore `utility_tool_quotas`
 * - Bypass-proof: Clearing localStorage/sessionStorage does not grant new tokens.
 * - Quota Lockdown Modal with Google Sign-In (double tokens) and Sponsored Ads watch.
 */

(function() {
  "use strict";

  let currentDeviceFingerprint = null;
  let currentQuotaTokens = 1;
  let currentMaxQuota = 1;
  let activeToolName = "Utility Tool";
  let adWatchInProgress = false;
  let adWatchTimer = null;
  let midnightTimer = null;
  let adsenseCheckTimer = null;
  let coverAdObserver = null;
  let adsRequiredTotal = 1;
  let adsRemainingToWatch = 1;

  // Firebase Module References
  let dpgDb = null;
  let dpgAuth = null;
  let fsDoc = null;
  let fsSetDoc = null;
  let fsGetDoc = null;
  let fsServerTimestamp = null;

  async function initFirebaseModules() {
    if (dpgDb) return;
    try {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js");
      const { getFirestore, doc, setDoc, getDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js");
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js");

      const cfg = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) ? window.FIREBASE_CONFIG : {
        apiKey: "AIzaSyClhxuoGf7ELHD0srUBUPyQM6_CvYNafIE",
        authDomain: "dpgnotes.firebaseapp.com",
        projectId: "dpgnotes",
        storageBucket: "dpgnotes.firebasestorage.app",
        messagingSenderId: "910494426039",
        appId: "1:910494426039:web:adeae5315caaf846c43e32"
      };

      const app = !getApps().length ? initializeApp(cfg) : getApps()[0];
      dpgDb = getFirestore(app);
      dpgAuth = getAuth(app);
      fsDoc = doc;
      fsSetDoc = setDoc;
      fsGetDoc = getDoc;
      fsServerTimestamp = serverTimestamp;
      window._dpgAuthModule = { auth: dpgAuth, signInWithPopup, GoogleAuthProvider };
    } catch(err) {
      console.warn("[DpgUtilityQuota] Firebase init warning:", err);
    }
  }

  async function getDeviceFingerprint() {
    if (currentDeviceFingerprint) return currentDeviceFingerprint;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 240;
      canvas.height = 60;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px 'Arial', sans-serif";
        ctx.fillStyle = "#f60";
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = "#069";
        ctx.fillText("DPGNotes_Utility_Security_FP_2026", 2, 15);
        ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
        ctx.fillText("DPGNotes_Utility_Security_FP_2026", 4, 17);
      }
      const dataUrl = canvas.toDataURL();
      const screenInfo = `${screen.width}x${screen.height}x${screen.colorDepth}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      const lang = navigator.language || "";
      const platform = navigator.platform || "";
      const raw = `${dataUrl}___${screenInfo}___${tz}___${lang}___${platform}`;

      let h1 = 0xdeadbeef, h2 = 0x41c64e6d;
      for (let i = 0; i < raw.length; i++) {
        const ch = raw.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
      h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
      h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
      currentDeviceFingerprint = "fp_u_" + hash.toString(36);
    } catch(e) {
      currentDeviceFingerprint = "fp_u_dev_" + Math.abs(navigator.userAgent.split("").reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36);
    }
    return currentDeviceFingerprint;
  }

  function isContributor() {
    try {
      return !!(localStorage.getItem("dpgActiveUserUid") || (dpgAuth && dpgAuth.currentUser));
    } catch(e) {
      return false;
    }
  }

  function getTodayDateStr() {
    return new Date().toISOString().split("T")[0];
  }

  async function getQuotaDocId() {
    const fp = await getDeviceFingerprint();
    const isContrib = isContributor();
    const uid = localStorage.getItem("dpgActiveUserUid") || (dpgAuth && dpgAuth.currentUser ? dpgAuth.currentUser.uid : null);
    const prefix = isContrib && uid ? `user_${uid}` : `guest_${fp}`;
    return `util_${prefix}_${getTodayDateStr()}`;
  }

  async function syncQuotaFromFirestore() {
    await initFirebaseModules();
    const isContrib = isContributor();
    currentMaxQuota = isContrib ? 2 : 1;
    const today = getTodayDateStr();
    const quotaId = await getQuotaDocId();

    try {
      if (dpgDb && fsDoc && fsGetDoc) {
        const quotaRef = fsDoc(dpgDb, "utility_tool_quotas", quotaId);
        const snap = await fsGetDoc(quotaRef);
        if (snap.exists()) {
          const data = snap.data();
          currentQuotaTokens = typeof data.tokensRemaining === "number" ? data.tokensRemaining : 0;
        } else {
          currentQuotaTokens = currentMaxQuota;
          if (fsSetDoc) {
            await fsSetDoc(quotaRef, {
              id: quotaId,
              userType: isContrib ? "contributor" : "guest",
              userId: isContrib ? (localStorage.getItem("dpgActiveUserUid") || "") : `guest_${currentDeviceFingerprint}`,
              date: today,
              tokensRemaining: currentQuotaTokens,
              maxTokens: currentMaxQuota,
              createdAt: fsServerTimestamp ? fsServerTimestamp() : new Date().toISOString()
            });
          }
        }
      }
    } catch (err) {
      console.warn("[DpgUtilityQuota] Quota sync error:", err);
    }

    updateBadgeUI();
    return currentQuotaTokens;
  }

  function updateBadgeUI() {
    const isContrib = isContributor();
    const badgeText = `${currentQuotaTokens} / ${currentMaxQuota}`;
    const badgeColor = currentQuotaTokens > 0 ? "#10b981" : "#ef4444";
    const badgeBg = currentQuotaTokens > 0 ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.15)";
    const badgeBorder = currentQuotaTokens > 0 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.35)";

    const badgeHtml = `
      <div id="dpgUtilityQuotaBadge" style="display:inline-flex; align-items:center; gap:6px; background:${badgeBg}; border:1px solid ${badgeBorder}; padding:4px 10px; border-radius:20px; font-size:0.75rem; font-weight:700; color:${badgeColor}; font-family:inherit; cursor:pointer;" title="Click to view Quota details">
        <i class="ri-flashlight-fill" style="color:#f59e0b;"></i>
        <span>Daily Quota: ${badgeText}</span>
        ${isContrib ? '<span style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:2px 6px; border-radius:10px; font-size:0.65rem; margin-left:2px;">Contributor (2x)</span>' : '<span style="background:rgba(255,255,255,0.08); color:#94a3b8; padding:2px 6px; border-radius:10px; font-size:0.65rem; margin-left:2px;">Guest</span>'}
      </div>
    `;

    // Look for tool-specific header pill placeholders or inject into header
    const targets = ["userHeaderPillAdder", "userHeaderPillAnalyzer", "userHeaderPillConverter"];
    let injected = false;
    for (const tId of targets) {
      const el = document.getElementById(tId);
      if (el) {
        el.innerHTML = badgeHtml;
        injected = true;
        break;
      }
    }

    if (!injected) {
      const headerStatus = document.querySelector(".header-status");
      if (headerStatus) {
        let existing = document.getElementById("dpgUtilityQuotaBadge");
        if (existing) existing.remove();
        headerStatus.insertAdjacentHTML("afterbegin", badgeHtml);
      }
    }

    const b = document.getElementById("dpgUtilityQuotaBadge");
    if (b) {
      b.onclick = () => {
        if (currentQuotaTokens <= 0) {
          showQuotaLockdown();
        } else if (typeof window.customAlert === "function") {
          window.customAlert(`You currently have ${currentQuotaTokens} of ${currentMaxQuota} daily token(s) available for utility operations. Tokens automatically reset at midnight.`, { title: "Daily Utility Quota" });
        } else {
          alert(`You have ${currentQuotaTokens} of ${currentMaxQuota} daily token(s) remaining.`);
        }
      };
    }
  }

  // Quota Consumption
  async function requestTokenOrLockdown(toolName = "Utility Tool") {
    activeToolName = toolName;
    await syncQuotaFromFirestore();

    if (currentQuotaTokens <= 0) {
      showQuotaLockdown();
      return false;
    }

    currentQuotaTokens--;
    updateBadgeUI();

    try {
      const quotaId = await getQuotaDocId();
      if (dpgDb && fsDoc && fsSetDoc) {
        const quotaRef = fsDoc(dpgDb, "utility_tool_quotas", quotaId);
        await fsSetDoc(quotaRef, {
          tokensRemaining: currentQuotaTokens,
          lastUsedAt: fsServerTimestamp ? fsServerTimestamp() : new Date().toISOString()
        }, { merge: true });
      }
    } catch (err) {
      console.warn("[DpgUtilityQuota] Failed to decrement token:", err);
    }

    return true;
  }

  // Injects Quota Lockdown Modal DOM into document
  function ensureLockdownModal() {
    if (document.getElementById("dpgUtilityLockOverlay")) return;

    const modalHtml = `
      <div id="dpgUtilityLockOverlay" style="display:none; position:fixed; inset:0; z-index:2147483640; background:rgba(6,9,19,0.92); backdrop-filter:blur(14px); align-items:center; justify-content:center; padding:1rem; overflow-y:auto;">
        <div style="background:rgba(15,23,42,0.98); border:1px solid rgba(99,102,241,0.35); box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(99,102,241,0.25); border-radius:20px; max-width:620px; width:100%; padding:2rem 1.75rem; color:white; text-align:center; position:relative; box-sizing:border-box;">
          
          <button type="button" onclick="window.DpgUtilityQuota.exitLockdown()" style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#94a3b8; width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.1rem; cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.color='white'; this.style.borderColor='rgba(255,255,255,0.4)';" onmouseleave="this.style.color='#94a3b8'; this.style.borderColor='rgba(255,255,255,0.15)';">
            <i class="ri-close-line"></i>
          </button>

          <div style="width:64px; height:64px; border-radius:50%; background:rgba(239,68,68,0.15); border:1.5px solid rgba(239,68,68,0.4); display:flex; align-items:center; justify-content:center; font-size:2rem; color:#ef4444; margin:0 auto 1.25rem;">
            <i class="ri-flashlight-line"></i>
          </div>

          <h3 id="dpgUtilModalTitle" style="font-size:1.35rem; font-weight:800; margin-bottom:0.5rem; letter-spacing:-0.02em; color:white;">
            Daily Utility Quota Limit Reached
          </h3>

          <p id="dpgUtilModalSubtitle" style="font-size:0.88rem; color:#94a3b8; line-height:1.55; margin-bottom:1.5rem;">
            You have exhausted your daily free token for <strong>${activeToolName}</strong>. Choose an option below to continue processing:
          </p>

          <!-- Choices Section -->
          <div id="dpgUtilChoiceSec" style="display:flex; flex-direction:column; gap:12px; margin-bottom:1.5rem;">
            <button type="button" id="dpgUtilBtnWatchAd" onclick="window.DpgUtilityQuota.startAdFlow()" style="display:flex; align-items:center; justify-content:center; gap:10px; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; border:none; padding:12px 16px; border-radius:12px; font-weight:700; font-size:0.92rem; cursor:pointer; box-shadow:0 4px 15px rgba(99,102,241,0.35); transition:transform 0.2s;" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='none'">
              <i class="ri-play-circle-line" style="font-size:1.2rem;"></i> Watch Sponsored Ad (Restore 1 Token)
            </button>

            <button type="button" id="dpgUtilBtnGoogleSign" onclick="window.DpgUtilityQuota.signInWithGoogle()" style="display:flex; align-items:center; justify-content:center; gap:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:white; padding:12px 16px; border-radius:12px; font-weight:700; font-size:0.92rem; cursor:pointer; transition:all 0.2s;" onmouseenter="this.style.borderColor='#818cf8'; this.style.background='rgba(99,102,241,0.1)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.15)'; this.style.background='rgba(255,255,255,0.06)'">
              <i class="ri-google-fill" style="color:#ea4335; font-size:1.1rem;"></i> Sign In with Google (Double Daily Quota)
            </button>
          </div>

          <!-- Ad Playback Section (Standardized Cover Page Generator Architecture) -->
          <div id="dpgUtilAdPlaybackSec" style="display:none; text-align:center;">
            <div id="dpgUtilAdCountdownBadge" style="display:inline-flex; align-items:center; gap:8px; background:rgba(139,92,246,0.18); color:#c084fc; border:1px solid rgba(139,92,246,0.35); padding:6px 16px; border-radius:999px; font-size:0.85rem; font-weight:700; margin-bottom:1rem;">
              <i class="ri-loader-4-line spin-icon"></i> <span id="dpgUtilAdStatusText">Checking Google AdSense availability (15s timeout)...</span>
            </div>

            <div style="width:100%; max-width:580px; height:6px; background:rgba(255,255,255,0.08); border-radius:999px; overflow:hidden; margin:0 auto 1rem auto;">
              <div id="dpgUtilAdProgressBar" style="width:0%; height:100%; background:linear-gradient(90deg, #ec4899, #8b5cf6); transition:width 0.3s ease;"></div>
            </div>

            <p style="font-size:0.82rem; color:#64748b; margin-bottom:0.5rem;">
              <i class="ri-information-line"></i> Priority given to Google AdSense with connection check. Automatically falls back to DPGNotes Native Ads.
            </p>

            <!-- AdSense Container -->
            <div id="dpgUtilAdsenseBox" style="width:100%; max-width:600px; margin:1rem auto; display:none;"></div>

            <!-- Native Ads Container -->
            <div id="dpgUtilNativeBox" style="display:none; justify-content:center; width:100%;">
              <div id="native-ads" class="native-ads cover-modal-native-ad" data-ad-variant="cover_image" data-ad-count="1" style="margin-top:0.5rem; width:100%; max-width:600px;"></div>
            </div>
          </div>

          <!-- Midnight Lockout Section (Offline fallback) -->
          <div id="dpgUtilMidnightSec" style="display:none; text-align:center;">
            <p style="font-size:0.85rem; color:#94a3b8; margin-bottom:8px;">Daily Quota resets automatically in:</p>
            <div id="dpgUtilMidnightCountdown" style="font-family:monospace; font-size:1.8rem; font-weight:800; color:#f59e0b; letter-spacing:2px; margin-bottom:12px;">00:00:00</div>
          </div>

        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  function showQuotaLockdown() {
    ensureLockdownModal();
    const overlay = document.getElementById("dpgUtilityLockOverlay");
    const choiceSec = document.getElementById("dpgUtilChoiceSec");
    const adSec = document.getElementById("dpgUtilAdPlaybackSec");
    const midSec = document.getElementById("dpgUtilMidnightSec");
    const googleBtn = document.getElementById("dpgUtilBtnGoogleSign");
    const subtitle = document.getElementById("dpgUtilModalSubtitle");

    if (choiceSec) choiceSec.style.display = "flex";
    if (adSec) adSec.style.display = "none";
    if (midSec) midSec.style.display = "none";

    const isContrib = isContributor();
    if (googleBtn) {
      googleBtn.style.display = isContrib ? "none" : "flex";
    }

    if (subtitle) {
      if (isContrib) {
        subtitle.innerHTML = `You have used your Contributor daily quota tokens for <strong>${activeToolName}</strong>. Watch verified learning sponsor ads below to immediately restore your token, or wait for midnight automatic reset.`;
      } else {
        subtitle.innerHTML = `You have exhausted your daily free token for <strong>${activeToolName}</strong>. Choose how you would like to proceed:`;
      }
    }

    if (overlay) {
      overlay.style.display = "flex";
    }
  }

  function exitLockdown() {
    const overlay = document.getElementById("dpgUtilityLockOverlay");
    if (overlay) overlay.style.display = "none";

    adWatchInProgress = false;
    if (adWatchTimer) { clearInterval(adWatchTimer); adWatchTimer = null; }
    if (midnightTimer) { clearInterval(midnightTimer); midnightTimer = null; }
    if (adsenseCheckTimer) { clearInterval(adsenseCheckTimer); adsenseCheckTimer = null; }
    if (coverAdObserver) { coverAdObserver.disconnect(); coverAdObserver = null; }

    if (typeof window.cleanupAllNativeAds === "function") {
      window.cleanupAllNativeAds();
    }

    const adsenseBox = document.getElementById("dpgUtilAdsenseBox");
    if (adsenseBox) {
      adsenseBox.style.display = "none";
      adsenseBox.innerHTML = "";
    }

    const adNativeInner = document.getElementById("native-ads");
    if (adNativeInner) {
      adNativeInner.classList.remove("native-ads");
      delete adNativeInner.dataset.adInjected;
      adNativeInner.innerHTML = "";
    }
  }

  async function restoreQuotaToken() {
    const quotaId = await getQuotaDocId();
    currentQuotaTokens = 1;
    updateBadgeUI();

    try {
      if (dpgDb && fsDoc && fsSetDoc) {
        const quotaRef = fsDoc(dpgDb, "utility_tool_quotas", quotaId);
        await fsSetDoc(quotaRef, {
          tokensRemaining: currentQuotaTokens,
          restoredAt: fsServerTimestamp ? fsServerTimestamp() : new Date().toISOString()
        }, { merge: true });
      }
    } catch (e) {
      console.warn("[DpgUtilityQuota] Failed to update restored token:", e);
    }

    exitLockdown();
    if (typeof window.customAlert === "function") {
      await window.customAlert("🎉 Thank you for supporting DPGNotes! Your daily utility token has been restored. You may now continue your operation.", { title: "Token Restored" });
    } else {
      alert("🎉 Token restored successfully!");
    }
  }

  // Quota Ad Flow: Follows exact Cover Page Generator logic (AdSense priority + silent Native Ads fallback)
  function startAdFlow() {
    if (adWatchInProgress) return;
    adWatchInProgress = true;

    if (adWatchTimer) clearInterval(adWatchTimer);
    if (adsenseCheckTimer) clearInterval(adsenseCheckTimer);
    if (coverAdObserver) { coverAdObserver.disconnect(); coverAdObserver = null; }

    const choiceSec = document.getElementById("dpgUtilChoiceSec");
    const adSec = document.getElementById("dpgUtilAdPlaybackSec");
    if (choiceSec) choiceSec.style.display = "none";
    if (adSec) adSec.style.display = "block";

    const statusEl = document.getElementById("dpgUtilAdStatusText");
    const barEl = document.getElementById("dpgUtilAdProgressBar");
    const adsenseBox = document.getElementById("dpgUtilAdsenseBox");
    const nativeBox = document.getElementById("dpgUtilNativeBox");

    if (statusEl) statusEl.textContent = "Connecting to Google AdSense... (15s timeout)";
    if (barEl) barEl.style.width = "0%";

    if (!navigator.onLine) {
      fallbackToNativeCoverAd();
      return;
    }

    // 1. Mount Google AdSense container
    if (adsenseBox) {
      adsenseBox.style.display = "block";
      adsenseBox.innerHTML = `
        <ins class="adsbygoogle"
             style="display:block; text-align:center;"
             data-ad-layout="in-article"
             data-ad-format="fluid"
             data-ad-client="ca-pub-5515547448097504"
             data-ad-slot="6070257271"></ins>
      `;
    }
    if (nativeBox) nativeBox.style.display = "none";

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch(e) {
      console.warn("[DpgUtilityQuota] AdSense push failed, falling back to Native Ad:", e);
      fallbackToNativeCoverAd();
      return;
    }

    const ins = adsenseBox ? adsenseBox.querySelector("ins.adsbygoogle") : null;
    if (!ins) {
      fallbackToNativeCoverAd();
      return;
    }

    let adResolved = false;
    let checkElapsed = 0;

    const onAdsenseAbsent = () => {
      if (adResolved) return;
      adResolved = true;
      if (adsenseCheckTimer) clearInterval(adsenseCheckTimer);
      if (coverAdObserver) { coverAdObserver.disconnect(); coverAdObserver = null; }
      fallbackToNativeCoverAd();
    };

    const onAdsenseFilled = () => {
      if (adResolved) return;
      adResolved = true;
      if (adsenseCheckTimer) clearInterval(adsenseCheckTimer);
      if (coverAdObserver) { coverAdObserver.disconnect(); coverAdObserver = null; }
      playAdsenseDuration();
    };

    coverAdObserver = new MutationObserver(() => {
      const status = ins.getAttribute("data-ad-status");
      const isCollapsed = ins.style.display === "none";
      if (status === "unfilled" || (isCollapsed && checkElapsed > 500)) {
        onAdsenseAbsent();
        return;
      }
      if (status === "filled" && ins.offsetHeight > 50 && !isCollapsed) {
        onAdsenseFilled();
      }
    });
    coverAdObserver.observe(ins, { attributes: true, attributeFilter: ["data-ad-status", "style", "class"] });

    adsenseCheckTimer = setInterval(() => {
      checkElapsed += 250;
      const status = ins.getAttribute("data-ad-status");
      const isCollapsed = ins.style.display === "none";

      if (status === "unfilled" || isCollapsed) {
        onAdsenseAbsent();
        return;
      }
      if (status === "filled" && ins.offsetHeight > 50 && !isCollapsed) {
        onAdsenseFilled();
        return;
      }

      const secLeft = Math.max(0, ((3500 - checkElapsed) / 1000).toFixed(1));
      if (statusEl && !adResolved) {
        statusEl.textContent = `Connecting to Google AdSense... (${secLeft}s)`;
      }
      if (barEl && !adResolved) {
        barEl.style.width = `${Math.round((checkElapsed / 3500) * 40)}%`;
      }

      if (checkElapsed >= 3500) {
        onAdsenseAbsent();
      }
    }, 250);
  }

  function playAdsenseDuration() {
    const statusEl = document.getElementById("dpgUtilAdStatusText");
    const barEl = document.getElementById("dpgUtilAdProgressBar");
    let adSec = 15;
    if (statusEl) statusEl.textContent = `Viewing Google AdSense (${adSec}s remaining...)`;

    adWatchTimer = setInterval(() => {
      adSec--;
      if (statusEl) statusEl.textContent = `Viewing Google AdSense (${adSec}s remaining...)`;
      if (barEl) barEl.style.width = `${Math.round(((15 - adSec) / 15) * 100)}%`;

      if (adSec <= 0) {
        clearInterval(adWatchTimer);
        adWatchTimer = null;
        adWatchInProgress = false;
        restoreQuotaToken();
      }
    }, 1000);
  }

  function fallbackToNativeCoverAd() {
    if (adWatchTimer) clearInterval(adWatchTimer);
    if (adsenseCheckTimer) clearInterval(adsenseCheckTimer);
    if (coverAdObserver) { coverAdObserver.disconnect(); coverAdObserver = null; }

    const statusEl = document.getElementById("dpgUtilAdStatusText");
    const barEl = document.getElementById("dpgUtilAdProgressBar");
    const adsenseBox = document.getElementById("dpgUtilAdsenseBox");
    const nativeBox = document.getElementById("dpgUtilNativeBox");
    const adNativeInner = document.getElementById("native-ads") || (nativeBox ? nativeBox.querySelector(".native-ads") : null);

    if (adsenseBox) {
      adsenseBox.style.display = "none";
      adsenseBox.innerHTML = "";
    }

    if (nativeBox) nativeBox.style.display = "flex";
    let nativeSec = 15;
    if (statusEl) statusEl.textContent = `Viewing Sponsor Native Ad (${nativeSec}s remaining...)`;
    if (barEl) barEl.style.width = "0%";

    if (adNativeInner) {
      adNativeInner.classList.add("native-ads");
      adNativeInner.classList.add("cover-modal-native-ad");
      const hasVideo = (window.DPG_APPROVED_ADS || []).some(a => a.videoUrl && a.videoUrl.trim() !== "");
      adNativeInner.dataset.adVariant = hasVideo ? "cover_video" : "cover_image";
      adNativeInner.dataset.adCount = "1";
      delete adNativeInner.dataset.adInjected;
      adNativeInner.innerHTML = "";
      if (typeof window.renderNativeDPGAds === "function") {
        window.renderNativeDPGAds();
      }
    }

    adWatchTimer = setInterval(() => {
      nativeSec--;
      if (statusEl) statusEl.textContent = `Viewing Sponsor Native Ad (${nativeSec}s remaining...)`;
      if (barEl) barEl.style.width = `${Math.round(((15 - nativeSec) / 15) * 100)}%`;

      if (nativeSec <= 0) {
        clearInterval(adWatchTimer);
        adWatchTimer = null;
        adWatchInProgress = false;
        restoreQuotaToken();
      }
    }, 1000);
  }

  // Bind global cover ad watched callback so native ad skip / complete immediately restores token
  window.onCoverAdWatched = function() {
    const overlay = document.getElementById("dpgUtilityLockOverlay");
    if (overlay && (window.getComputedStyle(overlay).display !== "none")) {
      restoreQuotaToken();
    }
  };

  async function signInWithGoogle() {
    const btn = document.getElementById("dpgUtilBtnGoogleSign");
    if (btn) btn.innerHTML = '<i class="ri-loader-4-line spin-icon"></i> Connecting to Google...';
    try {
      await initFirebaseModules();
      if (!window._dpgAuthModule) throw new Error("Auth module not initialized");
      const { auth, signInWithPopup, GoogleAuthProvider } = window._dpgAuthModule;
      const provider = new GoogleAuthProvider();
      const res = await signInWithPopup(auth, provider);

      if (res && res.user) {
        localStorage.setItem("dpgActiveUserUid", res.user.uid);
        localStorage.setItem("dpgActiveUser", JSON.stringify({
          uid: res.user.uid,
          email: res.user.email,
          name: res.user.displayName,
          avatar: res.user.photoURL,
          role: "contributor"
        }));

        currentMaxQuota = 2;
        currentQuotaTokens = 2;
        updateBadgeUI();

        const quotaId = await getQuotaDocId();
        if (dpgDb && fsDoc && fsSetDoc) {
          const quotaRef = fsDoc(dpgDb, "utility_tool_quotas", quotaId);
          await fsSetDoc(quotaRef, {
            userId: res.user.uid,
            userType: "contributor",
            tokensRemaining: 2,
            maxTokens: 2,
            date: getTodayDateStr()
          }, { merge: true });
        }

        exitLockdown();
        if (typeof window.customAlert === "function") {
          await window.customAlert("🎉 Welcome Contributor! Your daily utility tool quota has been doubled (2 tokens).", { title: "Signed In Successfully" });
        } else {
          alert("🎉 Welcome Contributor! Daily quota doubled to 2 tokens.");
        }
      }
    } catch(err) {
      console.error("[DpgUtilityQuota] Google sign-in failed:", err);
      if (btn) btn.innerHTML = '<i class="ri-google-fill" style="color:#ea4335;"></i> Sign In with Google (Double Daily Quota)';
      if (typeof window.customAlert === "function") {
        await window.customAlert("Authentication failed: " + (err.message || err), { title: "Sign-In Error", isDanger: true });
      } else {
        alert("Authentication failed: " + (err.message || err));
      }
    }
  }

  // Auto-init on page load
  window.DpgUtilityQuota = {
    init: async function(toolName) {
      activeToolName = toolName || "Utility Tool";
      await getDeviceFingerprint();
      await syncQuotaFromFirestore();
    },
    requestTokenOrLockdown,
    showLockdown: showQuotaLockdown,
    exitLockdown,
    restoreQuotaToken,
    startAdFlow,
    signInWithGoogle,
    getTokensRemaining: () => currentQuotaTokens,
    getMaxTokens: () => currentMaxQuota
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.DpgUtilityQuota.init(document.title || "Utility Tool");
    });
  } else {
    window.DpgUtilityQuota.init(document.title || "Utility Tool");
  }

})();

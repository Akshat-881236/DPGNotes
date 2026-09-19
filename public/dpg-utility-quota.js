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
        <div style="background:rgba(15,23,42,0.98); border:1px solid rgba(99,102,241,0.35); box-shadow:0 25px 60px rgba(0,0,0,0.8), 0 0 35px rgba(99,102,241,0.25); border-radius:20px; max-width:540px; width:100%; padding:2rem 1.75rem; color:white; text-align:center; position:relative; box-sizing:border-box;">
          
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
            You have exhausted your daily free token for <strong>\${activeToolName}</strong>. Choose an option below to continue processing:
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

          <!-- Ad Playback Section -->
          <div id="dpgUtilAdPlaybackSec" style="display:none; text-align:center;">
            <div style="font-size:0.85rem; color:#818cf8; font-weight:700; margin-bottom:10px;" id="dpgUtilAdStatusText">
              Loading Sponsored Partner Ad (15s remaining...)...
            </div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:10px; overflow:hidden; margin-bottom:15px;">
              <div id="dpgUtilAdProgressBar" style="width:0%; height:100%; background:linear-gradient(90deg,#6366f1,#10b981); transition:width 0.3s ease;"></div>
            </div>
            
            <div id="dpgUtilNativeAdContainer" style="width:100%; min-height:200px; display:flex; align-items:center; justify-content:center;">
              <div id="dpgUtilNativeAdsInner" class="native-ads" data-ad-variant="cover_image" data-ad-count="1" style="width:100%;"></div>
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

    if (choiceSec) choiceSec.style.display = "flex";
    if (adSec) adSec.style.display = "none";
    if (midSec) midSec.style.display = "none";

    if (googleBtn) {
      googleBtn.style.display = isContributor() ? "none" : "flex";
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

    const adInner = document.getElementById("dpgUtilNativeAdsInner");
    if (adInner) {
      adInner.classList.remove("native-ads");
      delete adInner.dataset.adInjected;
      adInner.innerHTML = "";
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

  function startAdFlow() {
    if (adWatchInProgress) return;
    adWatchInProgress = true;

    const choiceSec = document.getElementById("dpgUtilChoiceSec");
    const adSec = document.getElementById("dpgUtilAdPlaybackSec");
    if (choiceSec) choiceSec.style.display = "none";
    if (adSec) adSec.style.display = "block";

    const statusEl = document.getElementById("dpgUtilAdStatusText");
    const barEl = document.getElementById("dpgUtilAdProgressBar");
    const adInner = document.getElementById("dpgUtilNativeAdsInner");

    let sec = 15;
    if (statusEl) statusEl.textContent = `Viewing Sponsored Partner Ad (${sec}s remaining...)`;
    if (barEl) barEl.style.width = "0%";

    if (adInner) {
      adInner.classList.add("native-ads");
      const hasVideo = (window.DPG_APPROVED_ADS || []).some(a => a.videoUrl && a.videoUrl.trim() !== "");
      adInner.dataset.adVariant = hasVideo ? "cover_video" : "cover_image";
      delete adInner.dataset.adInjected;
      adInner.innerHTML = "";
      if (typeof window.renderNativeDPGAds === "function") {
        window.renderNativeDPGAds();
      }
    }

    adWatchTimer = setInterval(() => {
      sec--;
      if (statusEl) statusEl.textContent = `Viewing Sponsored Partner Ad (${sec}s remaining...)`;
      if (barEl) barEl.style.width = `${Math.round(((15 - sec) / 15) * 100)}%`;

      if (sec <= 0) {
        clearInterval(adWatchTimer);
        adWatchTimer = null;
        adWatchInProgress = false;
        restoreQuotaToken();
      }
    }, 1000);
  }

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

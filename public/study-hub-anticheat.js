/**
 * DPGNotes Study Hub Anti-Cheat & Inspection Lockout Engine
 * Dedicated security monitor: Active ONLY on Study Hub (study-hub.html).
 * Enforces cross-session 3-hour lockout (-1,800 coins penalty, negative balance supported)
 * against Developer Tools inspection, shortcut interception, and Ask Gemini side panels.
 */
(function() {
  "use strict";

  // Safeguard: Only execute on Study Hub pages
  if (typeof window === "undefined") return;
  const path = (window.location.pathname || "").toLowerCase();
  const isStudyHub = path.includes("study-hub") || document.title.toLowerCase().includes("study hub") || !!document.getElementById("studyHubSearchInput");
  if (!isStudyHub && !path.includes("study")) {
    return;
  }

  const ANTICHEAT_LOCK_KEY = "dpg_anticheat_lock_v1";
  const ANTICHEAT_PENALTY_COINS = 1800;
  const ANTICHEAT_DURATION_MS = 3 * 60 * 60 * 1000; // 3 Hours

  function getApiBase() {
    const fallback = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://localhost:5000"
      : "https://dpgnotes.onrender.com";
    const configured = (typeof window.API_BASE_URL === "string" && window.API_BASE_URL && window.API_BASE_URL !== "undefined")
      ? window.API_BASE_URL
      : fallback;
    return configured.replace(/\/+$/, "");
  }

  function getActiveUid() {
    try {
      const uid = localStorage.getItem("dpgActiveUserUid");
      if (uid) return uid;
      const raw = localStorage.getItem("dpgActiveUser");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.uid) return parsed.uid;
      }
    } catch (_) {}
    return "";
  }

  function getCoinsBalance() {
    try {
      const raw = localStorage.getItem("dpg_user_coins_balance");
      if (raw === null || raw === "") return 0;
      const val = parseInt(raw, 10);
      return isNaN(val) ? 0 : val;
    } catch (_) {
      return 0;
    }
  }

  function setCoinsBalance(val) {
    const parsed = Number(val);
    const clean = Number.isFinite(parsed) ? Math.max(-1000000, Math.floor(parsed)) : 0;
    try {
      localStorage.setItem("dpg_user_coins_balance", String(clean));
    } catch (_) {}
    return clean;
  }

  function openIntegrityDB() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") return reject(new Error("No IDB"));
      const req = indexedDB.open("DPGIntegrityDB", 1);
      req.onupgradeneeded = (e) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains("locks")) {
          idb.createObjectStore("locks", { keyPath: "id" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function saveIntegrityLockIDB(lockObj) {
    try {
      const idb = await openIntegrityDB();
      return await new Promise((resolve) => {
        const tx = idb.transaction("locks", "readwrite");
        tx.objectStore("locks").put({ id: "anticheat_lock", ...lockObj });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch (_) {
      return false;
    }
  }

  async function readIntegrityLockIDB() {
    try {
      const idb = await openIntegrityDB();
      return await new Promise((resolve) => {
        const tx = idb.transaction("locks", "readonly");
        const req = tx.objectStore("locks").get("anticheat_lock");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (_) {
      return null;
    }
  }

  function readAntiCheatLockLocal() {
    try {
      const raw = localStorage.getItem(ANTICHEAT_LOCK_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === "object") ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function writeAntiCheatLockLocal(lockObj) {
    try {
      localStorage.setItem(ANTICHEAT_LOCK_KEY, JSON.stringify(lockObj));
    } catch (_) {}
    saveIntegrityLockIDB(lockObj);
  }

  function getAntiCheatStatus() {
    const now = Date.now();
    const lock = readAntiCheatLockLocal();
    if (lock && Number(lock.creditBlockedUntil) > now) {
      return {
        isBlocked: true,
        remainingMs: Number(lock.creditBlockedUntil) - now,
        creditBlockedUntil: Number(lock.creditBlockedUntil),
        violatedAt: Number(lock.violatedAt || 0),
        reason: lock.reason || "Anti-Cheat Policy / Inspection Mode or Ask Gemini Tab detected",
        penaltyDeducted: Boolean(lock.penaltyDeducted)
      };
    }
    return {
      isBlocked: false,
      remainingMs: 0,
      creditBlockedUntil: Number(lock?.creditBlockedUntil || 0),
      violatedAt: Number(lock?.violatedAt || 0),
      reason: "",
      penaltyDeducted: false
    };
  }

  function isAntiCheatCreditBlocked() {
    return getAntiCheatStatus().isBlocked;
  }

  function detectInspectionOrGemini() {
    try {
      if (window.outerWidth > 0 && window.innerWidth > 0 && window.outerHeight > 0 && window.innerHeight > 0) {
        const vv = window.visualViewport;
        const scale = (vv && vv.scale && vv.scale > 0.25) ? vv.scale : 1;
        const widthDelta = window.outerWidth - Math.round(window.innerWidth * scale);
        const heightDelta = window.outerHeight - Math.round(window.innerHeight * scale);
        const isDesktopLike = (window.screen && window.screen.width > 520) && !(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);

        // Ask Gemini or docked inspection panel on right
        if (widthDelta > 175) {
          return { detected: true, reason: "External AI Side Panel (Ask Gemini) or Docked Inspection Mode detected" };
        }
        // DevTools docked to bottom
        if (isDesktopLike && heightDelta > 220) {
          return { detected: true, reason: "Browser Developer Tools / Inspection Mode detected" };
        }
      }

      let isInspectorOpen = false;
      const probe = new Image();
      Object.defineProperty(probe, "id", {
        get: function () {
          isInspectorOpen = true;
          return "";
        }
      });
      console.log("%c", probe);
      if (isInspectorOpen) {
        return { detected: true, reason: "Developer Tools Console / Inspection Mode detected" };
      }
    } catch (_) {}
    return { detected: false, reason: "" };
  }

  function showAntiCheatPenaltyNotice(lockInfo, balance) {
    try {
      if (typeof document === "undefined" || !document.body) return;
      const toastId = "dpgAntiCheatPenaltyToast";
      let el = document.getElementById(toastId);
      if (!el) {
        el = document.createElement("div");
        el.id = toastId;
        el.style.cssText = "position:fixed;bottom:18px;right:18px;z-index:2147483640;max-width:400px;width:calc(100vw - 36px);background:rgba(15,23,42,0.97);border:1.5px solid #ef4444;border-radius:14px;padding:14px 16px;color:#f8fafc;box-shadow:0 20px 50px rgba(0,0,0,0.65);font-family:'Inter',system-ui,sans-serif;backdrop-filter:blur(12px);";
        document.body.appendChild(el);
      }
      const minsLeft = Math.max(1, Math.ceil((lockInfo.creditBlockedUntil - Date.now()) / 60000));
      const hrs = Math.floor(minsLeft / 60);
      const mins = minsLeft % 60;
      const timeLabel = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      el.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="width:34px;height:34px;border-radius:10px;background:rgba(239,68,68,0.18);color:#ef4444;display:flex;align-items:center;justify-content:center;font-size:1.15rem;flex-shrink:0;">
            <i class="ri-shield-cross-fill"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:0.9rem;color:#fca5a5;margin-bottom:3px;">Anti-Cheat Penalty: -1,800 DPG Coins</div>
            <div style="font-size:0.78rem;color:#cbd5e1;line-height:1.45;">
              ${lockInfo.reason}. Coin credits are disabled for <strong>${timeLabel}</strong> (3-hour lockout). Current Balance: <strong style="color:${balance < 0 ? '#f87171' : '#fbbf24'};">${balance.toLocaleString()} DPGCoins</strong>.
            </div>
            <div style="margin-top:8px;">
              <button type="button" onclick="if(window.openDpgDeductionReportModal) window.openDpgDeductionReportModal();" style="background:rgba(239,68,68,0.22);border:1px solid rgba(239,68,68,0.45);color:#fca5a5;padding:4px 10px;border-radius:6px;font-size:0.74rem;font-weight:700;cursor:pointer;">
                Dispute / Report to Admin
              </button>
            </div>
          </div>
          <button type="button" onclick="this.closest('#dpgAntiCheatPenaltyToast').remove()" style="background:none;border:none;color:#94a3b8;cursor:pointer;font-size:1.1rem;padding:0;line-height:1;" aria-label="Dismiss">&times;</button>
        </div>
      `;
    } catch (_) {}
  }

  let penaltySyncInFlight = false;
  async function triggerAntiCheatPenalty(reason, opts = {}) {
    const now = Date.now();
    const existing = readAntiCheatLockLocal();
    const cleanReason = String(reason || "Anti-Cheat Policy / Inspection Mode or Ask Gemini Tab detected");

    // If an active 3-hour penalized lockout already exists, keep credit disabled without double-deducting -1800
    if (existing && existing.penaltyDeducted && Number(existing.creditBlockedUntil) > now) {
      return {
        alreadyPenalized: true,
        balance: getCoinsBalance(),
        lock: existing
      };
    }

    const curBal = getCoinsBalance();
    const prevLocalUpdatedAt = parseInt(localStorage.getItem("dpg_coins_local_updated_at") || "0", 10);
    const newBal = setCoinsBalance(curBal - ANTICHEAT_PENALTY_COINS);
    try {
      localStorage.setItem("dpg_coins_local_updated_at", String(now));
      localStorage.setItem("dpg_coins_local_debit_at", String(now));
    } catch (_) {}

    const blockedUntil = now + ANTICHEAT_DURATION_MS;
    const lockObj = {
      violatedAt: now,
      creditBlockedUntil: blockedUntil,
      penaltyDeducted: true,
      penaltyAmount: ANTICHEAT_PENALTY_COINS,
      reason: cleanReason,
      page: window.location.pathname || "/study-hub.html"
    };
    writeAntiCheatLockLocal(lockObj);

    const uid = getActiveUid();
    let finalBalance = newBal;
    if (uid && !penaltySyncInFlight) {
      penaltySyncInFlight = true;
      try {
        const res = await fetch(`${getApiBase()}/api/coins/penalty`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            uid,
            amount: ANTICHEAT_PENALTY_COINS,
            blockedUntil,
            reason: cleanReason,
            page: window.location.pathname || "/study-hub.html",
            localCoins: curBal,
            localUpdatedAt: prevLocalUpdatedAt
          })
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.success && typeof data.dpgCoins === "number") {
          finalBalance = setCoinsBalance(data.dpgCoins);
          if (Number(data.antiCheatBlockedUntil) > blockedUntil) {
            lockObj.creditBlockedUntil = Number(data.antiCheatBlockedUntil);
            writeAntiCheatLockLocal(lockObj);
          }
          localStorage.setItem("dpg_coins_local_updated_at", String(Date.now()));
          localStorage.setItem("dpg_coins_local_debit_at", String(Date.now()));
        }
      } catch (_) {} finally {
        penaltySyncInFlight = false;
      }
    }

    if (!opts.silent) {
      showAntiCheatPenaltyNotice(lockObj, finalBalance);
    }

    window.dispatchEvent(new CustomEvent("dpg-anticheat-penalty", {
      detail: { balance: finalBalance, lock: lockObj, reason: cleanReason }
    }));
    window.dispatchEvent(new CustomEvent("dpg-coins-pass-updated", {
      detail: { balance: finalBalance, antiCheatLock: lockObj }
    }));

    return {
      alreadyPenalized: false,
      balance: finalBalance,
      lock: lockObj
    };
  }

  function runAntiCheatPassCheck() {
    const detection = detectInspectionOrGemini();
    if (detection.detected) {
      triggerAntiCheatPenalty(detection.reason);
    }
  }

  // Restore lock from IndexedDB mirror if localStorage was cleared
  readIntegrityLockIDB().then((idbLock) => {
    if (idbLock && Number(idbLock.creditBlockedUntil) > Date.now()) {
      const localLock = readAntiCheatLockLocal();
      if (!localLock || Number(localLock.creditBlockedUntil || 0) < Number(idbLock.creditBlockedUntil)) {
        try {
          localStorage.setItem(ANTICHEAT_LOCK_KEY, JSON.stringify({
            violatedAt: idbLock.violatedAt,
            creditBlockedUntil: idbLock.creditBlockedUntil,
            penaltyDeducted: Boolean(idbLock.penaltyDeducted),
            penaltyAmount: idbLock.penaltyAmount || ANTICHEAT_PENALTY_COINS,
            reason: idbLock.reason || "Previous session Anti-Cheat Lockout active",
            page: idbLock.page || "/study-hub.html"
          }));
        } catch (_) {}
        window.dispatchEvent(new CustomEvent("dpg-anticheat-penalty", {
          detail: { balance: getCoinsBalance(), lock: idbLock, restored: true }
        }));
      }
    }
  });

  // Attach keyboard listeners for dev tools / view source shortcuts
  if (!window.__studyHubAntiCheatAttached) {
    window.__studyHubAntiCheatAttached = true;
    window.addEventListener("keydown", function(e) {
      const key = String(e.key || "").toUpperCase();
      const isF12 = key === "F12" || e.keyCode === 123;
      const isInspectorShortcut = (e.ctrlKey || e.metaKey) && e.shiftKey && (key === "I" || key === "J" || key === "C");
      const isViewSource = (e.ctrlKey || e.metaKey) && key === "U";
      if (isF12 || isInspectorShortcut || isViewSource) {
        e.preventDefault();
        e.stopPropagation();
        triggerAntiCheatPenalty("Developer Tools / Inspection shortcut attempted (" + key + ")");
      }
    }, { capture: true, passive: false });

    window.addEventListener("resize", function() {
      setTimeout(runAntiCheatPassCheck, 120);
    });

    setTimeout(runAntiCheatPassCheck, 800);
    setInterval(runAntiCheatPassCheck, 2500);
  }

  // Expose API
  window.StudyHubAntiCheat = {
    ANTICHEAT_LOCK_KEY,
    ANTICHEAT_PENALTY_COINS,
    ANTICHEAT_DURATION_MS,
    getAntiCheatStatus,
    isAntiCheatCreditBlocked,
    detectInspectionOrGemini,
    triggerAntiCheatPenalty
  };

  // Bridge to DPGCoinsPasses if available or when it loads
  if (window.DPGCoinsPasses) {
    window.DPGCoinsPasses.detectInspectionOrGemini = detectInspectionOrGemini;
    window.DPGCoinsPasses.triggerAntiCheatPenalty = triggerAntiCheatPenalty;
    window.DPGCoinsPasses.getAntiCheatStatus = getAntiCheatStatus;
    window.DPGCoinsPasses.isAntiCheatCreditBlocked = isAntiCheatCreditBlocked;
  }
})();

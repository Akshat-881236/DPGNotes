/**
 * DPGNotes Global DPGCoins Unified Policy Engine & Treasury Inflow Handler
 * (dpgcoins-policy-handler.js)
 * 
 * CORE POLICY ENFORCEMENT:
 * 1. Admin Treasury Routing:
 *    - All credits awarded are added to Guest / Contributor Vaults.
 *    - 100% of deducted coins from Guests / Contributors reach Admin's Contributor Account:
 *      its.akshatnetworkhub23@gmail.com
 * 
 * 2. Balance Lifecycle & Thresholds:
 *    - Guest First Visit: 2,000 DPGCoins initial balance in vault wrt Guest ID.
 *    - New Account Creation: 5,000 DPGCoins initial balance.
 *    - Sign In: +1,000 DPGCoins awarded per authenticated session.
 *    - Manual Logout / Expiring Session: -2,500 DPGCoins deducted (routed to Admin Vault).
 *      Allows negative balances.
 *    - Scope Page Visit: -20 DPGCoins per new page visit (routed to Admin Vault).
 *    - Educational PDF & Solution Time Scale: -20 DPGCoins base on entry, plus automated
 *      5-minute gap formula deductions (25, 30, 35, 40... coins) routed to Admin Vault.
 *    - Quiz Attempt Reward: Quizzes started and submitted award from 30 DPGCoins scaled
 *      by 5-question pairs after first 10 questions.
 *    - Negative Threshold: -5,000 DPGCoins limit. Breaching this threshold redirects
 *      User/Guest to earnCoin.html with recovery lockdown session.
 * 
 * Excluded Pages (Bypassed from deductions and negative lockdown):
 * - report.html
 * - earnCoin.html
 * - support / contact pages
 * - admin related pages
 */
(function() {
  "use strict";

  const ADMIN_TREASURY_EMAIL = "its.akshatnetworkhub23@gmail.com";
  const NEGATIVE_THRESHOLD = -5000;
  const COINS_KEY = "dpg_user_coins_balance";
  const GUEST_ID_KEY = "dpg_guest_id";
  const GUEST_INIT_KEY = "dpg_guest_initialized_v2";

  function getApiBase() {
    const fallback = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? "http://localhost:5000"
      : "https://dpgnotes.onrender.com";
    const configured = (typeof window.API_BASE_URL === "string" && window.API_BASE_URL && window.API_BASE_URL !== "undefined")
      ? window.API_BASE_URL
      : fallback;
    return configured.replace(/\/+$/, "");
  }

  // 1. Identify Excluded Pages
  function isExcludedPage() {
    const p = (window.location.pathname || "").toLowerCase();
    return p.includes("report.html") ||
           p.includes("earncoin.html") ||
           p.includes("auth-layer.html") ||
           p.includes("support") ||
           p.includes("contact") ||
           p.includes("admin") ||
           p.includes("legal");
  }

  // 2. Guest & User Identity
  function getGuestId() {
    let gid = localStorage.getItem(GUEST_ID_KEY);
    if (!gid) {
      gid = "guest_" + Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4);
      try { localStorage.setItem(GUEST_ID_KEY, gid); } catch (_) {}
    }
    return gid;
  }

  function getEffectiveUid() {
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

  function isContributor() {
    return Boolean(getEffectiveUid());
  }

  // 3. Vault Balance Management
  function getBalance() {
    try {
      const raw = localStorage.getItem(COINS_KEY);
      if (raw === null || raw === "") {
        // Initialize balance on first visit
        const isUser = isContributor();
        const initialCoins = isUser ? 5000 : 2000;
        localStorage.setItem(COINS_KEY, String(initialCoins));
        if (!isUser) localStorage.setItem(GUEST_INIT_KEY, "true");
        return initialCoins;
      }
      const val = parseInt(raw, 10);
      return isNaN(val) ? 0 : val;
    } catch (_) {
      return 0;
    }
  }

  function setBalance(num) {
    const clean = Math.floor(Number(num) || 0);
    try {
      localStorage.setItem(COINS_KEY, String(clean));
    } catch (_) {}

    // Dispatch update event for open modules and header badges
    window.dispatchEvent(new CustomEvent("dpg-coins-updated", {
      detail: { balance: clean }
    }));

    // Update common balance pill DOM elements if present
    document.querySelectorAll("#dpgUtilityCoinsPill span, #dpgAuthCoinsBal, .dpg-user-coins-val").forEach(el => {
      el.textContent = clean.toLocaleString() + " Coins";
      if (clean < 0) el.style.color = "#f87171";
    });

    // Check negative threshold lockdown
    checkNegativeThreshold(clean);
    return clean;
  }

  // ==========================================================================
  // INDEXEDDB SUBSYSTEMS (dpg_policy_db & dpg_device_db)
  // ==========================================================================

  // 1. Visit Logs DB (4-Hour nominal 20-coin visit deduction interval)
  function openPolicyDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open("dpg_policy_db", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("resource_visit_logs")) {
          db.createObjectStore("resource_visit_logs", { keyPath: "url" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
  }

  // Helper to extract canonical resource identity and uniqueness parameters
  function getCanonicalResourceIdentity() {
    const p = (window.location.pathname || "").toLowerCase();
    const params = new URLSearchParams(window.location.search || "");

    // 1. PDF Educational Resource (dpgnotes-pdf-viewer.html)
    if (p.includes("dpgnotes-pdf-viewer.html")) {
      const pdfUrl = (params.get("pdf") || params.get("file") || params.get("url") || "").trim();
      const docId = (params.get("id") || params.get("docid") || params.get("resourceId") || params.get("resourceID") || "").trim();
      const title = (params.get("title") || "").trim();
      const token = (params.get("token") || params.get("share") || "").trim();

      // Canonical key prioritizes actual targeted PDF URL or Doc ID
      let uniqueIdentifier = pdfUrl || docId || token || title;
      if (!uniqueIdentifier) {
        uniqueIdentifier = window.location.search || "default_pdf";
      }

      return {
        type: "pdf_viewer",
        resourceKey: "pdf::" + (docId ? (docId + "::") : "") + (pdfUrl || uniqueIdentifier),
        resourceName: title || docId || "PDF Educational Resource",
        pdfUrl: pdfUrl,
        docId: docId,
        isEducationalResource: true
      };
    }

    // 2. Assignment Solution (AssignmentSolution/index.html?id=assign_...)
    if (p.includes("assignmentsolution") && !p.includes("generate")) {
      const assignId = (params.get("id") || "").trim();
      const solutionKey = assignId ? ("solution_assign::" + assignId) : ("solution_assign::" + (window.location.search || "default"));
      return {
        type: "assignment_solution",
        resourceKey: solutionKey,
        resourceName: assignId ? `Assignment Solution (${assignId})` : "Assignment Solution",
        solutionId: assignId,
        isEducationalResource: true
      };
    }

    // 3. Practical Solution (PracticalSolution/index.html?id=prac_...)
    if (p.includes("practicalsolution") && !p.includes("generate")) {
      const pracId = (params.get("id") || "").trim();
      const solutionKey = pracId ? ("solution_prac::" + pracId) : ("solution_prac::" + (window.location.search || "default"));
      return {
        type: "practical_solution",
        resourceKey: solutionKey,
        resourceName: pracId ? `Practical Solution (${pracId})` : "Practical Solution",
        solutionId: pracId,
        isEducationalResource: true
      };
    }

    // 4. Standard Scope Pages
    return {
      type: "page_scope",
      resourceKey: "page::" + p,
      resourceName: `Page: ${p}`,
      isEducationalResource: false
    };
  }

  async function checkAndLogNominalVisit(resourceIdentity) {
    const resInfo = resourceIdentity || getCanonicalResourceIdentity();
    const urlKey = resInfo.resourceKey;
    const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
    const db = await openPolicyDB();

    if (!db) {
      // LocalStorage fallback if IndexedDB is unavailable
      try {
        const stored = localStorage.getItem("dpg_visit_" + urlKey);
        const now = Date.now();
        if (stored && (now - parseInt(stored, 10) < FOUR_HOURS_MS)) {
          return false;
        }
        localStorage.setItem("dpg_visit_" + urlKey, String(now));
      } catch (_) {}
      return true;
    }

    return new Promise((resolve) => {
      try {
        const tx = db.transaction("resource_visit_logs", "readwrite");
        const store = tx.objectStore("resource_visit_logs");
        const getReq = store.get(urlKey);
        getReq.onsuccess = () => {
          const record = getReq.result;
          const now = Date.now();
          if (record && record.timestamp && (now - record.timestamp < FOUR_HOURS_MS)) {
            resolve(false); // Visited within past 4 hours, bypass 20-coin deduction
          } else {
            store.put({
              url: urlKey,
              resourceKey: urlKey,
              type: resInfo.type,
              resourceName: resInfo.resourceName,
              pdfUrl: resInfo.pdfUrl || "",
              docId: resInfo.docId || resInfo.solutionId || "",
              timestamp: now
            });
            resolve(true); // First visit or 4-hour window passed, proceed to deduct
          }
        };
        getReq.onerror = () => resolve(true);
      } catch (_) {
        resolve(true);
      }
    });
  }

  // 2. Device Management DB (Session Key Storage & Multi-Device Validation)
  function openDeviceDB() {
    return new Promise((resolve) => {
      if (!window.indexedDB) return resolve(null);
      const req = indexedDB.open("dpg_device_db", 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("session_store")) {
          db.createObjectStore("session_store", { keyPath: "key" });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = () => resolve(null);
    });
  }

  async function getStoredDeviceSession() {
    const db = await openDeviceDB();
    if (!db) {
      try {
        const raw = localStorage.getItem("dpg_device_session");
        return raw ? JSON.parse(raw) : null;
      } catch (_) { return null; }
    }
    return new Promise((resolve) => {
      try {
        const tx = db.transaction("session_store", "readonly");
        const store = tx.objectStore("session_store");
        const req = store.get("current_session");
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (_) {
        resolve(null);
      }
    });
  }

  async function saveDeviceSession(sessionData) {
    const db = await openDeviceDB();
    try {
      localStorage.setItem("dpg_device_session", JSON.stringify(sessionData));
    } catch (_) {}
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction("session_store", "readwrite");
        const store = tx.objectStore("session_store");
        store.put({ key: "current_session", ...sessionData });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (_) {
        resolve(false);
      }
    });
  }

  async function clearStoredDeviceSession() {
    try {
      localStorage.removeItem("dpg_device_session");
    } catch (_) {}
    const db = await openDeviceDB();
    if (!db) return;
    try {
      const tx = db.transaction("session_store", "readwrite");
      tx.objectStore("session_store").delete("current_session");
    } catch (_) {}
  }

  function getClientDeviceInfo() {
    let deviceId = localStorage.getItem("dpg_device_id");
    if (!deviceId) {
      deviceId = "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);
      try { localStorage.setItem("dpg_device_id", deviceId); } catch (_) {}
    }

    const ua = navigator.userAgent || "";
    let type = "Desktop";
    if (/tablet|ipad|playbook|silk/i.test(ua)) {
      type = "Tablet";
    } else if (/mobile|iphone|ipod|android|blackberry|iemobile|kindle/i.test(ua)) {
      type = "Mobile";
    }

    let os = "Unknown OS";
    if (/windows/i.test(ua)) os = "Windows PC";
    else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
    else if (/linux/i.test(ua)) os = "Linux";

    let browser = "Browser";
    if (/chrome|crios/i.test(ua) && !/edge|opr\//i.test(ua)) browser = "Chrome";
    else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua)) browser = "Safari";
    else if (/edge|edg/i.test(ua)) browser = "Edge";
    else if (/opr\//i.test(ua)) browser = "Opera";

    const deviceName = `${os} (${browser})`;
    const geoLocation = Intl.DateTimeFormat().resolvedOptions().timeZone || "India";

    return { deviceId, deviceName, type, geoLocation };
  }

  async function registerCurrentDeviceSession(uid) {
    if (!uid) return;
    const { deviceId, deviceName, type, geoLocation } = getClientDeviceInfo();
    const sessionId = "ses_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 10);

    try {
      const res = await fetch(`${getApiBase()}/api/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          deviceId,
          deviceName,
          type,
          geoLocation,
          sessionId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await saveDeviceSession({
          uid,
          deviceId,
          sessionId: data.sessionId || sessionId,
          timestamp: Date.now()
        });
        return { success: true, deviceId, sessionId: data.sessionId || sessionId };
      }
    } catch (err) {
      console.warn("[DPGNotes Device Manager] Device register notice:", err.message);
    }
    return { success: false };
  }

  async function validateActiveDeviceSession() {
    const uid = getEffectiveUid();
    if (!uid) return;

    const session = await getStoredDeviceSession();
    if (!session || !session.sessionId || session.uid !== uid) {
      // If no session stored yet for logged-in user, auto-register this current device
      await registerCurrentDeviceSession(uid);
      return;
    }

    try {
      const res = await fetch(`${getApiBase()}/api/devices/validate-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          deviceId: session.deviceId,
          sessionId: session.sessionId
        })
      });
      const data = await res.json().catch(() => ({}));
      if (data && data.valid === false) {
        console.warn("[DPGNotes Device Manager] Device session revoked from another device. Purging session...");
        await clearStoredDeviceSession();
        localStorage.removeItem("dpgActiveUserUid");
        localStorage.removeItem("dpgActiveUser");
        sessionStorage.clear();
        alert("Your session on this device has been revoked from another device. Please sign in again.");
        window.location.replace("/index.html?action=signIn");
      }
    } catch (err) {
      console.warn("[DPGNotes Device Manager] Validation heartbeat notice:", err.message);
    }
  }

  // 4. Negative Threshold (-5,000 DPGCoins) Lockdown Redirection
  async function checkNegativeThreshold(currentBal) {
    if (isExcludedPage()) return;
    if (sessionStorage.getItem("dpg_recovery_cleared") === "true") return;
    const bal = currentBal !== undefined ? currentBal : getBalance();

    if (bal < NEGATIVE_THRESHOLD) {
      if (window.__dpgRedirectingToRecovery) return;
      window.__dpgRedirectingToRecovery = true;
      console.warn(`[DPGCoins Policy] Negative threshold breached (${bal} < ${NEGATIVE_THRESHOLD}). Redirecting to Recovery Center...`);
      
      const uid = getEffectiveUid();
      const guestId = getGuestId();
      let sessionId = "rec_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
      
      try {
        const resp = await fetch(`${getApiBase()}/api/coins/create-recovery-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: uid || null,
            guestId: uid ? null : guestId,
            sessionId: sessionId
          })
        });
        const d = await resp.json().catch(() => ({}));
        if (d && d.sessionId) sessionId = d.sessionId;
      } catch (e) {
        console.warn("[DPGCoins Policy] Recovery session creation notice:", e);
      }

      const idParam = uid ? `contributor-id=${encodeURIComponent(uid)}` : `guest-id=${encodeURIComponent(guestId)}`;
      const destination = window.location.pathname + window.location.search + window.location.hash;
      const targetUrl = `/earnCoin.html?session-id=${encodeURIComponent(sessionId)}&${idParam}&go-to=${encodeURIComponent(destination)}`;
      
      if (window.location.replace) {
        window.location.replace(targetUrl);
      } else {
        window.location.href = targetUrl;
      }
    }
  }

  // 5. Backend Policy Operations (Deduct & Inflow to Admin / Award to User)
  async function deductPolicyCoins(amount, reason, meta = {}) {
    const deductAmt = Math.max(1, Math.floor(Number(amount) || 20));
    const uid = getEffectiveUid();
    const guestId = getGuestId();

    // Optimistically update client vault (allows negative balance)
    const oldBal = getBalance();
    const newBal = setBalance(oldBal - deductAmt);

    try {
      const res = await fetch(`${getApiBase()}/api/coins/policy-deduct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: uid || null,
          guestId: uid ? null : guestId,
          amount: deductAmt,
          reason: reason || "DPGNotes Platform Policy Deduction",
          page: window.location.pathname || "/",
          meta: meta || {}
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && typeof data.newBalance === "number") {
        setBalance(data.newBalance);
        return { success: true, balance: data.newBalance };
      }
    } catch (err) {
      console.warn("[DPGCoins Policy] Deduct sync notice:", err.message);
    }
    return { success: true, balance: newBal };
  }

  async function awardPolicyCoins(amount, reason, action = "policy_award", meta = {}) {
    const awardAmt = Math.max(1, Math.floor(Number(amount) || 0));
    const uid = getEffectiveUid();
    const guestId = getGuestId();

    const oldBal = getBalance();
    const newBal = setBalance(oldBal + awardAmt);

    try {
      const res = await fetch(`${getApiBase()}/api/coins/policy-award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: uid || null,
          guestId: uid ? null : guestId,
          amount: awardAmt,
          reason: reason || `DPGCoins Awarded (+${awardAmt.toLocaleString()} Coins)`,
          action: action,
          meta: meta || {}
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data && typeof data.newBalance === "number") {
        setBalance(data.newBalance);
        return { success: true, balance: data.newBalance };
      }
    } catch (err) {
      console.warn("[DPGCoins Policy] Award sync notice:", err.message);
    }
    return { success: true, balance: newBal };
  }

  // 6. Automated Page Visit Deduction (-20 DPGCoins tracked via IndexedDB 4-Hour interval)
  async function initPageVisitDeduction() {
    if (isExcludedPage()) return;
    const resInfo = getCanonicalResourceIdentity();
    
    // Deduct only once per navigation and only if 4 hours have elapsed for this specific resource
    if (!window.__dpgPageVisitDeducted) {
      window.__dpgPageVisitDeducted = true;
      const shouldDeduct = await checkAndLogNominalVisit(resInfo);
      if (shouldDeduct) {
        deductPolicyCoins(20, `${resInfo.resourceName} Access Fee (4h Interval)`, {
          resourceType: resInfo.type,
          resourceKey: resInfo.resourceKey,
          pdfUrl: resInfo.pdfUrl || "",
          docId: resInfo.docId || resInfo.solutionId || ""
        });
        showPolicyToast(`📖 ${resInfo.resourceName}: -20 DPGCoins access fee`, "#f59e0b");
      } else {
        console.log(`[DPGCoins Policy] 20-coin fee bypassed (Visited within 4 hours: ${resInfo.resourceKey})`);
      }
    }
  }

  // 7. Automated Time-Spent Deduction for PDF Viewer & Solutions (5-Minute Scale)
  function initResourceTimeScaleTracking() {
    if (isExcludedPage()) return;
    const resInfo = getCanonicalResourceIdentity();
    if (!resInfo.isEducationalResource) return;

    const resourceType = resInfo.resourceName;

    // Time-based reading milestones (5-Minute intervals: 25, 30, 35, 40... coins)
    // Note: The base entry fee (-20) is unified and handled by initPageVisitDeduction above.
    let intervalCount = 0;
    setInterval(() => {
      intervalCount++;
      // Formula: 20 base + (intervalCount * 5) coins: 5min->25, 10min->30, 15min->35, 20min->40...
      const deduction = 20 + (intervalCount * 5);
      deductPolicyCoins(deduction, `Time-Scale Reading: ${resourceType} (${intervalCount * 5} Min Milestone)`, {
        resourceType: resInfo.type,
        resourceKey: resInfo.resourceKey,
        intervalMinutes: intervalCount * 5,
        intervalCount
      });

      // Toast notification of milestone deduction
      showPolicyToast(`⏳ ${resourceType} Milestone (${intervalCount * 5} min): -${deduction} DPGCoins`, "#f59e0b");
    }, 5 * 60 * 1000);
  }

  // 8. Quiz Attempt Reward Formula Calculation
  function calculateQuizReward(questionCount) {
    const q = Math.max(1, parseInt(questionCount, 10) || 10);
    if (q <= 10) return 30;

    const extra = q - 10;
    const brackets = Math.ceil(extra / 5);
    let total = 30;
    for (let i = 1; i <= brackets; i++) {
      total += (10 + (i * 5));
    }
    return total;
  }

  // 9. Sign-In & Logout Interceptors
  function initAuthLifecycleInterceptors() {
    // Validate active device session heartbeat
    validateActiveDeviceSession().catch(() => {});

    // Manual Logout / Explicit Session Termination (-1,500 DPGCoins strictly to Admin Vault)
    // Automated session expiry NEVER triggers this deduction.
    const executeLogoutDeduction = () => {
      if (sessionStorage.getItem("dpg_logout_deducted")) return;
      sessionStorage.setItem("dpg_logout_deducted", "true");
      deductPolicyCoins(1500, "Manual Logout Action (-1,500 DPGCoins)");
    };

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#logoutBtn, .logout-btn, [data-action='logout'], .nav-logout-btn, button[onclick*='logout']");
      if (btn) {
        executeLogoutDeduction();
      }
    }, true);

    if (typeof window.logoutUser === "function") {
      const origLogout = window.logoutUser;
      window.logoutUser = async function(...args) {
        executeLogoutDeduction();
        return origLogout.apply(this, args);
      };
    }
  }

  // 10. Lightweight Toast UI for Policy Feedback
  function showPolicyToast(text, color = "#10b981") {
    try {
      let toast = document.getElementById("dpgPolicyToast");
      if (!toast) {
        toast = document.createElement("div");
        toast.id = "dpgPolicyToast";
        toast.style.cssText = `
          position: fixed; bottom: 20px; right: 20px; z-index: 2147483640;
          background: rgba(15, 23, 42, 0.94); border: 1px solid rgba(255, 255, 255, 0.15);
          color: #f8fafc; padding: 10px 16px; border-radius: 12px; font-size: 0.82rem;
          font-weight: 600; display: flex; align-items: center; gap: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.4); backdrop-filter: blur(8px);
          transition: transform 0.25s ease, opacity 0.25s ease; opacity: 0; transform: translateY(10px);
        `;
        document.body.appendChild(toast);
      }
      toast.innerHTML = `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${color};"></span><span>${text}</span>`;
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
      });
      clearTimeout(window.__dpgToastTimeout);
      window.__dpgToastTimeout = setTimeout(() => {
        if (toast) {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(10px)";
        }
      }, 3500);
    } catch (_) {}
  }

  // 11. Initial Run & Global API Export
  function initPolicy() {
    // 1. Ensure Guest ID & first-visit 2,000 balance
    const currentBal = getBalance();
    
    // 2. Check negative threshold lockdown
    checkNegativeThreshold(currentBal);

    // 3. Page Visit deduction (4-hour interval tracked via IndexedDB)
    initPageVisitDeduction();

    // 4. Time-spent deduction for resources/solutions
    initResourceTimeScaleTracking();

    // 5. Auth lifecycle interceptors
    initAuthLifecycleInterceptors();
  }

  window.DPGCoinsPolicy = {
    ADMIN_TREASURY_EMAIL,
    NEGATIVE_THRESHOLD,
    getBalance,
    setBalance,
    getGuestId,
    getEffectiveUid,
    isExcludedPage,
    checkNegativeThreshold,
    deductPolicyCoins,
    awardPolicyCoins,
    calculateQuizReward,
    // Explicit Sign-In action reward (+1,000 DPGCoins) & device session registration
    recordSignInReward: async function(uid) {
      const targetUid = uid || getEffectiveUid();
      if (!targetUid) return;
      const key = "dpg_signin_awarded_" + targetUid + "_" + new Date().toDateString();
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "true");
      await awardPolicyCoins(1000, "Contributor Sign-In Bonus (+1,000 DPGCoins)", "signin_bonus");
      showPolicyToast("🪙 Welcome! +1,000 DPGCoins credited to your vault on Sign-In.", "#10b981");
      await registerCurrentDeviceSession(targetUid);
    },
    // Explicit manual logout execution (-1,500 DPGCoins)
    executeLogoutDeduction: function() {
      if (sessionStorage.getItem("dpg_logout_deducted")) return;
      sessionStorage.setItem("dpg_logout_deducted", "true");
      deductPolicyCoins(1500, "Manual Logout Action (-1,500 DPGCoins)");
    },
    getClientDeviceInfo,
    registerCurrentDeviceSession,
    validateActiveDeviceSession,
    getStoredDeviceSession,
    clearStoredDeviceSession,
    onQuizStarted: function(quizId) {
      sessionStorage.setItem("dpg_active_quiz_id", String(quizId || ""));
      sessionStorage.setItem("dpg_active_quiz_start", String(Date.now()));
    },
    onQuizSubmitted: async function(quizData, qCount) {
      const count = parseInt(qCount, 10) || (quizData?.questions?.length) || 10;
      const coins = calculateQuizReward(count);
      const title = quizData?.title || "Academic Assessment";
      await awardPolicyCoins(coins, `Quiz Successfully Completed: ${title} (${count} Questions)`, "quiz_submission_reward", {
        quizId: quizData?.quizId || quizData?.id || "",
        questionCount: count
      });
      showPolicyToast(`🎉 Assessment Submitted! +${coins.toLocaleString()} DPGCoins credited to your vault.`, "#10b981");
      return coins;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initPolicy);
  } else {
    initPolicy();
  }
})();

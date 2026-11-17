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

  // 4. Negative Threshold (-5,000 DPGCoins) Lockdown Redirection
  function checkNegativeThreshold(currentBal) {
    if (isExcludedPage()) return;
    if (sessionStorage.getItem("dpg_recovery_cleared") === "true") return;
    const bal = currentBal !== undefined ? currentBal : getBalance();

    if (bal < NEGATIVE_THRESHOLD) {
      console.warn(`[DPGCoins Policy] Negative threshold breached (${bal} < ${NEGATIVE_THRESHOLD}). Redirecting to Recovery Center...`);
      const sessionId = "ses_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
      const uid = getEffectiveUid();
      const guestId = getGuestId();
      const idParam = uid ? `contributor-id=${encodeURIComponent(uid)}` : `guest-id=${encodeURIComponent(guestId)}`;
      const destination = window.location.pathname + window.location.search + window.location.hash;
      const targetUrl = `/earnCoin.html?session-id=${sessionId}&${idParam}&go-to=${encodeURIComponent(destination)}`;
      
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

  // 6. Automated Page Visit Deduction (-20 DPGCoins)
  function initPageVisitDeduction() {
    if (isExcludedPage()) return;
    const pagePath = window.location.pathname || "/";
    const navKey = "dpg_nav_" + pagePath + "_" + window.location.search;
    // Strictly deduct 20 coins once per distinct navigation
    if (!window.__dpgPageVisitDeducted) {
      window.__dpgPageVisitDeducted = true;
      deductPolicyCoins(20, `Page Visit Scope: ${pagePath}`);
    }
  }

  // 7. Automated Time-Spent Deduction for PDF Viewer & Solutions (5-Minute Scale)
  function initResourceTimeScaleTracking() {
    if (isExcludedPage()) return;
    const p = (window.location.pathname || "").toLowerCase();
    const isPdfViewer = p.includes("dpgnotes-pdf-viewer.html");
    const isAssignment = p.includes("assignmentsolution") && !p.includes("generate");
    const isPractical = p.includes("practicalsolution") && !p.includes("generate");

    if (!isPdfViewer && !isAssignment && !isPractical) return;

    const resourceType = isPdfViewer ? "PDF Educational Resource" : (isAssignment ? "Assignment Solution" : "Practical Solution");
    
    // Strict Base Entry Deduction (starts from 20 DPGCoins)
    deductPolicyCoins(20, `Resource Reading Access: ${resourceType} Initial Viewing`);
    showPolicyToast(`📖 ${resourceType}: -20 DPGCoins base reading fee`, "#f59e0b");

    let intervalCount = 0;
    // 5-Minute Gap Automated Timer (300,000 ms)
    setInterval(() => {
      intervalCount++;
      // Formula: 20 base + (intervalCount * 5) coins: 5min->25, 10min->30, 15min->35, 20min->40...
      const deduction = 20 + (intervalCount * 5);
      deductPolicyCoins(deduction, `Time-Scale Reading: ${resourceType} (${intervalCount * 5} Min Milestone)`, {
        resourceType,
        intervalMinutes: intervalCount * 5,
        intervalCount
      });

      // Toast notification of milestone deduction
      showPolicyToast(`⏳ ${resourceType} Milestone (${intervalCount * 5} min): -${deduction} DPGCoins`, "#f59e0b");
    }, 5 * 60 * 1000);
  }

  // 8. Quiz Attempt Reward Formula Calculation
  // Base 30 DPGCoins for <= 10 questions. Scaled by 5-question pairs after first 10 questions:
  // 1-10 Qs: 30 Coins | 11-15: 45 | 16-20: 65 | 21-25: 90 | 26-30: 120 | 31+: +30 per 5 Qs
  function calculateQuizReward(questionCount) {
    const q = Math.max(1, parseInt(questionCount, 10) || 10);
    if (q <= 10) return 30;

    const extra = q - 10;
    const brackets = Math.ceil(extra / 5);
    // Cumulative brackets: +15, +20, +25, +30...
    let total = 30;
    for (let i = 1; i <= brackets; i++) {
      total += (10 + (i * 5));
    }
    return total;
  }

  // 9. Sign-In & Logout / Session Expiry Interceptors
  function initAuthLifecycleInterceptors() {
    const uid = getEffectiveUid();

    // Sign In Award (+1,000 DPGCoins once per authenticated session)
    if (uid) {
      const signinSessionKey = "dpg_signin_reward_" + uid;
      if (!sessionStorage.getItem(signinSessionKey)) {
        sessionStorage.setItem(signinSessionKey, "true");
        awardPolicyCoins(1000, "Daily Authenticated Contributor Sign-In Bonus (+1,000 DPGCoins)", "signin_bonus");
        showPolicyToast("🪙 Welcome Back! +1,000 DPGCoins credited to your vault.", "#10b981");
      }
    }

    // Manual Logout / Expiring Session Interception (-2,500 DPGCoins strictly to Admin Vault)
    const executeLogoutDeduction = () => {
      deductPolicyCoins(2500, "Manual Logout / Session Concluded (-2,500 DPGCoins)");
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

    // 3. Page Visit deduction
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

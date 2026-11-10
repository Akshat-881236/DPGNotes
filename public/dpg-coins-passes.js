/**
 * DPGNotes Unified DPG Coins Pass & Instant 1-Click Upgrade Engine
 * Handles Utilities Passes (1-Day Unlimited, 1-Mo Blaze, 1-Mo Pro)
 * and Academic / Guest Quota Passes (1-Day Full Access, 15-Days Access).
 */
(function () {
  "use strict";

  const COINS_STORAGE_KEY = "dpg_user_coins_balance";
  const PASSES_STORAGE_KEY = "dpg_active_passes";

  const PASS_CATALOG = {
    utilities_1d: {
      id: "utilities_1d",
      category: "utilities",
      name: "1-Day Utilities Unlimited",
      shortName: "1-Day Unlimited",
      desc: "24 Hours unlimited runs across all 5 DPGNotes utility tools",
      cost: 650,
      durationMs: 24 * 60 * 60 * 1000,
      icon: "ri-flashlight-fill",
      accent: "#f59e0b"
    },
    utilities_blaze: {
      id: "utilities_blaze",
      category: "utilities",
      name: "1-Month Blaze Tier",
      shortName: "1-Mo Blaze",
      desc: "30 Days unlimited usage across all 5 utility tools",
      cost: 2500,
      durationMs: 30 * 24 * 60 * 60 * 1000,
      icon: "ri-fire-fill",
      accent: "#fb7185"
    },
    utilities_pro: {
      id: "utilities_pro",
      category: "utilities",
      name: "1-Month Pro Tier",
      shortName: "1-Mo Pro",
      desc: "30 Days unlimited utilities + full academic & guest quota unlock",
      cost: 4500,
      durationMs: 30 * 24 * 60 * 60 * 1000,
      icon: "ri-vip-crown-2-fill",
      accent: "#a855f7",
      unlocksBoth: true
    },
    access_1d: {
      id: "access_1d",
      category: "access",
      name: "1-Day Full Academic Access",
      shortName: "1-Day Full Access",
      desc: "24 Hours unlimited notes, PDFs, papers & guest reading access",
      cost: 500,
      durationMs: 24 * 60 * 60 * 1000,
      icon: "ri-shield-keyhole-fill",
      accent: "#10b981"
    },
    access_15d: {
      id: "access_15d",
      category: "access",
      name: "15-Days Full Access",
      shortName: "15-Days Access",
      desc: "15 Days uninterrupted full access across all DPGNotes resources",
      cost: 10500,
      durationMs: 15 * 24 * 60 * 60 * 1000,
      icon: "ri-vip-diamond-fill",
      accent: "#38bdf8"
    }
  };

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
    } catch (e) {}
    return "";
  }

  function getCoinsBalance() {
    try {
      const val = parseInt(localStorage.getItem(COINS_STORAGE_KEY) || "0", 10);
      return isNaN(val) || val < 0 ? 0 : val;
    } catch (e) {
      return 0;
    }
  }

  function setCoinsBalance(val) {
    const clean = Math.max(0, Math.floor(Number(val) || 0));
    try {
      localStorage.setItem(COINS_STORAGE_KEY, String(clean));
    } catch (e) {}
    return clean;
  }

  function getActivePasses() {
    const now = Date.now();
    try {
      const raw = localStorage.getItem(PASSES_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw) || {};
      const cleaned = {};
      if (parsed.utilities && Number(parsed.utilities.expiresAt) > now) {
        cleaned.utilities = parsed.utilities;
      }
      if (parsed.access && Number(parsed.access.expiresAt) > now) {
        cleaned.access = parsed.access;
      }
      if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
        localStorage.setItem(PASSES_STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch (e) {
      return {};
    }
  }

  function saveActivePasses(passesObj) {
    try {
      localStorage.setItem(PASSES_STORAGE_KEY, JSON.stringify(passesObj || {}));
    } catch (e) {}
  }

  function hasUnlimitedUtilitiesPass() {
    const passes = getActivePasses();
    const u = passes.utilities;
    if (u && Number(u.expiresAt) > Date.now()) return u;
    return null;
  }

  function hasUnlimitedAccessPass() {
    const passes = getActivePasses();
    const now = Date.now();
    if (passes.access && Number(passes.access.expiresAt) > now) return passes.access;
    if (passes.utilities && passes.utilities.passId === "utilities_pro" && Number(passes.utilities.expiresAt) > now) {
      return passes.utilities;
    }
    return null;
  }

  function clearGuestQuotaLockFlags() {
    try {
      localStorage.removeItem("dpg_quota_locked");
      sessionStorage.removeItem("dpg_quota_locked");
      document.cookie = "dpg_quota_locked=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      localStorage.setItem("dpg_quota_visits", "0");
      localStorage.setItem("dpg_quota_pdfs", "0");
    } catch (e) {}
  }

  function formatExpiry(ts) {
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Active";
    }
  }

  async function syncFromCloud(explicitUid) {
    const uid = explicitUid || getActiveUid();
    if (!uid) return null;
    try {
      const res = await fetch(`${getApiBase()}/api/coins/status?uid=${encodeURIComponent(uid)}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.success) return null;

      const localUpdatedAt = parseInt(localStorage.getItem("dpg_coins_local_updated_at") || "0", 10);
      const cloudDebitAt = typeof data.coinsLastDebitAt === "number" ? data.coinsLastDebitAt : 0;
      const localBal = getCoinsBalance();
      const cloudBal = typeof data.dpgCoins === "number" ? data.dpgCoins : 0;

      const resolvedBal = cloudDebitAt > localUpdatedAt ? cloudBal : Math.max(localBal, cloudBal);
      setCoinsBalance(resolvedBal);

      if (data.activePasses && typeof data.activePasses === "object") {
        const current = getActivePasses();
        const merged = { ...current };
        const now = Date.now();
        ["utilities", "access"].forEach((slot) => {
          const cp = data.activePasses[slot];
          if (cp && Number(cp.expiresAt) > now) {
            if (!merged[slot] || Number(cp.expiresAt) > Number(merged[slot].expiresAt)) {
              merged[slot] = cp;
            }
          }
        });
        saveActivePasses(merged);
      }

      window.dispatchEvent(new CustomEvent("dpg-coins-pass-updated", {
        detail: { balance: resolvedBal, activePasses: getActivePasses() }
      }));
      return { balance: resolvedBal, activePasses: getActivePasses() };
    } catch (e) {
      return null;
    }
  }

  async function redeemPass(passId) {
    const pass = PASS_CATALOG[passId];
    if (!pass) {
      throw new Error("Selected pass tier was not found.");
    }

    const uid = getActiveUid();
    const localCoins = getCoinsBalance();

    if (uid) {
      const res = await fetch(`${getApiBase()}/api/coins/redeem-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, passId, localCoins })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to complete pass upgrade right now.");
      }

      const newBalance = setCoinsBalance(data.newCoinsBalance);
      localStorage.setItem("dpg_coins_local_updated_at", String(Date.now()));
      const mergedPasses = { ...getActivePasses(), ...(data.activePasses || {}) };
      saveActivePasses(mergedPasses);
      if (pass.category === "access" || pass.unlocksBoth) {
        clearGuestQuotaLockFlags();
      }
      window.dispatchEvent(new CustomEvent("dpg-coins-pass-updated", {
        detail: { balance: newBalance, activePasses: mergedPasses, pass }
      }));
      return { success: true, newBalance, activePasses: mergedPasses, pass };
    }

    // Guest local device redemption
    if (localCoins < pass.cost) {
      const shortage = pass.cost - localCoins;
      throw new Error(`Insufficient DPG Coins (${localCoins.toLocaleString()} available, ${shortage.toLocaleString()} more needed). Answer public quizzes in Study Hub to earn more!`);
    }

    const now = Date.now();
    const expiresAt = now + pass.durationMs;
    const passEntry = {
      passId: pass.id,
      name: pass.name,
      shortName: pass.shortName,
      category: pass.category,
      cost: pass.cost,
      redeemedAt: now,
      expiresAt
    };

    const currentPasses = getActivePasses();
    if (pass.category === "utilities") {
      currentPasses.utilities = passEntry;
    }
    if (pass.category === "access" || pass.unlocksBoth) {
      currentPasses.access = passEntry;
    }

    const newBalance = setCoinsBalance(localCoins - pass.cost);
    localStorage.setItem("dpg_coins_local_updated_at", String(now));
    saveActivePasses(currentPasses);

    if (pass.category === "access" || pass.unlocksBoth) {
      clearGuestQuotaLockFlags();
      const guestId = localStorage.getItem("dpg_guest_id") || "guest_anon";
      fetch(`${getApiBase()}/api/guest-quota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId,
          action: "unlock_pass",
          passId: pass.id,
          passExpiresAt: expiresAt
        })
      }).catch(() => {});
    }

    window.dispatchEvent(new CustomEvent("dpg-coins-pass-updated", {
      detail: { balance: newBalance, activePasses: currentPasses, pass }
    }));

    return { success: true, newBalance, activePasses: currentPasses, pass };
  }

  function getStudyHubQuizHref() {
    if (window.location.pathname.toLowerCase().includes("study-hub.html")) {
      return "#simQuizTitle";
    }
    return "/study-hub.html";
  }

  function injectModalStyles() {
    if (document.getElementById("dpgCoinsPassesStyles")) return;
    const style = document.createElement("style");
    style.id = "dpgCoinsPassesStyles";
    style.textContent = `
      .dpg-cp-overlay {
        position: fixed;
        inset: 0;
        z-index: 2147483645;
        background: rgba(6, 10, 22, 0.82);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
        opacity: 0;
        transition: opacity 0.22s ease;
      }
      .dpg-cp-overlay.active { opacity: 1; }
      .dpg-cp-dialog {
        position: relative;
        width: 100%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 22px;
        padding: 1.5rem;
        color: #f8fafc;
        font-family: 'Outfit', 'Inter', system-ui, sans-serif;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
      }
      .dpg-cp-close {
        position: absolute;
        top: 14px;
        right: 14px;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.14);
        color: #94a3b8;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
      }
      .dpg-cp-close:hover { color: #ffffff; background: rgba(239, 68, 68, 0.22); }
      .dpg-cp-bal-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.32);
        border-radius: 14px;
        padding: 0.85rem 1rem;
        margin: 1rem 0;
      }
      .dpg-cp-tier-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 1rem;
      }
      .dpg-cp-tier-row {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        padding: 0.85rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        text-align: left;
      }
      .dpg-cp-upgrade-btn {
        background: linear-gradient(135deg, #f59e0b, #d97706);
        border: none;
        color: #ffffff;
        padding: 0.55rem 0.95rem;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.82rem;
        cursor: pointer;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.28);
        transition: transform 0.16s ease, opacity 0.16s ease;
      }
      .dpg-cp-upgrade-btn:hover:not(:disabled) { transform: translateY(-1px); }
      .dpg-cp-upgrade-btn:disabled {
        background: rgba(148, 163, 184, 0.16);
        color: #94a3b8;
        box-shadow: none;
        cursor: not-allowed;
      }
      .dpg-cp-active-tag {
        background: rgba(16, 185, 129, 0.16);
        border: 1px solid rgba(16, 185, 129, 0.35);
        color: #34d399;
        padding: 0.42rem 0.8rem;
        border-radius: 10px;
        font-weight: 700;
        font-size: 0.78rem;
        white-space: nowrap;
      }
      html[data-theme="light"] .dpg-cp-dialog {
        background: #ffffff;
        border-color: #cbd5e1;
        color: #0f172a;
      }
      html[data-theme="light"] .dpg-cp-tier-row {
        background: #f8fafc;
        border-color: #e2e8f0;
      }
      html[data-theme="light"] .dpg-cp-close {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #475569;
      }
    `;
    document.head.appendChild(style);
  }

  function getPassesByCategory(category) {
    if (category === "utilities") {
      return [PASS_CATALOG.utilities_1d, PASS_CATALOG.utilities_blaze, PASS_CATALOG.utilities_pro];
    }
    if (category === "access") {
      return [PASS_CATALOG.access_1d, PASS_CATALOG.access_15d, PASS_CATALOG.utilities_pro];
    }
    return Object.values(PASS_CATALOG);
  }

  function closeUpgradeModal() {
    const existing = document.getElementById("dpgCoinsUpgradeModal");
    if (!existing) return;
    existing.classList.remove("active");
    setTimeout(() => existing.remove(), 220);
  }

  function openUpgradeModal(category = "utilities", onSuccess = null) {
    injectModalStyles();
    closeUpgradeModal();

    const passes = getPassesByCategory(category);
    const bal = getCoinsBalance();
    const activePasses = getActivePasses();
    const activePass = category === "access" ? hasUnlimitedAccessPass() : hasUnlimitedUtilitiesPass();

    const overlay = document.createElement("div");
    overlay.id = "dpgCoinsUpgradeModal";
    overlay.className = "dpg-cp-overlay";
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeUpgradeModal();
    });

    const rowsHtml = passes.map((p) => {
      const canAfford = bal >= p.cost;
      const isCurrentActive = activePass && activePass.passId === p.id;
      return `
        <div class="dpg-cp-tier-row">
          <div style="flex:1 1 200px; min-width:0;">
            <div style="font-weight:700; font-size:0.94rem; display:flex; align-items:center; gap:6px;">
              <i class="${p.icon}" style="color:${p.accent};"></i>
              <span>${p.name}</span>
            </div>
            <div style="font-size:0.77rem; color:#94a3b8; margin-top:2px;">${p.desc}</div>
          </div>
          ${isCurrentActive ? `
            <span class="dpg-cp-active-tag"><i class="ri-checkbox-circle-fill"></i> Active (${formatExpiry(activePass.expiresAt)})</span>
          ` : `
            <button type="button" class="dpg-cp-upgrade-btn" data-dpg-redeem="${p.id}" ${!canAfford ? 'title="Insufficient coins — earn in Study Hub"' : ""}>
              <i class="ri-copper-coin-fill"></i> ${p.cost.toLocaleString()} Coins
            </button>
          `}
        </div>
      `;
    }).join("");

    const heading = category === "access" ? "Unlock Full Platform Access" : "Upgrade Utilities with DPG Coins";
    const subheading = category === "access"
      ? "Redeem coins for instant, uninterrupted academic & PDF reading access"
      : "Unlock unlimited usage across Image to PDF, Metadata Tools & Cover Page Generators";

    overlay.innerHTML = `
      <div class="dpg-cp-dialog">
        <button type="button" class="dpg-cp-close" id="dpgCpCloseBtn" aria-label="Close"><i class="ri-close-line"></i></button>
        <div style="text-align:center;">
          <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:1.5rem; margin-bottom:0.6rem; box-shadow:0 6px 18px rgba(245,158,11,0.35);">
            <i class="ri-copper-coin-fill"></i>
          </div>
          <h3 style="font-size:1.25rem; font-weight:800; margin:0 0 0.25rem 0;">${heading}</h3>
          <p style="font-size:0.82rem; color:#94a3b8; margin:0;">${subheading}</p>
        </div>

        <div class="dpg-cp-bal-bar">
          <div>
            <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:#f59e0b; font-weight:700;">Your Balance</div>
            <div style="font-size:1.45rem; font-weight:800; color:#f59e0b;">${bal.toLocaleString()} <span style="font-size:0.82rem; color:#94a3b8; font-weight:600;">DPGCoins</span></div>
          </div>
          <a href="${getStudyHubQuizHref()}" style="font-size:0.78rem; font-weight:700; color:#818cf8; text-decoration:none; background:rgba(99,102,241,0.14); border:1px solid rgba(99,102,241,0.3); padding:0.42rem 0.78rem; border-radius:999px;">
            <i class="ri-gamepad-line"></i> Earn Coins
          </a>
        </div>

        ${activePass ? `
          <div style="margin-bottom:0.85rem; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); border-radius:10px; padding:0.65rem 0.85rem; font-size:0.8rem; color:#34d399; display:flex; align-items:center; gap:8px;">
            <i class="ri-shield-check-fill" style="font-size:1.1rem;"></i>
            <span><strong>${activePass.name}</strong> active until ${formatExpiry(activePass.expiresAt)}</span>
          </div>
        ` : ""}

        <div class="dpg-cp-tier-list">${rowsHtml}</div>

        <div id="dpgCpStatusMsg" style="display:none; padding:0.65rem 0.85rem; border-radius:10px; font-size:0.82rem; margin-bottom:0.85rem;"></div>

        <button type="button" id="dpgCpCancelBtn" style="width:100%; padding:0.7rem; border-radius:10px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.14); color:#cbd5e1; font-weight:600; cursor:pointer;">Close</button>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("active"));

    overlay.querySelector("#dpgCpCloseBtn").onclick = closeUpgradeModal;
    overlay.querySelector("#dpgCpCancelBtn").onclick = closeUpgradeModal;

    overlay.querySelectorAll("[data-dpg-redeem]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const pid = btn.getAttribute("data-dpg-redeem");
        const msgEl = overlay.querySelector("#dpgCpStatusMsg");
        const origHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Upgrading...';
        if (msgEl) msgEl.style.display = "none";

        try {
          const result = await redeemPass(pid);
          if (msgEl) {
            msgEl.style.display = "block";
            msgEl.style.background = "rgba(16,185,129,0.15)";
            msgEl.style.border = "1px solid rgba(16,185,129,0.35)";
            msgEl.style.color = "#34d399";
            msgEl.innerHTML = `<strong>Upgraded!</strong> ${result.pass.name} is now active. Remaining balance: ${result.newBalance.toLocaleString()} DPGCoins.`;
          }
          setTimeout(() => {
            closeUpgradeModal();
            if (typeof onSuccess === "function") onSuccess(result);
          }, 900);
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = origHtml;
          if (msgEl) {
            msgEl.style.display = "block";
            msgEl.style.background = "rgba(239,68,68,0.15)";
            msgEl.style.border = "1px solid rgba(239,68,68,0.35)";
            msgEl.style.color = "#fca5a5";
            msgEl.textContent = err.message || "Upgrade failed.";
          }
        }
      });
    });
  }

  window.DPGCoinsPasses = {
    PASS_CATALOG,
    getCoinsBalance,
    setCoinsBalance,
    getActivePasses,
    hasUnlimitedUtilitiesPass,
    hasUnlimitedAccessPass,
    clearGuestQuotaLockFlags,
    formatExpiry,
    syncFromCloud,
    redeemPass,
    openUpgradeModal,
    closeUpgradeModal
  };

  // Opportunistically sync active contributor's coins & passes on page load
  const initialUid = getActiveUid();
  if (initialUid) {
    syncFromCloud(initialUid);
  }
})();

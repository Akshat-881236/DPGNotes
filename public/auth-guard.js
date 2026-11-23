/**
 * DPGNotes Global Unified Authentication Guard & Go-To Redirection Handler
 * Automatically manages:
 * 1. Safe capturing and persistence of destination URLs via '?go-to=' / '?goto=' params.
 * 2. Robust loop prevention (no bouncing between index.html and protected pages).
 * 3. Automatic interception of unauthenticated access on protected pages (like dashboard.html).
 * 4. Clean post-login redirection for both index.html and in-page/built-in authentication components.
 */
(function() {
  "use strict";

  // Sanitize destination URL to prevent open-redirects and recursive redirect loops
  function sanitizeDestination(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";

    try {
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.origin !== window.location.origin) {
        return "";
      }

      // Strip auth recursion and redirect parameters
      parsed.searchParams.delete("action");
      parsed.searchParams.delete("auth");
      parsed.searchParams.delete("go-to");
      parsed.searchParams.delete("goto");
      parsed.searchParams.delete("redirect");
      parsed.searchParams.delete("redirect-to");
      parsed.searchParams.delete("returnUrl");
      parsed.searchParams.delete("return_url");
      parsed.searchParams.delete("dest");
      parsed.searchParams.delete("target");
      parsed.searchParams.delete("next");
      parsed.searchParams.delete("continue");

      const pathname = parsed.pathname || "";
      // Reject any login / auth gateway pages as valid post-login destinations
      if (!pathname || pathname === "/" || pathname === "/index.html" || pathname.endsWith("/index.html") || pathname.includes("auth-layer.html") || pathname.includes("admin-login.html")) {
        return "";
      }

      const search = parsed.searchParams.toString();
      return pathname + (search ? "?" + search : "") + (parsed.hash || "");
    } catch (_) {}
    return "";
  }

  // Retrieve destination from query parameter, sessionStorage, or fallback
  function getAuthRedirectTarget(fallback = "/dashboard.html") {
    try {
      const urlP = new URLSearchParams(window.location.search);
      const param = urlP.get("go-to") ||
                    urlP.get("goto") ||
                    urlP.get("redirect") ||
                    urlP.get("redirect-to") ||
                    urlP.get("returnUrl") ||
                    urlP.get("return_url") ||
                    urlP.get("dest") ||
                    urlP.get("target") ||
                    urlP.get("next") ||
                    urlP.get("continue");

      if (param) {
        const sanitized = sanitizeDestination(decodeURIComponent(param));
        if (sanitized) {
          sessionStorage.setItem("dpg_auth_redirect", sanitized);
          return sanitized;
        }
      }

      const stored = sessionStorage.getItem("dpg_auth_redirect") || localStorage.getItem("dpg_auth_redirect");
      if (stored) {
        const sanitized = sanitizeDestination(stored);
        if (sanitized) return sanitized;
      }
    } catch (_) {}

    return fallback;
  }

  function setAuthRedirectTarget(targetUrl) {
    const sanitized = sanitizeDestination(targetUrl || window.location.href);
    if (sanitized) {
      try {
        sessionStorage.setItem("dpg_auth_redirect", sanitized);
      } catch (_) {}
    }
  }

  // Global redirect to index.html with action=signIn and encoded go-to parameter
  function redirectToLogin(customTarget) {
    // If the current page is already index.html or an auth layer, never self-redirect
    const currentPath = window.location.pathname;
    if (currentPath === "/" || currentPath.endsWith("/index.html") || currentPath.includes("auth-layer.html")) {
      return;
    }

    const rawTarget = customTarget || (window.location.pathname + window.location.search + window.location.hash);
    const sanitized = sanitizeDestination(rawTarget) || "/dashboard.html";

    // Loop Breaker: Detect rapid oscillation between protected page and login
    try {
      const lastTs = parseInt(sessionStorage.getItem("dpg_login_redirect_ts") || "0", 10);
      const lastDest = sessionStorage.getItem("dpg_login_redirect_dest") || "";
      const now = Date.now();
      if (now - lastTs < 4000 && lastDest === sanitized) {
        console.warn("[AuthGuard] Infinite redirect loop detected for", sanitized, "- breaking loop!");
        sessionStorage.removeItem("dpg_auth_redirect");
        sessionStorage.removeItem("dpg_login_redirect_dest");
        localStorage.removeItem("dpgActiveUserUid");
        localStorage.removeItem("dpgActiveUser");
        if (window.location.replace) {
          window.location.replace("/index.html?action=signIn");
        } else {
          window.location.href = "/index.html?action=signIn";
        }
        return;
      }
      sessionStorage.setItem("dpg_login_redirect_ts", now.toString());
      sessionStorage.setItem("dpg_login_redirect_dest", sanitized);
    } catch (_) {}

    setAuthRedirectTarget(sanitized);

    const destUrl = "/index.html?action=signIn&go-to=" + encodeURIComponent(sanitized);
    if (window.location.replace) {
      window.location.replace(destUrl);
    } else {
      window.location.href = destUrl;
    }
  }

  // Execute redirection upon successful authentication
  function handleAuthRedirect(user, defaultFallback = "/dashboard.html") {
    // Require active authenticated user before redirecting
    const uid = user ? (user.uid || user) : null;
    if (!uid) {
      console.warn("[AuthGuard] handleAuthRedirect aborted: user is not authenticated.");
      return;
    }

    const target = getAuthRedirectTarget(defaultFallback);
    try {
      sessionStorage.removeItem("dpg_auth_redirect");
      localStorage.removeItem("dpg_auth_redirect");
      sessionStorage.removeItem("dpg_login_redirect_ts");
      sessionStorage.removeItem("dpg_login_redirect_dest");
    } catch (_) {}

    // Credit Sign-In Reward (+1,000 DPGCoins) and register device session on explicit SignIn
    if (window.DPGCoinsPolicy && typeof window.DPGCoinsPolicy.recordSignInReward === "function") {
      try { window.DPGCoinsPolicy.recordSignInReward(uid); } catch (_) {}
    }

    const cleaned = sanitizeDestination(target) || defaultFallback;
    const finalTarget = (cleaned && cleaned !== "/" && !cleaned.includes("index.html")) ? cleaned : defaultFallback;

    // Do not reload if destination matches current page
    const currentLoc = window.location.pathname + window.location.search + window.location.hash;
    if (finalTarget === currentLoc) {
      return;
    }

    if (window.location.replace) {
      window.location.replace(finalTarget);
    } else {
      window.location.href = finalTarget;
    }
  }

  // Auto-record destination if present in current URL
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const rawTarget = urlParams.get("go-to") || urlParams.get("goto");
    if (rawTarget) {
      const clean = sanitizeDestination(decodeURIComponent(rawTarget));
      if (clean) sessionStorage.setItem("dpg_auth_redirect", clean);
    }
  } catch (_) {}

  // Expose global methods
  window.DPGAuthGuard = {
    sanitizeDestination,
    getAuthRedirectTarget,
    setAuthRedirectTarget,
    redirectToLogin,
    handleAuthRedirect
  };

  window.getAuthRedirectTarget = getAuthRedirectTarget;
  window.setAuthRedirectTarget = setAuthRedirectTarget;
  window.redirectToLogin = redirectToLogin;
  window.handleAuthRedirect = handleAuthRedirect;
})();

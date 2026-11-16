/**
 * DPGNotes Global Unified Authentication Guard & Go-To Redirection Handler
 * Automatically manages:
 * 1. Safe capturing and persistence of destination URLs via '?go-to=' / '?goto=' params.
 * 2. Automatic interception of unauthenticated access on protected pages (like dashboard.html).
 * 3. Smooth post-login redirection for both index.html and in-page/built-in authentication components.
 */
(function() {
  "use strict";

  // Safe origin check to prevent open-redirect vulnerabilities
  function sanitizeDestination(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (!trimmed) return "";

    try {
      // Relative path: e.g. /dashboard.html?tab=devToolsTab or AssignmentSolution/index.html?id=...
      if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
        return trimmed;
      }
      const parsed = new URL(trimmed, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return parsed.pathname + parsed.search + parsed.hash;
      }
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
    const target = customTarget || (window.location.pathname + window.location.search + window.location.hash);
    const sanitized = sanitizeDestination(target) || "/dashboard.html";
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
    const target = getAuthRedirectTarget(defaultFallback);
    try {
      sessionStorage.removeItem("dpg_auth_redirect");
      localStorage.removeItem("dpg_auth_redirect");
    } catch (_) {}

    const finalTarget = (target && target !== "/" && !target.includes("index.html")) ? target : defaultFallback;
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

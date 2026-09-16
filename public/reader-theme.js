/**
 * DPGNotes Reader Theme & Contrast Accessibility Engine
 * Manages Light / Dark / Default DPG Midnight Blue themes and dynamic font scaling.
 */
(function() {
  const THEME_KEY = "dpgReaderTheme";
  const FONT_SIZE_KEY = "dpgReaderFontSize";

  // Available themes: 'default' (DPG Blue), 'light' (Paper), 'dark' (OLED)
  let currentTheme = localStorage.getItem(THEME_KEY) || "default";
  let currentFontSize = localStorage.getItem(FONT_SIZE_KEY) || "md";

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    if (document.body) {
      document.body.setAttribute("data-theme", theme);
    }
    localStorage.setItem(THEME_KEY, theme);
    updateControlsUI();
    window.dispatchEvent(new CustomEvent("dpg-theme-changed", { detail: { theme } }));
  }

  function applyFontSize(size) {
    currentFontSize = size;
    document.documentElement.setAttribute("data-font-size", size);
    if (document.body) {
      document.body.setAttribute("data-font-size", size);
    }
    localStorage.setItem(FONT_SIZE_KEY, size);
    updateControlsUI();
    window.dispatchEvent(new CustomEvent("dpg-fontsize-changed", { detail: { size } }));
  }

  window.setReaderTheme = applyTheme;
  window.setReaderFontSize = applyFontSize;

  window.cycleFontSize = function(delta) {
    const sizes = ["sm", "md", "lg", "xl"];
    let idx = sizes.indexOf(currentFontSize);
    if (idx === -1) idx = 1;
    let nextIdx = Math.max(0, Math.min(sizes.length - 1, idx + delta));
    applyFontSize(sizes[nextIdx]);
  };

  function updateControlsUI() {
    document.querySelectorAll(".dpg-rc-theme-btn").forEach(btn => {
      const target = btn.getAttribute("data-target-theme");
      btn.classList.toggle("active", target === currentTheme);
    });
    document.querySelectorAll(".dpg-rc-font-btn").forEach(btn => {
      const target = btn.getAttribute("data-target-size");
      btn.classList.toggle("active", target === currentFontSize);
    });
  }

  function createControlsDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "dpg-reader-controls";
    wrapper.setAttribute("role", "toolbar");
    wrapper.setAttribute("aria-label", "Accessibility and Reading Theme Controls");

    wrapper.innerHTML = `
      <!-- Theme Switchers -->
      <button type="button" class="dpg-rc-btn dpg-rc-theme-btn ${currentTheme === 'default' ? 'active' : ''}" data-target-theme="default" onclick="window.setReaderTheme('default')" title="Default DPGNotes Blue Theme">
        <i class="ri-contrast-2-line"></i> DPG Blue
      </button>
      <button type="button" class="dpg-rc-btn dpg-rc-theme-btn ${currentTheme === 'light' ? 'active' : ''}" data-target-theme="light" onclick="window.setReaderTheme('light')" title="Light High-Contrast Paper Theme">
        <i class="ri-sun-line"></i> Light
      </button>
      <button type="button" class="dpg-rc-btn dpg-rc-theme-btn ${currentTheme === 'dark' ? 'active' : ''}" data-target-theme="dark" onclick="window.setReaderTheme('dark')" title="OLED Pure Dark Contrast Theme">
        <i class="ri-moon-clear-line"></i> Dark
      </button>

      <span class="dpg-rc-divider"></span>

      <!-- Font Size Scalers -->
      <button type="button" class="dpg-rc-btn" onclick="window.cycleFontSize(-1)" title="Decrease Text Size" aria-label="Decrease Text Size">
        A-
      </button>
      <button type="button" class="dpg-rc-btn ${currentFontSize === 'md' ? 'active' : ''}" onclick="window.setReaderFontSize('md')" title="Standard Text Size" aria-label="Reset Standard Text Size">
        A
      </button>
      <button type="button" class="dpg-rc-btn" onclick="window.cycleFontSize(1)" title="Increase Text Size (High Accessibility)" aria-label="Increase Text Size">
        A+
      </button>
    `;

    return wrapper;
  }

  function mountControls() {
    // If already mounted, skip
    if (document.querySelector(".dpg-reader-controls")) return;

    // Check preferred mounting slots in headers:
    // 1. PDF viewer topbar
    const topbar = document.querySelector(".topbar");
    if (topbar) {
      const controls = createControlsDOM();
      // Insert before mobile toggle or at end
      const mobToggle = topbar.querySelector(".mob-toggle");
      if (mobToggle) topbar.insertBefore(controls, mobToggle);
      else topbar.appendChild(controls);
      return;
    }

    // 2. Solution viewers navbar actions
    const navActions = document.querySelector(".sol-navbar-actions");
    if (navActions) {
      const controls = createControlsDOM();
      navActions.insertBefore(controls, navActions.firstChild);
      return;
    }

    // 3. Fallback: Floating widget in bottom right
    const floatingWrapper = document.createElement("div");
    floatingWrapper.className = "dpg-reader-controls-floating";
    floatingWrapper.appendChild(createControlsDOM());
    document.body.appendChild(floatingWrapper);
  }

  // Ensure initial theme & font size apply immediately to eliminate flicker
  applyTheme(currentTheme);
  applyFontSize(currentFontSize);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountControls);
  } else {
    mountControls();
  }
})();

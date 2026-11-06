/** DPGNotes Reader Theme & Contrast Accessibility Engine */
(function() {
  const THEME_KEY = "dpgReaderTheme";
  const FONT_SIZE_KEY = "dpgReaderFontSize";
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
      if (target) {
        btn.classList.toggle("active", target === currentFontSize);
      }
    });
  }
  function createControlsDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "dpg-reader-controls";
    wrapper.setAttribute("role", "toolbar");
    wrapper.setAttribute("aria-label", "Accessibility and Reading Theme Controls");
    wrapper.innerHTML = `
      <div class="dpg-rc-row dpg-rc-theme-row">
        <button type="button" class="dpg-rc-btn dpg-rc-theme-btn ${currentTheme === 'default' ? 'active' : ''}" data-target-theme="default" onclick="window.setReaderTheme('default')" title="Default DPG Blue Theme" aria-label="Default Blue Theme">
          <i class="ri-contrast-2-line" style="color:#60a5fa;"></i>
        </button>
        <button type="button" class="dpg-rc-btn dpg-rc-theme-btn ${currentTheme === 'light' ? 'active' : ''}" data-target-theme="light" onclick="window.setReaderTheme('light')" title="Light High-Contrast Paper Theme" aria-label="Light High Contrast Paper Theme">
          <i class="ri-sun-line" style="color:#f59e0b;"></i>
        </button>
        <button type="button" class="dpg-rc-btn dpg-rc-theme-btn ${currentTheme === 'dark' ? 'active' : ''}" data-target-theme="dark" onclick="window.setReaderTheme('dark')" title="OLED Pure Dark Contrast Theme" aria-label="OLED Pure Dark Contrast Theme">
          <i class="ri-moon-clear-line" style="color:#a78bfa;"></i>
        </button>
        <span class="dpg-rc-divider"></span>
      </div>
      <div class="dpg-rc-row dpg-rc-font-row">
        <button type="button" class="dpg-rc-btn dpg-rc-font-btn" onclick="window.cycleFontSize(-1)" title="Decrease Text Size" aria-label="Decrease Text Size">
          <span class="dpg-font-tt-label">T<span class="dpg-font-sub">T</span> -</span>
        </button>
        <button type="button" class="dpg-rc-btn dpg-rc-font-btn ${currentFontSize === 'md' ? 'active' : ''}" data-target-size="md" onclick="window.setReaderFontSize('md')" title="Standard Text Size" aria-label="Standard Text Size">
          <span class="dpg-font-tt-label">T</span>
        </button>
        <button type="button" class="dpg-rc-btn dpg-rc-font-btn" onclick="window.cycleFontSize(1)" title="Increase Text Size" aria-label="Increase Text Size">
          <span class="dpg-font-tt-label">T<span class="dpg-font-sub">T</span> +</span>
        </button>
      </div>
    `;
    return wrapper;
  }
  function mountControls() {
    if (document.querySelector(".dpg-reader-controls")) {
      updateControlsUI();
      return;
    }
    const slot = document.getElementById("dpgReaderControlsSlot");
    if (slot) {
      slot.appendChild(createControlsDOM());
      updateControlsUI();
      return;
    }
    const topbar = document.querySelector(".topbar");
    if (topbar) {
      const controls = createControlsDOM();
      const mobToggle = topbar.querySelector("#sidebarToggleBtn, .mob-toggle");
      if (mobToggle) topbar.insertBefore(controls, mobToggle);
      else topbar.appendChild(controls);
      updateControlsUI();
      return;
    }
    const navActions = document.querySelector(".sol-navbar-actions, .portal-nav-actions, .qz-nav-actions, .analytics-nav-actions, .dpg-theme-slot");
    if (navActions) {
      const controls = createControlsDOM();
      navActions.insertBefore(controls, navActions.firstChild);
      updateControlsUI();
      return;
    }
    const floatingWrapper = document.createElement("div");
    floatingWrapper.className = "dpg-reader-controls-floating";
    floatingWrapper.appendChild(createControlsDOM());
    document.body.appendChild(floatingWrapper);
    updateControlsUI();
  }
  applyTheme(currentTheme);
  applyFontSize(currentFontSize);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountControls);
  } else {
    mountControls();
  }
})();

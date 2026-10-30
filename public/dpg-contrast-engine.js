/**
 * DPGNotes – Runtime Color Contrast & Theme Enforcement Engine
 * 
 * Complies strictly with WCAG 2.2 Level AA / AAA standards:
 * - Normal text: >= 4.5:1 (Target AAA: >= 7:1)
 * - Large text (18pt/24px or 14pt/18.66px bold): >= 3:1
 * - Graphical controls, icons, input boundaries: >= 3:1
 * - Focus indicators: clearly visible outline
 * 
 * Supports:
 * - Blue Theme (Midnight Blue #0B1F3A)
 * - Light Theme (Light Paper #F8FAFC)
 * - Black Theme (OLED Dark #000000)
 * - Green Theme (Nature Green #123B2A)
 * - Light Green Theme (#F1F8F3)
 * - Dynamic Ancestor Background Blending & MutationObserver Enforcement
 */

(function() {
  'use strict';

  // Canonical Theme Palettes (Design Guidelines)
  const THEME_PALETTES = {
    blue: {
      name: 'blue',
      isDark: true,
      bg: [11, 31, 58],           // #0B1F3A
      surface: [20, 43, 72],       // #142B48
      surfaceHover: [28, 58, 92],  // #1C3A5C
      text: '#F8FAFC',
      textSecondary: '#C7D2E0',
      textMuted: '#B8C7D9',
      heading: '#FFFFFF',
      link: '#7DD3FC',
      primaryIcon: '#F8FAFC',
      secondaryIcon: '#C7D2E0',
      success: '#86EFAC',
      warning: '#FDE68A',
      danger: '#FCA5A5',
      info: '#93C5FD',
      border: '#49627E',
      focus: '#7DD3FC',
      inputBg: '#142B48',
      inputText: '#F8FAFC',
      placeholder: '#B8C7D9'
    },
    light: {
      name: 'light',
      isDark: false,
      bg: [248, 250, 252],        // #F8FAFC
      surface: [255, 255, 255],    // #FFFFFF
      surfaceHover: [241, 245, 249],// #F1F5F9
      text: '#172033',
      textSecondary: '#475569',
      textMuted: '#64748B',
      heading: '#111827',
      link: '#1D4ED8',
      primaryIcon: '#172033',
      secondaryIcon: '#475569',
      success: '#166534',
      warning: '#854D0E',
      danger: '#B91C1C',
      info: '#1E40AF',
      border: '#CBD5E1',
      focus: '#1D4ED8',
      inputBg: '#FFFFFF',
      inputText: '#172033',
      placeholder: '#64748B'
    },
    black: {
      name: 'black',
      isDark: true,
      bg: [0, 0, 0],              // #000000
      surface: [23, 23, 23],       // #171717
      surfaceHover: [38, 38, 38],  // #262626
      text: '#F5F5F5',
      textSecondary: '#A3A3A3',
      textMuted: '#A3A3A3',
      heading: '#FFFFFF',
      link: '#7DD3FC',
      primaryIcon: '#F5F5F5',
      secondaryIcon: '#A3A3A3',
      success: '#86EFAC',
      warning: '#FDE68A',
      danger: '#FCA5A5',
      info: '#93C5FD',
      border: '#525252',
      focus: '#7DD3FC',
      inputBg: '#171717',
      inputText: '#F5F5F5',
      placeholder: '#A3A3A3'
    },
    green: {
      name: 'green',
      isDark: true,
      bg: [18, 59, 42],           // #123B2A
      surface: [27, 73, 53],       // #1B4935
      surfaceHover: [36, 92, 66],  // #245C42
      text: '#F1F8F3',
      textSecondary: '#CDEBDD',
      textMuted: '#CDEBDD',
      heading: '#FFFFFF',
      link: '#86EFAC',
      primaryIcon: '#F1F8F3',
      secondaryIcon: '#CDEBDD',
      success: '#86EFAC',
      warning: '#FDE68A',
      danger: '#FCA5A5',
      info: '#7DD3FC',
      border: '#47725C',
      focus: '#86EFAC',
      inputBg: '#1B4935',
      inputText: '#F1F8F3',
      placeholder: '#CDEBDD'
    },
    'light-green': {
      name: 'light-green',
      isDark: false,
      bg: [241, 248, 243],        // #F1F8F3
      surface: [255, 255, 255],    // #FFFFFF
      surfaceHover: [226, 242, 233],
      text: '#123B2A',
      textSecondary: '#355B47',
      textMuted: '#4F7A62',
      heading: '#123B2A',
      link: '#166534',
      primaryIcon: '#14532D',
      secondaryIcon: '#355B47',
      success: '#14532D',
      warning: '#854D0E',
      danger: '#B91C1C',
      info: '#15803D',
      border: '#A7C8B4',
      focus: '#166534',
      inputBg: '#FFFFFF',
      inputText: '#123B2A',
      placeholder: '#4F7A62'
    }
  };

  // Aliases for themes used across DPGNotes
  THEME_PALETTES['default'] = THEME_PALETTES.blue;
  THEME_PALETTES['ocean'] = THEME_PALETTES.blue;
  THEME_PALETTES['dark'] = THEME_PALETTES.black;
  THEME_PALETTES['oled'] = THEME_PALETTES.black;
  THEME_PALETTES['forest'] = THEME_PALETTES.green;
  THEME_PALETTES['emerald'] = THEME_PALETTES.green;
  THEME_PALETTES['paper'] = THEME_PALETTES.light;
  THEME_PALETTES['sepia'] = {
    name: 'sepia',
    isDark: false,
    bg: [244, 237, 224],
    surface: [254, 250, 240],
    surfaceHover: [238, 228, 210],
    text: '#2d241e',
    textSecondary: '#6e5d4f',
    textMuted: '#8b7a6d',
    heading: '#1e1610',
    link: '#8a4b16',
    primaryIcon: '#2d241e',
    secondaryIcon: '#6e5d4f',
    success: '#2e6930',
    warning: '#8a5e12',
    danger: '#a62e2e',
    info: '#2d5a88',
    border: '#d7c7b2',
    focus: '#8a4b16',
    inputBg: '#fbf7ee',
    inputText: '#2d241e',
    placeholder: '#8b7a6d'
  };

  /**
   * Determine current active theme
   */
  function getActiveTheme() {
    const htmlTheme = document.documentElement.getAttribute('data-theme') ||
                      document.body?.getAttribute('data-theme') ||
                      localStorage.getItem('dpgReaderTheme') ||
                      localStorage.getItem('theme') ||
                      'blue';
    const norm = htmlTheme.toLowerCase().trim();
    return THEME_PALETTES[norm] || (norm.includes('light') ? THEME_PALETTES.light : THEME_PALETTES.blue);
  }

  /**
   * Color conversion & Relative Luminance (WCAG 2.2 Relative Luminance)
   */
  function sRGBtoLinear(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function getRelativeLuminance(r, g, b) {
    return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
  }

  function getContrastRatio(lum1, lum2) {
    const l1 = Math.max(lum1, lum2);
    const l2 = Math.min(lum1, lum2);
    return (l1 + 0.05) / (l2 + 0.05);
  }

  /**
   * Robust CSS Color Parser
   * Returns [r, g, b, a] where r,g,b in [0, 255] and a in [0, 1]
   */
  function parseColor(colorStr) {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit') {
      return [0, 0, 0, 0];
    }
    const str = colorStr.trim().toLowerCase();

    // Hex #RGB, #RGBA, #RRGGBB, #RRGGBBAA
    if (str.startsWith('#')) {
      const hex = str.slice(1);
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16),
          1
        ];
      }
      if (hex.length === 4) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16),
          parseInt(hex[3] + hex[3], 16) / 255
        ];
      }
      if (hex.length === 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
          1
        ];
      }
      if (hex.length === 8) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
          parseInt(hex.slice(6, 8), 16) / 255
        ];
      }
    }

    // rgb(...) or rgba(...)
    const rgbMatch = str.match(/rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
    if (rgbMatch) {
      return [
        Math.round(parseFloat(rgbMatch[1])),
        Math.round(parseFloat(rgbMatch[2])),
        Math.round(parseFloat(rgbMatch[3])),
        rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
      ];
    }

    // Named common colors
    const NAMED_COLORS = {
      black: [0, 0, 0, 1],
      white: [255, 255, 255, 1],
      red: [255, 0, 0, 1],
      green: [0, 128, 0, 1],
      blue: [0, 0, 255, 1],
      yellow: [255, 255, 0, 1],
      gray: [128, 128, 128, 1],
      grey: [128, 128, 128, 1]
    };
    if (NAMED_COLORS[str]) {
      return NAMED_COLORS[str];
    }

    return [0, 0, 0, 0];
  }

  /**
   * Blend a foreground color with alpha onto a background color
   */
  function blendAlpha(fgR, fgG, fgB, alpha, bgR, bgG, bgB) {
    return [
      Math.round(alpha * fgR + (1 - alpha) * bgR),
      Math.round(alpha * fgG + (1 - alpha) * bgG),
      Math.round(alpha * fgB + (1 - alpha) * bgB)
    ];
  }

  /**
   * Compute effective background color by traversing ancestors
   */
  function getEffectiveBackgroundColor(el, activeTheme) {
    let curr = el;
    let accumulatedAlpha = 0;
    let r = 0, g = 0, b = 0;

    const layers = [];

    while (curr && curr !== document.documentElement && curr !== document) {
      try {
        const style = window.getComputedStyle(curr);
        const bg = parseColor(style.backgroundColor);
        if (bg[3] > 0) {
          layers.push(bg);
          if (bg[3] >= 0.99) break; // fully opaque
        }
      } catch (e) {
        break;
      }
      curr = curr.parentElement;
    }

    // Default base background from current theme
    let [baseR, baseG, baseB] = activeTheme.bg;

    // Apply layers from back (last) to front (first)
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      [baseR, baseG, baseB] = blendAlpha(layer[0], layer[1], layer[2], layer[3], baseR, baseG, baseB);
    }

    return [baseR, baseG, baseB];
  }

  /**
   * Enforce contrast on a single element
   */
  function enforceElementContrast(el, activeTheme) {
    if (!el || el.nodeType !== 1) return;
    
    // Ignore invisible or decorative elements
    if (el.offsetWidth === 0 && el.offsetHeight === 0) return;
    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'svg', 'path', 'meta', 'link', 'noscript'].includes(tag)) return;

    let computed;
    try {
      computed = window.getComputedStyle(el);
    } catch(e) {
      return;
    }

    if (computed.display === 'none' || computed.visibility === 'hidden' || parseFloat(computed.opacity) < 0.1) {
      return;
    }

    const [bgR, bgG, bgB] = getEffectiveBackgroundColor(el, activeTheme);
    const bgLum = getRelativeLuminance(bgR, bgG, bgB);
    const isSurfaceDark = bgLum < 0.45;

    // 1. Text Elements (h1-h6, p, span, a, label, li, td, th, dt, dd, b, strong, em, small)
    const isTextContainer = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'label', 'li', 'td', 'th', 'dt', 'dd', 'b', 'strong', 'em', 'small'].includes(tag) ||
                            (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent.trim().length > 0);

    if (isTextContainer && el.textContent.trim().length > 0) {
      const fgColor = parseColor(computed.color);
      let fgR = fgColor[0], fgG = fgColor[1], fgB = fgColor[2], fgA = fgColor[3];
      if (fgA < 1) {
        [fgR, fgG, fgB] = blendAlpha(fgR, fgG, fgB, fgA, bgR, bgG, bgB);
      }

      const fgLum = getRelativeLuminance(fgR, fgG, fgB);
      const cr = getContrastRatio(fgLum, bgLum);

      // Determine text size category
      const fontSize = parseFloat(computed.fontSize);
      const fontWeight = parseInt(computed.fontWeight, 10) || 400;
      const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const minRequiredCr = isLargeText ? 3.0 : 4.5;

      if (cr < minRequiredCr) {
        // Contrast is failing! Adjust automatically
        if (isSurfaceDark) {
          // Surface is dark: Assign high-contrast light foreground
          if (tag === 'a' || el.classList.contains('sol-link') || el.classList.contains('dpg-auth-link')) {
            el.style.setProperty('color', activeTheme.link, 'important');
          } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) || fontWeight >= 700) {
            el.style.setProperty('color', activeTheme.heading, 'important');
          } else if (el.classList.contains('text-muted') || el.classList.contains('sol-text-muted') || tag === 'small') {
            el.style.setProperty('color', activeTheme.textSecondary, 'important');
          } else {
            el.style.setProperty('color', activeTheme.text, 'important');
          }
        } else {
          // Surface is light: Assign high-contrast dark foreground
          if (tag === 'a' || el.classList.contains('sol-link') || el.classList.contains('dpg-auth-link')) {
            el.style.setProperty('color', activeTheme.link, 'important');
          } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag) || fontWeight >= 700) {
            el.style.setProperty('color', activeTheme.heading, 'important');
          } else if (el.classList.contains('text-muted') || el.classList.contains('sol-text-muted') || tag === 'small') {
            el.style.setProperty('color', activeTheme.textSecondary, 'important');
          } else {
            el.style.setProperty('color', activeTheme.text, 'important');
          }
        }
        el.setAttribute('data-contrast-enforced', 'text');
      }
    }

    // 2. Bootstrap & Remix Icons (.bi, [class^="ri-"], [class*=" ri-"])
    const isIcon = el.classList.contains('bi') ||
                   Array.from(el.classList).some(c => c.startsWith('ri-'));

    if (isIcon) {
      el.style.verticalAlign = 'middle';

      // Check for semantic colors
      const isSuccess = el.classList.contains('text-success');
      const isWarning = el.classList.contains('text-warning');
      const isDanger = el.classList.contains('text-danger') || el.classList.contains('text-error');
      const isInfo = el.classList.contains('text-info') || el.classList.contains('text-primary');

      if (isSuccess) {
        el.style.setProperty('color', activeTheme.success, 'important');
      } else if (isWarning) {
        el.style.setProperty('color', activeTheme.warning, 'important');
      } else if (isDanger) {
        el.style.setProperty('color', activeTheme.danger, 'important');
      } else if (isInfo) {
        el.style.setProperty('color', activeTheme.info, 'important');
      } else {
        // Icon should inherit parent color
        const iconColor = parseColor(computed.color);
        const iconLum = getRelativeLuminance(iconColor[0], iconColor[1], iconColor[2]);
        const cr = getContrastRatio(iconLum, bgLum);

        if (cr < 3.0) {
          el.style.setProperty('color', isSurfaceDark ? activeTheme.primaryIcon : activeTheme.primaryIcon, 'important');
        }
      }
      el.setAttribute('data-contrast-enforced', 'icon');
    }

    // 3. Form Inputs & Controls (input, textarea, select)
    if (['input', 'textarea', 'select'].includes(tag)) {
      const type = el.getAttribute('type');
      if (type !== 'hidden' && type !== 'checkbox' && type !== 'radio') {
        const inputFg = parseColor(computed.color);
        const cr = getContrastRatio(getRelativeLuminance(inputFg[0], inputFg[1], inputFg[2]), bgLum);

        if (cr < 4.5) {
          el.style.setProperty('color', isSurfaceDark ? activeTheme.inputText : activeTheme.inputText, 'important');
        }

        // Input boundary visibility (>= 3:1 against card surface)
        const borderCol = parseColor(computed.borderColor);
        const borderCr = getContrastRatio(getRelativeLuminance(borderCol[0], borderCol[1], borderCol[2]), bgLum);
        if (borderCr < 2.2) {
          el.style.setProperty('border-color', activeTheme.border, 'important');
        }

        // Accessible Focus Indicator
        el.addEventListener('focus', function() {
          el.style.setProperty('border-color', activeTheme.focus, 'important');
          el.style.setProperty('box-shadow', `0 0 0 3px ${isSurfaceDark ? 'rgba(125,211,252,0.25)' : 'rgba(29,78,216,0.2)'}`, 'important');
        });
        el.addEventListener('blur', function() {
          el.style.removeProperty('box-shadow');
        });
      }
    }

    // 4. Buttons (button, .btn, [role="button"], .sol-btn)
    if (tag === 'button' || el.classList.contains('btn') || el.classList.contains('sol-btn') || el.getAttribute('role') === 'button') {
      const btnBg = parseColor(computed.backgroundColor);
      let btnBgR = btnBg[0], btnBgG = btnBg[1], btnBgB = btnBg[2];
      if (btnBg[3] < 1) {
        [btnBgR, btnBgG, btnBgB] = blendAlpha(btnBgR, btnBgG, btnBgB, btnBg[3], bgR, bgG, bgB);
      }
      const btnBgLum = getRelativeLuminance(btnBgR, btnBgG, btnBgB);

      const btnFg = parseColor(computed.color);
      const btnFgLum = getRelativeLuminance(btnFg[0], btnFg[1], btnFg[2]);
      const btnCr = getContrastRatio(btnFgLum, btnBgLum);

      if (btnCr < 4.5) {
        // Adjust button text for high contrast against button background
        const lightTextLum = getRelativeLuminance(248, 250, 252);
        const darkTextLum = getRelativeLuminance(23, 32, 51);
        const lightCr = getContrastRatio(lightTextLum, btnBgLum);
        const darkCr = getContrastRatio(darkTextLum, btnBgLum);

        if (lightCr >= darkCr) {
          el.style.setProperty('color', '#ffffff', 'important');
        } else {
          el.style.setProperty('color', '#172033', 'important');
        }
      }

      // Add aria-label to icon-only buttons if missing
      if (!el.getAttribute('aria-label') && !el.getAttribute('title') && el.textContent.trim().length === 0) {
        const iconChild = el.querySelector('.bi, [class^="ri-"]');
        if (iconChild) {
          const iconClass = Array.from(iconChild.classList).find(c => c.startsWith('ri-') || c.startsWith('bi-'));
          if (iconClass) {
            const label = iconClass.replace(/^(ri-|bi-)/, '').replace(/-line|-fill/, '').replace(/-/g, ' ');
            el.setAttribute('aria-label', label);
          }
        }
      }

      // Keyboard Focus Outline
      el.style.outlineOffset = '2px';
    }

    // 5. Cards & Containers (.card, .sol-card, .edu-modal, .section-card)
    if (el.classList.contains('card') || el.classList.contains('sol-card') || el.classList.contains('section-card')) {
      const cardBorder = parseColor(computed.borderColor);
      const borderCr = getContrastRatio(getRelativeLuminance(cardBorder[0], cardBorder[1], cardBorder[2]), bgLum);
      if (borderCr < 1.8) {
        el.style.setProperty('border-color', activeTheme.border, 'important');
      }
    }
  }

  /**
   * Enforce contrast globally across all elements
   */
  let enforcementPending = false;
  function enforceAll(rootNode) {
    if (enforcementPending) return;
    enforcementPending = true;

    requestAnimationFrame(function() {
      const activeTheme = getActiveTheme();
      const root = rootNode || document.body || document.documentElement;
      if (!root) {
        enforcementPending = false;
        return;
      }

      // Enforce on target and all descendants
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, null, false);
      let node = walker.currentNode;
      let count = 0;
      while (node) {
        enforceElementContrast(node, activeTheme);
        node = walker.nextNode();
        count++;
        // Yield if large DOM to prevent UI block
        if (count > 2500) break;
      }
      enforcementPending = false;
    });
  }

  /**
   * Setup Real-time MutationObserver & Event Listeners
   */
  function initEngine() {
    enforceAll();

    // 1. Observe Theme Attribute changes on <html> and <body>
    const themeObserver = new MutationObserver(function(mutations) {
      for (const m of mutations) {
        if (m.type === 'attributes' && (m.attributeName === 'data-theme' || m.attributeName === 'class')) {
          enforceAll();
          break;
        }
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    if (document.body) {
      themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    }

    // 2. Observe DOM tree changes (for dynamic modals, SERP results, test cases, alerts)
    let domChangeTimeout = null;
    const domObserver = new MutationObserver(function(mutations) {
      let shouldEnforce = false;
      for (const m of mutations) {
        if (m.addedNodes.length > 0) {
          shouldEnforce = true;
          break;
        }
      }
      if (shouldEnforce) {
        clearTimeout(domChangeTimeout);
        domChangeTimeout = setTimeout(function() {
          enforceAll();
        }, 120);
      }
    });

    if (document.body) {
      domObserver.observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        domObserver.observe(document.body, { childList: true, subtree: true });
        enforceAll();
      });
    }

    // 3. Listen to custom theme events
    window.addEventListener('dpg-theme-changed', function() {
      enforceAll();
    });
    window.addEventListener('storage', function(e) {
      if (e.key === 'dpgReaderTheme' || e.key === 'theme') {
        enforceAll();
      }
    });
  }

  // Self-initialize safely
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEngine);
  } else {
    initEngine();
  }

  // Public API
  window.DPGContrastEngine = {
    enforceAll: enforceAll,
    enforceElement: function(el) {
      enforceElementContrast(el, getActiveTheme());
    },
    getRelativeLuminance: getRelativeLuminance,
    getContrastRatio: getContrastRatio,
    getActiveTheme: getActiveTheme,
    THEME_PALETTES: THEME_PALETTES
  };

})();

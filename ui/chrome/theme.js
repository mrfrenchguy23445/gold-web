"use strict";

/* Gold-Web theme engine.
 *
 * Everything the interface can be re-skinned with lives here: a set of presets,
 * the user's overrides, and the translation from both into the CSS custom
 * properties in brand/gold-ui/tokens.css.
 *
 * The contract is deliberately small. The rest of the UI never reads settings
 * directly; it either reads the custom properties or listens for a change. That
 * keeps every surface in sync no matter which control moved.
 *
 * Persistence is localStorage for now (the shell registers goldweb:// as a
 * standard secure scheme, so it has a storage origin). When native settings
 * land in a later milestone this object becomes the migration source.
 */

(function () {
  const KEY = "goldweb:settings:v1";

  /* -------------------------------------------------------------- defaults */

  const DEFAULTS = {
    // Which preset the palette came from, or "custom" once edited.
    theme: "gold",

    // Palette
    accent: "#e0b84c",
    base: "#000000",
    surface: "#0a0a0a",
    raised: "#141414",
    active: "#202020",
    line: "#232323",
    textPrimary: "#f5f5f5",
    textSecondary: "#a3a3a3",

    // Shape and density
    radius: 10,
    density: "comfortable",
    tabStyle: "rounded",
    tabPosition: "top", // "top" | "left" | "right"
    compactToolbar: false,

    // Type
    font: "system",
    fontScale: 100,

    // Effects
    motion: true,
    blur: true,

    // Chrome details
    showShield: true,
    showKbdHint: true,

    // New tab
    backgroundStyle: "aura",
    backgroundImage: "",
    bgIntensity: 55,
    showClock: true,
    clock24h: false,
    showGreeting: true,
    userName: "",
    showShortcuts: true,

    // Search and browsing
    searchEngine: "duckduckgo",
    searchSuggestions: false,

    // Privacy
    trackingProtection: true,
    encryptedDns: true,
    httpsOnly: true,
    wipeOnShutdown: false,

    // Reopen the tabs that were open last time. Local only; the snapshot lives
    // in the device's storage beside the theme.
    restoreSession: true,
  };

  /* --------------------------------------------------------------- presets */

  const PRESETS = {
    gold: {
      name: "Gold",
      accent: "#e0b84c",
      base: "#000000", surface: "#0a0a0a", raised: "#141414", active: "#202020", line: "#232323",
      textPrimary: "#f5f5f5", textSecondary: "#a3a3a3",
    },
    obsidian: {
      name: "Obsidian",
      accent: "#9aa7b4",
      base: "#050506", surface: "#0d0e11", raised: "#16181c", active: "#21242a", line: "#23262c",
      textPrimary: "#eef1f5", textSecondary: "#98a0ab",
    },
    midnight: {
      name: "Midnight",
      accent: "#5b8cff",
      base: "#04060f", surface: "#0a0f1e", raised: "#111832", active: "#182247", line: "#1b2440",
      textPrimary: "#eaf0ff", textSecondary: "#93a0c4",
    },
    emerald: {
      name: "Emerald",
      accent: "#35d09a",
      base: "#00100b", surface: "#04170f", raised: "#07251a", active: "#0a3324", line: "#0d3324",
      textPrimary: "#eafff6", textSecondary: "#8fc7b2",
    },
    crimson: {
      name: "Crimson",
      accent: "#ff5d6c",
      base: "#0e0406", surface: "#170709", raised: "#240d11", active: "#34141a", line: "#301319",
      textPrimary: "#ffeef1", textSecondary: "#c79aa1",
    },
    violet: {
      name: "Violet",
      accent: "#a679ff",
      base: "#08050f", surface: "#100b1c", raised: "#191231", active: "#241a47", line: "#241a47",
      textPrimary: "#f2ecff", textSecondary: "#b0a0d6",
    },
    ocean: {
      name: "Ocean",
      accent: "#38d6e6",
      base: "#00080d", surface: "#04141b", raised: "#07202b", active: "#0a2e3d", line: "#0a2e3d",
      textPrimary: "#e9fbff", textSecondary: "#8dbac6",
    },
    sunset: {
      name: "Sunset",
      accent: "#ff9a4d",
      base: "#0d0602", surface: "#170d05", raised: "#24150a", active: "#341f0f", line: "#34200f",
      textPrimary: "#fff3e8", textSecondary: "#c9a184",
    },
    rose: {
      name: "Rose",
      accent: "#ff7ab6",
      base: "#0d0409", surface: "#180710", raised: "#250d1a", active: "#351326", line: "#351326",
      textPrimary: "#ffeef6", textSecondary: "#c99ab4",
    },
    neon: {
      name: "Neon",
      accent: "#c6ff3d",
      base: "#040704", surface: "#0a1008", raised: "#121a0c", active: "#1b2612", line: "#1b2612",
      textPrimary: "#f3ffe0", textSecondary: "#9db386",
    },
    mono: {
      name: "Mono",
      accent: "#f0f0f0",
      base: "#000000", surface: "#0b0b0b", raised: "#151515", active: "#222222", line: "#262626",
      textPrimary: "#fafafa", textSecondary: "#a0a0a0",
    },
    daylight: {
      name: "Daylight",
      accent: "#8a5a10",
      base: "#f6f4ef", surface: "#ffffff", raised: "#f1efe8", active: "#e7e4db", line: "#e0dcd2",
      textPrimary: "#17150f", textSecondary: "#6a655c",
    },
  };

  const PALETTE_KEYS = [
    "accent", "base", "surface", "raised", "active", "line", "textPrimary", "textSecondary",
  ];

  /* Base tones for the "tone" control. Keeps a preset's accent but swaps the
   * greyscale it sits on. */
  const TONES = {
    black:    { name: "Black",    base: "#000000", surface: "#0a0a0a", raised: "#141414", active: "#202020", line: "#232323" },
    onyx:     { name: "Onyx",     base: "#050505", surface: "#0e0e0e", raised: "#191919", active: "#262626", line: "#282828" },
    charcoal: { name: "Charcoal", base: "#0b0b0c", surface: "#141416", raised: "#1e1e21", active: "#2a2a2e", line: "#2c2c30" },
    slate:    { name: "Slate",    base: "#0a0c11", surface: "#12151c", raised: "#1b1f28", active: "#262b36", line: "#272c38" },
  };

  const DENSITY = {
    compact:     { titlebar: 36, toolbar: 42, tab: 26, sp: [3, 6, 10, 14, 20, 28, 40] },
    comfortable: { titlebar: 40, toolbar: 48, tab: 30, sp: [4, 8, 12, 16, 24, 32, 48] },
    spacious:    { titlebar: 46, toolbar: 56, tab: 34, sp: [5, 10, 14, 20, 28, 40, 56] },
  };

  const FONTS = {
    system: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    humanist: '"Inter", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", sans-serif',
    rounded: '"Nunito", "Quicksand", "Segoe UI", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace',
    serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  };

  const SEARCH = {
    duckduckgo: { name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
    startpage:  { name: "Startpage",  url: "https://www.startpage.com/sp/search?query=" },
    brave:      { name: "Brave Search", url: "https://search.brave.com/search?q=" },
    wikipedia:  { name: "Wikipedia",  url: "https://en.wikipedia.org/w/index.php?search=" },
    google:     { name: "Google",     url: "https://www.google.com/search?q=" },
  };

  /* --------------------------------------------------------- colour helpers */

  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

  function hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return null;
    let h = hex.trim().replace(/^#/, "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    if (!/^[0-9a-f]{6}$/i.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function toHex(r, g, b) {
    const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    return `#${h(r)}${h(g)}${h(b)}`;
  }

  /* amount > 0 lightens toward white, < 0 darkens toward black. */
  function shift(hex, amount) {
    const c = hexToRgb(hex);
    if (!c) return hex;
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    return toHex(c.r + (t - c.r) * p, c.g + (t - c.g) * p, c.b + (t - c.b) * p);
  }

  /* Blend a toward b by amt (0..1). */
  function mix(a, b, amt) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    if (!ca || !cb) return a;
    return toHex(
      ca.r + (cb.r - ca.r) * amt,
      ca.g + (cb.g - ca.g) * amt,
      ca.b + (cb.b - ca.b) * amt
    );
  }

  function luminance(rgb) {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(rgb.r) + 0.7152 * f(rgb.g) + 0.0722 * f(rgb.b);
  }

  function isDark(hex) {
    const c = hexToRgb(hex);
    return c ? luminance(c) < 0.5 : true;
  }

  function rgba(hex, a) {
    const c = hexToRgb(hex);
    return c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${a})` : hex;
  }

  /* Whichever of near-black or white reads with more contrast on a fill. */
  function bestInk(rgb) {
    const l = luminance(rgb);
    const onWhite = 1.05 / (l + 0.05);
    const onBlack = (l + 0.05) / 0.05;
    return onBlack >= onWhite ? "#12100a" : "#ffffff";
  }

  /* ---------------------------------------------------------------- state */

  const listeners = new Set();

  function coerce(raw) {
    const out = { ...DEFAULTS };
    if (!raw || typeof raw !== "object") return out;
    for (const key of Object.keys(DEFAULTS)) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) out[key] = raw[key];
    }
    // Sanitise the values the CSS engine trusts.
    for (const key of PALETTE_KEYS) {
      if (!hexToRgb(out[key])) out[key] = DEFAULTS[key];
    }
    out.radius = clamp(Number(out.radius) || 0, 0, 20);
    out.fontScale = clamp(Number(out.fontScale) || 100, 85, 120);
    out.bgIntensity = clamp(Number(out.bgIntensity) || 0, 0, 100);
    if (!DENSITY[out.density]) out.density = "comfortable";
    if (!FONTS[out.font]) out.font = "system";
    if (!PRESETS[out.theme]) out.theme = "custom";
    return out;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return coerce(raw ? JSON.parse(raw) : null);
    } catch (err) {
      return coerce(null);
    }
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      /* private modes can refuse; the session still works in memory */
    }
  }

  function emit() {
    for (const fn of listeners) {
      try {
        fn(state);
      } catch (err) {
        /* a bad listener must not break the others */
      }
    }
  }

  /* --------------------------------------------------------------- apply */

  function apply(s) {
    const root = document.documentElement;
    const set = (k, v) => root.style.setProperty(k, v);

    const dark = isDark(s.base);
    const acc = hexToRgb(s.accent) || hexToRgb(DEFAULTS.accent);
    const accCss = `${acc.r}, ${acc.g}, ${acc.b}`;

    /* accent + its derivatives */
    set("--accent", s.accent);
    set("--accent-rgb", accCss);
    set("--accent-hover", shift(s.accent, dark ? 0.1 : -0.12));
    set("--accent-soft", shift(s.accent, dark ? 0.22 : 0.4));
    set("--accent-dim", `rgba(${accCss}, ${dark ? 0.14 : 0.16})`);
    set("--accent-glow", `rgba(${accCss}, ${dark ? 0.38 : 0.3})`);
    set("--accent-grad", `linear-gradient(135deg, ${shift(s.accent, dark ? 0.22 : 0.4)}, ${s.accent})`);
    set("--accent-ink", bestInk(acc));

    /* surfaces and lines */
    set("--bg-void", s.base);
    set("--bg-content", s.base);
    set("--bg-surface", s.surface);
    set("--bg-raised", s.raised);
    set("--bg-active", s.active);
    set("--border-subtle", s.line);
    set("--border-strong", shift(s.line, dark ? 0.12 : -0.1));
    set("--hairline", dark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)");
    set("--bg-glass", dark ? rgba(s.surface, 0.72) : "rgba(255, 255, 255, 0.7)");

    /* text */
    set("--text-primary", s.textPrimary);
    set("--text-secondary", s.textSecondary);
    set("--text-disabled", mix(s.textSecondary, s.base, 0.5));
    set("--text-inverse", dark ? s.base : s.textPrimary);

    /* scrollbars follow the theme instead of a hardcoded grey */
    set("--scroll-thumb", dark ? "rgba(255, 255, 255, 0.11)" : "rgba(0, 0, 0, 0.18)");
    set("--scroll-thumb-hover", dark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.3)");

    /* the sheen flips direction between dark and light surfaces */
    set("--sheen", dark
      ? "linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0) 62%)"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0) 62%)");

    root.style.colorScheme = dark ? "dark" : "light";

    /* shape */
    set("--r-sm", `${Math.max(2, s.radius - 3)}px`);
    set("--r-md", `${s.radius}px`);
    set("--r-lg", `${s.radius + 2}px`);
    set("--r-xl", `${s.radius + 5}px`);

    /* density */
    const d = DENSITY[s.density] || DENSITY.comfortable;
    set("--titlebar-h", `${d.titlebar}px`);
    set("--toolbar-h", `${d.toolbar}px`);
    set("--tab-h", `${d.tab}px`);
    d.sp.forEach((px, i) => set(`--sp-${i + 1}`, `${px}px`));

    /* type */
    set("--font-ui", FONTS[s.font] || FONTS.system);
    const sc = s.fontScale / 100;
    set("--font-scale", String(sc));
    set("--text-body", `${(14 * sc).toFixed(1)}px`);
    set("--text-chrome", `${(13 * sc).toFixed(1)}px`);
    set("--text-sm", `${(12 * sc).toFixed(1)}px`);
    set("--text-xs", `${(11 * sc).toFixed(1)}px`);

    /* effects and decoration */
    set("--glass-blur", s.blur ? "18px" : "0px");
    set("--bg-alpha", String(s.bgIntensity / 100));
    set("--bg-image", s.backgroundImage ? `url("${s.backgroundImage}")` : "none");

    /* flags the stylesheet keys off */
    root.dataset.theme = s.theme;
    root.dataset.density = s.density;
    root.dataset.tabStyle = s.tabStyle;
    root.dataset.tabs = s.tabPosition;
    root.dataset.motion = s.motion ? "on" : "off";
    root.dataset.blur = s.blur ? "on" : "off";
    root.dataset.compact = s.compactToolbar ? "on" : "off";
    root.dataset.bg = s.backgroundStyle;
    root.dataset.shield = s.showShield ? "on" : "off";
    root.dataset.kbd = s.showKbdHint ? "on" : "off";
  }

  /* --------------------------------------------------------------- public */

  function get() {
    return { ...state };
  }

  function set(patch) {
    state = coerce({ ...state, ...patch });
    apply(state);
    save();
    emit();
    return get();
  }

  function usePreset(id) {
    const preset = PRESETS[id];
    if (!preset) return set({ theme: "custom" });
    const palette = {};
    for (const key of PALETTE_KEYS) palette[key] = preset[key];
    return set({ ...palette, theme: id });
  }

  function useTone(id) {
    const tone = TONES[id];
    if (!tone) return get();
    const next = { ...state };
    for (const key of ["base", "surface", "raised", "active", "line"]) next[key] = tone[key];
    next.theme = "custom";
    return set(next);
  }

  function reset() {
    state = coerce(null);
    apply(state);
    save();
    emit();
    return get();
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    const parsed = JSON.parse(text); // let the caller surface the error
    return set(parsed);
  }

  /* The preset id that matches a palette, or "custom". */
  function matchPreset(palette) {
    for (const [id, p] of Object.entries(PRESETS)) {
      if (PALETTE_KEYS.every((k) => p[k].toLowerCase() === String(palette[k]).toLowerCase())) {
        return id;
      }
    }
    return "custom";
  }

  window.GoldTheme = {
    DEFAULTS,
    PRESETS,
    TONES,
    DENSITY,
    FONTS,
    SEARCH,
    PALETTE_KEYS,
    hexToRgb,
    shift,
    mix,
    isDark,
    get,
    set,
    apply,
    usePreset,
    useTone,
    reset,
    subscribe,
    exportJSON,
    importJSON,
    matchPreset,
  };

  /* Paint the stored theme before first frame. */
  apply(state);
})();

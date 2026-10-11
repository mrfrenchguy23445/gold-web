"use strict";

/* Gold-Web chrome.
 *
 * The browser's own interface: tabs, the new tab, the Protection Centre and
 * Settings. It is one document that renders the internal pages; each real page
 * lives in its own content browser beneath the toolbar (see the shell's
 * GoldWebWindowDelegate). Internal page = chrome draws it; external page = the
 * shell shows a content overlay and only the title/url/history come back here.
 *
 * The theme lives in theme.js. This file only reads it (through GoldTheme) and
 * never hardcodes a colour.
 */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const PAGES = new Set(["newtab", "privacy", "settings", "placeholder"]);

const PAGE_META = {
  newtab: { title: "New tab", url: "goldweb://newtab", icon: "i-plus" },
  privacy: { title: "Protection Centre", url: "goldweb://privacy", icon: "i-shield" },
  settings: { title: "Settings", url: "goldweb://settings", icon: "i-settings" },
  placeholder: { title: "Coming up", url: "goldweb://coming-soon", icon: "i-globe" },
};

const SHORTCUTS = [
  { label: "Eaglercraft", letter: "E", url: "https://eaglercraft.com/" },
  { label: "YouTube", letter: "Y", url: "https://www.youtube.com/" },
  { label: "GitHub", letter: "G", url: "https://github.com/" },
  { label: "Reddit", letter: "R", url: "https://www.reddit.com/" },
  { label: "Wikipedia", letter: "W", url: "https://www.wikipedia.org/" },
];

const ACCENTS = [
  "#e0b84c", "#f0d179", "#ff9a4d", "#ff5d6c", "#ff7ab6", "#a679ff",
  "#5b8cff", "#38d6e6", "#35d09a", "#c6ff3d", "#9aa7b4", "#f0f0f0",
];

const BACKGROUNDS = ["solid", "aura", "mesh", "grid", "image"];

/* Native bridge.
 *
 * Inside the shell, CEF injects window.cefQuery (see the message router in
 * app/src/goldweb_client.cpp). Window controls are bare tokens; everything else
 * is a JSON command. In a plain browser preview there is no bridge, so native()
 * reports false and the UI falls back to toasts.
 */
if (typeof window.cefQuery === "function" && !window.goldweb) {
  const raw = (request) => window.cefQuery({ request, onSuccess() {}, onFailure() {} });
  window.goldweb = {
    raw,
    send: (payload) => raw(JSON.stringify(payload)),
    windowControl: (action) => raw(`window:${action}`),
    quit: () => raw("app:quit"),
  };
}

// Send a JSON command to the shell. Returns false in a plain browser.
function native(payload) {
  const bridge = window.goldweb;
  if (bridge && typeof bridge.send === "function") {
    bridge.send(payload);
    return true;
  }
  return false;
}

const theme = window.GoldTheme;

let settings = theme.get();

const els = {
  tabs: $("#tabs"),
  add: $("#tab-add"),
  omnibox: $("#omnibox-input"),
  suggest: $("#omnibox-suggest"),
  menu: $("#menu"),
  privacy: $("#privacy-pop"),
  palette: $("#palette"),
  paletteInput: $("#palette-input"),
  paletteList: $("#palette-list"),
  reload: $("#nav-reload"),
  back: $("#nav-back"),
  forward: $("#nav-forward"),
  settingsBody: $("#settings-body"),
};

let tabs = [];
let activeId = null;
let seq = 0;

/* -------------------------------------------------------------- tabs */

function makeTab(page = "newtab", title) {
  seq += 1;
  const meta = PAGE_META[page] || PAGE_META.placeholder;
  return {
    id: `t${seq}`,
    page,
    external: false,
    title: title || meta.title,
    icon: meta.icon,
    url: meta.url,
    loading: false,
    canGoBack: false,
    canGoForward: false,
  };
}

const activeTab = () => tabs.find((t) => t.id === activeId);

function renderTabs() {
  els.tabs.replaceChildren(
    ...tabs.map((t) => {
      const el = document.createElement("button");
      el.className = "tab" + (t.id === activeId ? " is-active" : "");
      if (t.loading) el.classList.add("is-loading");
      el.setAttribute("role", "tab");
      el.setAttribute("aria-selected", String(t.id === activeId));
      el.innerHTML = `
        <span class="tab__favicon"><svg><use href="#${t.icon}"></use></svg></span>
        <span class="tab__title"></span>
        <span class="tab__close" role="button" aria-label="Close tab"><svg><use href="#i-x"></use></svg></span>`;
      el.querySelector(".tab__title").textContent = t.title;
      el.querySelector(".tab__close").addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(t.id);
      });
      el.addEventListener("click", () => activate(t.id));
      return el;
    })
  );
  updateNavButtons();
}

function renderPage() {
  const t = activeTab();
  const page = t ? t.page : "newtab";
  $$(".page").forEach((p) => p.classList.toggle("is-active", p.dataset.page === page));
  if (t) els.omnibox.value = t.url;
  if (page === "newtab") renderNewTab();
  if (page === "settings") ensureSection();
}

// Enable/disable back/forward/reload against the active tab.
function updateNavButtons() {
  const t = activeTab();
  const external = !!(t && t.external);
  els.back.disabled = !(external && t.canGoBack);
  els.forward.disabled = !(external && t.canGoForward);
}

function activate(id) {
  activeId = id;
  renderTabs();
  renderPage();
  closePopovers();
  native({ cmd: "tab:activate", id });
}

function addTab(page = "newtab", title) {
  const t = makeTab(page, title);
  tabs.push(t);
  activeId = t.id;
  renderTabs();
  renderPage();
  closePopovers();
  native({ cmd: "tab:new", id: t.id });
  native({ cmd: "tab:activate", id: t.id });
  if (page === "newtab") setTimeout(() => $("#newtab-search")?.focus(), 0);
  return t;
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i === -1) return;
  tabs.splice(i, 1);
  native({ cmd: "tab:close", id });
  if (activeId === id) {
    const next = tabs[i] || tabs[i - 1];
    if (next) activeId = next.id;
    else {
      tabs.push(makeTab("newtab"));
      activeId = tabs[0].id;
      native({ cmd: "tab:new", id: activeId });
    }
  }
  renderTabs();
  renderPage();
  if (activeId) native({ cmd: "tab:activate", id: activeId });
}

function openPage(page, title) {
  const t = activeTab();
  if (!t) return;
  t.external = false;
  t.page = page;
  t.title = title || PAGE_META[page]?.title || "Gold-Web";
  t.icon = PAGE_META[page]?.icon || "i-globe";
  t.url = PAGE_META[page]?.url || "goldweb://coming-soon";
  if (page === "placeholder") {
    $("#placeholder-title").textContent = title || "Coming up";
    $("#placeholder-text").textContent =
      `${title || "This part of Gold-Web"} is on the roadmap, not in this build yet.`;
  }
  renderTabs();
  renderPage();
  closePopovers();
  // Tell the shell to take the page overlay away — the chrome draws this one.
  native({ cmd: "tab:go", id: t.id, url: t.url });
}

/* ---------------------------------------------------------- navigation */

function searchUrl(query) {
  const engine = theme.SEARCH[settings.searchEngine] || theme.SEARCH.duckduckgo;
  return engine.url + encodeURIComponent(query);
}

// Turn whatever the user typed into a URL: a goldweb:// page, a full URL, a
// bare host, or a search.
function resolveInput(value) {
  const v = value.trim();
  if (!v) return null;
  if (/^goldweb:\/\//i.test(v)) return v;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  if (/^[^\s/]+\.[^\s/]+/.test(v) && !/\s/.test(v)) return "https://" + v;
  return searchUrl(v);
}

function goTo(url) {
  const t = activeTab();
  if (!t || !url) return;
  if (/^goldweb:\/\//i.test(url)) {
    const m = url.match(/^goldweb:\/\/([a-z-]+)/i);
    openPage(m && PAGES.has(m[1]) ? m[1] : "placeholder");
    return;
  }
  t.external = true;
  t.page = "external";
  t.url = url;
  t.loading = true;
  t.canGoBack = false;
  t.canGoForward = false;
  t.title = hostOf(url);
  renderTabs();
  renderPage();
  els.omnibox.value = url;
  if (!native({ cmd: "tab:go", id: t.id, url })) {
    toast(`Preview only — ${hostOf(url)} opens in a tab inside the shell.`);
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "") || url;
  } catch (err) {
    return url;
  }
}

/* Applied from the shell: window.GoldChrome.onTabState({...}). */
function onTabState(state) {
  const t = tabs.find((tab) => tab.id === state.id);
  if (!t) return;
  if (state.title) t.title = state.title;
  if (state.url) t.url = state.url;
  t.loading = !!state.loading;
  t.canGoBack = !!state.canGoBack;
  t.canGoForward = !!state.canGoForward;
  renderTabs();
  if (t.id === activeId) {
    if (document.activeElement !== els.omnibox) els.omnibox.value = t.url;
    updateNavButtons();
  }
}

// Tell the shell where the page area starts, so content overlays line up under
// the toolbar at any density or font size.
function reportChromeTop() {
  const content = document.getElementById("content");
  if (!content) return;
  native({ cmd: "chrome:top", top: Math.round(content.getBoundingClientRect().top) });
}

/* --------------------------------------------------------- new tab */

function hueOf(hex) {
  const c = theme.hexToRgb(hex);
  if (!c) return 45;
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 45;
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}

function tileColors(i) {
  const dark = theme.isDark(settings.base);
  const h = Math.round((hueOf(settings.accent) + i * 29) % 360);
  return dark
    ? {
        grad: `linear-gradient(135deg, hsl(${h} 72% 55% / 0.32), hsl(${h} 72% 48% / 0.14))`,
        ink: `hsl(${h} 85% 72%)`,
      }
    : {
        grad: `linear-gradient(135deg, hsl(${h} 70% 55% / 0.22), hsl(${h} 70% 45% / 0.1))`,
        ink: `hsl(${h} 65% 34%)`,
      };
}

function renderShortcuts() {
  const wrap = $("#shortcuts");
  wrap.hidden = !settings.showShortcuts;
  if (!settings.showShortcuts) return;
  wrap.style.setProperty("--shortcut-cols", String(Math.min(SHORTCUTS.length, 5)));
  wrap.replaceChildren(
    ...SHORTCUTS.map((s, i) => {
      const b = document.createElement("button");
      b.className = "shortcut";
      b.innerHTML = `<span class="shortcut__icon"></span><span class="shortcut__label"></span>`;
      const icon = b.querySelector(".shortcut__icon");
      const tc = tileColors(i);
      icon.style.setProperty("--tile-grad", tc.grad);
      icon.style.setProperty("--tile-ink", tc.ink);
      icon.textContent = s.letter;
      b.querySelector(".shortcut__label").textContent = s.label;
      b.addEventListener("click", () => goTo(s.url));
      return b;
    })
  );
}

function fmtTime(d) {
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  if (settings.clock24h) return `${String(h).padStart(2, "0")}:${m}`;
  const suffix = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
}

function renderClock() {
  const clock = $("#newtab-clock");
  const date = $("#newtab-date");
  const greeting = $("#newtab-greeting");
  clock.hidden = !settings.showClock;
  date.hidden = !settings.showClock;
  greeting.hidden = !settings.showGreeting;
  if (!settings.showClock && !settings.showGreeting) return;

  const now = new Date();
  clock.textContent = fmtTime(now);
  date.textContent = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const hour = now.getHours();
  const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const name = settings.userName.trim();
  greeting.innerHTML = `Good ${part}${name ? `, <b></b>` : ""}`;
  if (name) greeting.querySelector("b").textContent = name;
}

function renderNewTab() {
  renderClock();
  renderShortcuts();
  updateStats();
}

/* ------------------------------------------------------- stats + popovers */

function updateStats() {
  // Real counts arrive with the request layer. Zero is the honest value today.
  for (const id of ["stat-blocked", "shield-count", "pop-blocked", "pop-session"]) {
    const el = document.getElementById(id);
    if (el) el.textContent = "0";
  }
  const ring = $(".shield-ring__value");
  if (ring) ring.style.strokeDashoffset = "320";
}

function closePopovers() {
  els.menu.hidden = true;
  els.privacy.hidden = true;
  if (els.suggest) els.suggest.hidden = true;
}

function openPopover(pop, trigger) {
  const wasOpen = !pop.hidden;
  closePopovers();
  if (wasOpen) return;
  pop.hidden = false;
  const r = trigger.getBoundingClientRect();
  const pr = pop.getBoundingClientRect();
  let left = Math.min(r.right - pr.width, window.innerWidth - pr.width - 8);
  left = Math.max(8, left);
  let top = r.bottom + 6;
  if (top + pr.height > window.innerHeight - 8) top = r.top - pr.height - 6;
  pop.style.left = `${left}px`;
  pop.style.top = `${Math.max(8, top)}px`;
}

/* ------------------------------------------------------------ toast */

let toastEl = null;
let toastTimer = 0;

function toast(message) {
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.className = "toast";
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
}

/* ------------------------------------------------------------ settings UI */

let section = "appearance";

function showSection(name) {
  section = name;
  $$(".ssec").forEach((s) => (s.hidden = s.dataset.ssec !== name));
  $$("#settings-nav button").forEach((b) =>
    b.classList.toggle("is-on", b.dataset.snav === name)
  );
  els.settingsBody.scrollTop = 0;
  if (name === "data") fillThemeText();
}

/* Keeps the visible section valid when a settings tab is activated. */
function ensureSection() {
  showSection(section);
}

function matchTone(s) {
  for (const [id, tone] of Object.entries(theme.TONES)) {
    if (
      tone.base === s.base && tone.surface === s.surface && tone.raised === s.raised &&
      tone.active === s.active && tone.line === s.line
    ) {
      return id;
    }
  }
  return "";
}

function hex6(value) {
  const c = theme.hexToRgb(value);
  return c
    ? `#${[c.r, c.g, c.b].map((n) => n.toString(16).padStart(2, "0")).join("")}`
    : "#000000";
}

function buildPresets() {
  $("#preset-grid").replaceChildren(
    ...Object.entries(theme.PRESETS).map(([id, p]) => {
      const b = document.createElement("button");
      b.className = "preset";
      b.dataset.preset = id;
      b.innerHTML = `
        <span class="preset__preview" style="background:${p.base}">
          <span class="preset__dot" style="background:${p.accent}"></span>
        </span>
        <span class="preset__name">${p.name}</span>
        <svg class="preset__check"><use href="#i-check"></use></svg>`;
      b.addEventListener("click", () => {
        theme.usePreset(id);
        toast(`${p.name} theme applied.`);
      });
      return b;
    })
  );
}

function buildSwatches() {
  $("#accent-swatches").replaceChildren(
    ...ACCENTS.map((color) => {
      const b = document.createElement("button");
      b.className = "swatch";
      b.dataset.color = color;
      b.style.background = color;
      b.title = color;
      b.setAttribute("aria-label", `Accent ${color}`);
      b.addEventListener("click", () => {
        theme.set({ accent: color, theme: theme.matchPreset({ ...theme.get(), accent: color }) });
      });
      return b;
    })
  );
}

function bindControls() {
  $$("[data-setting]").forEach((el) => {
    const key = el.dataset.setting;

    if (el.classList.contains("switch")) {
      el.addEventListener("click", () => theme.set({ [key]: !theme.get()[key] }));
      return;
    }

    if (el.dataset.kind === "seg") {
      $$("button[data-value]", el).forEach((btn) =>
        btn.addEventListener("click", () => {
          if (key === "tone") theme.useTone(btn.dataset.value);
          else theme.set({ [key]: btn.dataset.value });
        })
      );
      return;
    }

    if (el.tagName === "SELECT") {
      el.addEventListener("change", () => theme.set({ [key]: el.value }));
      return;
    }

    if (el.type === "range") {
      el.addEventListener("input", () => theme.set({ [key]: Number(el.value) }));
      return;
    }

    if (el.type === "color") {
      el.addEventListener("input", () => {
        const value = hex6(el.value);
        theme.set({ accent: value, theme: theme.matchPreset({ ...theme.get(), accent: value }) });
      });
      return;
    }

    if (el.type === "text") {
      el.addEventListener("input", () => theme.set({ [key]: el.value }));
      return;
    }
  });
}

/* Push the current settings into every bound control. */
function syncControls() {
  settings = theme.get();
  const s = settings;

  $$("[data-setting]").forEach((el) => {
    const key = el.dataset.setting;
    if (el.classList.contains("switch")) {
      el.setAttribute("aria-checked", String(!!s[key]));
    } else if (el.dataset.kind === "seg") {
      const value = key === "tone" ? matchTone(s) : s[key];
      $$("button[data-value]", el).forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.value === value))
      );
    } else if (el.tagName === "SELECT") {
      el.value = s[key];
    } else if (el.type === "range") {
      el.value = s[key];
      const out = el.closest(".range-field")?.querySelector("output");
      if (out) out.value = s[key];
    } else if (el.type === "color") {
      el.value = hex6(s[key]);
    } else if (el.tagName === "INPUT" && document.activeElement !== el) {
      el.value = s[key];
    }
  });

  const hex = $("#accent-hex");
  if (hex) hex.textContent = s.accent;

  $$("#preset-grid .preset").forEach((b) =>
    b.classList.toggle("is-on", b.dataset.preset === s.theme)
  );
  $$("#accent-swatches .swatch").forEach((b) =>
    b.classList.toggle("is-on", b.dataset.color.toLowerCase() === s.accent.toLowerCase())
  );

  // rows that only apply in certain modes
  $("#row-bg-image").hidden = s.backgroundStyle !== "image";
  $("#row-bg-intensity").hidden = s.backgroundStyle === "solid";
  $("#row-clock24").hidden = !s.showClock;

  const note = $("#palette-theme");
  if (note) note.textContent = `Theme: ${theme.PRESETS[s.theme]?.name || "Custom"}`;
}

/* ------------------------------------------------------- theme file */

function fillThemeText() {
  const ta = $("#theme-text");
  if (ta) ta.value = theme.exportJSON();
}

function copyTheme() {
  const text = theme.exportJSON();
  const ta = $("#theme-text");
  if (ta) ta.value = text;
  const done = () => toast("Theme JSON copied.");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done, () => {
      if (ta) ta.select();
      toast("Select and copy the JSON above.");
    });
  } else {
    if (ta) ta.select();
    toast("Select and copy the JSON above.");
  }
}

function loadThemeFromText() {
  const ta = $("#theme-text");
  if (!ta || !ta.value.trim()) return toast("Nothing to load.");
  try {
    theme.importJSON(ta.value);
    toast("Theme loaded.");
  } catch (err) {
    toast("That isn't valid theme JSON.");
  }
}

function importThemeFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      theme.importJSON(String(reader.result));
      fillThemeText();
      toast("Theme imported.");
    } catch (err) {
      toast("Couldn't read that theme file.");
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  theme.reset();
  toast("Everything is back to defaults.");
}

function clearData() {
  try {
    localStorage.removeItem("goldweb:settings:v1");
  } catch (err) {
    /* nothing to clear */
  }
  theme.reset();
  toast("Gold-Web settings cleared from this device.");
}

/* ------------------------------------------------------- command palette */

let paletteItems = [];
let paletteIndex = 0;

function paletteActions() {
  const s = theme.get();
  const items = [
    { label: "New tab", sub: "Ctrl T", icon: "i-plus", run: () => addTab("newtab") },
    { label: "Open settings", sub: "Ctrl ,", icon: "i-settings", run: () => openSettings("appearance") },
    { label: "Customise appearance", icon: "i-palette", run: () => openSettings("appearance") },
    { label: "Open Protection Centre", icon: "i-shield", run: () => openPage("privacy") },
  ];
  for (const [id, p] of Object.entries(theme.PRESETS)) {
    items.push({ label: `Theme: ${p.name}`, swatch: p.accent, run: () => theme.usePreset(id) });
  }
  items.push(
    { label: `${s.motion ? "Turn off" : "Turn on"} motion`, icon: "i-sparkles", run: () => theme.set({ motion: !s.motion }) },
    { label: `${s.blur ? "Turn off" : "Turn on"} transparency`, icon: "i-droplet", run: () => theme.set({ blur: !s.blur }) },
    { label: "Cycle new-tab background", icon: "i-image", run: cycleBackground },
    { label: `${s.showShield ? "Hide" : "Show"} address-bar shield`, icon: "i-shield", run: () => theme.set({ showShield: !s.showShield }) },
    { label: "Reset everything", icon: "i-reset", run: resetAll }
  );
  return items;
}

function cycleBackground() {
  const next = BACKGROUNDS[(BACKGROUNDS.indexOf(settings.backgroundStyle) + 1) % BACKGROUNDS.length];
  theme.set({ backgroundStyle: next });
  toast(`New-tab background: ${next}.`);
}

function renderPalette() {
  const query = els.paletteInput.value.trim().toLowerCase();
  const all = paletteActions();
  paletteItems = query ? all.filter((a) => a.label.toLowerCase().includes(query)) : all;
  if (paletteIndex >= paletteItems.length) paletteIndex = 0;

  if (!paletteItems.length) {
    els.paletteList.replaceChildren(
      Object.assign(document.createElement("div"), {
        className: "palette__empty",
        textContent: "No matching commands.",
      })
    );
    return;
  }

  els.paletteList.replaceChildren(
    ...paletteItems.map((item, i) => {
      const b = document.createElement("button");
      b.className = "palette-item" + (i === paletteIndex ? " is-on" : "");
      if (item.swatch) {
        const sw = document.createElement("span");
        sw.className = "palette-item__swatch";
        sw.style.background = item.swatch;
        b.append(sw);
      } else {
        b.innerHTML = `<svg><use href="#${item.icon}"></use></svg>`;
      }
      const label = document.createElement("span");
      label.textContent = item.label;
      b.append(label);
      if (item.sub) {
        const sub = document.createElement("span");
        sub.className = "palette-item__sub";
        sub.textContent = item.sub;
        b.append(sub);
      }
      b.addEventListener("click", () => runPaletteItem(i));
      b.addEventListener("mousemove", () => {
        if (paletteIndex !== i) {
          paletteIndex = i;
          renderPalette();
        }
      });
      return b;
    })
  );
}

function runPaletteItem(i) {
  const item = paletteItems[i];
  closePalette();
  if (item) item.run();
}

function openPalette() {
  closePopovers();
  els.palette.hidden = false;
  els.paletteInput.value = "";
  paletteIndex = 0;
  renderPalette();
  els.paletteInput.focus();
}

function closePalette() {
  els.palette.hidden = true;
}

/* ------------------------------------------------------ omnibox suggestions */

const INTERNAL = [
  { label: "New tab", url: "goldweb://newtab", page: "newtab", icon: "i-plus" },
  { label: "Protection Centre", url: "goldweb://privacy", page: "privacy", icon: "i-shield" },
  { label: "Settings", url: "goldweb://settings", page: "settings", icon: "i-settings" },
];

function renderSuggest() {
  const value = els.omnibox.value.trim().toLowerCase();
  const matches = INTERNAL.filter(
    (p) => !value || p.label.toLowerCase().includes(value) || p.url.includes(value)
  );
  const items = [...matches];
  const raw = els.omnibox.value.trim();
  if (raw && !/^goldweb:\/\//i.test(raw)) {
    items.push({
      label: `Search for "${raw}"`,
      engine: theme.SEARCH[settings.searchEngine]?.name || "your search engine",
      icon: "i-search",
      query: raw,
    });
  }
  if (!items.length) {
    els.suggest.hidden = true;
    return;
  }

  els.suggest.replaceChildren(
    ...items.map((item) => {
      const b = document.createElement("button");
      b.className = "suggest-item";
      b.innerHTML = `<svg><use href="#${item.icon}"></use></svg><span></span><span class="suggest-item__sub"></span>`;
      b.querySelector("span").textContent = item.label;
      b.querySelector(".suggest-item__sub").textContent = item.engine || item.url;
      b.addEventListener("mousedown", (e) => {
        e.preventDefault();
        navigate(item);
      });
      return b;
    })
  );
  els.suggest.hidden = false;
}

function navigate(item) {
  els.suggest.hidden = true;
  els.omnibox.blur();
  if (item.page) goTo(PAGE_META[item.page].url);
  else if (item.query) goTo(searchUrl(item.query));
}

function openSettings(name) {
  openPage("settings");
  showSection(name || "appearance");
}

/* -------------------------------------------------------------- wire */

function wire() {
  els.add.addEventListener("click", () => addTab("newtab"));

  $("#btn-menu").addEventListener("click", (e) => {
    e.stopPropagation();
    openPopover(els.menu, e.currentTarget);
  });
  $("#btn-shield").addEventListener("click", (e) => {
    e.stopPropagation();
    openPopover(els.privacy, e.currentTarget);
  });
  $("#btn-bookmark").addEventListener("click", () => toast("Bookmarking arrives in M4."));
  $("#cmd-open").addEventListener("click", openPalette);

  els.reload.addEventListener("click", () => {
    const t = activeTab();
    if (t && t.external) native({ cmd: "nav:reload", id: t.id });
    else spin(els.reload);
  });
  els.back.addEventListener("click", () => {
    const t = activeTab();
    if (t && t.external && t.canGoBack) native({ cmd: "nav:back", id: t.id });
  });
  els.forward.addEventListener("click", () => {
    const t = activeTab();
    if (t && t.external && t.canGoForward) native({ cmd: "nav:forward", id: t.id });
  });

  // settings nav
  $$("#settings-nav button").forEach((b) =>
    b.addEventListener("click", () => showSection(b.dataset.snav))
  );
  $("#settings-reset")?.addEventListener("click", resetAll);
  $("#theme-copy")?.addEventListener("click", copyTheme);
  $("#theme-load")?.addEventListener("click", loadThemeFromText);
  $("#theme-file")?.addEventListener("click", () => $("#theme-file-input").click());
  $("#theme-file-input")?.addEventListener("change", (e) => {
    importThemeFile(e.target.files?.[0]);
    e.target.value = "";
  });
  $("#clear-data")?.addEventListener("click", clearData);

  // popover / palette / global clicks
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) {
      closePalette();
      return;
    }
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === "newtab") addTab("newtab");
      else if (action === "privacy") openPage("privacy");
      else if (action === "settings") openPage("settings");
      else if (action === "appearance") openSettings("appearance");
      else if (action === "quit") quit();
      else if (action === "placeholder") openPage("placeholder", actionEl.dataset.title);
      closePopovers();
      return;
    }
    if (!e.target.closest(".popover")) closePopovers();
    if (!e.target.closest(".palette")) closePalette();
    if (!e.target.closest(".omnibox")) els.suggest.hidden = true;
  });

  $$(".wbtn").forEach((b) => b.addEventListener("click", () => windowControl(b.dataset.win)));

  // omnibox
  els.omnibox.addEventListener("input", renderSuggest);
  els.omnibox.addEventListener("focus", () => {
    els.omnibox.select();
    renderSuggest();
  });
  els.omnibox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const url = resolveInput(els.omnibox.value);
      if (url) goTo(url);
      else openPage("newtab");
      els.suggest.hidden = true;
      els.omnibox.blur();
    }
    if (e.key === "Escape") {
      els.suggest.hidden = true;
      els.omnibox.blur();
    }
  });

  // palette
  els.paletteInput.addEventListener("input", () => {
    paletteIndex = 0;
    renderPalette();
  });
  els.paletteInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      paletteIndex = Math.min(paletteIndex + 1, paletteItems.length - 1);
      renderPalette();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      paletteIndex = Math.max(paletteIndex - 1, 0);
      renderPalette();
    } else if (e.key === "Enter") {
      e.preventDefault();
      runPaletteItem(paletteIndex);
    } else if (e.key === "Escape") {
      closePalette();
    }
  });

  // global keys
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !els.palette.hidden) {
      closePalette();
      return;
    }
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      const t = activeTab();
      if (t && t.external) {
        e.preventDefault();
        native({ cmd: e.key === "ArrowLeft" ? "nav:back" : "nav:forward", id: t.id });
      }
      return;
    }
    if (!(e.ctrlKey || e.metaKey)) {
      if ((e.key === "/" || e.key === "?") && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
        e.preventDefault();
        openPalette();
      }
      return;
    }
    const k = e.key.toLowerCase();
    if (k === "t") { e.preventDefault(); addTab("newtab"); }
    else if (k === "w") { e.preventDefault(); if (activeId) closeTab(activeId); }
    else if (k === "l") { e.preventDefault(); els.omnibox.focus(); }
    else if (k === "k") { e.preventDefault(); openPalette(); }
    else if (k === ",") { e.preventDefault(); openSettings("appearance"); }
    else if (k === "r") {
      e.preventDefault();
      const t = activeTab();
      if (t && t.external) native({ cmd: "nav:reload", id: t.id });
      else spin(els.reload);
    }
    else if (k >= "1" && k <= "9") {
      const t = tabs[Number(k) - 1];
      if (t) { e.preventDefault(); activate(t.id); }
    }
  });

  // new-tab search box is recreated per page switch, so delegate.
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "newtab-search" && e.key === "Enter" && e.target.value.trim()) {
      goTo(resolveInput(e.target.value));
      e.target.blur();
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target.closest(".searchbox__go")) {
      const input = $("#newtab-search");
      if (input?.value.trim()) goTo(resolveInput(input.value));
    }
  });

  // re-render the live bits whenever a setting changes
  theme.subscribe(() => {
    syncControls();
    if (activeTab()?.page === "newtab") renderNewTab();
    requestAnimationFrame(reportChromeTop);
  });

  window.addEventListener("resize", () => reportChromeTop());
}

function spin(el) {
  el.animate(
    [{ transform: "rotate(0)" }, { transform: "rotate(360deg)" }],
    { duration: 420, easing: "ease-out" }
  );
}

function windowControl(action) {
  const bridge = window.goldweb;
  if (bridge && typeof bridge.windowControl === "function") bridge.windowControl(action);
  else toast(`${action[0].toUpperCase()}${action.slice(1)} — wired to the shell in the next step.`);
}

function quit() {
  const bridge = window.goldweb;
  if (bridge && typeof bridge.quit === "function") bridge.quit();
  else toast("Quit is wired to the shell in the next step.");
}

/* --------------------------------------------------------------- go */

// The shell calls into these (see GoldWebWindowDelegate::SendTabState).
window.GoldChrome = { onTabState };

reportChromeTop();
native({ cmd: "chrome:ready" });

buildPresets();
buildSwatches();
bindControls();
syncControls();
wire();
setInterval(() => {
  if (activeTab()?.page === "newtab") renderClock();
}, 20000);
addTab("newtab");

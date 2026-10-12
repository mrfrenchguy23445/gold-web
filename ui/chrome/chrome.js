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

const PAGES = new Set([
  "newtab", "privacy", "settings", "history", "bookmarks", "downloads", "placeholder",
]);

const PAGE_META = {
  newtab: { title: "New tab", url: "goldweb://newtab", icon: "i-plus" },
  privacy: { title: "Protection Centre", url: "goldweb://privacy", icon: "i-shield" },
  settings: { title: "Settings", url: "goldweb://settings", icon: "i-settings" },
  history: { title: "History", url: "goldweb://history", icon: "i-history" },
  bookmarks: { title: "Bookmarks", url: "goldweb://bookmarks", icon: "i-bookmark" },
  downloads: { title: "Downloads", url: "goldweb://downloads", icon: "i-download" },
  placeholder: { title: "Coming up", url: "goldweb://coming-soon", icon: "i-globe" },
};

const SHORTCUTS = [
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
  app: $("#app"),
  titlebar: $("#titlebar"),
  tabstrip: $("#tabstrip"),
  rail: $("#rail"),
  tabs: $("#tabs"),
  add: $("#tab-add"),
  omnibox: $("#omnibox-input"),
  suggest: $("#omnibox-suggest"),
  menu: $("#menu"),
  privacy: $("#privacy-pop"),
  workspacePop: $("#workspace-pop"),
  workspaceList: $("#workspace-list"),
  workspaceName: $("#workspace-name"),
  workspaceDot: $("#workspace-dot"),
  bookmark: $("#btn-bookmark"),
  findbar: $("#findbar"),
  findInput: $("#find-input"),
  findCount: $("#find-count"),
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
let dragId = null;

/* ---------------------------------------------------------- workspaces */

// A workspace is a named set of tabs. A tab belongs to exactly one, and the tab
// strip only ever shows the active workspace's own tabs, so unrelated work
// stays apart without a second window. The list lives on this device only,
// beside the theme and the session, and is never sent anywhere.
const WORKSPACE_KEY = "goldweb:workspaces:v1";
const WORKSPACE_COLORS = [
  "#e0b84c", "#5b8cff", "#35d09a", "#ff7a4d", "#a679ff", "#38d6e6", "#ff5d6c", "#c6ff3d",
];

let workspaces = [];
let activeWorkspace = null;

function readWorkspaces() {
  try {
    const raw = JSON.parse(localStorage.getItem(WORKSPACE_KEY) || "null");
    if (raw && Array.isArray(raw.items)) {
      const items = raw.items.filter(
        (w) => w && typeof w.id === "string" && typeof w.name === "string"
      );
      if (items.length) return { items, active: raw.active };
    }
  } catch (err) {
    /* a corrupt list is the same as none */
  }
  return null;
}

function saveWorkspaces() {
  try {
    localStorage.setItem(
      WORKSPACE_KEY,
      JSON.stringify({ items: workspaces, active: activeWorkspace })
    );
  } catch (err) {
    /* storage is best-effort */
  }
}

function nextWorkspaceId() {
  let n = 0;
  for (const w of workspaces) {
    const m = /^w(\d+)$/.exec(w.id);
    if (m) n = Math.max(n, Number(m[1]));
  }
  return `w${n + 1}`;
}

function workspaceById(id) {
  return workspaces.find((w) => w.id === id) || null;
}

function initWorkspaces() {
  const saved = readWorkspaces();
  workspaces = saved ? saved.items : [];
  if (!workspaces.length) {
    workspaces.push({ id: "w1", name: "Personal", color: WORKSPACE_COLORS[0] });
  }
  activeWorkspace =
    saved && workspaces.some((w) => w.id === saved.active) ? saved.active : workspaces[0].id;
  // Never start with the tab strip pointing at a workspace that is gone.
  if (!workspaceById(activeWorkspace)) activeWorkspace = workspaces[0].id;
  renderWorkspaceButton();
}

function tabsInWorkspace(id) {
  return tabs.filter((t) => t.workspace === id);
}

function renderWorkspaceButton() {
  const w = workspaceById(activeWorkspace);
  if (!w) return;
  if (els.workspaceName) els.workspaceName.textContent = w.name;
  if (els.workspaceDot) els.workspaceDot.style.background = w.color;
  const count = tabsInWorkspace(w.id).length;
  $("#btn-workspace")?.setAttribute(
    "aria-label",
    `Workspaces. Current: ${w.name}, ${count} tab${count === 1 ? "" : "s"}`
  );
}

function renderWorkspaceList() {
  if (!els.workspaceList) return;
  els.workspaceList.replaceChildren(
    ...workspaces.map((w) => {
      const count = tabsInWorkspace(w.id).length;
      const row = document.createElement("div");
      row.className = "workspace-row" + (w.id === activeWorkspace ? " is-on" : "");
      row.innerHTML = `
        <button class="workspace-row__pick" type="button">
          <span class="workspace-row__dot"></span>
          <span class="workspace-row__name"></span>
          <span class="workspace-row__count"></span>
        </button>
        <button class="row-action" type="button" title="Rename workspace" aria-label="Rename workspace"><svg><use href="#i-pencil"></use></svg></button>
        <button class="row-action" type="button" title="Delete workspace" aria-label="Delete workspace"><svg><use href="#i-trash"></use></svg></button>`;
      row.querySelector(".workspace-row__dot").style.background = w.color;
      row.querySelector(".workspace-row__name").textContent = w.name;
      row.querySelector(".workspace-row__count").textContent = String(count);
      row.querySelector(".workspace-row__pick").addEventListener("click", () => switchWorkspace(w.id));
      const [renameBtn, deleteBtn] = row.querySelectorAll(".row-action");
      renameBtn.addEventListener("click", () => beginRenameWorkspace(row, w));
      deleteBtn.addEventListener("click", () => deleteWorkspace(w.id));
      return row;
    })
  );
}

function beginRenameWorkspace(row, w) {
  const nameEl = row.querySelector(".workspace-row__name");
  const input = document.createElement("input");
  input.className = "workspace-row__input";
  input.value = w.name;
  input.setAttribute("aria-label", "Workspace name");
  nameEl.replaceWith(input);
  input.focus();
  input.select();
  let settled = false;
  const finish = (save) => {
    if (settled) return;
    settled = true;
    if (save) renameWorkspace(w.id, input.value);
    else renderWorkspaceList();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      finish(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("blur", () => finish(true));
}

function switchWorkspace(id) {
  const w = workspaceById(id);
  if (!w || id === activeWorkspace) return;
  activeWorkspace = id;
  saveWorkspaces();
  const mine = tabsInWorkspace(id);
  if (mine.length) activate(mine[mine.length - 1].id);
  else addTab("newtab");
  renderWorkspaceButton();
  renderWorkspaceList();
}

function newWorkspace(name) {
  const w = {
    id: nextWorkspaceId(),
    name: name || `Workspace ${workspaces.length + 1}`,
    color: WORKSPACE_COLORS[workspaces.length % WORKSPACE_COLORS.length],
  };
  workspaces.push(w);
  activeWorkspace = w.id;
  saveWorkspaces();
  addTab("newtab");
  renderWorkspaceButton();
  renderWorkspaceList();
  toast(`Workspace "${w.name}" created.`);
  return w;
}

function renameWorkspace(id, name) {
  const w = workspaceById(id);
  const clean = (name || "").trim();
  if (!w || !clean) return;
  w.name = clean.slice(0, 40);
  saveWorkspaces();
  renderWorkspaceButton();
  renderWorkspaceList();
}

function deleteWorkspace(id) {
  if (workspaces.length <= 1) {
    toast("Gold-Web needs at least one workspace.");
    return;
  }
  const i = workspaces.findIndex((w) => w.id === id);
  if (i === -1) return;
  const fallback = workspaces.find((w) => w.id !== id)?.id;
  // Move its tabs into the first remaining workspace rather than throwing them
  // away; switching views should never close anything.
  tabs.forEach((t) => {
    if (t.workspace === id) t.workspace = fallback;
  });
  const name = workspaces[i].name;
  workspaces.splice(i, 1);
  if (activeWorkspace === id) {
    activeWorkspace = fallback;
    const mine = tabsInWorkspace(fallback);
    if (mine.length) activate(mine[mine.length - 1].id);
    else addTab("newtab");
  }
  saveWorkspaces();
  saveSession();
  renderTabs();
  renderPage();
  renderWorkspaceButton();
  renderWorkspaceList();
  toast(`Workspace "${name}" removed. Its tabs moved to the next workspace.`);
}

/* ----------------------------------------------------------- session */

// The snapshot of open tabs, so the next launch can put them back. It is kept
// in this device's storage only, beside the theme, and is never sent anywhere.
// Only the pages are remembered; internal tabs (a new tab, Settings) are not.
const SESSION_KEY = "goldweb:session:v1";

function readSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (raw && Array.isArray(raw.tabs)) return raw;
  } catch (err) {
    /* a corrupt snapshot is the same as none */
  }
  return null;
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (err) {
    /* best effort */
  }
}

function saveSession() {
  if (!settings.restoreSession) {
    clearSession();
    return;
  }
  try {
    const open = tabs.filter((t) => t.external && t.url);
    const snapshot = {
      tabs: open.slice(0, 40).map((t) => ({
        url: t.url,
        title: t.title,
        workspace: t.workspace,
      })),
      active: Math.max(open.findIndex((t) => t.id === activeId), 0),
      workspace: activeWorkspace,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  } catch (err) {
    /* storage is best-effort */
  }
}

// Put the last session back: one tab per remembered page, each in the workspace
// it belonged to, with the page that was active selected again. With nothing to
// restore (or restore switched off), start on a new tab.
function restoreSession() {
  initWorkspaces();
  const saved = settings.restoreSession ? readSession() : null;
  const items = (saved?.tabs || [])
    .map((entry) =>
      entry && typeof entry.url === "string"
        ? { url: entry.url, workspace: entry.workspace }
        : null
    )
    .filter((entry) => entry && entry.url && !/^goldweb:\/\//i.test(entry.url))
    .slice(0, 40);

  if (items.length === 0) {
    addTab("newtab");
    return;
  }

  const created = items.map((entry) => {
    if (entry.workspace && workspaceById(entry.workspace)) activeWorkspace = entry.workspace;
    const t = addTab("newtab");
    goTo(entry.url);
    return t;
  });

  const index = Math.min(Math.max(saved.active | 0, 0), items.length - 1);
  const wanted = items[index];
  if (wanted.workspace && workspaceById(wanted.workspace)) activeWorkspace = wanted.workspace;
  const target = created[index];
  if (target) activate(target.id);
  renderWorkspaceButton();
  saveWorkspaces();
  saveSession();
}

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
    workspace: activeWorkspace,
  };
}

const activeTab = () => tabs.find((t) => t.id === activeId);

// The tabs the tab strip is showing: only the active workspace's own.
const visibleTabs = () => tabsInWorkspace(activeWorkspace);

function renderTabs() {
  els.tabs.replaceChildren(
    ...visibleTabs().map((t) => {
      const el = document.createElement("button");
      el.className = "tab" + (t.id === activeId ? " is-active" : "");
      if (t.loading) el.classList.add("is-loading");
      el.setAttribute("role", "tab");
      el.draggable = true;
      el.dataset.id = t.id;
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

      // Reorder by dragging. The list is rearranged live so the tab follows the
      // pointer, and written back into the model when the drag ends.
      el.addEventListener("dragstart", (e) => {
        dragId = t.id;
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", t.id);
      });
      el.addEventListener("dragover", (e) => {
        if (!dragId || dragId === t.id) return;
        e.preventDefault();
        const dragged = els.tabs.querySelector(`[data-id="${dragId}"]`);
        if (!dragged) return;
        const box = el.getBoundingClientRect();
        const after = e.clientX > box.left + box.width / 2;
        els.tabs.insertBefore(dragged, after ? el.nextSibling : el);
      });
      el.addEventListener("dragend", () => {
        if (!dragId) return;
        dragId = null;
        const order = $$("#tabs .tab").map((node) => node.dataset.id);
        const rank = new Map(order.map((id, i) => [id, i]));
        // Only the visible workspace is reordered; tabs belonging to other
        // workspaces keep their places (the sort is stable).
        tabs.sort((a, b) => {
          const ra = rank.has(a.id) ? rank.get(a.id) : Infinity;
          const rb = rank.has(b.id) ? rank.get(b.id) : Infinity;
          return ra - rb;
        });
        saveSession();
        renderTabs();
      });

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
  if (page === "history") requestHistory();
  if (page === "bookmarks") requestBookmarks();
  if (page === "downloads") requestDownloads();
  updateBookmarkButton();
}

// Enable/disable back/forward/reload against the active tab.
function updateNavButtons() {
  const t = activeTab();
  const external = !!(t && t.external);
  els.back.disabled = !(external && t.canGoBack);
  els.forward.disabled = !(external && t.canGoForward);
}

function activate(id) {
  const t = tabs.find((tab) => tab.id === id);
  if (t && t.workspace !== activeWorkspace) {
    // Something outside the strip asked for a tab in another workspace (opening
    // a bookmark, restoring a session): follow it there.
    activeWorkspace = t.workspace;
    saveWorkspaces();
    renderWorkspaceButton();
  }
  activeId = id;
  renderTabs();
  renderPage();
  closePopovers();
  native({ cmd: "tab:activate", id });
  saveSession();
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
  renderWorkspaceButton();
  saveSession();
  return t;
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i === -1) return;
  const ws = tabs[i].workspace;
  tabs.splice(i, 1);
  native({ cmd: "tab:close", id });
  if (activeId === id) {
    const mine = tabsInWorkspace(ws);
    activeId = mine.length ? mine[mine.length - 1].id : null;
  }
  if (!activeId) {
    // The workspace is empty now; give it a fresh new tab.
    activeWorkspace = ws;
    const t = makeTab("newtab");
    tabs.push(t);
    activeId = t.id;
    native({ cmd: "tab:new", id: t.id });
  }
  renderTabs();
  renderPage();
  renderWorkspaceButton();
  if (activeId) native({ cmd: "tab:activate", id: activeId });
  saveSession();
}

// Move to the next (or previous) tab in the active workspace, wrapping round.
function cycleTab(step) {
  const mine = visibleTabs();
  if (mine.length < 2) return;
  const i = mine.findIndex((t) => t.id === activeId);
  const next = mine[(((i === -1 ? 0 : i) + step) % mine.length + mine.length) % mine.length];
  if (next) activate(next.id);
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
  saveSession();
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
  saveSession();
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
    updateBookmarkButton();
  }
  if (t.external) saveSession();
}

// Tell the shell where the page area starts, so content overlays line up under
// the toolbar at any density or font size.
function reportChromeTop() {
  const content = document.getElementById("content");
  if (!content) return;
  // The page area starts where the chrome ends. With the tab strip moved to a
  // side the page also starts a rail width in, so the shell needs the full
  // rectangle, not just the top.
  const r = content.getBoundingClientRect();
  native({
    cmd: "chrome:top",
    top: Math.round(r.top),
    left: Math.round(r.left),
    width: Math.round(r.width),
  });
}

/* --------------------------------------------------------------- tab strip */

// Where the tab strip lives: across the top, or down the left/right side of the
// window. The strip is one element; this moves it between the title bar (top)
// and the side rail (left/right) and lets CSS lay out the rest.
function applyTabPosition(pos) {
  if (!els.app || !els.tabstrip || !els.rail || !els.titlebar) return;
  els.app.dataset.tabs = pos;
  if (pos === "left" || pos === "right") {
    els.rail.appendChild(els.tabstrip);
  } else {
    els.titlebar.insertBefore(els.tabstrip, els.titlebar.firstChild);
  }
  requestAnimationFrame(reportChromeTop);
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
  renderProtection();
}

/* ---------------------------------------------------------- protection */

// What the privacy layer has refused. The shell owns the session total (it
// counts requests as it cancels them); all-time is summed here on the device and
// never sent anywhere.
let protection = { page: 0, session: 0, enabled: true };
let allTimeBlocked = readAllTime();
let lastSessionCount = 0;
let lastProtectionSetting = null;
let lastTabPosition = null;

function readAllTime() {
  try {
    return Number(localStorage.getItem("goldweb:blocked:v1")) || 0;
  } catch (err) {
    return 0;
  }
}

function saveAllTime() {
  try {
    localStorage.setItem("goldweb:blocked:v1", String(allTimeBlocked));
  } catch (err) {
    /* storage is best-effort */
  }
}

function setStat(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

// Applied from the shell: window.GoldChrome.onProtection({page,session,enabled}).
function onProtection(state) {
  protection.enabled = !!state.enabled;
  protection.page = state.page | 0;
  protection.session = state.session | 0;
  if (protection.session > lastSessionCount) {
    allTimeBlocked += protection.session - lastSessionCount;
    saveAllTime();
  }
  lastSessionCount = protection.session;
  renderProtection();
}

function renderProtection() {
  setStat("stat-blocked", protection.session);
  setStat("shield-count", protection.session);
  setStat("pop-blocked", protection.page);
  setStat("pop-session", protection.session);
  setStat("stat-session", protection.session);
  setStat("stat-alltime", allTimeBlocked);
  setStat("stat-page", protection.page);

  const state = document.getElementById("shield-state");
  if (state) {
    state.innerHTML = protection.enabled
      ? '<span class="dot"></span> Protection is on'
      : '<span class="dot dot--off"></span> Protection is off for this window';
  }

  const ring = $(".shield-ring__value");
  if (ring) {
    // Fill the ring as the session count climbs; empty when turned off.
    const circumference = 327;
    const fill = protection.enabled ? Math.min(protection.session / 50, 1) : 0;
    ring.style.strokeDashoffset = String(circumference * (1 - fill));
  }
}

/* ----------------------------------------------------------- history */

// The shell keeps the list and hands it over on request; here we just render it.
let historyEntries = [];

function requestHistory() {
  renderHistory();
  if (!native({ cmd: "history:list" })) {
    renderHistory({ preview: true });
  }
}

// Applied from the shell: window.GoldChrome.onHistory({entries:[...]}).
function onHistory(payload) {
  const entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
  historyEntries = entries.filter((e) => e && typeof e.url === "string");
  renderHistory();
}

function dayLabel(seconds) {
  const then = new Date((seconds || 0) * 1000);
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const daysAgo = Math.round((midnight - day) / 86400000);
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return then.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

function renderHistory(opts = {}) {
  const list = document.getElementById("history-list");
  if (!list) return;

  const query = (document.getElementById("history-search")?.value || "").trim().toLowerCase();
  const entries = historyEntries.filter(
    (e) => !query || `${e.title || ""} ${e.url}`.toLowerCase().includes(query)
  );

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    if (historyEntries.length) empty.textContent = "No pages match that search.";
    else if (opts.preview) empty.textContent = "History is kept by the shell — open the real app to see it.";
    else empty.textContent = "Nothing here yet. Pages you visit will show up here.";
    list.replaceChildren(empty);
    return;
  }

  // Group by day, newest first (the shell already sorts newest first).
  const groups = new Map();
  for (const e of entries) {
    const label = dayLabel(e.time);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(e);
  }

  const frag = document.createDocumentFragment();
  for (const [label, items] of groups) {
    const head = document.createElement("div");
    head.className = "history-day";
    head.textContent = label;
    frag.append(head);

    for (const e of items) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "history-row";
      row.innerHTML = `
        <span class="history-row__icon"><svg><use href="#i-globe"></use></svg></span>
        <span class="history-row__text">
          <span class="history-row__title"></span>
          <span class="history-row__url"></span>
        </span>
        <span class="history-row__time"></span>`;
      row.querySelector(".history-row__title").textContent = e.title || hostOf(e.url);
      row.querySelector(".history-row__url").textContent = e.url;
      row.querySelector(".history-row__time").textContent = new Date((e.time || 0) * 1000)
        .toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      row.addEventListener("click", () => {
        addTab("newtab");
        goTo(e.url);
      });
      frag.append(row);
    }
  }
  list.replaceChildren(frag);
}

function clearHistory() {
  historyEntries = [];
  if (document.getElementById("history-search")) document.getElementById("history-search").value = "";
  renderHistory();
  native({ cmd: "history:clear" });
  toast("History cleared.");
}

function closePopovers() {
  els.menu.hidden = true;
  els.privacy.hidden = true;
  if (els.workspacePop) els.workspacePop.hidden = true;
  if (els.suggest) els.suggest.hidden = true;
}

/* ---------------------------------------------------------- bookmarks */

// The shell keeps the list (it owns the JSON file); this renders it and asks for
// changes, so the star and the Bookmarks page always agree with the store.
let bookmarkEntries = [];

function requestBookmarks() {
  renderBookmarks();
  if (!native({ cmd: "bookmark:list" })) renderBookmarks({ preview: true });
}

// Applied from the shell: window.GoldChrome.onBookmarks({entries:[...]}).
function onBookmarks(payload) {
  const entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
  bookmarkEntries = entries.filter((e) => e && typeof e.url === "string");
  renderBookmarks();
  updateBookmarkButton();
}

function isBookmarked(url) {
  return !!url && bookmarkEntries.some((e) => e.url === url);
}

function updateBookmarkButton() {
  if (!els.bookmark) return;
  const t = activeTab();
  const on = !!(t && t.external && isBookmarked(t.url));
  els.bookmark.classList.toggle("is-on", on);
  els.bookmark.setAttribute("aria-pressed", String(on));
  els.bookmark.title = on ? "Remove bookmark (Ctrl+D)" : "Bookmark this page (Ctrl+D)";
}

function toggleBookmark() {
  const t = activeTab();
  if (!t || !t.external || !t.url) {
    toast("Only web pages can be bookmarked.");
    return;
  }
  if (isBookmarked(t.url)) {
    native({ cmd: "bookmark:remove", url: t.url });
    toast("Bookmark removed.");
  } else {
    native({ cmd: "bookmark:add", url: t.url, title: t.title || hostOf(t.url) });
    toast("Bookmarked.");
  }
}

function renderBookmarks(opts = {}) {
  const list = document.getElementById("bookmarks-list");
  if (!list) return;

  const query = (document.getElementById("bookmarks-search")?.value || "").trim().toLowerCase();
  const entries = bookmarkEntries.filter(
    (e) => !query || `${e.title || ""} ${e.url}`.toLowerCase().includes(query)
  );

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    if (bookmarkEntries.length) empty.textContent = "No bookmarks match that search.";
    else if (opts.preview) empty.textContent = "Bookmarks are kept by the shell — open the real app to see them.";
    else empty.textContent = "Nothing saved yet. Use the star, or press Ctrl+D, on a page you like.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...entries.map(bookmarkRow));
}

function bookmarkRow(e) {
  const row = document.createElement("div");
  row.className = "history-row history-row--action";
  row.innerHTML = `
    <span class="history-row__icon"><svg><use href="#i-bookmark"></use></svg></span>
    <button class="history-row__open" type="button">
      <span class="history-row__title"></span>
      <span class="history-row__url"></span>
    </button>
    <button class="row-action" type="button" title="Remove bookmark" aria-label="Remove bookmark"><svg><use href="#i-trash"></use></svg></button>`;
  row.querySelector(".history-row__title").textContent = e.title || hostOf(e.url);
  row.querySelector(".history-row__url").textContent = e.url;
  row.querySelector(".history-row__open").addEventListener("click", () => {
    addTab("newtab");
    goTo(e.url);
  });
  row.querySelector(".row-action").addEventListener("click", () => {
    native({ cmd: "bookmark:remove", url: e.url });
    toast("Bookmark removed.");
  });
  return row;
}

function clearBookmarks() {
  bookmarkEntries = [];
  const search = document.getElementById("bookmarks-search");
  if (search) search.value = "";
  renderBookmarks();
  native({ cmd: "bookmark:clear" });
  updateBookmarkButton();
  toast("Bookmarks cleared.");
}

/* ---------------------------------------------------------- downloads */

let downloadEntries = [];

function requestDownloads() {
  renderDownloads();
  if (!native({ cmd: "download:list" })) renderDownloads({ preview: true });
}

// Applied from the shell: window.GoldChrome.onDownloads({entries:[...]}).
function onDownloads(payload) {
  downloadEntries = payload && Array.isArray(payload.entries) ? payload.entries : [];
  renderDownloads();
}

function bytesLabel(n) {
  const v = Math.max(0, Number(n) || 0);
  if (v < 1024) return `${v} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = v / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[i]}`;
}

const DOWNLOAD_STATE = {
  progress: "Downloading",
  done: "Done",
  cancelled: "Cancelled",
  interrupted: "Interrupted",
};

function renderDownloads(opts = {}) {
  const list = document.getElementById("downloads-list");
  if (!list) return;

  if (downloadEntries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = opts.preview
      ? "Downloads are kept by the shell — open the real app to see them."
      : "Nothing downloaded yet. Files you download land in your Downloads folder.";
    list.replaceChildren(empty);
    return;
  }

  list.replaceChildren(...downloadEntries.map(downloadRow));
}

function downloadRow(d) {
  const state = DOWNLOAD_STATE[d.state] || d.state || "Downloading";
  const percent = Math.max(0, Math.min(100, Number(d.percent) || 0));
  const row = document.createElement("div");
  row.className = "history-row history-row--action download-row";
  row.innerHTML = `
    <span class="history-row__icon"><svg><use href="#i-download"></use></svg></span>
    <span class="history-row__text">
      <span class="history-row__title"></span>
      <span class="history-row__url"></span>
      <span class="download-bar"><span class="download-bar__fill"></span></span>
    </span>
    <span class="download-meta">
      <b class="download-meta__state"></b>
      <span class="download-meta__size"></span>
    </span>
    <span class="download-actions"></span>`;
  row.querySelector(".history-row__title").textContent = d.name || hostOf(d.url);
  row.querySelector(".history-row__url").textContent = d.path || d.url || "";
  row.querySelector(".download-meta__state").textContent = state;
  const received = bytesLabel(d.received);
  row.querySelector(".download-meta__size").textContent =
    d.state === "progress" && d.total ? `${received} of ${bytesLabel(d.total)}` : received;
  if (d.state === "progress") {
    row.querySelector(".download-bar__fill").style.width = `${percent}%`;
  } else {
    row.querySelector(".download-bar")?.remove();
  }

  const actions = row.querySelector(".download-actions");
  const addAction = (icon, title, onClick) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "row-action";
    b.title = title;
    b.setAttribute("aria-label", title);
    b.innerHTML = `<svg><use href="#${icon}"></use></svg>`;
    b.addEventListener("click", onClick);
    actions.append(b);
  };

  if (d.state === "progress") {
    addAction("i-x", "Cancel download", () => native({ cmd: "download:cancel", id: d.id }));
  } else {
    if (d.path) {
      addAction("i-open", "Open file", () => native({ cmd: "download:open", path: d.path }));
      addAction("i-folder", "Show in folder", () => native({ cmd: "download:reveal", path: d.path }));
    }
    addAction("i-trash", "Remove from list", () => native({ cmd: "download:remove", id: d.id }));
  }
  return row;
}

function clearDownloads() {
  downloadEntries = [];
  renderDownloads();
  native({ cmd: "download:clear" });
  toast("Download list cleared.");
}

/* ----------------------------------------------------------- find bar */

// Find in page. The bar sits between the toolbar and the page area, so a page
// overlay can never cover it; showing it shrinks the page area and the shell is
// told where the page now starts (reportChromeTop).
let findOpen = false;

function openFind() {
  els.findbar.hidden = false;
  findOpen = true;
  els.findInput.focus();
  els.findInput.select();
  requestAnimationFrame(reportChromeTop);
  if (els.findInput.value) runFind(false);
}

function closeFind() {
  if (!findOpen) return;
  findOpen = false;
  els.findbar.hidden = true;
  els.findCount.textContent = "";
  const t = activeTab();
  if (t && t.external) native({ cmd: "find:stop", id: t.id });
  requestAnimationFrame(reportChromeTop);
}

function runFind(next, backwards) {
  const t = activeTab();
  if (!t || !t.external) {
    els.findCount.textContent = "not on web pages";
    return;
  }
  native({
    cmd: next ? "find:next" : "find:start",
    id: t.id,
    text: els.findInput.value,
    forward: !backwards,
  });
}

// Applied from the shell: window.GoldChrome.onFindResult({id,count,active,final}).
// CEF reports several updates per search; only the last one is settled, so the
// count is not scrollable through the intermediate ones.
function onFindResult(state) {
  if (state.id !== activeId) return;
  if (!state.final) return;
  // CEF counts the current match from zero, so show it from one the way people
  // read it: "1/4" is the first of four, not the zeroth.
  els.findCount.textContent = state.count
    ? `${Math.max(state.active, 0) + 1}/${state.count}`
    : "no matches";
}

/* --------------------------------------------------------------- zoom */

function zoom(direction) {
  const t = activeTab();
  if (!t || !t.external) {
    toast("Zoom applies to web pages.");
    return;
  }
  native({ cmd: "nav:zoom", id: t.id, direction });
}

function onZoom(state) {
  const percent = Math.round(Math.pow(1.2, Number(state.level) || 0) * 100);
  toast(`Zoom ${percent}%`);
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
    { label: "New workspace", sub: "Ctrl Shift N", icon: "i-workspace", run: () => newWorkspace() },
    { label: "Open settings", sub: "Ctrl ,", icon: "i-settings", run: () => openSettings("appearance") },
    { label: "Open history", sub: "Ctrl H", icon: "i-history", run: () => openPage("history") },
    { label: "Open bookmarks", sub: "Ctrl B", icon: "i-bookmark", run: () => openPage("bookmarks") },
    { label: "Open downloads", sub: "Ctrl J", icon: "i-download", run: () => openPage("downloads") },
    { label: "Find in page", sub: "Ctrl F", icon: "i-search", run: openFind },
    { label: "Zoom in", sub: "Ctrl +", icon: "i-zoom-in", run: () => zoom("in") },
    { label: "Zoom out", sub: "Ctrl -", icon: "i-zoom-out", run: () => zoom("out") },
    { label: "Reset zoom", sub: "Ctrl 0", icon: "i-reset", run: () => zoom("reset") },
    { label: "Bookmark this page", sub: "Ctrl D", icon: "i-bookmark", run: toggleBookmark },
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
  { label: "History", url: "goldweb://history", page: "history", icon: "i-history" },
  { label: "Bookmarks", url: "goldweb://bookmarks", page: "bookmarks", icon: "i-bookmark" },
  { label: "Downloads", url: "goldweb://downloads", page: "downloads", icon: "i-download" },
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

/* ---------------------------------------------------------- shortcuts */

// The one place that knows what each keyboard action does. Two callers use it:
// the chrome document's own keydown (when the chrome has focus) and the shell,
// through window.GoldChrome.onAccelerator, when a page has focus. The shell
// only sends the names below — see app/src/goldweb_content_client.cpp.
function runShortcut(name) {
  const t = activeTab();
  switch (name) {
    case "new-tab":
      addTab("newtab");
      return true;
    case "close-tab":
      if (activeId) closeTab(activeId);
      return true;
    case "focus-address":
      els.omnibox.focus();
      return true;
    case "palette":
      openPalette();
      return true;
    case "settings":
      openSettings("appearance");
      return true;
    case "history":
      openPage("history");
      return true;
    case "bookmarks":
      openPage("bookmarks");
      return true;
    case "downloads":
      openPage("downloads");
      return true;
    case "bookmark":
      toggleBookmark();
      return true;
    case "find":
      openFind();
      return true;
    case "zoom-in":
      zoom("in");
      return true;
    case "zoom-out":
      zoom("out");
      return true;
    case "zoom-reset":
      zoom("reset");
      return true;
    case "new-workspace":
      newWorkspace();
      return true;
    case "next-tab":
      cycleTab(1);
      return true;
    case "prev-tab":
      cycleTab(-1);
      return true;
    case "reload":
      if (t && t.external) native({ cmd: "nav:reload", id: t.id });
      else spin(els.reload);
      return true;
    case "back":
      if (t && t.external) native({ cmd: "nav:back", id: t.id });
      return true;
    case "forward":
      if (t && t.external) native({ cmd: "nav:forward", id: t.id });
      return true;
    default:
      break;
  }
  const numbered = /^tab-([1-9])$/.exec(name);
  if (numbered) {
    const tab = visibleTabs()[Number(numbered[1]) - 1];
    if (tab) {
      activate(tab.id);
      return true;
    }
  }
  return false;
}

// A Ctrl/Cmd key press to a shortcut name, or null if it is not one of ours.
// The event is passed whole because Shift changes the meaning of a few keys.
function shortcutForKey(e) {
  const k = e.key.toLowerCase();
  if (k === "tab") return e.shiftKey ? "prev-tab" : "next-tab";
  if (e.shiftKey) {
    if (k === "n") return "new-workspace";
    if (k === "j") return "downloads";
    return null;
  }
  if (k === "t") return "new-tab";
  if (k === "w") return "close-tab";
  if (k === "l") return "focus-address";
  if (k === "k") return "palette";
  if (k === ",") return "settings";
  if (k === "h") return "history";
  if (k === "b") return "bookmarks";
  if (k === "j") return "downloads";
  if (k === "d") return "bookmark";
  if (k === "f") return "find";
  if (k === "r") return "reload";
  if (k === "+" || k === "=") return "zoom-in";
  if (k === "-") return "zoom-out";
  if (k === "0") return "zoom-reset";
  if (k >= "1" && k <= "9") return "tab-" + k;
  return null;
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
  $("#btn-workspace").addEventListener("click", (e) => {
    e.stopPropagation();
    renderWorkspaceList();
    openPopover(els.workspacePop, e.currentTarget);
  });
  $("#workspace-new").addEventListener("click", () => newWorkspace());
  els.bookmark.addEventListener("click", toggleBookmark);
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
      else if (action === "history") openPage("history");
      else if (action === "bookmarks") openPage("bookmarks");
      else if (action === "downloads") openPage("downloads");
      else if (action === "new-workspace") newWorkspace();
      else if (action === "find") openFind();
      else if (action === "zoom-in") zoom("in");
      else if (action === "zoom-out") zoom("out");
      else if (action === "zoom-reset") zoom("reset");
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
    if (e.key === "Escape" && findOpen) {
      closeFind();
      return;
    }
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      if (runShortcut(e.key === "ArrowLeft" ? "back" : "forward")) e.preventDefault();
      return;
    }
    if (!(e.ctrlKey || e.metaKey)) {
      if ((e.key === "/" || e.key === "?") && !/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) {
        e.preventDefault();
        openPalette();
      }
      return;
    }
    const name = shortcutForKey(e);
    if (name && runShortcut(name)) e.preventDefault();
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

  // history
  $("#history-search").addEventListener("input", () => renderHistory());
  $("#history-clear").addEventListener("click", clearHistory);

  // bookmarks
  $("#bookmarks-search")?.addEventListener("input", () => renderBookmarks());
  $("#bookmarks-clear")?.addEventListener("click", clearBookmarks);

  // downloads
  $("#downloads-clear")?.addEventListener("click", clearDownloads);

  // find bar
  els.findInput.addEventListener("input", () => runFind(false));
  els.findInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runFind(true, e.shiftKey);
    }
  });
  $("#find-next").addEventListener("click", () => runFind(true, false));
  $("#find-prev").addEventListener("click", () => runFind(true, true));
  $("#find-close").addEventListener("click", closeFind);

  // re-render the live bits whenever a setting changes
  theme.subscribe(() => {
    syncControls();
    if (activeTab()?.page === "newtab") renderNewTab();
    if (settings.tabPosition !== lastTabPosition) {
      lastTabPosition = settings.tabPosition;
      applyTabPosition(settings.tabPosition);
    }
    if (settings.trackingProtection !== lastProtectionSetting) {
      lastProtectionSetting = settings.trackingProtection;
      native({ cmd: "protection:set", enabled: settings.trackingProtection });
      renderProtection();
    }
    if (!settings.restoreSession) clearSession();
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
  // "Wipe on shutdown" should also forget the session snapshot.
  if (settings.wipeOnShutdown) clearSession();
  const bridge = window.goldweb;
  if (bridge && typeof bridge.quit === "function") bridge.quit();
  else toast("Quit is wired to the shell in the next step.");
}

/* --------------------------------------------------------------- go */

// The shell calls into these (see GoldWebWindowDelegate::SendTabState).
window.GoldChrome = {
  onTabState,
  onProtection,
  onHistory,
  onBookmarks,
  onDownloads,
  onFindResult,
  onZoom,
  onAccelerator: runShortcut,
};

applyTabPosition(settings.tabPosition);
reportChromeTop();
native({ cmd: "chrome:ready" });
lastProtectionSetting = settings.trackingProtection;
lastTabPosition = settings.tabPosition;
native({ cmd: "protection:set", enabled: settings.trackingProtection });

buildPresets();
buildSwatches();
bindControls();
syncControls();
wire();
setInterval(() => {
  if (activeTab()?.page === "newtab") renderClock();
}, 20000);
native({ cmd: "bookmark:list" });
native({ cmd: "download:list" });
restoreSession();

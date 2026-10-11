"use strict";

/* Gold-Web chrome.
 *
 * This is the browser's own interface. For M0 it manages tabs and internal
 * pages in one document; wiring the address bar and tab content to real CEF
 * browser instances is the next step.
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
  { label: "Eaglercraft", letter: "E" },
  { label: "YouTube", letter: "Y" },
  { label: "GitHub", letter: "G" },
  { label: "Reddit", letter: "R" },
  { label: "Wikipedia", letter: "W" },
];

/* Native bridge.
 *
 * Inside the Gold-Web shell, CEF injects window.cefQuery (see the message
 * router in app/src/goldweb_client.cpp). Wrap it so the interface can drive the
 * frameless window and quit the app. In a plain browser preview there is no
 * bridge, and the UI falls back to toasts instead.
 */
if (typeof window.cefQuery === "function" && !window.goldweb) {
  const send = (request) =>
    window.cefQuery({ request, onSuccess() {}, onFailure() {} });
  window.goldweb = {
    windowControl: (action) => send(`window:${action}`),
    quit: () => send("app:quit"),
  };
}

const els = {
  tabs: $("#tabs"),
  add: $("#tab-add"),
  omnibox: $("#omnibox-input"),
  menu: $("#menu"),
  privacy: $("#privacy-pop"),
  reload: $("#nav-reload"),
  back: $("#nav-back"),
  forward: $("#nav-forward"),
};

let tabs = [];
let activeId = null;
let seq = 0;

/* -------------------------------------------------------------- tabs */

function makeTab(page = "newtab", title) {
  seq += 1;
  const meta = PAGE_META[page] || PAGE_META.placeholder;
  return { id: `t${seq}`, page, title: title || meta.title, icon: meta.icon, url: meta.url };
}

const activeTab = () => tabs.find((t) => t.id === activeId);

function renderTabs() {
  els.tabs.replaceChildren(
    ...tabs.map((t) => {
      const el = document.createElement("button");
      el.className = "tab" + (t.id === activeId ? " is-active" : "");
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
}

function renderPage() {
  const t = activeTab();
  const page = t ? t.page : "newtab";
  $$(".page").forEach((p) => p.classList.toggle("is-active", p.dataset.page === page));
  if (t) els.omnibox.value = t.url;
}

function activate(id) {
  activeId = id;
  renderTabs();
  renderPage();
  closePopovers();
}

function addTab(page = "newtab", title) {
  const t = makeTab(page, title);
  tabs.push(t);
  activeId = t.id;
  renderTabs();
  renderPage();
  closePopovers();
  if (page === "newtab") setTimeout(() => $("#newtab-search")?.focus(), 0);
  return t;
}

function closeTab(id) {
  const i = tabs.findIndex((t) => t.id === id);
  if (i === -1) return;
  tabs.splice(i, 1);
  if (activeId === id) {
    const next = tabs[i] || tabs[i - 1];
    if (next) activeId = next.id;
    else {
      tabs.push(makeTab("newtab"));
      activeId = tabs[0].id;
    }
  }
  renderTabs();
  renderPage();
}

function openPage(page, title) {
  const t = activeTab();
  if (!t) return;
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
}

/* --------------------------------------------------------- popovers */

function closePopovers() {
  els.menu.hidden = true;
  els.privacy.hidden = true;
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

/* ------------------------------------------------------- shortcuts */

function renderShortcuts() {
  $("#shortcuts").replaceChildren(
    ...SHORTCUTS.map((s) => {
      const b = document.createElement("button");
      b.className = "shortcut";
      b.innerHTML = `<span class="shortcut__icon"></span><span class="shortcut__label"></span>`;
      b.querySelector(".shortcut__icon").textContent = s.letter;
      b.querySelector(".shortcut__label").textContent = s.label;
      b.addEventListener("click", () =>
        toast(`${s.label} — real navigation arrives with the CEF content engine.`)
      );
      return b;
    })
  );
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
  $("#btn-bookmark").addEventListener("click", () =>
    toast("Bookmarking arrives in M4.")
  );

  els.reload.addEventListener("click", () => spin(els.reload));
  els.back.addEventListener("click", () => toast("No history yet."));
  els.forward.addEventListener("click", () => toast("No forward history yet."));

  document.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action === "newtab") addTab("newtab");
      else if (action === "privacy") openPage("privacy");
      else if (action === "settings") openPage("settings");
      else if (action === "quit") quit();
      else if (action === "placeholder") openPage("placeholder", actionEl.dataset.title);
      return;
    }
    if (e.target.closest(".switch")) {
      const sw = e.target.closest(".switch");
      sw.setAttribute("aria-checked", sw.getAttribute("aria-checked") === "true" ? "false" : "true");
      return;
    }
    if (!e.target.closest(".popover")) closePopovers();
  });

  $$(".wbtn").forEach((b) =>
    b.addEventListener("click", () => windowControl(b.dataset.win))
  );

  els.omnibox.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const v = els.omnibox.value.trim();
      const m = v.match(/^goldweb:\/\/([a-z]+)/i);
      if (m && PAGES.has(m[1])) openPage(m[1]);
      else if (v) toast("Real navigation arrives with the CEF content engine.");
      else openPage("newtab");
      els.omnibox.blur();
    }
    if (e.key === "Escape") els.omnibox.blur();
  });
  els.omnibox.addEventListener("focus", () => els.omnibox.select());

  document.addEventListener("keydown", (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = e.key.toLowerCase();
    if (k === "t") { e.preventDefault(); addTab("newtab"); }
    else if (k === "w") { e.preventDefault(); if (activeId) closeTab(activeId); }
    else if (k === "l") { e.preventDefault(); els.omnibox.focus(); }
    else if (k === "r") { e.preventDefault(); spin(els.reload); }
    else if (k >= "1" && k <= "9") {
      const t = tabs[Number(k) - 1];
      if (t) { e.preventDefault(); activate(t.id); }
    }
  });

  // The new-tab search box is recreated per page switch, so delegate.
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "newtab-search" && e.key === "Enter" && e.target.value.trim()) {
      toast("Search arrives with the CEF content engine.");
      e.target.blur();
    }
  });
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

renderShortcuts();
wire();
addTab("newtab");

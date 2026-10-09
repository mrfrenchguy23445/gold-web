const api = globalThis.browser ?? globalThis.chrome;

const DEFAULT_SHORTCUTS = [
  { name: "Wikipedia", url: "https://en.wikipedia.org" },
  { name: "Hacker News", url: "https://news.ycombinator.com" },
  { name: "MDN", url: "https://developer.mozilla.org" },
  { name: "GitHub", url: "https://github.com" },
];

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const shortcutsEl = document.getElementById("shortcuts");
const bookmarksEl = document.getElementById("bookmarks");
const dialog = document.getElementById("add-dialog");
const addForm = document.getElementById("add-form");
const addName = document.getElementById("add-name");
const addUrl = document.getElementById("add-url");

let shortcuts = [];

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function badgeText(name) {
  const match = name.match(/[a-z0-9]/i);
  return (match ? match[0] : "?").toUpperCase();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

async function saveShortcuts() {
  await api.storage.local.set({ shortcuts });
}

function renderShortcuts() {
  shortcutsEl.textContent = "";

  shortcuts.forEach((shortcut, index) => {
    const tile = document.createElement("a");
    tile.className = "tile";
    tile.href = shortcut.url;
    tile.title = shortcut.url;

    const badge = document.createElement("span");
    badge.className = "tile__badge";
    badge.textContent = badgeText(shortcut.name);

    const label = document.createElement("span");
    label.className = "tile__label";
    label.textContent = shortcut.name;

    const remove = document.createElement("button");
    remove.className = "tile__remove";
    remove.type = "button";
    remove.title = `Remove ${shortcut.name}`;
    remove.setAttribute("aria-label", `Remove ${shortcut.name}`);
    remove.textContent = "\u00d7";
    remove.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      shortcuts.splice(index, 1);
      await saveShortcuts();
      renderShortcuts();
    });

    tile.append(badge, label, remove);
    shortcutsEl.append(tile);
  });

  const add = document.createElement("button");
  add.className = "tile tile--add";
  add.type = "button";
  add.addEventListener("click", () => {
    addName.value = "";
    addUrl.value = "";
    dialog.showModal();
    addName.focus();
  });

  const addBadge = document.createElement("span");
  addBadge.className = "tile__badge";
  addBadge.textContent = "+";
  const addLabel = document.createElement("span");
  addLabel.className = "tile__label";
  addLabel.textContent = "Add";
  add.append(addBadge, addLabel);

  shortcutsEl.append(add);
}

async function renderBookmarks() {
  try {
    const roots = await api.bookmarks.getTree();
    const bar = roots?.[0]?.children?.find((node) => node.children);
    const items = (bar?.children ?? [])
      .filter((node) => node.url)
      .slice(0, 8);

    if (items.length === 0) {
      return;
    }

    bookmarksEl.textContent = "";
    for (const node of items) {
      const link = document.createElement("a");
      link.href = node.url;
      link.textContent = node.title || hostOf(node.url);
      bookmarksEl.append(link);
    }
    bookmarksEl.hidden = false;
  } catch {
    bookmarksEl.hidden = true;
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    return;
  }
  api.search.search({ query, disposition: "CURRENT_TAB" }).catch(() => {
    searchInput.value = query;
  });
  searchInput.value = "";
});

addForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = addName.value.trim();
  const url = addUrl.value.trim();
  if (!name || !url) {
    return;
  }
  shortcuts.push({ name, url: normalizeUrl(url) });
  await saveShortcuts();
  renderShortcuts();
  dialog.close();
});

document.getElementById("add-cancel").addEventListener("click", () => {
  dialog.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== searchInput) {
    event.preventDefault();
    searchInput.focus();
  }
});

(async function init() {
  const stored = await api.storage.local.get({ shortcuts: DEFAULT_SHORTCUTS });
  shortcuts = stored.shortcuts;
  renderShortcuts();
  renderBookmarks();
  searchInput.focus();
})();

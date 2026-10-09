# `src/` — the browser chrome

The front end of Gold-Web: everything you see around the page. It's a web
application, but a deliberately closed one — it renders our UI and never loads
remote content.

Planned areas (not all created yet):

- `chrome/` — window frame, tab strip, toolbar, address bar
- `pages/` — new tab, home, settings, history, bookmarks, downloads
- `privacy/` — the Privacy Control Centre UI
- `theme/` — the Gold UI tokens and components, sourced from `brand/gold-ui/`
- `lib/` — the typed bridge to the Rust core (commands and events)

It talks to `src-tauri/` through Tauri's command and event interface and holds
no secrets: cookies, keys, history and the privacy policy all live on the Rust
side.

# `ui/` — the browser chrome and pages

Everything the user sees and interacts with, written in HTML, CSS and
JavaScript and rendered by CEF. It's a deliberately closed web app: it draws our
interface and never loads remote content.

- `chrome/` — window frame, tab strip, toolbar, address bar, menus
- `pages/` — new tab, home, settings, history, bookmarks, downloads and the
  privacy centre

It talks to the C++ shell through a narrow bridge (the custom `goldweb://` scheme
and a message channel, settled during M0) and holds no secrets. Cookies, keys,
history and the privacy policy all live in `app/`.

The visual language is the Gold UI; its tokens live in `brand/gold-ui/`.

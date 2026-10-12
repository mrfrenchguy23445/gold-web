# How Gold-Web is put together

Gold-Web is a C++ desktop application that embeds the **Chromium Embedded
Framework (CEF)**. The browser around the engine — window, tabs, address bar,
privacy policy, storage — is ours. The engine that turns HTML, CSS and
JavaScript into pixels is Chromium's, through CEF.

## Why CEF

An earlier plan used the operating system's webview (Tauri on WebKitGTK). We
moved to CEF for one concrete reason: **compatibility**. Gold-Web is meant to
run the browser games people actually play — eaglercraft and others that lean on
WebGL, WebAssembly and modern JavaScript. Chromium is where those get tested
first, and CEF gives us Chromium's engine without adopting Chrome's interface or
its telemetry.

The cost is worth stating plainly: CEF bundles a large engine, so the
application is heavier than a webview shell, and we take on a C++ codebase and
its build system. We accept that for engine fidelity.

## Two halves

| | Written in | Rendered by | Holds secrets |
|---|---|---|---|
| **Shell** (`app/`) | C++ | — | yes |
| **Interface** (`ui/`) | HTML/CSS/JS | CEF | no |

The **shell** links against CEF, creates the window, manages browser instances
(tabs), and enforces policy. It is the trusted half.

The **interface** is the chrome and our pages — tabs, address bar, menus, new
tab, settings, the privacy centre. It's a closed web app that CEF renders. It
draws the browser; it does not get to decide what's private.

```
        ┌──────────────────────────────────────────────┐
        │  Interface (ui/)  — HTML/CSS/JS in CEF        │
        │  tabs · address bar · menus · our pages        │
        └───────────────▲───────────────┬──────────────┘
                        │ bridge        │ bridge
        ┌───────────────┴───────────────▼──────────────┐
        │  Shell (app/)  — C++ host process             │
        │  windows · tabs · privacy policy · storage     │
        └───────────────┬──────────────────────────────┘
                        │ CEF API
        ┌───────────────▼──────────────────────────────┐
        │  Chromium via CEF                             │
        │  renders our interface and page content        │
        └──────────────────────────────────────────────┘
```

## CEF in one paragraph

CEF is Chromium split into a reusable library. A CEF application is
multi-process: the **browser process** is our `app/` executable, and CEF spawns
**render**, **GPU** and **utility** processes that live outside our address
space. We implement a handful of callbacks — `CefApp`, `CefClient`,
`CefBrowser` and the render-side handlers — and CEF drives the rest. Every CEF
call happens on the browser process's UI thread; everything else is posted
there. Getting this lifecycle right is the core of M0.

The design keeps those helper processes sandboxed. The current M0 build runs
them directly instead: the minimal CEF distribution ships no sandbox library and
the Linux sandbox needs `chrome-sandbox` setuid root, so the shell builds with
`USE_SANDBOX=OFF` and passes `--no-zygote`. See `docs/BUILDING_LINUX.md`.

## What the shell builds today (M1)

Nothing below is aspirational — it runs:

- A **frameless** top-level window (CEF Views). The interface draws its own
  title bar and window buttons, and the shell forwards the CSS draggable regions
  (`-webkit-app-region`) so the window still moves like a native one.
- The **chrome** is one full-window `BrowserView` showing
  `goldweb://app/ui/chrome/index.html`. The host is a fixed name (`app`) so that
  relative asset URLs — `chrome.css`, and the shared
  `../../brand/gold-ui/tokens.css` — resolve under one origin.
- **Tabs are real browsers.** Every external tab gets its own `BrowserView`,
  added as an absolutely-positioned overlay in the rectangle below the toolbar.
  Only the active tab's view is visible; switching tabs shows and hides
  overlays, and closing a tab closes its browser. Internal pages (new tab,
  Settings, the Protection Centre) are drawn by the chrome and have no content
  browser at all.
- The **message bridge** is CEF's message router. Window controls travel as bare
  tokens (`window:minimize`, `window:maximize`, `window:close`, `app:quit`); the
  tab strip and navigation travel as small JSON commands (`tab:new`,
  `tab:close`, `tab:activate`, `tab:go`, `nav:back`/`forward`/`reload`/`stop`,
  and `chrome:top`, which tells the shell where the page area starts). The shell
  answers with `window.GoldChrome.onTabState({...})` — title, URL, loading and
  back/forward state. None of it exists in a plain browser.
- The **interface** is a small, closed web app under `ui/chrome/`. Its look is
  defined by design tokens in `brand/gold-ui/tokens.css` and applied by a theme
  engine in `ui/chrome/theme.js` that supports presets and per-setting
  overrides. Components read only custom properties, so restyling never touches
  layout code — see `docs/DESIGN.md`.
- **It runs from anywhere.** CEF's Chrome runtime looks for `icudtl.dat` and the
  `.pak` files relative to the working directory the process started in — fixed
  before `main()` runs, so an in-process `chdir()` is too late. The shell
  re-executes itself from its own directory at startup, which is why
  `./build/goldweb` works no matter which directory you launch it from.
  `--goldweb-root=PATH` still pins the interface to a specific directory.

### One window, two runtimes

CEF exposes two engine layers: **Chrome style** (the Chrome UI layer) and
**Alloy style** (the Chromium content layer). The rule that shapes this shell: a
Chrome-style window may host at most one Chrome-style `BrowserView`, but any
number of Alloy-style ones. So the chrome is a Chrome-style view and every
content tab is an Alloy view — the one arrangement that lets a single window
hold our custom chrome *and* many pages. We learned this the hard way: the first
build tried to add a second Chrome-style view and CEF refused it with
`Cannot add multiple Chrome style BrowserViews`.

## How the two halves talk

Two channels, both narrow:

1. **Local assets.** Our interface is served over a custom `goldweb://` scheme,
   handled inside the shell, so there is no web server and no remote origin.
   Only that scheme is trusted for the interface.
2. **A message bridge.** The interface asks the shell to do things (open a tab,
   navigate, read the block count) and listens for shell events (a page loaded,
   a tracker was blocked). The bridge is a fixed, typed command set — the
   interface can't call arbitrary C++.

Content pages get neither. They run in their own request context, with no access
to the bridge or the `goldweb://` scheme. Anything the chrome can do is
something a web page cannot.

## Drawing the chrome and the content

The black-and-gold chrome is a web page, so CEF has to render a web UI *and*
page content inside one window. M0's spike compared the two shapes:

- **CEF Views, windowed.** A native top-level window built from CEF's Views
  toolkit. Simplest to get right, good performance, the standard CEF layout
  model.
- **Off-screen rendering (OSR).** Every browser renders to a buffer and the
  shell composites. Maximum control over look and input, and the usual choice
  for heavily customised browsers, but more code and more to get subtly wrong.

M0 chose **windowed Views**, and M1 built it out. The chrome fills the window
and each content tab is a `BrowserView` placed as an overlay in the page
rectangle, using `CefWindow::AddOverlayView`. An overlay gives the page an exact
rectangle without a native layout manager, keeps the chrome a single ordinary
document, and needs no pixel copying the way OSR would. When the window resizes
or the interface reports a new toolbar height, the shell re-lays the overlays.

### The request path, and what it refuses (first cut)

The shell owns the request path, so blocking is a function in C++ rather than an
extension. Every content browser hands its network requests to
`GoldWebResourceRequestHandler`, which runs a small curated list of tracker hosts
(`app/src/goldweb_blocklist.cpp`) before anything leaves the machine and answers
`RV_CANCEL` for the ones it refuses. Two rules keep it honest and keep pages
working:

- **Never the main frame.** Blocking a navigation would break the tab; we only
  refuse subresources (images, scripts, beacons, fonts).
- **Never same-site.** A request to the page's own registrable domain is
  first-party, so it's allowed even if the host appears in the list.

It is on by default and each tab keeps its own count. The shell reports
`{page, session, enabled}` to the chrome over the same bridge as everything else,
and the chrome renders it on the new-tab line, the toolbar shield popover and the
Protection Centre. All-time totals are summed on the device in `localStorage` and
are not sent anywhere.

This is deliberately the small version: a fixed list, no per-site exceptions yet,
and no claim to stop fingerprinting or first-party tracking. The Protection
Centre says as much rather than implying more.

## Privacy model

Because we own the request path, blocking lives in the shell rather than in an
extension:

1. **Default deny for us.** No telemetry, analytics, studies or crash uploads,
   and CEF's own reporting is switched off. Any network call we make is explicit
   in code and listed in the privacy dashboard.
2. **Blocks first.** Tracker and ad blocking uses CEF's request interception
   (`CefResourceRequestHandler`), on by default, with per-site control.
3. **Network privacy at the edges.** Encrypted DNS and proxy support sit in the
   shell's network policy, so page content doesn't decide them.
4. **Least data, least time.** Cookies, cache and history have clear retention
   controls, including wipe-on-shutdown. Separate request contexts keep
   workspaces apart.
5. **Show the limits.** Wherever we report protection, we can say what it does
   *not* cover.

## Storage

- Cookies and cache live in CEF request contexts we create and control, under a
  Gold-Web profile directory; nothing is shared with an installed Chrome.
- Bookmarks, history, downloads, settings and workspace layouts in a local
  SQLite database.
- Saved passwords in the OS keyring, never in the database in the clear.

## Where each thing will live

| What | Where | Since |
|---|---|---|
| Window, tabs, navigation | `app/` (C++) | v0.1 |
| Chrome and pages (UI) | `ui/` (HTML/CSS/JS) | v0.1 |
| Theme engine and design tokens | `ui/chrome/theme.js`, `brand/gold-ui/tokens.css` | v0.1 |
| Custom `goldweb://` scheme and bridge | `app/` | v0.1 |
| Privacy defaults and blocking | `app/` (CEF request layer) | v0.1 |
| Privacy Control Centre | `ui/` + shell commands | v0.2 |
| Workspaces and sessions | `app/` (request contexts) | v0.3 |
| Bookmarks, history, downloads, passwords | `app/` + local database | v0.4 |
| DNS, proxy, egress control | `app/` network policy | v0.2–v0.4 |
| CEF fetch and pinning | `scripts/`, `third_party/` | M0 |
| Packaging and updates | `scripts/`, CI | v1.0 |

## Keeping the engine replaceable

The shell touches Chromium only through CEF, and the interface talks to the
shell only through the bridge. If we ever change engines again, the interface
and the privacy logic stay put — only the shell's engine layer moves. That
boundary is deliberate.

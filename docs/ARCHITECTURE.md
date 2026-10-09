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
**render**, **GPU** and **utility** processes that are sandboxed and live
outside our address space. We implement a handful of callbacks — `CefApp`,
`CefClient`, `CefBrowser` and the render-side handlers — and CEF drives the
rest. Every CEF call happens on the browser process's UI thread; everything else
is posted there. Getting this lifecycle right is the core of M0.

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
page content inside one window. There are two workable shapes, and M0 picks
between them with a spike:

- **CEF Views, windowed.** A native top-level window built from CEF's Views
  toolkit: a `BrowserView` for the chrome across the top, and a `BrowserView`
  per tab below it. Simplest to get right, good performance, the standard CEF
  layout model.
- **Off-screen rendering (OSR).** Every browser renders to a buffer and the
  shell composites. Maximum control over look and input, and the usual choice
  for heavily customised browsers, but more code and more to get subtly wrong.

The plan is to start windowed and reach for OSR only if the look requires it.

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

# How Gold-Web is put together

Gold-Web is a desktop application built with [Tauri 2](https://tauri.app): a
Rust core, a web-based front end for the browser chrome, and the operating
system's web engine for page content. This document explains that split, what
lives where, and the rules we hold ourselves to.

## The one thing we don't write

Turning HTML, CSS and JavaScript into pixels is an engine's job, and writing one
is a decades-long effort — not a sensible use of this project's time. So the
page engine comes from the platform, through Tauri:

| Platform | Engine Tauri uses |
|---|---|
| Linux | WebKitGTK |
| Windows | WebView2 (Chromium) |
| macOS | WKWebView |

Everything *around* the engine is ours: the window and its chrome, tabs, the
address bar, history and bookmarks, the privacy policy, storage, downloads,
settings. That's the part people actually form a relationship with, and the part
we can make honest and fast.

Because engine behaviour differs per platform, all engine-specific code hides
behind one crate (`goldweb-engine`). The rest of the application talks to that
crate, never to WebKitGTK or WebView2 directly. If we ever outgrow the platform
engine, that boundary is the single place we change our mind.

### What this means, plainly

- **Extensions:** we can't run the Chrome or Firefox extension catalogues on
  WebKitGTK. Any extension support will be our own, smaller model. Better to say
  that now than to imply compatibility we can't deliver.
- **Engine features:** a site that needs a cutting-edge Chromium API may work on
  Windows (WebView2) and behave differently on Linux (WebKitGTK). We document
  known gaps instead of pretending they don't exist.
- **Fingerprinting:** the engine's own fingerprint is largely outside our
  control. We reduce what we add on top and limit what the engine reports. We
  never claim to be invisible.

## The shape of the app

```
          ┌──────────────────────────────────────────────┐
          │  Front end (src/) — the browser chrome        │
          │  tabs · address bar · menus · our pages        │
          └───────────────▲───────────────┬──────────────┘
                          │ commands      │ events
          ┌───────────────┴───────────────▼──────────────┐
          │  Rust core (src-tauri/ + crates/)             │
          │  windows · tabs · privacy · storage · network │
          └───────────────┬──────────────────────────────┘
                          │ engine adapter
          ┌───────────────▼──────────────────────────────┐
          │  Platform web engine (WebKitGTK / WebView2)   │
          │  renders page content                         │
          └──────────────────────────────────────────────┘
```

The front end draws the browser but owns nothing sensitive. It asks the Rust
core to do things and listens for events (page loaded, title changed, a tracker
was blocked). Keys, cookies, history and the privacy policy live on the Rust
side, where a web page can't reach them.

### The chrome is not a web page

The browser chrome is our own UI, but we treat it as a trusted surface: it never
loads remote content, and it runs under a strict content-security policy. The
only remote content in the application is inside the tab that asked for it.

## Crates

The Rust side is kept in small libraries with clear jobs, so they can be tested
without launching a browser window.

| Crate | Owns |
|---|---|
| `goldweb-core` | Application state: windows, tabs, sessions, workspaces |
| `goldweb-privacy` | Blocklists, per-site policy, the privacy defaults |
| `goldweb-storage` | Bookmarks, history, downloads, settings; the database |
| `goldweb-net` | Network policy: DNS, proxy, what may reach out |
| `goldweb-engine` | The only place that touches the platform webview |
| `goldweb-shell` (in `src-tauri/`) | Wires the crates together, exposes Tauri commands |

None of these are written yet; these are the seams we intend to build along.

## Privacy model

1. **Default deny for us.** Gold-Web makes no telemetry, analytics, study or
   crash-report calls. Any network call we do make is explicit in code, listed in
   the privacy dashboard, and off unless it's essential (a manual update check,
   for example).
2. **Blocks first, asks never.** Tracker and ad blocking is on out of the box and
   configurable per site. The list source and match rules stay readable.
3. **Network privacy at the edges.** Encrypted DNS and proxy support live in
   `goldweb-net`, above or beside the engine, so page content doesn't decide
   them.
4. **Least data, least time.** History, cookies and caches have clear retention
   controls, including wipe-on-shutdown.
5. **Show the limits.** Anywhere we report protection, we can also say what it
   does *not* cover.

## Storage

- Structured data (bookmarks, history, downloads, settings, workspace layouts)
  in a local SQLite database in the app's profile directory.
- Saved passwords and anything else secret in the OS keyring, never in the
  database in the clear.
- One profile directory per install, kept away from any other browser's.

## Where each thing will live

| What | Where | Since |
|---|---|---|
| Window, tabs, address bar | `src/` + `goldweb-core` | v0.1 |
| New-tab / home page | `src/` | v0.1 |
| Privacy defaults | `goldweb-privacy` | v0.1 |
| Blocklist engine and stats | `goldweb-privacy` | v0.1–v0.2 |
| Privacy Control Centre | a `src/` page + core commands | v0.2 |
| Workspaces and sessions | `goldweb-core` | v0.3 |
| Bookmarks, history, downloads, passwords | `goldweb-storage` | v0.4 |
| DNS, proxy, egress control | `goldweb-net` | v0.2–v0.4 |
| Packaging and updates | `scripts/`, CI | v1.0 |

## Keeping the door open

The engine adapter (`goldweb-engine`) is the hedge. If platform webviews turn
out to be the wrong call, the change stays contained: implement the adapter
against something else and leave the rest of Gold-Web alone. We'd rather design
for that possibility than pretend our first guess is permanent.

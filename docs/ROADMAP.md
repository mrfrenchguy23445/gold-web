# Roadmap

Each milestone ends with something you can open and use. Nothing below is built
yet unless it's ticked.

## M0 — the skeleton

- [ ] A Tauri 2 app scaffolded: a window opens on Linux
- [ ] `src/` and `src-tauri/` build together (`tauri dev`)
- [ ] Our crates exist as empty libraries wired into the app
- [ ] CI builds the app and runs the crate tests
- [ ] Dev setup written down in `docs/BUILDING_LINUX.md`

## M1 — v0.1: it opens as Gold-Web

**The shell**

- [ ] A Gold UI window: real chrome, not a browser inside a page
- [ ] Tabs: open, close, switch, reorder, restore
- [ ] Address bar with search, back, forward, reload, stop
- [ ] New-tab and home pages of our own; no feeds, no sponsored tiles
- [ ] Menus and keyboard shortcuts for everything in this list

**Privacy, on by default**

- [ ] Tracker and ad blocking, with per-site control
- [ ] No telemetry, analytics, studies or background pings — and a way to see it
- [ ] Cookie and cache lifetime controlled; wipe options available
- [ ] Encrypted DNS on, with a named resolver you can change
- [ ] A clear, in-app statement of what private browsing does and doesn't do

**Engine**

- [ ] `goldweb-engine` working against WebKitGTK
- [ ] Known engine gaps documented

## M2 — v0.2: the Privacy Control Centre

- [ ] A page showing what was blocked — this session and all time
- [ ] Per-site shield: state, exceptions, what exactly was blocked
- [ ] Connection panel: DNS resolver, proxy, and a list of what Gold-Web itself
      connects to
- [ ] Data panel: cookies, cache, site data — review and clear, one site or all,
      with optional wipe on shutdown
- [ ] Permissions panel: camera, microphone, location, notifications, per site
- [ ] A fingerprinting self-test that explains itself honestly
- [ ] Keyboard accessible, themed in the Gold UI language

## M3 — v0.3: workspaces

- [ ] Workspaces with their own tabs, name and colour
- [ ] A clean switcher and a keyboard path through it
- [ ] Optional isolation per workspace (separate cookies and storage)
- [ ] Save, restore and clear a session in one action

## M4 — v0.4: the everyday browser

- [ ] Bookmarks, history, downloads and password management
- [ ] Settings organised into Gold-Web's own sections
- [ ] A complete keyboard-shortcut map
- [ ] Print, reader mode, zoom, find-in-page
- [ ] Accessibility pass: contrast, focus, screen readers, reduced motion

## M5 — v1.0: packages and updates

- [ ] Linux packages: `.deb`, AppImage, Flatpak
- [ ] Signed updates and a documented update path
- [ ] A reproducible release checklist
- [ ] A written security-response process
- [ ] Windows, via `docs/BUILDING_WINDOWS.md`

## Ideas, not yet scheduled

Split view, a built-in scratchpad, a per-site privacy report, HTTPS-only mode, a
search-provider picker, tab search.

## Deliberately not on the list

- Our own rendering engine
- Promising anonymity, or "military-grade" anything
- Monetisation that trades your data; telemetry on by default; bundled deals
- Claiming extension compatibility with Chrome or Firefox

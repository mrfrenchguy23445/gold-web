# Roadmap

Each milestone ends with something you can open and use. Nothing below is built
yet unless it's ticked.

## M0 — the skeleton

- [ ] `scripts/fetch-cef.sh` downloads and pins a CEF binary distribution
- [ ] The CMake project builds the shell against CEF on Linux
- [ ] A window opens from our executable and renders a page
- [ ] A spike decides windowed CEF Views vs off-screen rendering
- [ ] The custom `goldweb://` scheme serves a local HTML file
- [ ] CI builds the shell and runs whatever tests exist

## M1 — v0.1: it opens as Gold-Web

**The shell**

- [ ] Window, tab strip and address bar, drawn by our UI in `ui/`
- [ ] Tabs: open, close, switch, reorder, restore
- [ ] Navigation: back, forward, reload, stop, search from the address bar
- [ ] New-tab and home pages of our own; no feeds, no sponsored tiles
- [ ] Menus and keyboard shortcuts for everything above

**Engine and games**

- [ ] WebGL and WebAssembly confirmed working
- [ ] eaglercraft and a couple of other browser games run properly
- [ ] Known engine gaps documented

**Privacy, on by default**

- [ ] Tracker and ad blocking through CEF request interception, per-site control
- [ ] No telemetry, analytics, studies or crash uploads — and a way to see it
- [ ] CEF's own reporting and background services disabled
- [ ] Cookie and cache lifetime controlled; wipe options available
- [ ] Encrypted DNS on, with a named resolver you can change
- [ ] A clear, in-app statement of what private browsing does and doesn't do

## M2 — v0.2: the Privacy Control Centre

- [ ] A page showing what was blocked — this session and all time
- [ ] Per-site shield: state, exceptions, what exactly was blocked
- [ ] Connection panel: DNS resolver, proxy, and a list of what Gold-Web itself
      connects to
- [ ] Data panel: cookies, cache and site data — review and clear, one site or
      all, with optional wipe on shutdown
- [ ] Permissions panel: camera, microphone, location, notifications, per site
- [ ] A fingerprinting self-test that explains itself honestly
- [ ] Keyboard accessible, themed in the Gold UI language

## M3 — v0.3: workspaces

- [ ] Workspaces with their own tabs, name and colour
- [ ] A clean switcher and a keyboard path through it
- [ ] Optional isolation per workspace, via separate CEF request contexts
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
- Claiming Chrome or Firefox extension compatibility that we haven't built

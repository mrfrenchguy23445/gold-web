# Roadmap

Each milestone ends with something you can open and use. Nothing below is built
yet unless it's ticked.

## M0 — the skeleton

- [x] `scripts/fetch-cef.sh` downloads and pins a CEF binary distribution
- [x] The CMake project builds the shell against CEF on Linux
- [x] A window opens from our executable and renders a page
- [x] A spike decides windowed CEF Views vs off-screen rendering — **windowed
      Views**, a frameless window with one `BrowserView` for the chrome
- [x] The custom `goldweb://` scheme serves a local HTML file
- [ ] CI builds the shell and runs whatever tests exist

## M1 — v0.1: it opens as Gold-Web

The chrome UI is drawn and themeable (tabs, omnibox, menus, our new-tab page, a
command palette, and Settings → Appearance), and the shell now backs it with
real per-tab browser views and navigation. Tracker blocking has started, as a
first cut. What remains is the rest of the privacy layer, session behaviour and
the long tail.

**The shell**

- [x] Window, tab strip and address bar, drawn by our UI in `ui/`
- [x] Tabs: open, close and switch, each backed by its own content browser
- [x] Tabs: reorder by dragging, and restore the previous session on launch
- [x] Navigation: back, forward, reload, stop, search from the address bar
- [x] New-tab and home pages of our own; no feeds, no sponsored tiles
- [ ] Menus wired to real features (most menu destinations are placeholders)
- [x] Keyboard shortcuts: new/close/switch tab, reload, back/forward, focus the
      address bar, open the command palette — and they work while a page has
      focus, not only when the chrome does

**Engine and games**

- [x] WebGL and WebAssembly confirmed working (WebGL2 on the GPU via ANGLE)
- [ ] eaglercraft and a couple of other browser games run properly
- [ ] Known engine gaps documented

**Privacy, on by default**

- [x] Tracker and ad blocking through CEF request interception (first cut: a
      curated list, subresources only, no per-site control yet)
- [ ] Per-site control: allow or block a site from the toolbar shield
- [ ] No telemetry, analytics, studies or crash uploads — and a way to see it
- [ ] CEF's own reporting and background services disabled
- [ ] Cookie and cache lifetime controlled; wipe options available
- [ ] Encrypted DNS on, with a named resolver you can change
- [ ] A clear, in-app statement of what private browsing does and doesn't do

## M2 — v0.2: the Privacy Control Centre

- [x] A page showing what was blocked — this session and all time (the Protection
      Centre; per-site detail still to come)
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

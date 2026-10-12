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
- [x] Tab strip placement: across the top or down the left/right side, from a
      Settings → Layout control; the page overlays follow the strip
- [x] Navigation: back, forward, reload, stop, search from the address bar
- [x] New-tab and home pages of our own; no feeds, no sponsored tiles
- [x] Menus wired to real features (Bookmarks, Downloads, History, zoom, find
      and the workspace switcher all open something real; only unknown
      `goldweb://` destinations fall back to the "coming up" page)
- [x] Keyboard shortcuts: new/close/switch tab, reload, back/forward, focus the
      address bar, open the command palette, bookmark, downloads, find and zoom
      — and they work while a page has focus, not only when the chrome does

**Engine and games**

- [x] WebGL and WebAssembly confirmed working (WebGL2 on the GPU via ANGLE)
- [ ] A couple of browser games run properly
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

- [x] Workspaces with their own tabs, name and colour
- [x] A clean switcher and a keyboard path through it (the toolbar switcher,
      Ctrl+Shift+N for a new one, and closing a workspace keeps its tabs)
- [ ] Optional isolation per workspace, via separate CEF request contexts
- [ ] Save, restore and clear a session in one action

## M4 — v0.4: the everyday browser

- [x] History: the shell records every page that lands in a tab to a small file
      beside the profile; the History page groups by day, searches and clears
- [x] Bookmarks: kept in a small file beside the profile; a star in the toolbar,
      a Bookmarks page to search, and Ctrl+D to toggle the current page
- [x] Downloads: written straight to the Downloads folder, shown with progress
      and size on a Downloads page, and cancellable, openable and removable from
      there (Ctrl+J)
- [ ] Password management
- [ ] Settings organised into Gold-Web's own sections
- [ ] A complete keyboard-shortcut map
- [x] Zoom and find-in-page: Ctrl + / Ctrl - / Ctrl 0 per tab, Ctrl+F for a find
      bar that reports the match count
- [ ] Print and reader mode
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

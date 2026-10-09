# Roadmap

Each milestone ends with something that builds and runs. Nothing here is
implemented yet unless it's ticked.

## M0 — a Firefox build that runs

Prove the toolchain and get a binary out of the pinned revision.

- [ ] Revision pinned in `build/upstream.lock`
- [ ] `scripts/bootstrap.sh` reports no problems
- [ ] `./mach build` finishes and `./mach run` opens a window
- [ ] Full-build and incremental build times written down for this machine

This is the slow one — a cold build is measured in hours.

## M1 — v0.1: it's Gold-Web

It boots as Gold-Web, looks like Gold-Web and protects by default.

**Identity**
- [ ] Name "Gold-Web", `--with-app-basename=Gold-Web`, profile kept separate
      from any installed Firefox
- [ ] `brand/goldweb/` — `configure.sh`, prefs, about dialog, brand strings
- [ ] Real icon set and about-dialog art in the black-and-gold style
- [ ] The about dialog and `about:support` say Gold-Web, not Firefox

**Looks**
- [ ] `goldweb-theme` built-in theme: true black, single gold accent, no
      gradients
- [ ] Dark chrome regardless of the OS theme
- [ ] Compact toolbar and tabs; Firefox's promotional surfaces gone
- [ ] Firefox's vertical tabs enabled and styled as the default layout

**Start page**
- [ ] `ui/start-page` shipped as the `goldweb-start` add-on, overriding the
      new-tab and home pages
- [ ] Fast search box, editable shortcuts, quiet bookmarks row
- [ ] No feeds, no sponsored tiles, no ads. Search suggestions off by default

**Privacy defaults** (on out of the box, all overridable, all documented)

- Tracking protection on, including social, cryptomining and fingerprinting
- Total Cookie Protection
- Telemetry, studies and data uploads off; crash reports stay local
- Pocket off; sponsored top-sites and quick-suggest ads off
- Prefetch, speculative connections and the predictor off
- Beacon and battery-status off
- Encrypted DNS on with a named, documented resolver you can change
- Proxy settings easy to reach
- WebRTC leaks handled without silently breaking video calls
- Whatever background connections remain are listed and explained

**Then**
- [ ] `about:support` shows Gold-Web and a Gold-Web-specific profile path
- [ ] `about:config` spot-checks match the defaults above
- [ ] No update nags or promo surfaces
- [ ] `reset.sh && apply.sh && build.sh` reproduces a working build

## M2 — v0.2: the Privacy Control Centre

- [ ] `about:goldweb`, registered through `AboutRedirector`
- [ ] **Protection:** trackers blocked (this session and all time), per-site
      shield state and exceptions
- [ ] **Connection:** DNS resolver, proxy, WebRTC posture, a list of
      background connections
- [ ] **Data:** cookies, cache, site data and history — review, clear one site
      or all of it, optional auto-clear on shutdown
- [ ] **Permissions:** camera, microphone, location and notifications per site
- [ ] A fingerprinting self-test that explains itself honestly
- [ ] Fully keyboard accessible and themed in the Gold UI language

## M3 — v0.3: workspaces

- [ ] Surface vertical tabs and tab groups as **workspaces**, with a clean
      switcher and per-workspace name and colour
- [ ] Optional container isolation per workspace
- [ ] Save, restore and clear a session in one action
- [ ] Pinned sites and workspace layout persist across restarts

## M4 — v0.4: the everyday browser

- [ ] Settings reorganised into Gold-Web's own sections
- [ ] Bookmarks, history, downloads and passwords brought up to scratch
- [ ] Extensions page restyled; recommended-addon discovery off
- [ ] A complete keyboard-shortcut map; print and reader polish
- [ ] Accessibility pass — contrast, focus, screen readers, reduced motion

## M5 — v1.0: packages and updates

- [ ] Linux builds: tarball, `.deb`, AppImage (Flatpak later)
- [ ] A real update channel with signed updates
- [ ] Release checklist and repeatable build notes
- [ ] A written security-response process
- [ ] Windows, following `docs/BUILDING_WINDOWS.md`

## Ideas, not yet scheduled

Split view, a built-in scratchpad, a per-site privacy report, reader-mode
typography, HTTPS-only mode, a search-provider picker.

## Deliberately not on the list

- Our own engine or network stack
- Promising anonymity or "military-grade" anything
- Monetisation that trades your data, telemetry on by default, bundled deals

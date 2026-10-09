# Roadmap

Milestones are vertical slices: each ends with something that builds and runs.
Feature detail is deliberately kept honest — "planned" means not implemented.

## M0 — Baseline (foundation)

**Goal:** prove the toolchain and produce an unmodified Firefox binary from the
pinned upstream commit.

- [ ] Pin upstream commit in `config/upstream.lock`.
- [ ] `scripts/bootstrap.sh` reports no issues (`mach doctor`).
- [ ] `./mach build` completes; `./mach run` opens a window.
- [ ] Record full-build and incremental build times on this machine.

This step is the long pole: expect roughly 1.5–3 h for a cold build on 4 cores.

## M1 — v0.1 "Identity"

**Goal:** it boots as *Espionage*, protects by default, and looks like itself.

### Branding
- [ ] Product name "Espionage"; `--with-app-basename=Espionage` so profiles are
      separate from any installed Firefox.
- [ ] `branding/espionage/configure.sh`, `pref/firefox-branding.js`,
      `content/`, `locales/en-US/` (brand.ftl, brand.properties).
- [ ] Icon set (`default{16,32,48,64,128,256}.png`, window/document icons) and
      about-dialog art, from the pure-black design language.
- [ ] About dialog and `about:support` show Espionage, not Firefox.

### Pure-black UI
- [ ] Built-in theme extension `espionage-theme` as the default appearance:
      true-black surfaces, restrained accent, system font, no gradients.
- [ ] Dark-by-default chrome regardless of OS theme.
- [ ] Compact toolbar/tab treatment; hide Firefox promotional surfaces.
- [ ] Enable and style Firefox's built-in **vertical tabs** as the default
      sidebar layout.

### Start page + new tab
- [ ] `webui/start-page` wired in as built-in extension `espionage-start`,
      overriding the new-tab page and the home page.
- [ ] Fast search field, configurable shortcut grid, quiet bookmarks row.
      **No feeds, no sponsored tiles, no ads.**
- [ ] Search suggestions off by default; user-selectable search provider.

### Privacy defaults (the core promise)
Ship these as defaults, all overridable in the UI, all documented:

**Tracking & storage**
- `privacy.trackingprotection.enabled = true` (+ private-browsing variant)
- Social, cryptomining and fingerprinting protection enabled
- Total Cookie Protection / strict third-party cookie behaviour
- Query-parameter stripping (link decorators)

**Data minimisation**
- Telemetry, studies and Normandy disabled
- Data reporting uploads off; crash reporter local-only
- Pocket disabled; sponsored top-sites and URL-bar quick-suggest ads off
- Prefetch / speculative connect / predictor off
- Beacon off, battery status API off

**Network**
- Encrypted DNS (DoH) on by default with a named, documented resolver,
  switchable in the Privacy Control Center
- Proxy settings surfaced plainly
- WebRTC leaks addressed **without silently breaking video calls** — exposed
  and explained, not quietly disabled

**No surprises**
- Every background connection that remains (update checks, safe browsing, DoH)
  is listed and explained in the Privacy Control Center and docs.

### v0.1 smoke checklist
- [ ] Launches, loads pages, new tab shows our start page
- [ ] `about:support` identifies Espionage; profile path is Espionage-specific
- [ ] `about:config` spot-checks confirm the defaults above
- [ ] Reboot/relaunch works with no update-nag or promo surfaces
- [ ] Full clean `reset.sh && apply.sh && build.sh` reproduces the build

## M2 — v0.2 "Privacy Control Center"

- [ ] `about:espionage` privileged page registered via `AboutRedirector`.
- [ ] **Protection status:** trackers blocked (session/total), per-site shield
      state and exceptions.
- [ ] **Connection panel:** DoH provider, proxy, WebRTC posture, background
      connection inventory.
- [ ] **Data panel:** cookies, cache, site data, history — view, per-site and
      bulk clear, optional auto-clear on shutdown.
- [ ] **Permissions panel:** camera/mic/location/notifications review per site.
- [ ] Fingerprinting self-test with clear, non-hand-wavy explanations and no
      promise of anonymity.
- [ ] Keyboard-accessible, fully themed in the pure-black language.

## M3 — v0.3 "Workspaces & sessions"

- [ ] Surface Firefox vertical tabs + tab groups as **Workspaces** with a clean
      switcher UI and per-workspace colour/name.
- [ ] Container isolation as an option per workspace.
- [ ] Session management: restore, save, and one-action "clear this session".
- [ ] Pinned sites and persistent workspace layout across restarts.

## M4 — v0.4 "Daily browser"

- [ ] Unified settings surface (reorganised, Espionage-owned sections).
- [ ] Bookmarks, history, downloads and password manager passes.
- [ ] Extensions page restyled; recommended-addons discovery off.
- [ ] Complete keyboard-shortcut map and print/reader polish.
- [ ] Accessibility audit (contrast, focus, screen reader, reduced motion).

## M5 — v1.0 "Packaging & updates"

- [ ] Linux artifacts: tarball, `.deb`, AppImage (Flatpak later).
- [ ] Update strategy chosen and implemented (channel policy from
      `docs/ARCHITECTURE.md` §6), with signed updates.
- [ ] Reproducible-ish build notes and a release checklist.
- [ ] Security/response process documented.
- [ ] Windows follow-up (see `docs/BUILDING_WINDOWS.md`).

## Backlog / ideas (unscoped)

- Split view, built-in notes/scratchpad, per-site privacy report page.
- Search-provider marketplace, tracker-blocker list subscription.
- Reader-mode typography presets.
- Onion/HTTPS-only modes evaluated for feasibility and clearly labelled.

## Explicitly out of scope

- Building our own engine or network stack.
- Promising anonymity, "military-grade" encryption, or VPN-like guarantees.
- Dark-pattern monetisation, telemetry-by-default, or bundled affiliate deals.

# Architecture

How Espionage is built from the Firefox source tree, and the rules that keep it
maintainable over the lifetime of the project.

## 1. The two trees

| Tree | Location | Role |
|------|----------|------|
| **Espionage repo** | `~/Documents/EspionageWebBrowser` | Source of truth for everything *we* own: branding, web UI, patches, build config, docs. Small, tracked in git. |
| **Upstream Firefox** | `~/Documents/espionage-firefox-bootstrap/firefox` | An unmodified clone of `mozilla-firefox/firefox`. We never commit to it. It is treated as a build input. |

`config/upstream.lock` pins the exact upstream commit the current patch series
is known to apply against. Updating Firefox is an explicit, reviewable event
(see §6), never an implicit side effect of a build.

Why not fork the whole tree? Firefox is ~11 GB and moves fast. A full fork
makes every upstream security fix a manual merge and rots within weeks. The
overlay + patch model keeps Espionage a thin, reviewable layer on top of
upstream.

## 2. Two mechanisms for changing Firefox

Everything we do falls into one of two buckets:

**Overlay (whole new files).** Files that do not exist upstream are copied into
the tree by `scripts/apply.sh`. This covers our branding directory, our web UI
and our built-in extensions. Overlays never conflict on rebase.

**Patch (edits to existing files).** Changes to files Firefox already owns
(e.g. `browser/confvars.sh`, `browser/app/profile/firefox.js`,
`browser/themes/**`) are stored as unified diffs under `patches/` and applied
in the order listed in `patches/series`. Each patch addresses one concern and
should be as small as possible.

Rule of thumb: if you can add a new file or a new built-in extension instead of
editing a Firefox file, do that — it survives upstream updates for free.

## 3. Applied layout

`scripts/apply.sh` performs, in order:

1. **Preflight.** Confirm the upstream checkout exists, is a git repo and is
   clean. Refuse to run on a dirty tree unless `FORCE=1`, because patches would
   otherwise stack on top of stale edits.
2. **Patches.** `git apply` each patch in `patches/series` order.
3. **Branding overlay.** Copy `branding/espionage/` into
   `browser/branding/espionage/`. Any asset our repo does not ship (platform
   icons, installer bitmaps, Windows/macOS resources) is seeded from upstream's
   `browser/branding/unofficial/` so the tree stays buildable while brand art
   is still being designed.
4. **Web UI overlay.** Copy `webui/start-page/` into the built-in start-page
   extension at `browser/extensions/espionage-start/`.
5. **Theme overlay.** Copy `branding/theme/` into the built-in theme extension
   at `browser/extensions/espionage-theme/`.

`scripts/reset.sh` reverses all of the above, returning upstream to pristine
`HEAD` without touching the object directory.

## 4. Key integration points

| Concern | Mechanism | Milestone |
|---------|-----------|-----------|
| Product name, vendor, profile separation | Patch `browser/confvars.sh` (`MOZ_BRANDING_DIRECTORY=browser/branding/espionage`) + `--with-app-basename=Espionage` | M1 |
| Icons, wordmarks, about-dialog art | Overlay `branding/espionage/` | M1 |
| App display name / bundle id | `branding/espionage/configure.sh` | M1 |
| Default preferences (privacy, UI, telemetry-off) | Pref files in `branding/espionage/pref/` + patch to `browser/app/profile/firefox.js` | M1 |
| New-tab + home page | Built-in WebExtension `espionage-start` overriding `chrome_url_overrides.newtab`; `browser.startup.homepage` set to it | M1 |
| Pure-black chrome colours and structure | Built-in theme extension `espionage-theme` + targeted CSS patches under `patches/browser-ui/` | M1–M2 |
| Privacy Control Center (`about:espionage`) | In-tree privileged page: patch `browser/components/about/AboutRedirector.cpp` + `browser/components/espionage/**` | M2 |
| Workspaces | Reuse Firefox vertical tabs + tab groups, surfaced as "Workspaces"; Containers for isolation | M3 |
| Packaging / updates | `mach package` → tarball/AppImage/deb; update channel decision | M5 |

### Why extensions for UI where possible

A WebExtension that ships **built into the tree** is compiled into the browser,
has no install friction, and — unlike a chrome patch — is resilient to
front-end refactors. We therefore prefer built-in extensions for the start
page and the theme, and reserve C++/XUL patches for things that genuinely need
privileged access (the privacy dashboard) or deep structural change.

### `about:espionage` (privacy dashboard)

The dashboard needs the real blocked-tracker counters, connection state and
per-site permissions. That data lives behind privileged chrome APIs
(`browser.contentBlocking`, `Services.*`), so this one is an in-tree
`about:` page rather than a WebExtension. It is registered through
`AboutRedirector.cpp` and served from `browser/components/espionage/`.

## 5. Directory reference

```
branding/
  icons/            Source icon set (SVG/PNG masters)
  logos/            Wordmarks, hero art
  resources/        Shared source assets
  espionage/        Text files overlaid into browser/branding/espionage/
  theme/            Built-in theme extension source
config/
  mozconfig.linux   Build options
  upstream.lock     Pinned upstream commit
patches/
  series            Ordered list of patches to apply
  branding/         confvars.sh, app display strings, pref defaults
  browser-ui/       Chrome CSS / markup changes
  start-page/       Wiring for the built-in start-page extension
  privacy/          Privacy dashboard + hardened defaults
scripts/
  bootstrap.sh      Ensure upstream + toolchain are ready
  apply.sh          Overlay + patch the upstream tree
  reset.sh          Return upstream to pristine HEAD
  export-patch.sh   Capture current upstream edits into a new patch
  build.sh          Configure (if needed) and build
  run.sh            Launch the built browser
  sync-upstream.sh  Fetch new upstream and test the patch series
webui/
  start-page/       about:home / new-tab UI (HTML/CSS/JS)
  privacy-center/   (M2) source for about:espionage
```

## 6. Upstream update workflow

1. `git -C <upstream> fetch origin`
2. Choose a target commit (see the branch policy below) and update
   `config/upstream.lock`.
3. `scripts/sync-upstream.sh` checks out the pinned commit and applies the
   series, reporting any patch that no longer applies.
4. For each conflicting patch: fix it **in the upstream tree**, then
   `scripts/export-patch.sh <category> <name>` to refresh the stored diff.
5. Build, run the smoke checklist (`docs/BUILDING_LINUX.md` §5), commit.

### Branch policy (decision pending at M1)

The current checkout is `main` (**160.0a1**, Nightly). That is ideal while the
patch series is still churning, but a privacy browser that people trust must
sit on a supported branch with timely security updates. Before v0.1 ships we
choose one of:

- **ESR** — ~1 year of support per release, fewest breakages, best update
  story for a privacy browser. Recommended once M1 stabilises.
- **Release** — newest stable features (e.g. mature tab groups), monthly
  rebases.
- **Nightly (`main`)** — fastest iteration, not viable for real users.

## 7. Non-goals (for now)

- Rewriting the network stack or engine internals.
- Claiming anonymity or a hardened anti-fingerprinting browser beyond what we
  can verify and honestly document.
- Silent disabling of security-relevant infrastructure (updates, safe
  browsing). We minimise and document background connections instead.

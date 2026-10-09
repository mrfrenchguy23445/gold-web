# How Gold-Web is put together

Gold-Web is a thin layer over an unmodified Firefox source tree. This document
explains that relationship and the rules that keep it from turning into a mess
the next time Firefox moves.

## Two checkouts

| | Where | What it's for |
|---|---|---|
| **Gold-Web** (this repo) | `~/Documents/Gold-Web` | Everything we own: brand, UI, patches, build config, docs. Small, version-controlled. |
| **Firefox source** | a separate checkout, e.g. `~/Documents/gold-web/firefox` | A plain clone of `mozilla-firefox/firefox`. We never commit to it. It's a build input. |

`build/upstream.lock` records the exact Firefox revision the current patch
series works against. Moving to a newer Firefox is a deliberate, reviewable
step (see *Keeping up with Firefox* below) — never something that happens by
accident during a build.

We don't fork the whole tree. Firefox is about 11 GB and changes daily; a fork
would make every security fix a manual merge. A thin layer keeps Gold-Web
small enough to actually review.

## Two ways we change Firefox

**Add a file.** Anything brand-new — our brand directory, our UI, our built-in
extensions — is copied into the tree by `scripts/apply.sh`. New files never
conflict when Firefox updates.

**Patch a file.** Changes to files Firefox already owns (`browser/confvars.sh`,
`browser/app/profile/firefox.js`, …) are stored as diffs in `patches/` and
applied in the order listed in `patches/series`. Keep each patch about one
thing, and keep it small.

When you have the choice, add a file instead of patching one — new files
survive Firefox updates for free.

## What `apply.sh` does

1. **Checks the tree is clean.** If it isn't, it stops, so patches never stack
   on top of stale edits. (`FORCE=1` overrides, on purpose.)
2. **Applies the patches** in `patches/series`.
3. **Copies the brand** into `browser/branding/goldweb/`. Any asset we haven't
   made yet is seeded from upstream's `unofficial` branding so the tree still
   builds while the art is in progress.
4. **Copies the UI** into a built-in add-on at
   `browser/extensions/goldweb-start/`.
5. **Copies the theme** into `browser/extensions/goldweb-theme/`.

`scripts/reset.sh` undoes all of it and puts Firefox back to pristine `HEAD`.

## Where each thing lives

| What | How | Since |
|---|---|---|
| Name, profile separation | patch `browser/confvars.sh` + `--with-app-basename=Gold-Web` | v0.1 |
| Icons, wordmarks, about dialog | `brand/goldweb/` | v0.1 |
| Default preferences | pref files in `brand/goldweb/pref/` + a patch to `browser/app/profile/firefox.js` | v0.1 |
| Start page / new tab | built-in add-on `goldweb-start` overriding the new-tab page | v0.1 |
| Black-and-gold chrome | built-in theme `goldweb-theme` + focused CSS patches | v0.1–v0.2 |
| Privacy Control Centre (`about:goldweb`) | an in-tree page, registered via `AboutRedirector.cpp` | v0.2 |
| Workspaces | Firefox's vertical tabs and tab groups, surfaced as workspaces | v0.3 |
| Packages and updates | `mach package`, then `.deb` and AppImage | v1.0 |

### Why extensions for so much of the UI

A WebExtension shipped *inside* the build is just there — no install step, no
permissions prompt — and it keeps working when Firefox reshuffles its
front-end internals, which a chrome patch would not. So the start page and the
theme are built-in extensions. We save real patching for the things that need
privileged access, like the privacy dashboard.

### About `about:goldweb`

The dashboard needs the real numbers — what was blocked, what connections are
open — and that lives behind privileged APIs. So it's an in-tree `about:` page
rather than an extension, wired up through `AboutRedirector.cpp`.

## The layout

```
brand/
  goldweb/      Files copied into browser/branding/goldweb/
  assets/       Source art (icons, logos, shared resources)
  gold-ui/      The Gold UI theme extension
ui/
  start-page/   The start page and new tab
build/
  mozconfig.linux
  upstream.lock
patches/
  series        The order patches are applied in
  branding/  browser-ui/  start-page/  privacy/
scripts/
  _common.sh    Shared setup for the other scripts
  bootstrap.sh  Find Firefox, check the toolchain
  apply.sh      Put the Gold-Web layer on the tree
  reset.sh      Take it back off
  build.sh  run.sh
  export-patch.sh  sync-upstream.sh
docs/
```

## Keeping up with Firefox

1. `git -C <firefox> fetch origin`
2. Pick a target revision and write it into `build/upstream.lock`.
3. `./scripts/sync-upstream.sh` checks it out and dry-runs the patch series.
4. For any patch that no longer applies: fix it in the tree, then refresh it
   with `./scripts/export-patch.sh`.
5. Build, run the smoke checklist in `docs/BUILDING_LINUX.md`, commit.

### Which Firefox to track

Right now this is on `main` (Nightly, 160.0a1), which is fine while the patch
series is still finding its shape. Before v0.1 ships we'll settle on a
supported branch: **ESR** is the safe choice for a browser people rely on
(a year of fixes per release, fewest surprises), with **Release** as the
alternative if we want newer features sooner. Nightly is not an option for real
users.

## What we're not doing

- Rewriting the engine or the network stack.
- Promising anonymity, or anti-fingerprinting stronger than we can prove.
- Switching off security infrastructure and hoping no one notices. Where a
  connection has to stay (updates, safe browsing, DNS), we say so.

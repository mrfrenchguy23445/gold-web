# Building Espionage on Linux

This machine's status (verified during planning):

- Upstream Firefox at `~/Documents/espionage-firefox-bootstrap/firefox`
  (git clone of `mozilla-firefox/firefox`, currently `main` = **160.0a1**).
- `./mach doctor` → **No issues detected**.
- rustc 1.99, clang, python3 present. 4 cores, 13 GB RAM, ~140 GB free disk.

A cold full build on 4 cores takes roughly 1.5–3 hours. Incremental builds are
minutes. Disk use for an object directory is tens of GB — keep it outside the
Espionage repo (the default `obj-espionage` lives inside the upstream tree,
which is fine because the upstream tree is a build input, not our repo).

## 1. Environment

```sh
export ESPIONAGE_UPSTREAM="$HOME/Documents/espionage-firefox-bootstrap/firefox"
```

All scripts honour this variable and default to that path.

## 2. Bootstrap

```sh
./scripts/bootstrap.sh
```

- Confirms the upstream checkout exists (clones it if missing) and is clean.
- Checks out the commit pinned in `config/upstream.lock` (or reports the drift).
- Runs `./mach doctor`.

If `mach doctor` reports missing tools, run `./mach bootstrap` once and re-run.

## 3. Apply the Espionage layer

```sh
./scripts/apply.sh          # patches + overlays
FORCE=1 ./scripts/apply.sh  # only if you intentionally have local edits
./scripts/reset.sh          # undo everything, back to pristine upstream
```

`apply.sh` refuses to run on a dirty upstream tree so that patches never stack
on stale edits. Typical loop:

```sh
./scripts/reset.sh          # clean slate
./scripts/apply.sh          # reapply our series
./scripts/build.sh          # build
./scripts/run.sh            # launch
```

## 4. Build & run

```sh
./scripts/build.sh          # first run configures with config/mozconfig.linux
./scripts/run.sh            # or: ./scripts/run.sh -- -P   (new profile)
```

The build uses `config/mozconfig.linux`, with the object directory at
`$ESPIONAGE_UPSTREAM/obj-espionage`. Useful direct commands from the upstream
tree:

```sh
cd "$ESPIONAGE_UPSTREAM"
./mach build faster     # front-end only (prefs/JS/CSS/HTML, no C++/Rust)
./mach build binaries   # C++/Rust only, skip front-end
./mach build             # everything
./mach run
./mach package           # produce a distributable under obj-espionage/dist
```

## 5. Smoke checklist (run after every meaningful change)

- [ ] Window opens; `about:support` shows **Espionage** and the Espionage
      profile path.
- [ ] New tab and home page show our start page; no sponsored tiles or feeds.
- [ ] Load a few sites (search, a news site, a site with a video) successfully.
- [ ] `about:config` spot-check: tracking protection on, telemetry off, DoH mode
      as intended, Pocket off.
- [ ] Pure-black chrome looks correct, including hover/focus states.
- [ ] `./scripts/reset.sh && ./scripts/apply.sh && ./scripts/build.sh`
      reproduces a working build.

## 6. Editing Firefox files the right way

When a fix requires editing a file Firefox owns (not adding a new one):

```sh
cd "$ESPIONAGE_UPSTREAM"
# ...edit browser/... in a text editor...
git diff -- browser/path/you/changed          # review
# From the Espionage repo:
./scripts/export-patch.sh <category> <short-name> browser/path/you/changed
```

`export-patch.sh` writes `patches/<category>/<NN>-<short-name>.patch` and appends
it to `patches/series`. Commit the patch; never commit the upstream tree.

Categories in use: `branding`, `browser-ui`, `start-page`, `privacy`.

## 7. Packaging (M5, not yet implemented)

The intended Linux outputs are a tarball (`mach package`), a `.deb` and an
AppImage, built from a release-configured object directory. `--enable-release`
is available in `config/mozconfig.linux` but commented out for fast iteration.

## 8. Troubleshooting

- **Build fails after editing prefs/CSS/HTML only:** `./mach build faster`.
- **"Cannot apply patch":** upstream drifted. Update `config/upstream.lock`,
  re-checkout, and rebase the patch (`docs/ARCHITECTURE.md` §6).
- **Strange UI state:** delete the Espionage profile
  (`~/.mozilla/espionage/<profile>`) or run with `-P`.
- **Out of disk:** object directories are large; `./mach clobber` to reclaim.

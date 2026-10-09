# Building Gold-Web on Linux

Gold-Web builds from a normal Firefox source checkout. This repo never contains
that checkout — it holds the Gold-Web changes and a few scripts that put them
on top.

## Before you start

You need:

- A Firefox source checkout on disk (`git clone --filter=blob:none
  https://github.com/mozilla-firefox/firefox`). `scripts/bootstrap.sh` will do
  it if it's missing, but it's large.
- A working Firefox build toolchain. `./mach doctor` inside the checkout tells
  you if anything's missing; `./mach bootstrap` installs it.

If your checkout isn't in a place the scripts look, point them at it:

```sh
export GOLDWEB_UPSTREAM="$HOME/somewhere/firefox"
```

A cold full build takes hours on a four-core machine, and the object directory
is tens of gigabytes. Incremental builds after that are quick.

## The loop

```sh
./scripts/bootstrap.sh   # find the checkout, check the toolchain
./scripts/apply.sh       # brand + UI + patches
./scripts/build.sh       # configure (first time) and build
./scripts/run.sh         # launch it
```

When you edit something in the tree and want to start over cleanly:

```sh
./scripts/reset.sh       # Firefox back to pristine
./scripts/apply.sh
./scripts/build.sh
```

`apply.sh` refuses to run if the checkout has other local changes, so patches
never stack on stale edits. `FORCE=1 ./scripts/apply.sh` overrides that.

## Build commands worth knowing

Run these from the Firefox checkout (the scripts handle the common ones for
you):

```sh
./mach build            # everything
./mach build faster     # front-end only — prefs, JS, CSS, HTML; no C++/Rust
./mach build binaries   # C++/Rust only, skip the front-end
./mach run
./mach package          # a distributable under obj-goldweb/dist
```

Which to use:

| You changed | Use | Roughly |
|---|---|---|
| Start page, prefs, strings, chrome CSS | `mach build faster` | seconds |
| Branding and icons | `mach build faster` | about a minute |
| A C++ or Rust file | `mach build` | minutes (the link dominates) |
| A widely-included header | `mach build` | longer |

Two shortcuts that make iteration much cheaper: `mach build faster` skips all
compilation, and sccache (already enabled in `build/mozconfig.linux`) caches
both C++ and Rust compiles between builds.

## After a build, check these

- [ ] It opens; `about:support` says Gold-Web and points at a Gold-Web profile
- [ ] New tab and home show our start page, with no sponsored tiles or feeds
- [ ] A handful of sites load — a search, a news site, something with video
- [ ] `about:config` spot-check: tracking protection on, telemetry off, the
      DNS setting as intended, Pocket off
- [ ] The black-and-gold chrome looks right, including hover and focus states
- [ ] `reset.sh && apply.sh && build.sh` reproduces a working build

## Changing a file Firefox owns

If a fix needs editing a file Firefox already has (rather than adding one):

```sh
cd "$GOLDWEB_UPSTREAM"
# ...edit the file...
git diff -- browser/path/you/changed
# back in this repo:
./scripts/export-patch.sh <category> <name> browser/path/you/changed
```

That writes `patches/<category>/<NN>-<name>.patch` and adds it to
`patches/series`. Commit the patch; never commit the Firefox checkout.
Categories in use: `branding`, `browser-ui`, `start-page`, `privacy`.

## If something goes wrong

- **Only prefs/CSS/HTML changed but it won't build:** `./mach build faster`.
- **A patch won't apply:** Firefox moved. Update `build/upstream.lock`, check
  out the new revision and rebase the patch (see `docs/ARCHITECTURE.md`).
- **Weird UI state:** delete the profile under `~/.mozilla/goldweb/`, or run
  with `-P` for a fresh one.
- **Out of disk:** object directories are big. `./mach clobber` reclaims the
  space (and means the next build is a full one again).

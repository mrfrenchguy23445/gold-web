# `scripts/`

Developer tooling. Empty for now — the previous build scripts were for an
earlier approach and were removed with it.

Likely inhabitants once there's something to run:

- `fetch-cef.sh` — download and pin the CEF binary distribution
- `dev.sh` — configure and build the shell, then run it
- `test.sh` — run whatever tests exist
- `package.sh` — build Linux bundles (`.deb`, AppImage)
- `release.sh` — the release checklist, automated as far as it can be

Prefer clear, single-purpose scripts over one clever one.

# Espionage Web Browser

**Your browser. Your business.**

Espionage is an independent, privacy-first desktop browser built on Mozilla
Firefox's open-source foundation. It is not Firefox with a different logo: it
has its own visual identity, defaults, settings architecture and roadmap, and
it treats privacy as the default rather than a hidden settings menu.

> Status: **pre-alpha / planning.** No Espionage build exists yet. The upstream
> Firefox source is checked out and the toolchain is verified; the first build
> is milestone M0 (`docs/ROADMAP.md`).

## Principles

- **Anti-tracking by default** through Firefox's strongest built-in privacy
  mechanisms, enabled without the user having to find them.
- **No surprises.** No hidden analytics, advertising identifiers or undisclosed
  telemetry. Optional diagnostics are documented and genuinely opt-in.
- **Honest privacy.** Private browsing limits local records; it does not make
  you anonymous to websites or networks, and we say so.
- **Security is not optional.** Sandboxing, secure transport and timely updates
  are never traded away for a privacy claim.
- **Quiet and fast.** Minimal background activity, purposeful UI, no clutter.

See `docs/DESIGN.md` for the visual language and `docs/ARCHITECTURE.md` for how
the code is organised.

## Repository layout

```
branding/          Source brand assets and the in-tree branding overlay
config/            Build configuration + pinned upstream revision
docs/              Architecture, roadmap, design language, build guides
patches/           Edit-patches against the Firefox tree, applied in series order
scripts/           bootstrap / apply / build / run / export-patch helpers
webui/             Our web-facing UI (start page, privacy centre, ...)
```

The upstream Firefox checkout lives **outside** this repository at
`~/Documents/espionage-firefox-bootstrap/firefox`. This repo never vendors the
~11 GB source tree; it overlays files and applies patches onto it.

## Quick start (Linux)

```sh
./scripts/bootstrap.sh     # verify upstream checkout + toolchain
./scripts/apply.sh         # overlay branding/webui + apply patches
./scripts/build.sh         # configure (if needed) and build
./scripts/run.sh           # launch Espionage
```

Full details: `docs/BUILDING_LINUX.md`.

## Roadmap at a glance

| Milestone | Theme | Status |
|-----------|-------|--------|
| M0 | Baseline Firefox build & run | not started |
| M1 (v0.1) | Identity: branding, pure-black theme, start page, privacy defaults | not started |
| M2 (v0.2) | Privacy Control Center | planned |
| M3 (v0.3) | Workspaces & session management | planned |
| M4 (v0.4) | Daily-browser polish | planned |
| M5 (v1.0) | Packaging & updates | planned |

See `docs/ROADMAP.md`.

## License

TBD (see `LICENSE`). Espionage's own code will be licensed separately from
Mozilla's Firefox source, which remains under the MPL 2.0.

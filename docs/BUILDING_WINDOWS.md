# Building Espionage on Windows

**Status: deferred to M5.** Linux is the primary platform for v0.1–v0.4
(see `docs/ROADMAP.md`). This document is a placeholder so the eventual Windows
work has a home.

## What Windows will require (sketch)

- A Windows 11 host with the Firefox build prerequisites: Visual Studio 2022
  (Desktop C++ workload), Windows SDK, MozillaBuild, Rust and Node.
- `./mach bootstrap` on the Windows machine (it installs the correct MSVC
  layout and toolchain).
- A Windows variant of `config/mozconfig.linux`, e.g. `config/mozconfig.windows`,
  using `--enable-application=browser --with-app-basename=Espionage`.
- Windows-specific branding assets that we currently seed from upstream:
  `firefox.ico`, `VisualElements_*.png`, `*VisualElementsManifest.xml`,
  `wizHeader*.bmp`, `wizWatermark.bmp`, `stubinstaller/`, `msix/`.
- `branding/espionage/branding.nsi` (installer strings) and the MSIX package
  manifest, rebranded.
- Signing and a Windows update path (M5).

## Cross-compilation

Firefox does not support building Windows binaries from Linux. Windows builds
must run on Windows (a VM is fine).

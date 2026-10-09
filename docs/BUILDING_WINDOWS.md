# Building Gold-Web on Windows

**Later.** Linux is the focus through v0.4 (see `docs/ROADMAP.md`); Windows is
a v1.0 item. This is a placeholder so the work has somewhere to start.

## What it'll take

- A Windows 11 machine — Firefox can't be cross-compiled from Linux. A VM is
  fine.
- The usual Firefox prerequisites: Visual Studio 2022 (Desktop C++), the
  Windows SDK, MozillaBuild, Rust and Node. `./mach bootstrap` sets most of
  this up.
- A `build/mozconfig.windows`, mirroring the Linux one:

  ```
  ac_add_options --enable-application=browser
  ac_add_options --with-app-basename=Gold-Web
  ```

- The Windows-only brand art we currently borrow from upstream: `firefox.ico`,
  `VisualElements_*.png`, the `*VisualElementsManifest.xml` files,
  `wizHeader*.bmp`, `wizWatermark.bmp`, and the `stubinstaller/` and `msix/`
  directories.
- A rebranded `brand/goldweb/branding.nsi` and MSIX manifest.
- Signing, and an update path. Both are v1.0 work.

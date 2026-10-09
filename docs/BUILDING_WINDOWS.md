# Building Gold-Web on Windows

**Later.** Linux is the focus through v0.4 (see `docs/ROADMAP.md`); Windows is a
v1.0 item. This is a placeholder so the work has somewhere to start.

## What it'll take

- Visual Studio 2022 with the Desktop C++ workload, plus CMake.
- The **CEF binary distribution** for Windows, fetched into `third_party/cef/`.
- A matching toolchain: CEF's Windows binaries are built with a specific MSVC
  version, so use the one the distribution recommends.
- No cross-compiling — Gold-Web is built on Windows itself.

Once Linux is settled, this file gets the real steps: the CMake invocation,
packaging, code signing, and an update path.

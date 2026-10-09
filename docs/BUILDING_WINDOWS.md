# Building Gold-Web on Windows

**Later.** Linux is the focus through v0.4 (see `docs/ROADMAP.md`); Windows is a
v1.0 item. This is a placeholder so the work has somewhere to start.

## What it'll take

- Windows 10/11 with the **WebView2 runtime** (it ships with current Windows).
- The Rust toolchain for Windows (`rustup` plus the MSVC build tools).
- Node.js 20+.
- No cross-compiling — Gold-Web is built on Windows itself.

Once Linux is settled, this file gets the real steps: installing the toolchain,
the `tauri build` invocation, code signing, and an update path.

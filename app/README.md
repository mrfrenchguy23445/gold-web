# `app/` — the C++ shell

The CEF host: a C++ application that owns the window, the tabs, and the
integration with the Chromium Embedded Framework. It's the trusted half of
Gold-Web and the only part that links against CEF.

Planned areas:

- `src/` — entry point, CEF lifecycle, browser/tab management, and the C++ side
  of the bridge to the UI
- `include/` — headers for the shell
- `resources/` — native resources (icons, window metadata)

The interface the user sees is not drawn here; it lives in `ui/` and is rendered
by CEF. This layer exists to give that interface a secure, native foundation.

Build files (`CMakeLists.txt`) and sources come later — this is structure only.

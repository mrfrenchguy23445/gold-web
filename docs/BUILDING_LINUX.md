# Building Gold-Web on Linux

Gold-Web is a C++ application that links against CEF. The shell builds with
CMake and Ninja; the interface is plain HTML/CSS/JS that the shell serves over
the `goldweb://` scheme.

## What you'll need

- A **C++20** toolchain: `g++` (10+) or `clang`
- **CMake** 3.21+ and **Ninja** (or Make)
- **pkg-config** and the usual build tools
- **CEF's Linux dependencies.** On Debian/Ubuntu, roughly:

  ```sh
  sudo apt update
  sudo apt install \
    build-essential cmake ninja-build pkg-config \
    libgtk-3-dev libglib2.0-dev libnss3-dev libatk1.0-dev \
    libx11-dev libxcomposite-dev libxdamage-dev libxrandr-dev \
    libxkbcommon-dev libasound2-dev libdrm-dev libgbm-dev
  ```

  The CEF distribution's own `CMakeLists.txt` and Linux notes list the exact
  set; treat the above as a starting point.

- The **CEF binary distribution** for your platform, fetched into
  `third_party/cef/` (never committed). `scripts/fetch-cef.sh` downloads it,
  verifies the checksum and pins the version.

## Build and run

From the repo root:

```sh
./scripts/fetch-cef.sh                 # download and pin CEF (~330 MB compressed)
cmake -S app -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/goldweb                        # run it
```

`cmake --build` also stages CEF's runtime files and the `ui/` + `brand/` trees
next to the binary, so `build/goldweb` runs in place with no extra setup. For a
debug build, swap `Release` for `Debug`.

Useful switches:

- `--goldweb-verbose` — raise CEF's log level (shows load events).
- `--goldweb-root=PATH` — serve the interface from `PATH` instead of the
  executable's directory. Handy for editing `ui/` without rebuilding.

## Verifying a build

- [x] The window opens and shows our chrome, served over `goldweb://`
- [ ] A page loads in a tab; back, forward and reload work
- [ ] eaglercraft and one other WebGL game load and play
- [ ] No network requests at startup beyond the page you asked for
- [ ] Content pages are isolated from `goldweb://` and the bridge

## Notes and gotchas

- **Pin the CEF version.** Don't drift; CEF's API changes and your compiler must
  match what the distribution expects.
- **Sandboxing.** The minimal CEF distribution ships no sandbox library, and the
  Linux sandbox needs `chrome-sandbox` setuid root, so this build runs with the
  sandbox off (`USE_SANDBOX=OFF`) and launches sub-processes directly
  (`--no-zygote`). A packaged build turns the sandbox back on once
  `chrome-sandbox` is installed with the right bits.
- **GPU.** For games, confirm GPU compositing is actually on. `--goldweb-verbose`
  and CEF's GPU logs are the first place to look.
- **Wayland vs X11.** CEF on Linux is X11-first today; XWayland is fine for now.

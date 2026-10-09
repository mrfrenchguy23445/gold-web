# Building Gold-Web on Linux

Gold-Web is a C++ application that links against CEF. It isn't scaffolded yet —
this file is both the setup guide and the record of the commands we intend to
use.

## What you'll need

- A C++ toolchain: `clang` or `g++`, C++17
- **CMake** 3.20+ and **Ninja** (or Make)
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

  The CEF distribution's `CMakeLists.txt` and its Linux notes list the exact
  set; treat the above as a starting point.

- The **CEF binary distribution** for your platform, fetched into
  `third_party/cef/` (never committed). `scripts/fetch-cef.sh` will download it
  and pin the version.

## The commands we'll use

Once the shell is scaffolded, from the repo root:

```sh
./scripts/fetch-cef.sh                 # download and pin CEF
cmake -S app -B build -G Ninja \
  -DCMAKE_BUILD_TYPE=Debug \
  -DCEF_ROOT="$PWD/third_party/cef"
cmake --build build
./build/goldweb                        # run it
```

Exact target names and paths come with the scaffold; the shape won't change.

## Verifying a build

- [ ] The window opens and shows our chrome, not a generic page
- [ ] A page loads in a tab; back, forward and reload work
- [ ] eaglercraft and one other WebGL game load and play
- [ ] No network requests at startup beyond the page you asked for
- [ ] `goldweb://` serves our interface, and content pages cannot reach it

## Notes and gotchas

- **Pin the CEF version.** Don't drift; CEF's API changes and your compiler must
  match what the distribution expects.
- **Sandboxing.** On Linux CEF's sandbox needs the `chrome-sandbox` helper with
  the right setuid bits — otherwise you run with `--no-sandbox`, for development
  only.
- **GPU.** For games, confirm GPU compositing is actually on. Check `chrome://gpu`
  inside a tab and our own diagnostics.
- **Wayland vs X11.** CEF on Linux has historically been X11-first; plan for
  XWayland at first and track native Wayland support.

# Building Gold-Web on Linux

Gold-Web is a Tauri 2 application. It isn't scaffolded yet — this file is both
the setup guide and the record of the commands we intend to use.

## What you'll need

- **Rust** (stable) via [rustup](https://rustup.rs)
- **Node.js** 20+ and npm
- **Tauri's Linux dependencies.** On Debian/Ubuntu:

  ```sh
  sudo apt update
  sudo apt install \
    build-essential curl wget file libssl-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev libxdo-dev
  ```

  Equivalent packages exist for Fedora, Arch and the rest; Tauri's prerequisites
  page lists them.

- Optionally, the Tauri CLI: `cargo install tauri-cli --version '^2'`

## The commands we'll use

Once the app is scaffolded:

```sh
npm install          # front-end dependencies
npm run tauri dev    # run Gold-Web with hot reload
npm run tauri build  # produce a release bundle
cargo test           # crate tests
```

## If you're starting the scaffold yourself

We intend the standard Tauri 2 layout: the front end in `src/`, the Rust core in
`src-tauri/`, and our own libraries under `crates/`. `create-tauri-app` can
generate that shape — keep our directory names and move generated files into
place rather than replacing the layout.

## Checking your work

There's no browser yet, so the near-term checklist is short:

- [ ] `cargo test` passes for every crate
- [ ] `npm run tauri dev` opens a Gold-Web window with no console errors
- [ ] The window uses the Gold UI colours from `brand/gold-ui/`
- [ ] No network requests happen at startup (watch a system network tool)

## Troubleshooting

- **Missing `webkit2gtk`:** install `libwebkit2gtk-4.1-dev`. Older guides name
  `libwebkit2gtk-4.0-dev`, which is for Tauri 1.
- **AppIndicator errors:** install `libayatana-appindicator3-dev`.
- **Blank window:** check the terminal — `tauri dev` prints front-end build
  errors there.

# Gold-Web

A gaming and privacy browser for the desktop. Black and gold, quick, and quiet.

It's not a fork of Firefox or a reskin of Chromium. It's our own browser, built
in Rust on [Tauri](https://tauri.app). The look is ours, and so are the defaults
— tracking protection, fingerprint resistance and encrypted DNS are on the
moment you open it. No telemetry, no sponsored tiles, no "recommended" anything.

It's meant to run the browser games people actually play, eaglercraft and the
rest, without the tracking that usually rides along with them.

Right now it's a skeleton: folders and plans, no browser code yet. The order
things get built is in `docs/ROADMAP.md`.

## What's here

```
src/          the browser chrome — window, tabs, address bar, our pages
src-tauri/    the Rust core: windows, tabs, privacy, storage
crates/       our reusable Rust libraries (core, privacy, storage, net, engine)
brand/        source art and the Gold UI design system
docs/         design, architecture, roadmap
scripts/      dev tooling
```

## License

Gold-Web's own code is licensed separately from the web engine it uses. See
`LICENSE`.

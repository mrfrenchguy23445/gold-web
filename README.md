# Gold-Web

A gaming and privacy browser for the desktop. Black and gold, quick, and quiet.

It's not a fork of Firefox or a reskin of Chrome, but it does render pages with
Chromium's engine: Gold-Web embeds the **Chromium Embedded Framework (CEF)**.
Everything around that engine — the window, the tabs, the address bar, the
privacy defaults — is ours, written in C++ with our own web-based interface.

Tracking protection, fingerprint resistance and encrypted DNS are on the moment
you open it. No telemetry, no sponsored tiles, no "recommended" anything.

It's meant to run the browser games people actually play, eaglercraft and the
rest, without the tracking that usually rides along with them. Because the
engine is Chromium, WebGL and WebAssembly games get the same treatment they'd
get in a normal Chromium browser.

Right now it's a skeleton: folders and plans, no browser code yet. The order
things get built is in `docs/ROADMAP.md`.

## What's here

```
app/          the C++ shell: window, tabs, CEF integration
ui/           the browser chrome and pages, in HTML/CSS/JS
brand/        source art and the Gold UI design system
third_party/  the CEF binary distribution (fetched, not committed)
docs/         design, architecture, roadmap
scripts/      dev tooling
```

## License

Gold-Web's own code is licensed separately from CEF and Chromium, which keep
their own licenses. See `LICENSE`.

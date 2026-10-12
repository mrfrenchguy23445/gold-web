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

Right now it's early. The shell builds, opens a frameless black-and-gold window
and renders our own interface over `goldweb://`. Tabs, real navigation and the
privacy controls come next — see `docs/ROADMAP.md` for the order.

## Website

The landing page has its own repository:
[`gold-web-site`](https://github.com/mrfrenchguy23445/gold-web-site). One static
HTML page, no build step, no external requests, published with GitHub Pages.

## Build

```sh
./scripts/fetch-cef.sh
cmake -S app -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/goldweb
```

Linux only for now; Windows and macOS are planned for v1.0. More detail in
`docs/BUILDING_LINUX.md`.

## License

Gold-Web's own code is licensed separately from CEF and Chromium, which keep
their own licenses. See `LICENSE`.

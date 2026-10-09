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

Right now it's a skeleton: folders and plans, no browser code yet..

## License

Gold-Web's own code is licensed separately from CEF and Chromium, which keep
their own licenses. See `LICENSE`.

# `src-tauri/` — the Rust core

The Tauri application: it creates windows and tabs, owns application state, and
exposes the commands the front end calls. This is the trusted half of Gold-Web.

Planned responsibilities:

- window and tab lifecycle
- talking to the platform web engine (through `crates/goldweb-engine`)
- the command surface the front end uses
- wiring the crates in `crates/` together
- the application entry point, config and capabilities

Keep this layer thin. Logic belongs in the crates, where it can be tested
without opening a window.

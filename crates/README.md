# `crates/` — Gold-Web's Rust libraries

Small, focused libraries that the application is built from. They're kept
separate so they can be tested on their own and reasoned about in isolation.

Planned crates (none written yet):

| Crate | Job |
|---|---|
| `goldweb-core` | Windows, tabs, sessions, workspaces — application state |
| `goldweb-privacy` | Blocklists, per-site policy, privacy defaults |
| `goldweb-storage` | Bookmarks, history, downloads, settings — the database |
| `goldweb-net` | DNS, proxy and egress policy |
| `goldweb-engine` | The only code that touches the platform webview |

When we start, this becomes a Cargo workspace so the app and the crates build
together.

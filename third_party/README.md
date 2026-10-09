# `third_party/`

External code we don't write and don't commit. Today that means the **CEF binary
distribution** — the prebuilt Chromium Embedded Framework (headers plus
`libcef`) that the shell links against.

A future `scripts/fetch-cef.sh` will download the right build for the platform
into `third_party/cef/`, which is git-ignored. Nothing here yet.

CEF binaries are large, so keep them out of git and pin the exact version in a
lock file once we start.

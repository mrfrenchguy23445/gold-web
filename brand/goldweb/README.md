# Gold-Web brand files

These files get copied into `browser/branding/goldweb/` in the Firefox tree by
`scripts/apply.sh`. It's the product's identity as the browser build sees it:
name, bundle id, about-dialog styling and the translatable brand strings.

What lives here:

- `configure.sh` — display name and macOS bundle id
- `moz.build` — build wiring (mirrors upstream `unofficial`)
- `pref/firefox-branding.js` — branding and update preferences
- `content/` — about-dialog styling and `jar.mn`
- `locales/en-US/` — brand strings

The binary art that Firefox expects (window/app icons, installer bitmaps,
Windows and macOS resources) isn't committed yet. `apply.sh` fills anything
we haven't produced from upstream's `unofficial` branding so the tree still
builds. Real Gold-Web art goes in `../assets/` and takes over as it's made.

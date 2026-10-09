# Espionage branding directory

This directory is overlaid into `browser/branding/espionage/` by
`scripts/apply.sh`. It contains only text files owned by us:

- `configure.sh` — display name and bundle id
- `moz.build` — build wiring (mirrors upstream `unofficial`)
- `pref/firefox-branding.js` — branding/update prefs
- `content/` — about-dialog styling and `jar.mn`
- `locales/en-US/` — brand strings

## Binary assets are intentionally not committed yet

Firefox's branding build expects a set of platform assets
(`default{16,32,48,64,128,256}.png`, `firefox.ico`, `.icns`, `.bmp`, …).
Until the Espionage icon set is designed, `apply.sh` seeds any file we don't
ship from upstream `browser/branding/unofficial/` so the tree stays buildable.
As each real asset is produced it is added here and takes over.

Source masters (SVG/PNG, pre-export) belong in `../icons` and `../logos`.

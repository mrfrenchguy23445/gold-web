#!/usr/bin/env bash
#
# Fetch a pinned CEF binary distribution into third_party/cef.
#
#   scripts/fetch-cef.sh                        # latest stable, linux64, minimal
#   CEF_DIST=standard scripts/fetch-cef.sh      # include debug symbols + cefsimple
#   CEF_VERSION='156.0.7+g47dbc1d+chromium-156.0.8078.17' scripts/fetch-cef.sh
#
# Sizes are not small: the minimal distribution is ~330 MB compressed and
# ~1 GB extracted; the standard distribution is roughly double. Re-runs reuse
# the tarball in third_party/.cache unless you delete it.
#
# The whole of third_party/cef is git-ignored; this script is how a checkout
# gets its engine. Nothing here is vendored on purpose.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${CEF_DEST:-$ROOT/third_party/cef}"
CACHE="${CEF_CACHE:-$ROOT/third_party/.cache}"
PLATFORM="${CEF_PLATFORM:-linux64}"
DIST="${CEF_DIST:-minimal}"
VERSION="${CEF_VERSION:-}"
INDEX_URL="${CEF_INDEX_URL:-https://cef-builds.spotifycdn.com/index.json}"

say() { printf '\033[38;5;179m%s\033[0m\n' "$*"; }
die() { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null || die "curl is required"
command -v python3 >/dev/null || die "python3 is required"
command -v tar >/dev/null || die "tar is required"

if [ -f "$DEST/include/cef_version.h" ]; then
  say "CEF already present at $DEST — delete it to re-fetch."
  exit 0
fi

mkdir -p "$CACHE"

index="$CACHE/index.json"
if [ ! -s "$index" ]; then
  say "Fetching CEF build index (this is a ~10 MB file)…"
  curl -fSL --retry 5 --retry-delay 3 --retry-all-errors -o "$index" "$INDEX_URL"
fi

say "Resolving ${PLATFORM}/${DIST}${VERSION:+ @ $VERSION}…"
read -r NAME SHA1 CEFVER CHROMIUM <<EOF
$(python3 - "$index" "$PLATFORM" "$DIST" "$VERSION" <<'PY'
import json, sys
index, platform, dist, want = sys.argv[1:5]
data = json.load(open(index, encoding="utf-8"))
versions = data[platform]["versions"]          # newest first
for v in versions:
    if want and v["cef_version"] != want:
        continue
    files = {f["type"]: f for f in v["files"]}
    if dist in files:
        f = files[dist]
        print(f["name"], f["sha1"], v["cef_version"], v["chromium_version"])
        break
else:
    sys.exit(f"no {dist} build for {platform}" + (f" @ {want}" if want else ""))
PY
)
EOF

[ -n "$NAME" ] || die "Could not resolve a CEF build."

tarball="$CACHE/$NAME"
say "CEF $CEFVER (Chromium $CHROMIUM)"
say "Archive: $NAME"

if [ ! -s "$tarball" ]; then
  say "Downloading… (resumable; Ctrl-C is safe)"
  curl -fL -C - --retry 8 --retry-delay 5 --retry-all-errors -o "$tarball" \
    "https://cef-builds.spotifycdn.com/$NAME"
fi

say "Verifying checksum…"
actual="$(sha1sum "$tarball" | cut -d' ' -f1)"
[ "$actual" = "$SHA1" ] || die "checksum mismatch for $NAME (expected $SHA1, got $actual)"

say "Extracting…"
staging="$(mktemp -d "$CACHE/extract.XXXXXX")"
tar -xjf "$tarball" -C "$staging"
inner="$(find "$staging" -mindepth 1 -maxdepth 1 -type d | head -1)"
[ -n "$inner" ] || die "unexpected archive layout"

rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
mv "$inner" "$DEST"
rm -rf "$staging"

printf '%s\n' "$CEFVER" > "$ROOT/third_party/cef.version"

say "CEF $CEFVER ready at $DEST"
say "Next: cmake -S app -B build && cmake --build build"

#!/usr/bin/env bash
# Apply the Espionage layer onto the upstream Firefox tree:
#   1. edit-patches from patches/series
#   2. branding overlay  -> browser/branding/espionage
#   3. web UI overlay    -> browser/extensions/espionage-start
#   4. theme overlay     -> browser/extensions/espionage-theme
#
# Refuses to run on a dirty upstream tree (patches would stack on stale edits).
# Set FORCE=1 to override.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="${ESPIONAGE_UPSTREAM:-$HOME/Documents/espionage-firefox-bootstrap/firefox}"
SERIES="$REPO_ROOT/patches/series"

[ -d "$UPSTREAM/.git" ] || { echo "error: no upstream checkout at $UPSTREAM"; exit 1; }
[ -f "$SERIES" ] || { echo "error: missing $SERIES"; exit 1; }

if [ -n "$(git -C "$UPSTREAM" status --porcelain)" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "error: upstream tree is dirty. Run scripts/reset.sh first, or FORCE=1."
  exit 1
fi

echo "== 1/4 applying patches =="
applied=0
while IFS= read -r line; do
  line="${line%%#*}"
  line="$(printf '%s' "$line" | tr -d '[:space:]')"
  [ -n "$line" ] || continue
  patch_file="$REPO_ROOT/patches/$line"
  [ -f "$patch_file" ] || { echo "  missing patch: $line"; exit 1; }
  echo "  apply $line"
  git -C "$UPSTREAM" apply --whitespace=nowarn "$patch_file"
  applied=$((applied + 1))
done <"$SERIES"
echo "  ($applied patch(es))"

echo "== 2/4 branding overlay =="
dest="$UPSTREAM/browser/branding/espionage"
mkdir -p "$dest"
seed="$UPSTREAM/browser/branding/unofficial"
if [ -d "$seed" ]; then
  # Seed any asset we don't ship yet so the tree stays buildable.
  cp -rn "$seed/." "$dest/" 2>/dev/null || true
fi
if [ -d "$REPO_ROOT/branding/espionage" ]; then
  cp -r "$REPO_ROOT/branding/espionage/." "$dest/"
fi

echo "== 3/4 web UI overlay =="
if [ -d "$REPO_ROOT/webui/start-page" ]; then
  mkdir -p "$UPSTREAM/browser/extensions/espionage-start"
  cp -r "$REPO_ROOT/webui/start-page/." "$UPSTREAM/browser/extensions/espionage-start/"
fi

echo "== 4/4 theme overlay =="
if [ -d "$REPO_ROOT/branding/theme" ]; then
  mkdir -p "$UPSTREAM/browser/extensions/espionage-theme"
  cp -r "$REPO_ROOT/branding/theme/." "$UPSTREAM/browser/extensions/espionage-theme/"
fi

echo
echo "Applied. Changed files:"
git -C "$UPSTREAM" status --short | sed 's/^/  /' | head -40
echo
echo "Next: ./scripts/build.sh"

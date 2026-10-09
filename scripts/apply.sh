#!/usr/bin/env bash
# Lay the Gold-Web changes onto the upstream Firefox tree:
#   1. patches from patches/series
#   2. brand overlay  -> browser/branding/goldweb
#   3. UI overlay     -> browser/extensions/goldweb-start
#   4. theme overlay  -> browser/extensions/goldweb-theme
#
# Refuses to run on a dirty tree, so patches never stack on stale edits.
# Set FORCE=1 to override.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

[ -d "$UPSTREAM/.git" ] || die "no Firefox checkout at $UPSTREAM"
[ -f "$SERIES" ] || die "missing $SERIES"

if [ -n "$(git -C "$UPSTREAM" status --porcelain)" ] && [ "${FORCE:-0}" != "1" ]; then
  die "the checkout is dirty; run scripts/reset.sh first (or FORCE=1)"
fi

echo "== patches =="
count=0
while IFS= read -r line; do
  line="${line%%#*}"
  line="$(printf '%s' "$line" | tr -d '[:space:]')"
  [ -n "$line" ] || continue
  patch_file="$REPO_ROOT/patches/$line"
  [ -f "$patch_file" ] || die "missing patch: $line"
  echo "   $line"
  git -C "$UPSTREAM" apply --whitespace=nowarn "$patch_file"
  count=$((count + 1))
done <"$SERIES"
echo "   ($count applied)"

echo "== brand =="
dest="$UPSTREAM/browser/branding/goldweb"
mkdir -p "$dest"
# Seed any asset we don't ship yet (icons, installers, platform art) from
# upstream so the tree stays buildable while the Gold-Web art is designed.
seed="$UPSTREAM/browser/branding/unofficial"
[ -d "$seed" ] && cp -rn "$seed/." "$dest/" 2>/dev/null || true
[ -d "$REPO_ROOT/brand/goldweb" ] && cp -r "$REPO_ROOT/brand/goldweb/." "$dest/"

echo "== start page =="
if [ -d "$REPO_ROOT/ui/start-page" ]; then
  mkdir -p "$UPSTREAM/browser/extensions/goldweb-start"
  cp -r "$REPO_ROOT/ui/start-page/." "$UPSTREAM/browser/extensions/goldweb-start/"
fi

echo "== theme =="
if [ -d "$REPO_ROOT/brand/gold-ui" ] && [ -n "$(ls -A "$REPO_ROOT/brand/gold-ui")" ]; then
  mkdir -p "$UPSTREAM/browser/extensions/goldweb-theme"
  cp -r "$REPO_ROOT/brand/gold-ui/." "$UPSTREAM/browser/extensions/goldweb-theme/"
fi

echo
echo "Touched:"
git -C "$UPSTREAM" status --short | sed 's/^/   /' | head -40
echo
echo "Next: ./scripts/build.sh"

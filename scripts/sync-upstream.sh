#!/usr/bin/env bash
# Move the upstream tree to the commit pinned in config/upstream.lock and test
# whether the current patch series still applies. Nothing is built here.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="${ESPIONAGE_UPSTREAM:-$HOME/Documents/espionage-firefox-bootstrap/firefox}"
SERIES="$REPO_ROOT/patches/series"

[ -d "$UPSTREAM/.git" ] || { echo "error: no upstream checkout at $UPSTREAM"; exit 1; }

pinned="$(sed -n 's/^commit[[:space:]]*=[[:space:]]*//p' "$REPO_ROOT/config/upstream.lock" | head -1)"
[ -n "$pinned" ] || { echo "error: no commit in config/upstream.lock"; exit 1; }

echo "Fetching upstream..."
git -C "$UPSTREAM" fetch origin --tags

echo "Checking out pinned commit $pinned..."
git -C "$UPSTREAM" checkout --detach "$pinned"

if [ -n "$(git -C "$UPSTREAM" status --porcelain)" ]; then
  echo "Resetting working tree..."
  git -C "$UPSTREAM" reset --hard "$pinned"
fi

echo
echo "Testing patch series (dry run)..."
fail=0
while IFS= read -r line; do
  line="${line%%#*}"
  line="$(printf '%s' "$line" | tr -d '[:space:]')"
  [ -n "$line" ] || continue
  patch_file="$REPO_ROOT/patches/$line"
  if git -C "$UPSTREAM" apply --check "$patch_file" 2>/dev/null; then
    echo "  OK      $line"
  else
    echo "  CONFLICT $line"
    fail=1
  fi
done <"$SERIES"

echo
if [ "$fail" -eq 0 ]; then
  echo "All patches apply cleanly. Run ./scripts/apply.sh to apply for real."
else
  echo "Some patches no longer apply. Fix them in the upstream tree, then"
  echo "refresh each with ./scripts/export-patch.sh (see docs/ARCHITECTURE.md §6)."
  exit 1
fi

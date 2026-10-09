#!/usr/bin/env bash
# Check (or fetch) the upstream Firefox checkout and the build toolchain.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

REPO_URL="https://github.com/mozilla-firefox/firefox"

lock_value() {
  sed -n "s/^${1}[[:space:]]*=[[:space:]]*//p" "$REPO_ROOT/build/upstream.lock" | head -1
}

if [ ! -d "$UPSTREAM/.git" ]; then
  echo "No Firefox checkout at: $UPSTREAM"
  echo "Fetching $REPO_URL (this is large)..."
  mkdir -p "$(dirname "$UPSTREAM")"
  git clone --filter=blob:none "$REPO_URL" "$UPSTREAM"
fi

echo "Source:   $UPSTREAM"
echo "Version:  $(cat "$UPSTREAM/browser/config/version.txt" 2>/dev/null || echo unknown)"
echo "Revision: $(git -C "$UPSTREAM" rev-parse --short HEAD)"

pinned="$(lock_value commit)"
if [ -n "$pinned" ] && ! git -C "$UPSTREAM" cat-file -e "${pinned}^{commit}" 2>/dev/null; then
  echo "Heads up: pinned revision $pinned is not here yet (run scripts/sync-upstream.sh)."
fi

if [ -n "$(git -C "$UPSTREAM" status --porcelain)" ]; then
  echo
  echo "Note: the checkout has local changes. Run scripts/reset.sh before applying"
  echo "the Gold-Web layer (and export any real edits as a patch first)."
fi

echo
echo "Checking the toolchain..."
cd "$UPSTREAM"
./mach doctor

echo
echo "Ready. Next: ./scripts/apply.sh && ./scripts/build.sh"

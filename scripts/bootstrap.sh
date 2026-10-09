#!/usr/bin/env bash
# Verify (or create) the upstream Firefox checkout and the build toolchain.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="${ESPIONAGE_UPSTREAM:-$HOME/Documents/espionage-firefox-bootstrap/firefox}"
REPO_URL="https://github.com/mozilla-firefox/firefox"

lock_value() {
  sed -n "s/^${1}[[:space:]]*=[[:space:]]*//p" "$REPO_ROOT/config/upstream.lock" | head -1
}

if [ ! -d "$UPSTREAM/.git" ]; then
  echo "Upstream checkout not found at: $UPSTREAM"
  echo "Cloning $REPO_URL (this is large)..."
  mkdir -p "$(dirname "$UPSTREAM")"
  git clone --filter=blob:none "$REPO_URL" "$UPSTREAM"
fi

echo "Upstream:  $UPSTREAM"
echo "Version:   $(cat "$UPSTREAM/browser/config/version.txt" 2>/dev/null || echo unknown)"
echo "HEAD:      $(git -C "$UPSTREAM" rev-parse --short HEAD)"

pinned="$(lock_value commit)"
if [ -n "$pinned" ] && ! git -C "$UPSTREAM" cat-file -e "${pinned}^{commit}" 2>/dev/null; then
  echo "Note: pinned commit $pinned is not present locally (run scripts/sync-upstream.sh)."
fi

if [ -n "$(git -C "$UPSTREAM" status --porcelain)" ]; then
  echo
  echo "WARNING: upstream tree has local changes. Run scripts/reset.sh (and"
  echo "export any real edits as patches) before applying the Espionage layer."
fi

echo
echo "Running mach doctor..."
cd "$UPSTREAM"
./mach doctor

echo
echo "Bootstrap OK. Next: ./scripts/apply.sh && ./scripts/build.sh"

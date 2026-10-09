#!/usr/bin/env bash
# Return the upstream Firefox tree to pristine HEAD, removing the Espionage
# overlay. Does not touch the object directory.
set -euo pipefail

UPSTREAM="${ESPIONAGE_UPSTREAM:-$HOME/Documents/espionage-firefox-bootstrap/firefox}"
[ -d "$UPSTREAM/.git" ] || { echo "error: no upstream checkout at $UPSTREAM"; exit 1; }

echo "Reverting modified tracked files..."
# Revert only what actually changed; a full `git checkout -- .` walks the
# entire ~11 GB tree and is needlessly slow.
git -C "$UPSTREAM" diff --name-only -z | xargs -0 -r git -C "$UPSTREAM" checkout --

echo "Removing Espionage overlay directories..."
rm -rf \
  "$UPSTREAM/browser/branding/espionage" \
  "$UPSTREAM/browser/extensions/espionage-start" \
  "$UPSTREAM/browser/extensions/espionage-theme"

echo "Upstream is pristine at $(git -C "$UPSTREAM" rev-parse --short HEAD)."

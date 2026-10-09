#!/usr/bin/env bash
# Put the upstream Firefox checkout back to pristine HEAD, removing the
# Gold-Web overlay. Leaves the object directory alone.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

[ -d "$UPSTREAM/.git" ] || die "no Firefox checkout at $UPSTREAM"

echo "Reverting modified files..."
git -C "$UPSTREAM" diff --name-only -z | xargs -0 -r git -C "$UPSTREAM" checkout --

echo "Removing the Gold-Web overlay..."
rm -rf \
  "$UPSTREAM/browser/branding/goldweb" \
  "$UPSTREAM/browser/extensions/goldweb-start" \
  "$UPSTREAM/browser/extensions/goldweb-theme"

echo "Done. Pristine at $(git -C "$UPSTREAM" rev-parse --short HEAD)."

#!/usr/bin/env bash
# Configure (if needed) and build Gold-Web from the upstream tree.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

[ -d "$UPSTREAM/.git" ] || die "no Firefox checkout at $UPSTREAM"

if [ ! -f "$UPSTREAM/browser/branding/goldweb/configure.sh" ]; then
  echo "Note: the Gold-Web branding is not in the tree yet."
  echo "      Run ./scripts/apply.sh first for a branded build, or continue"
  echo "      as-is for a plain Firefox build."
fi

cp "$REPO_ROOT/build/mozconfig.linux" "$UPSTREAM/mozconfig"
echo "Using $UPSTREAM/mozconfig (object dir: obj-goldweb)"

cd "$UPSTREAM"
./mach build "$@"

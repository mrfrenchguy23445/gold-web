#!/usr/bin/env bash
# Configure (if needed) and build Espionage from the upstream tree.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="${ESPIONAGE_UPSTREAM:-$HOME/Documents/espionage-firefox-bootstrap/firefox}"
OBJDIR="$UPSTREAM/obj-espionage"

[ -d "$UPSTREAM/.git" ] || { echo "error: no upstream checkout at $UPSTREAM"; exit 1; }

if [ ! -f "$UPSTREAM/browser/branding/espionage/configure.sh" ]; then
  echo "warning: Espionage branding not found in the tree."
  echo "         Run ./scripts/apply.sh first (or this is a baseline M0 build)."
fi

cp "$REPO_ROOT/config/mozconfig.linux" "$UPSTREAM/mozconfig"
echo "mozconfig -> $UPSTREAM/mozconfig"

cd "$UPSTREAM"
if [ -f "$OBJDIR/config.status" ]; then
  echo "Reusing configured object directory: $OBJDIR"
  ./mach build "$@"
else
  echo "No config.status; mach will configure into $OBJDIR first."
  ./mach build "$@"
fi

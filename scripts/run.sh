#!/usr/bin/env bash
# Launch the built Espionage browser. Extra args are passed through to mach run.
set -euo pipefail

UPSTREAM="${ESPIONAGE_UPSTREAM:-$HOME/Documents/espionage-firefox-bootstrap/firefox}"
[ -d "$UPSTREAM/.git" ] || { echo "error: no upstream checkout at $UPSTREAM"; exit 1; }

cd "$UPSTREAM"
exec ./mach run "$@"

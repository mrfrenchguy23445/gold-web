#!/usr/bin/env bash
# Shared setup for the Gold-Web scripts.
#
# Keep the upstream Firefox checkout OUTSIDE this repo: it is a large build
# input, not something we commit to. Point GOLDWEB_UPSTREAM at it to override
# the auto-detected location.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERIES="$REPO_ROOT/patches/series"

find_upstream() {
  if [ -n "${GOLDWEB_UPSTREAM:-}" ]; then
    printf '%s\n' "$GOLDWEB_UPSTREAM"
    return
  fi
  local candidate
  # The first path is where a fresh checkout should live. The second is the
  # legacy location this project started in; kept so existing machine setups
  # (and the object directory baked into them) keep working.
  for candidate in \
    "$HOME/Documents/gold-web/firefox" \
    "$HOME/Documents/espionage-firefox-bootstrap/firefox"; do
    if [ -d "$candidate/.git" ]; then
      printf '%s\n' "$candidate"
      return
    fi
  done
  printf '%s\n' "$HOME/Documents/gold-web/firefox"
}

UPSTREAM="$(find_upstream)"
OBJDIR="$UPSTREAM/obj-goldweb"

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

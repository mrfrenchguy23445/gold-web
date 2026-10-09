#!/usr/bin/env bash
# Capture edits made in the upstream tree as a reviewable patch in the repo.
#
#   ./scripts/export-patch.sh <category> <short-name> [paths...]
#
# Writes patches/<category>/<NN>-<short-name>.patch and appends it to
# patches/series. With no paths, captures every modified tracked file.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="${ESPIONAGE_UPSTREAM:-$HOME/Documents/espionage-firefox-bootstrap/firefox}"

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <category> <short-name> [paths...]"
  echo "categories: branding browser-ui start-page privacy"
  exit 2
fi

category="$1"; shift
name="$1"; shift
case "$name" in
  *[!a-z0-9-]*|'') echo "error: name must be lowercase a-z, 0-9 and dashes"; exit 2 ;;
esac

dir="$REPO_ROOT/patches/$category"
mkdir -p "$dir"

next=1
for f in "$dir"/*.patch; do
  [ -e "$f" ] || continue
  n="${f##*/}"; n="${n%%-*}"
  case "$n" in ''|*[!0-9]*) continue ;; esac
  [ "$n" -ge "$next" ] && next=$((n + 1))
done
num="$(printf '%02d' "$next")"
rel="$category/$num-$name.patch"
out="$REPO_ROOT/patches/$rel"

if [ "$#" -gt 0 ]; then
  git -C "$UPSTREAM" diff --no-color -- "$@" >"$out"
else
  git -C "$UPSTREAM" diff --no-color >"$out"
fi

if [ ! -s "$out" ]; then
  rm -f "$out"
  echo "error: no changes to capture (nothing modified in the given paths)."
  exit 1
fi

if ! grep -qxF "$rel" "$REPO_ROOT/patches/series" 2>/dev/null; then
  printf '%s\n' "$rel" >>"$REPO_ROOT/patches/series"
fi

echo "wrote patches/$rel"
echo "line count: $(wc -l <"$out")"

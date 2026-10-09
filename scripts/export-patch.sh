#!/usr/bin/env bash
# Save edits made in the Firefox tree as a reviewable patch in the repo.
#
#   ./scripts/export-patch.sh <category> <short-name> [paths...]
#
# Writes patches/<category>/<NN>-<short-name>.patch and appends it to
# patches/series. With no paths, captures every modified file.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

if [ "$#" -lt 2 ]; then
  echo "usage: $0 <category> <short-name> [paths...]"
  echo "categories in use: branding  browser-ui  start-page  privacy"
  exit 2
fi

category="$1"; shift
name="$1"; shift
case "$name" in
  *[!a-z0-9-]*|'') die "name must be lowercase letters, digits and dashes" ;;
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
rel="$category/$(printf '%02d' "$next")-$name.patch"
out="$REPO_ROOT/patches/$rel"

if [ "$#" -gt 0 ]; then
  git -C "$UPSTREAM" diff --no-color -- "$@" >"$out"
else
  git -C "$UPSTREAM" diff --no-color >"$out"
fi

if [ ! -s "$out" ]; then
  rm -f "$out"
  die "nothing changed in those paths"
fi

grep -qxF "$rel" "$SERIES" 2>/dev/null || printf '%s\n' "$rel" >>"$SERIES"
echo "wrote patches/$rel ($(wc -l <"$out") lines)"

#!/usr/bin/env bash
# Move the Firefox checkout to the revision pinned in build/upstream.lock and
# check whether the current patch series still applies. Does not build.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

[ -d "$UPSTREAM/.git" ] || die "no Firefox checkout at $UPSTREAM"
[ -f "$SERIES" ] || die "missing $SERIES"

pinned="$(sed -n 's/^commit[[:space:]]*=[[:space:]]*//p' "$REPO_ROOT/build/upstream.lock" | head -1)"
[ -n "$pinned" ] || die "no commit in build/upstream.lock"

echo "Fetching upstream..."
git -C "$UPSTREAM" fetch origin --tags

echo "Checking out $pinned..."
git -C "$UPSTREAM" checkout --detach "$pinned"
[ -n "$(git -C "$UPSTREAM" status --porcelain)" ] && git -C "$UPSTREAM" reset --hard "$pinned"

echo
echo "Testing the patch series (dry run)..."
failed=0
while IFS= read -r line; do
  line="${line%%#*}"
  line="$(printf '%s' "$line" | tr -d '[:space:]')"
  [ -n "$line" ] || continue
  if git -C "$UPSTREAM" apply --check "$REPO_ROOT/patches/$line" 2>/dev/null; then
    echo "   ok       $line"
  else
    echo "   CONFLICT $line"
    failed=1
  fi
done <"$SERIES"

echo
if [ "$failed" -eq 0 ]; then
  echo "Everything applies. Run ./scripts/apply.sh to apply for real."
else
  echo "Some patches no longer apply. Fix them in the tree, then refresh each"
  echo "with ./scripts/export-patch.sh (see docs/ARCHITECTURE.md)."
  exit 1
fi

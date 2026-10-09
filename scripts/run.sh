#!/usr/bin/env bash
# Launch the built Gold-Web browser. Extra arguments go to `mach run`.
source "$(dirname "${BASH_SOURCE[0]}")/_common.sh"

[ -d "$UPSTREAM/.git" ] || die "no Firefox checkout at $UPSTREAM"

cd "$UPSTREAM"
exec ./mach run "$@"

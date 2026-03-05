#!/usr/bin/env bash
# Catches w-[Npx].*shrink-0 anti-pattern that causes overflow in flexible containers
set -euo pipefail
status=0
for file in "$@"; do
  if grep -nE 'w-\[[0-9]+px\].*shrink-0|shrink-0.*w-\[[0-9]+px\]' "$file"; then
    echo "ERROR: $file — fixed pixel width with shrink-0 causes overflow in flexible containers"
    echo "  Use flex-1, grid columns, or percentage widths instead"
    status=1
  fi
done
exit $status

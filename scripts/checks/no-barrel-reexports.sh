#!/usr/bin/env bash
# CLAUDE.md rule: No barrel re-exports except types/index.ts

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0

for file in "$@"; do
  rel_file="${file#$REPO_ROOT/}"

  # types/index.ts is the one allowed barrel
  case "$rel_file" in
    src/types/index.ts) continue ;;
    *.test.ts|*.test.tsx) continue ;;
    scripts/*|docs/*) continue ;;
    *.ts|*.tsx) ;;
    *) continue ;;
  esac

  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)
  MATCHES=$(echo "$CONTENT" | grep -nE '^\s*export\s+\*\s+from\b' || true)

  if [ -n "$MATCHES" ]; then
    echo "ERROR: Barrel re-export in $rel_file (only allowed in src/types/index.ts)"
    echo "$MATCHES" | while IFS= read -r line; do echo "  $line"; done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) use barrel re-exports."
  echo "Import directly from the source file. Only src/types/index.ts may barrel."
  exit 1
fi
exit 0

#!/usr/bin/env bash
# CLAUDE.md rule: Named exports for all files.
# Default exports only for page/route components in src/pages/.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0

for file in "$@"; do
  rel_file="${file#$REPO_ROOT/}"

  # Pages are allowed default exports
  case "$rel_file" in
    src/pages/*) continue ;;
    *.test.ts|*.test.tsx) continue ;;
    scripts/*|docs/*|*.config.*) continue ;;
    *.ts|*.tsx) ;;
    *) continue ;;
  esac

  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)
  MATCHES=$(echo "$CONTENT" | grep -nE '^\s*export\s+default\b' || true)

  if [ -n "$MATCHES" ]; then
    echo "ERROR: Default export in $rel_file (use named exports)"
    echo "$MATCHES" | while IFS= read -r line; do echo "  $line"; done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) use default exports outside src/pages/."
  echo "Use named exports: export function/const/class instead."
  exit 1
fi
exit 0

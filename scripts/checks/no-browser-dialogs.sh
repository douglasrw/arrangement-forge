#!/usr/bin/env bash
# CLAUDE.md rule: Must not use browser confirm(), alert(), or prompt()
# Use ConfirmDialog or custom UI instead.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0

PATTERN='\b(window\.)?(confirm|alert|prompt)\s*\('

for file in "$@"; do
  rel_file="${file#$REPO_ROOT/}"

  # Only check ts/tsx source files
  case "$rel_file" in
    *.test.ts|*.test.tsx) continue ;;
    scripts/*|docs/*) continue ;;
    *.ts|*.tsx) ;;
    *) continue ;;
  esac

  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)
  # Filter out comments and imports
  MATCHES=$(echo "$CONTENT" | grep -nE "$PATTERN" | grep -vE '^\s*//' | grep -vE 'ConfirmDialog|// eslint' || true)

  if [ -n "$MATCHES" ]; then
    echo "ERROR: Browser dialog in $rel_file (use ConfirmDialog instead)"
    echo "$MATCHES" | while IFS= read -r line; do echo "  $line"; done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) use browser confirm/alert/prompt."
  echo "Use ConfirmDialog from src/components/shared/ConfirmDialog.tsx instead."
  exit 1
fi
exit 0

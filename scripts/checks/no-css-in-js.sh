#!/usr/bin/env bash
# CLAUDE.md rule: Must not write CSS-in-JS (styled-components, emotion, CSS modules)

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0

PATTERN='(styled-components|@emotion|\.module\.css|\.module\.scss|css`)'

for file in "$@"; do
  rel_file="${file#$REPO_ROOT/}"

  case "$rel_file" in
    *.test.ts|*.test.tsx) continue ;;
    scripts/*|docs/*) continue ;;
    *.ts|*.tsx) ;;
    *) continue ;;
  esac

  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)
  MATCHES=$(echo "$CONTENT" | grep -nE "$PATTERN" | grep -vE '^\s*//' || true)

  if [ -n "$MATCHES" ]; then
    echo "ERROR: CSS-in-JS import in $rel_file (use Tailwind + DaisyUI)"
    echo "$MATCHES" | while IFS= read -r line; do echo "  $line"; done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) import CSS-in-JS libraries."
  echo "Use Tailwind utility classes + DaisyUI component classes instead."
  exit 1
fi
exit 0

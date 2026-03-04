#!/usr/bin/env bash
# CLAUDE.md rule: Must not use the DaisyUI wireframe theme.
# Production uses the custom forge theme.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0

for file in "$@"; do
  rel_file="${file#$REPO_ROOT/}"

  case "$rel_file" in
    *.test.ts|*.test.tsx) continue ;;
    scripts/*|docs/*) continue ;;
    *.ts|*.tsx) ;;
    *) continue ;;
  esac

  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)
  MATCHES=$(echo "$CONTENT" | grep -nE '(data-theme|theme).*wireframe' | grep -vE '^\s*//' || true)

  if [ -n "$MATCHES" ]; then
    echo "ERROR: Wireframe theme reference in $rel_file (use forge theme)"
    echo "$MATCHES" | while IFS= read -r line; do echo "  $line"; done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) reference the wireframe theme."
  echo "Use the custom forge theme instead. Wireframe was prototyping only."
  exit 1
fi
exit 0

#!/usr/bin/env bash
# CLAUDE.md rule: Functional components only, no class components.

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
  MATCHES=$(echo "$CONTENT" | grep -nE '\bextends\s+(React\.)?(Component|PureComponent)\b' | grep -vE '^\s*//' || true)

  if [ -n "$MATCHES" ]; then
    echo "ERROR: Class component in $rel_file (use functional components)"
    echo "$MATCHES" | while IFS= read -r line; do echo "  $line"; done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) use class components."
  echo "Use functional components with hooks instead."
  exit 1
fi
exit 0

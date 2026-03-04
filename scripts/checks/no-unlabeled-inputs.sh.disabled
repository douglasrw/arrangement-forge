#!/usr/bin/env bash
# CLAUDE.md rule: Every <input> and <textarea> must have a unique id attribute
# and a corresponding <label htmlFor={id}>.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0

for file in "$@"; do
  rel_file="${file#$REPO_ROOT/}"

  case "$rel_file" in
    *.test.ts|*.test.tsx) continue ;;
    scripts/*|docs/*) continue ;;
    *.tsx) ;;
    *) continue ;;
  esac

  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)

  # Find <input or <textarea tags that don't have id= on the same or adjacent context
  # This is a heuristic — checks if any <input/<textarea line lacks id=
  INPUT_LINES=$(echo "$CONTENT" | grep -nE '<(input|textarea)\b' | grep -vE '\bid=' | grep -vE '^\s*//' | grep -vE 'type="hidden"' || true)

  if [ -n "$INPUT_LINES" ]; then
    echo "ERROR: Input/textarea without id= in $rel_file"
    echo "$INPUT_LINES" | while IFS= read -r line; do echo "  $line"; done
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) have inputs without id attributes."
  echo "Every <input> and <textarea> needs id= and a matching <label htmlFor=>."
  exit 1
fi
exit 0

#!/usr/bin/env bash
# Design system enforcement: reject hardcoded hex colors in component files.
# Runs on staged file content (not working tree) to avoid false positives.
#
# Allowed locations (excluded from checks):
#   - tailwind.config.ts, globals.css, src/lib/genre-config.ts (token definitions)
#   - *.test.ts, *.test.tsx (test files)
#   - scripts/ (tooling)
#   - docs/ (documentation)
#
# What it catches:
#   - Tailwind arbitrary values: bg-[#14b8a6], text-[#fff]
#   - Inline style hex: color: "#18181b", backgroundColor: '#09090b'
#   - JS hex strings: const color = "#27272a"
#
# Use forge theme tokens instead:
#   bg-base-100, bg-base-200, bg-base-300, text-primary, text-base-content,
#   border-base-300, bg-primary, bg-secondary, etc.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0
VIOLATION_FILES=()

# Hex color pattern: # followed by 3, 4, 6, or 8 hex digits
# Anchored with word boundary to avoid matching CSS custom properties, URLs, etc.
HEX_PATTERN='#[0-9a-fA-F]{3,8}\b'

for file in "$@"; do
  # Normalize absolute paths to repo-relative
  rel_file="${file#$REPO_ROOT/}"

  # Skip allowed files
  case "$rel_file" in
    tailwind.config.ts|src/app/globals.css|src/styles/globals.css|globals.css) continue ;;
    src/lib/genre-config.ts) continue ;;
    *.test.ts|*.test.tsx) continue ;;
    scripts/*|docs/*) continue ;;
  esac

  # Only check TypeScript/TSX component files
  case "$rel_file" in
    *.ts|*.tsx) ;;
    *) continue ;;
  esac

  # Check staged content (not working tree); fall back to file read if not staged
  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)
  MATCHES=$(echo "$CONTENT" | grep -nE "$HEX_PATTERN" || true)

  if [ -n "$MATCHES" ]; then
    # Filter out legitimate uses: CSS custom property definitions, comments
    REAL_MATCHES=$(echo "$MATCHES" | grep -vE '^\s*//' | grep -vE 'hsl\(|rgb\(|oklch\(' || true)

    if [ -n "$REAL_MATCHES" ]; then
      echo "ERROR: Hardcoded hex colors in $rel_file"
      echo "$REAL_MATCHES" | while IFS= read -r line; do
        echo "  $line"
      done
      echo ""
      VIOLATIONS=$((VIOLATIONS + 1))
      VIOLATION_FILES+=("$file")
    fi
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "========================================="
  echo "BLOCKED: $VIOLATIONS file(s) contain hardcoded hex colors."
  echo ""
  echo "Use forge theme tokens instead:"
  echo "  bg-base-100, bg-base-200, bg-base-300"
  echo "  text-base-content, text-primary, text-secondary"
  echo "  border-base-300, bg-primary, bg-secondary"
  echo ""
  echo "See: tailwind.config.ts for available tokens"
  echo "See: docs/research/design-system-linter-research-2026-03-04.md"
  echo "========================================="
  exit 1
fi

exit 0

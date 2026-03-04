#!/usr/bin/env bash
# Auto-discovery pre-commit runner.
# Runs every *.sh script in scripts/checks/ against staged files.
# Each check receives the list of staged files as arguments.
# If any check exits non-zero, the commit is blocked.
#
# To add a new check: drop a .sh file in scripts/checks/
# No config changes needed — it runs automatically.
#
# IMPORTANT: Always validate new checks against the real codebase before committing:
#   bash scripts/run-checks.sh src/**/*.tsx
# Synthetic test files miss multi-line JSX, edge cases, and existing tech debt.
# See: "Enforcement Without Validation" anti-pattern.

set -euo pipefail

CHECKS_DIR="$(dirname "$0")/checks"
FAILED=0
FAILED_CHECKS=()

# Filter out node_modules/ and dist/ — these are tracked but contain
# third-party code that must not be linted against project conventions.
FILTERED_FILES=()
for f in "$@"; do
  case "$f" in
    node_modules/*|dist/*) continue ;;
    *) FILTERED_FILES+=("$f") ;;
  esac
done

# Nothing to check after filtering
if [ ${#FILTERED_FILES[@]} -eq 0 ]; then
  exit 0
fi

if [ ! -d "$CHECKS_DIR" ]; then
  echo "No checks directory found at $CHECKS_DIR"
  exit 0
fi

for check in "$CHECKS_DIR"/*.sh; do
  [ -f "$check" ] || continue

  CHECK_NAME=$(basename "$check" .sh)

  if ! bash "$check" "${FILTERED_FILES[@]}"; then
    FAILED=$((FAILED + 1))
    FAILED_CHECKS+=("$CHECK_NAME")
  fi
done

if [ "$FAILED" -gt 0 ]; then
  echo ""
  echo "========================================="
  echo "COMMIT BLOCKED: $FAILED check(s) failed:"
  for name in "${FAILED_CHECKS[@]}"; do
    echo "  - $name"
  done
  echo "========================================="
  exit 1
fi

exit 0

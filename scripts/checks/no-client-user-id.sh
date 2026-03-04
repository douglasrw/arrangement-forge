#!/usr/bin/env bash
# CLAUDE.md rule: Must not send user_id from the client in Supabase inserts.
# Use DEFAULT auth.uid() on the column so Postgres sets it from the JWT.

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel)
VIOLATIONS=0

for file in "$@"; do
  rel_file="${file#$REPO_ROOT/}"

  # Only check store/hook/lib files that interact with Supabase
  case "$rel_file" in
    src/store/*|src/hooks/*|src/lib/supabase*) ;;
    *.test.ts|*.test.tsx) continue ;;
    *) continue ;;
  esac

  CONTENT=$(git show ":$rel_file" 2>/dev/null || cat "$file" 2>/dev/null || true)

  # Look for user_id being explicitly set in insert/upsert objects
  MATCHES=$(echo "$CONTENT" | grep -nE '\buser_id\s*:' | grep -vE '^\s*//' | grep -vE '\.eq\(|\.match\(|\.filter\(|WHERE|select' || true)

  if [ -n "$MATCHES" ]; then
    echo "ERROR: Client-side user_id in $rel_file"
    echo "$MATCHES" | while IFS= read -r line; do echo "  $line"; done
    echo "  Use DEFAULT auth.uid() on the column instead."
    echo ""
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done

if [ "$VIOLATIONS" -gt 0 ]; then
  echo "BLOCKED: $VIOLATIONS file(s) send user_id from client."
  echo "Remove user_id from insert/upsert objects. The DB column DEFAULT handles it."
  exit 1
fi
exit 0

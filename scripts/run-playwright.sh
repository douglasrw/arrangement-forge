#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

resolve_node_bin() {
  if [[ -n "${PLAYWRIGHT_NODE_BIN:-}" && -x "${PLAYWRIGHT_NODE_BIN}" ]]; then
    printf '%s\n' "${PLAYWRIGHT_NODE_BIN}"
    return 0
  fi

  if [[ -n "${NVM_BIN:-}" && -x "${NVM_BIN}/node" ]]; then
    printf '%s\n' "${NVM_BIN}/node"
    return 0
  fi

  local candidate=""
  candidate="$(find "${HOME}/.nvm/versions/node" -mindepth 2 -maxdepth 2 -path '*/bin/node' 2>/dev/null | sort -V | tail -n 1 || true)"
  if [[ -n "${candidate}" && -x "${candidate}" ]]; then
    printf '%s\n' "${candidate}"
    return 0
  fi

  if [[ -x "/usr/bin/node" ]]; then
    printf '%s\n' "/usr/bin/node"
    return 0
  fi

  printf >&2 'ERROR: Could not find a real Node.js binary for Playwright. Set PLAYWRIGHT_NODE_BIN.\n'
  return 1
}

NODE_BIN="$(resolve_node_bin)"
PLAYWRIGHT_CLI="${REPO_ROOT}/node_modules/playwright/cli.js"

if [[ ! -f "${PLAYWRIGHT_CLI}" ]]; then
  printf >&2 'ERROR: Playwright CLI not found at %s\n' "${PLAYWRIGHT_CLI}"
  exit 1
fi

exec "${NODE_BIN}" "${PLAYWRIGHT_CLI}" "$@"

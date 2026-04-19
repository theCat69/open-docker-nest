#!/usr/bin/env bash
set -euo pipefail

OPENCODE_USER="${OPENCODE_USER:-opencode}"

eval "$(/usr/local/bin/opencode-user-map --print-env)"

if [[ -z "${OPENCODE_RUNTIME_UID:-}" || -z "${OPENCODE_RUNTIME_GID:-}" ]]; then
  echo "Error: user mapping bootstrap did not provide runtime UID/GID." >&2
  exit 1
fi

if [[ "$#" -eq 0 ]]; then
  set -- opencode
fi

export HOME="${OPENCODE_RUNTIME_HOME:-/home/${OPENCODE_USER}}"

exec setpriv \
  --reuid "${OPENCODE_RUNTIME_UID}" \
  --regid "${OPENCODE_RUNTIME_GID}" \
  --clear-groups \
  "$@"

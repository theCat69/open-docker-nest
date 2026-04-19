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

if [[ -n "${OPENCODE_CACHE_CTRL_LOCAL_TARGET:-}" ]]; then
  cache_ctrl_target="${OPENCODE_CACHE_CTRL_LOCAL_TARGET}"
  cache_ctrl_bin_dir="${HOME}/.local/bin"
  cache_ctrl_link_path="${cache_ctrl_bin_dir}/cache-ctrl"

  if [[ ! -e "${cache_ctrl_target}" ]]; then
    echo "Error: OPENCODE_CACHE_CTRL_LOCAL_TARGET does not exist in-container: ${cache_ctrl_target}." >&2
    exit 1
  fi

  mkdir -p "${cache_ctrl_bin_dir}"
  ln -sfn "${cache_ctrl_target}" "${cache_ctrl_link_path}"

  if [[ ! -L "${cache_ctrl_link_path}" ]]; then
    echo "Error: failed to create cache-ctrl symlink at ${cache_ctrl_link_path}." >&2
    exit 1
  fi
fi

if [[ -n "${OPENCODE_PREPEND_PATH:-}" ]]; then
  export PATH="${OPENCODE_PREPEND_PATH}:${PATH}"
fi

exec setpriv \
  --reuid "${OPENCODE_RUNTIME_UID}" \
  --regid "${OPENCODE_RUNTIME_GID}" \
  --clear-groups \
  "$@"

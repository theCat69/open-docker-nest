#!/usr/bin/env bash
set -euo pipefail

TARGET_USER="${OPENCODE_USER:-opencode}"
HOST_UID="${HOST_UID:-}"
HOST_GID="${HOST_GID:-}"

runtime_uid="$(id -u "${TARGET_USER}")"
runtime_gid="$(id -g "${TARGET_USER}")"
home_dir="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"

if [[ -z "${HOST_UID}" || -z "${HOST_GID}" ]]; then
  :
else
  if ! [[ "${HOST_UID}" =~ ^[0-9]+$ && "${HOST_GID}" =~ ^[0-9]+$ ]]; then
    echo "Error: HOST_UID and HOST_GID must be numeric values." >&2
    exit 1
  fi

  if [[ "${HOST_UID}" == "0" || "${HOST_GID}" == "0" ]]; then
    echo "Error: Refusing to remap to root UID/GID (0)." >&2
    exit 1
  fi

  runtime_uid="${HOST_UID}"
  runtime_gid="${HOST_GID}"
fi

chown -R "${runtime_uid}:${runtime_gid}" "${home_dir}" 2>/dev/null || true

if [[ "${1:-}" == "--print-env" ]]; then
  printf 'OPENCODE_RUNTIME_UID=%s\n' "${runtime_uid}"
  printf 'OPENCODE_RUNTIME_GID=%s\n' "${runtime_gid}"
  printf 'OPENCODE_RUNTIME_HOME=%s\n' "${home_dir}"
fi

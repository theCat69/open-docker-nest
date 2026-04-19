#!/usr/bin/env bash
set -euo pipefail

TARGET_USER="${OPENCODE_USER:-opencode}"
HOST_UID="${HOST_UID:-}"
HOST_GID="${HOST_GID:-}"

find_available_uid() {
  local candidate_uid=50000

  while getent passwd "${candidate_uid}" >/dev/null; do
    candidate_uid=$((candidate_uid + 1))
  done

  printf '%s\n' "${candidate_uid}"
}

align_target_user_identity_to_host() {
  local target_user="$1"
  local host_uid="$2"
  local host_gid="$3"
  local existing_uid_owner

  existing_uid_owner="$(getent passwd "${host_uid}" | cut -d: -f1 || true)"
  if [[ -n "${existing_uid_owner}" && "${existing_uid_owner}" != "${target_user}" ]]; then
    local replacement_uid
    replacement_uid="$(find_available_uid)"
    usermod --uid "${replacement_uid}" "${existing_uid_owner}"
  fi

  if [[ "$(id -u "${target_user}")" != "${host_uid}" ]]; then
    usermod --uid "${host_uid}" "${target_user}"
  fi

  if getent group "${host_gid}" >/dev/null; then
    usermod --gid "${host_gid}" "${target_user}"
  else
    groupmod --gid "${host_gid}" "${target_user}"
    usermod --gid "${host_gid}" "${target_user}"
  fi
}

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

  align_target_user_identity_to_host "${TARGET_USER}" "${HOST_UID}" "${HOST_GID}"
fi

runtime_uid="$(id -u "${TARGET_USER}")"
runtime_gid="$(id -g "${TARGET_USER}")"
home_dir="$(getent passwd "${TARGET_USER}" | cut -d: -f6)"

chown -R "${runtime_uid}:${runtime_gid}" "${home_dir}" 2>/dev/null || true

if [[ "${1:-}" == "--print-env" ]]; then
  printf 'OPENCODE_RUNTIME_UID=%s\n' "${runtime_uid}"
  printf 'OPENCODE_RUNTIME_GID=%s\n' "${runtime_gid}"
  printf 'OPENCODE_RUNTIME_HOME=%s\n' "${home_dir}"
fi

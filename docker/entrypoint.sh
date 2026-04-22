#!/usr/bin/env bash
set -euo pipefail

OPENCODE_USER="${OPENCODE_USER:-opencode}"
OPEN_DOCKER_NEST_JAVA_VERSION="${OPEN_DOCKER_NEST_JAVA_VERSION:-21}"

case "${OPEN_DOCKER_NEST_JAVA_VERSION}" in
  21|25)
    selected_java_home="/opt/java/jdk-${OPEN_DOCKER_NEST_JAVA_VERSION}"
    ;;
  *)
    echo "Error: OPEN_DOCKER_NEST_JAVA_VERSION must be one of: 21, 25." >&2
    exit 1
    ;;
esac

if [[ ! -d "${selected_java_home}" ]]; then
  echo "Error: selected Java home does not exist in-container: ${selected_java_home}." >&2
  exit 1
fi

ln -sfn "${selected_java_home}" /opt/java/default
export JAVA_HOME="/opt/java/default"

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

runtime_supplementary_groups="${OPENCODE_RUNTIME_GID}"
if [[ -n "${OPEN_DOCKER_NEST_SOCKET_GID:-}" ]]; then
  if ! [[ "${OPEN_DOCKER_NEST_SOCKET_GID}" =~ ^[0-9]+$ ]]; then
    echo "Error: OPEN_DOCKER_NEST_SOCKET_GID must be numeric when set." >&2
    exit 1
  fi

  if [[ "${OPEN_DOCKER_NEST_SOCKET_GID}" != "${OPENCODE_RUNTIME_GID}" ]]; then
    runtime_supplementary_groups="${runtime_supplementary_groups},${OPEN_DOCKER_NEST_SOCKET_GID}"
  fi
fi

exec setpriv \
  --reuid "${OPENCODE_RUNTIME_UID}" \
  --regid "${OPENCODE_RUNTIME_GID}" \
  --groups "${runtime_supplementary_groups}" \
  "$@"

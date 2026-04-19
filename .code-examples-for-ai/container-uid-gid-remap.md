<!-- Focused excerpt from production entrypoint support logic (docker/user-map.sh); HOST_UID/HOST_GID are provided by the wrapper at runtime. -->
```bash
if ! [[ "${HOST_UID}" =~ ^[0-9]+$ && "${HOST_GID}" =~ ^[0-9]+$ ]]; then
  echo "Error: HOST_UID and HOST_GID must be numeric values." >&2
  exit 1
fi

if [[ "${HOST_UID}" == "0" || "${HOST_GID}" == "0" ]]; then
  echo "Error: Refusing to remap to root UID/GID (0)." >&2
  exit 1
fi

existing_uid_owner="$(getent passwd "${HOST_UID}" | cut -d: -f1 || true)"
if [[ -n "${existing_uid_owner}" && "${existing_uid_owner}" != "${TARGET_USER}" ]]; then
  # Move conflicting account away first, then reuse host UID for target runtime user.
  usermod --uid "$(find_available_uid)" "${existing_uid_owner}"
fi

if [[ "$(id -u "${TARGET_USER}")" != "${HOST_UID}" ]]; then
  usermod --uid "${HOST_UID}" "${TARGET_USER}"
fi

if getent group "${HOST_GID}" >/dev/null; then
  usermod --gid "${HOST_GID}" "${TARGET_USER}"
else
  groupmod --gid "${HOST_GID}" "${TARGET_USER}"
  usermod --gid "${HOST_GID}" "${TARGET_USER}"
fi

runtime_uid="$(id -u "${TARGET_USER}")"
runtime_gid="$(id -g "${TARGET_USER}")"

printf 'OPENCODE_RUNTIME_UID=%s\n' "${runtime_uid}"
printf 'OPENCODE_RUNTIME_GID=%s\n' "${runtime_gid}"
```

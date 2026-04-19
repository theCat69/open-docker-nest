<!-- Demonstrates UID/GID remapping with non-root guard and env export. -->
```bash
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

printf 'OPENCODE_RUNTIME_UID=%s\n' "${runtime_uid}"
printf 'OPENCODE_RUNTIME_GID=%s\n' "${runtime_gid}"
```

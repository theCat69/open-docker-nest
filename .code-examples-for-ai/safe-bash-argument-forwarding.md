<!-- Demonstrates safe array-based Docker argument and command forwarding. -->
```bash
declare -a passthrough_command=()

if [[ "${shell_mode}" == true ]]; then
  command_to_run=("/bin/bash")
elif [[ "${#passthrough_command[@]}" -eq 0 ]]; then
  command_to_run=("opencode")
else
  command_to_run=("${passthrough_command[@]}")
fi

docker_run_args=(
  --rm
  --workdir "${CONTAINER_PROJECT_DIR}"
  --env "HOST_UID=$(id -u)"
  --env "HOST_GID=$(id -g)"
)

exec docker run "${docker_run_args[@]}" "${image_ref}" "${command_to_run[@]}"
```

<!-- Focused excerpt from production wrapper logic (bin/opencode-docker); helper functions are defined elsewhere in the same file. -->
```bash
prepare_la_briguade_config_mount "${host_la_briguade_config_dir}" "${CONTAINER_HOME_DIR}/${LA_BRIGUADE_HOST_CONFIG_RELATIVE}"

la_briguade_local_project_root="$(resolve_la_briguade_local_project_root "${la_briguade_local_mode}" "${plugin_entry_path}" "${la_briguade_local_path}")"
if [[ -n "${la_briguade_local_project_root}" ]]; then
  docker_run_args+=(--volume "${la_briguade_local_project_root}:${la_briguade_local_project_root}")
fi
```

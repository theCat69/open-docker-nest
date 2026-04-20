<!-- Focused excerpt from production wrapper logic (bin/open-docker-nest); surrounding setup like SCRIPT_NAME/project_path declarations may be defined elsewhere in the source file. -->
```bash
fail() {
  local message="$1"
  echo "${SCRIPT_NAME}: ${message}" >&2
  exit 1
}

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker CLI is required but was not found in PATH. Install Docker and re-run."
fi

if [[ ! -d "${project_path}" ]]; then
  fail "Project path does not exist or is not a directory: ${project_path}. Remediation: pass a valid directory with --project."
fi
```

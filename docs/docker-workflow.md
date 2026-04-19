# Dockerized OpenCode Workflow

This repository supports running OpenCode/OpenSpec workflows inside a single Docker image using `bin/opencode-docker`.

## Prerequisites

- Docker CLI/runtime installed and running.
- Local clone of this repository.

## Build the image

```bash
docker build -t opencode-docker:latest .
```

The image installs `cache-ctrl` during build, so runtime commands can rely on it without startup-time installation.

## Wrapper usage

```bash
bin/opencode-docker [--project <host-path>] [--image <image-ref>] [--shell] [--] [command ...args]
```

- Default project mount is the current directory.
- Override project mount with `--project <host-path>`.
- Override image with `--image <image-ref>`.
- `--shell` starts an interactive shell at `/workspace`.
- Without `--shell` and without command args, default command is `opencode`.
- Any command after `--` is passed through unchanged.

## Mount model

### Project mount

- Host path: current working directory by default (or `--project` override)
- Container path: `/workspace`

### Persistent OpenCode directories

The wrapper ensures these directories exist and mounts them on each run:

- `~/.config/opencode` → `/home/opencode/.config/opencode`
- `~/.local/state/opencode` → `/home/opencode/.local/state/opencode`
- `~/.local/share/opencode` → `/home/opencode/.local/share/opencode`

If directory creation fails, the wrapper exits non-zero and prints the failing path plus remediation guidance.

### Optional la-briguade user config import

On each run, the wrapper checks for `~/la_briguade` on the host:

- If present and accessible, it is bind-mounted to `/home/opencode/la_briguade`.
- If absent, startup continues (non-fatal).
- If present but invalid/inaccessible (for example broken symlink or permission issue), startup continues and prints actionable diagnostics.

This config import behavior is independent from la-briguade plugin installation mode.

### Local symlink plugin-dev mode (auto/force/off)

The wrapper supports a local plugin-dev contract for `plugins/index.js` symlink workflows.

Environment contract:

- `LA_BRIGUADE_LOCAL_MODE=auto|force|off` (default: `auto`)
- `LA_BRIGUADE_LOCAL_PATH` (optional)

Mode behavior:

- `auto`: if `<project>/plugins/index.js` is a symlink, local-link mode activates automatically.
- `force`: local-link mode is required; preflight fails fast if `plugins/index.js` is missing, not a symlink, or its resolved target is invalid/inaccessible.
- `off`: local-link mode is disabled even if auto-detect would match.

When local-link mode is active:

- The wrapper resolves the absolute host symlink target from `plugins/index.js`.
- It bind-mounts that host target into the same absolute path in-container.
- If `LA_BRIGUADE_LOCAL_PATH` is set, it must exactly match the resolved symlink target; mismatch fails preflight.
- If `LA_BRIGUADE_LOCAL_PATH` is unset, the resolved symlink target is used.

When `LA_BRIGUADE_LOCAL_MODE=off`, `LA_BRIGUADE_LOCAL_PATH` is ignored.

### Migration from legacy persistence paths

If you previously used `~/.opencode-docker/{config,state,share}`, migrate existing data into the new defaults before your next run:

```bash
mkdir -p ~/.config/opencode ~/.local/state/opencode ~/.local/share/opencode
cp -a ~/.opencode-docker/config/. ~/.config/opencode/
cp -a ~/.opencode-docker/state/. ~/.local/state/opencode/
cp -a ~/.opencode-docker/share/. ~/.local/share/opencode/
```

After confirming data is present in the new locations, you can archive or remove `~/.opencode-docker`.

## Examples

Run OpenCode help:

```bash
bin/opencode-docker -- opencode --help
```

Start an interactive shell:

```bash
bin/opencode-docker --shell
```

Run OpenSpec command parity checks:

```bash
bin/opencode-docker -- opencode --help
bin/opencode-docker -- opencode run "/opsx-propose demo-change"
bin/opencode-docker -- opencode run "/opsx-explore demo-change"
bin/opencode-docker -- opencode run "/opsx-apply demo-change"
bin/opencode-docker -- opencode run "/opsx-archive demo-change"
```

## Permissions and file ownership

The wrapper passes host UID/GID into the container. At startup, `docker/user-map.sh` remaps the container `opencode` user to match host IDs before executing commands.

Result: files created or edited in `/workspace` are owned by the invoking host user, not root.

## Troubleshooting

- `Docker CLI is required but was not found`: install Docker and ensure `docker` is on `PATH`.
- `Project path does not exist`: pass a valid directory with `--project`.
- `Unable to create persistence directory`: fix permissions/ownership for the reported path (or create it manually), then rerun.
- `Invalid LA_BRIGUADE_LOCAL_MODE`: use one of `auto`, `force`, `off`.
- `LA_BRIGUADE local-link mode requires .../plugins/index.js to be a symlink`: create/update `plugins/index.js` to point to your local la-briguade build output.
- `LA_BRIGUADE_LOCAL_PATH must exactly match...`: set `LA_BRIGUADE_LOCAL_PATH` to the resolved absolute symlink target or unset it.

## Release plugin installation behavior

Standard/release la-briguade plugin installation via the OpenCode plugin array is unchanged and requires no additional repository-side setup.

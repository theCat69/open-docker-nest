# Dockerized OpenCode Workflow

This repository supports running OpenCode/OpenSpec workflows inside a single Docker image using `bin/opencode-docker`.

## Prerequisites

- Docker CLI/runtime installed and running.
- Local clone of this repository.

## Build the image

```bash
docker build -t opencode-docker:latest .
```

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

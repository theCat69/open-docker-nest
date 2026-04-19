# dock-opencode

Run [OpenCode](https://github.com/anomalyco/opencode) inside Docker with host-project parity, persistent OpenCode data, and non-root file ownership.

## What this repository provides

- A host wrapper: `bin/opencode-docker`
- A Docker image with `opencode` and `cache-ctrl` installed
- A `/workspace` mount model for running against your host project
- Persistent host-backed OpenCode config/state/share directories across runs
- Non-root execution via host UID/GID remapping

## Prerequisites

- Docker
- A local clone of this repository

## Build

```bash
docker build -t opencode-docker:latest .
```

## Usage

```bash
bin/opencode-docker [--project <host-path>] [--image <image-ref>] [--shell] [--] [command ...args]
```

- `--shell` opens an interactive shell as user `opencode` with `HOME=/home/opencode`.
- With no command args and no `--shell`, the wrapper still runs `opencode` by default.
- Commands provided after `--` are passed through unchanged (`-- <command> ...args`).

### Common examples

Run the default `opencode` command:

```bash
bin/opencode-docker
```

Run any OpenCode command with the same pass-through shape:

```bash
bin/opencode-docker -- opencode --help
```

Open an interactive shell in the container:

```bash
bin/opencode-docker --shell
```

Mount a different project directory:

```bash
bin/opencode-docker --project /path/to/project -- opencode --help
```

## Mount and persistence model

- Project directory: host current directory by default → `/workspace`
- Config: `~/.config/opencode` → `/home/opencode/.config/opencode`
- State: `~/.local/state/opencode` → `/home/opencode/.local/state/opencode`
- Share: `~/.local/share/opencode` → `/home/opencode/.local/share/opencode`

The wrapper creates missing persistence directories before `docker run` and fails fast with remediation if creation is not possible.

## Non-root execution

The container starts as the `opencode` user and remaps runtime UID/GID from the invoking host user. Files created under `/workspace` are intended to remain owned by your host user rather than root.

## Optional integrations

- `cache-ctrl` is installed in the image and available at runtime.
- If `~/la_briguade` exists and is readable, it is mounted into the container at `/home/opencode/la_briguade`.
- Local la-briguade symlink workflows are supported through `LA_BRIGUADE_LOCAL_MODE` (`auto`, `force`, `off`) and optional `LA_BRIGUADE_LOCAL_PATH`; when active, the wrapper derives and mounts the local project root at `<resolved plugins/index.js target>/../..`.

## More detail

- Operational workflow: `docs/docker-workflow.md`
- Behavior/spec source of truth: `openspec/specs/dockerized-opencode-workflow/spec.md`

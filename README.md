# dock-opencode

Run [OpenCode](https://github.com/anomalyco/opencode) inside Docker with host-project parity, persistent OpenCode data, and non-root file ownership.

## What this repository provides

- An authoritative host entrypoint: `bin/opencode-docker.js`
- A compatibility shim: `bin/opencode-docker` → `bin/opencode-docker.js`
- A Docker image with `opencode`, `cache-ctrl`, Java 24, and a pinned Rust toolchain (`1.84.0`) installed
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
bin/opencode-docker.js [--project <host-path>] [--image <image-ref>] [--shell] [--host-docker] [--] [command ...args]
```

- `bin/opencode-docker.js` is the published entrypoint.
- `bin/opencode-docker` remains available as a thin compatibility shim.
- `--shell` opens an interactive shell as user `opencode` with `HOME=/home/opencode`.
- `--host-docker` enables host Docker daemon access for the entire in-container session (explicit high-privilege mode).
- With no command args and no `--shell`, the wrapper still runs `opencode` by default.
- Commands provided after `--` are passed through unchanged (`-- <command> ...args`).
- `--repo-command` is removed; use `--host-docker` for session-wide host Docker access.

### Host Docker mode (`--host-docker`)

Use this mode when tooling inside `/workspace` needs host Docker daemon access for a full OpenCode, shell, or pass-through session:

```bash
bin/opencode-docker.js --host-docker
bin/opencode-docker.js --shell --host-docker
bin/opencode-docker.js --host-docker -- docker version
```

Scope and safety contract:

- Runs the session inside the container (not on the host), through the standard entrypoint as remapped non-root `opencode`.
- Mounts `/var/run/docker.sock` only for runs where `--host-docker` is explicitly set.
- Supports Linux/macOS only when a usable local Unix-socket Docker daemon is available at `/var/run/docker.sock`.
- Requires the active Docker context to be the default/local context.
- Supports best-effort Linux-in-WSL usage when invoked from Linux inside WSL and `/var/run/docker.sock` is usable in that Linux environment.
- Fails fast on native Windows host invocation for this mode, unsupported `DOCKER_HOST` endpoints, and missing/inaccessible Docker socket prerequisites.
- Does not forward host Docker credentials/config (`~/.docker`) in this slice.
- Does not translate sibling-container bind-mount source paths from in-container `/workspace/...` to host-visible paths in this slice.

Security note: this mode intentionally grants any process started in that flagged session control over the host Docker daemon for that run.

Non-goal: this is not a generic host-command bridge.

Rollback: stop using `--host-docker` and use existing default/`--shell`/normal pass-through modes.

### Common examples

Run the default `opencode` command:

```bash
bin/opencode-docker.js
```

Run any OpenCode command with the same pass-through shape:

```bash
bin/opencode-docker.js -- opencode --help
```

Open an interactive shell in the container:

```bash
bin/opencode-docker.js --shell
```

Mount a different project directory:

```bash
bin/opencode-docker.js --project /path/to/project -- opencode --help
```

## Windows support

Windows hosts support core flows only: default mode, `--shell`, and direct command pass-through. `--host-docker` and advanced local-dev modes for la-briguade and `cache-ctrl` remain Unix-like in this slice and are currently unsupported on native Windows hosts.

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

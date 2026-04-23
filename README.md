# open-docker-nest

Run [OpenCode](https://github.com/anomalyco/opencode) inside Docker with host-project parity, persistent OpenCode data, and non-root file ownership.

## What this repository provides

- Canonical CLI command: `open-docker-nest` (published from `package.json`)
- A Docker image with `opencode`, `cache-ctrl`, Java 21 as the default JDK, Java 25 as an opt-in JDK, and a pinned Rust toolchain (`1.84.0`) installed
- A `/workspace` mount model for running against your host project
- Persistent host-backed OpenCode config/state/share directories across runs
- Non-root execution via host UID/GID remapping
- Layered `open-docker-nest.json` config (user + project) for validated extra container environment wiring

## Prerequisites

- Docker
- Node.js + npm (only if you want to install the published CLI from npm)
- Bun

## Install

Install the published CLI from npm:

```bash
npm install --global open-docker-nest
```

Or run it without a global install:

```bash
npx open-docker-nest --help
```

The default container image is published on Docker Hub as `felixdock/open-docker-nest:latest`.
If you want to pre-pull it explicitly:

```bash
docker pull felixdock/open-docker-nest:latest
```

## Local development install from a repository clone (POSIX)

This repository includes non-interactive local-dev scripts that install/uninstall `open-docker-nest` in `~/.local/bin` using a symlink to this clone's `bin/open-docker-nest.js`.

Install:

```bash
./install.sh
```

Uninstall:

```bash
./uninstall.sh
```

Behavior and safety contract:

- Idempotent: running either script repeatedly is safe.
- Reversible: uninstall removes only the installed symlink.
- Overwrite protection: scripts refuse to overwrite/remove unrelated non-symlink files or unrelated symlink targets.
- Fail-fast diagnostics: missing prerequisites (for example, `HOME`, `readlink`, or source script) fail with actionable errors.
- PATH visibility: install warns when `~/.local/bin` is not present in your current `PATH`.

If needed, add `~/.local/bin` to `PATH` in your shell profile:

```bash
# POSIX sh / bash / zsh (for interactive shells)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile

# fish
set -U fish_user_paths $HOME/.local/bin $fish_user_paths
```

## Build

```bash
docker build -t felixdock/open-docker-nest:latest .
```

This command builds a local image in your Docker daemon using the same tag as the published default reference.
It does not pull or overwrite Docker Hub content; it only defines what `felixdock/open-docker-nest:latest` resolves to on your machine.
Local builds use the Dockerfile's checked-in default pinned toolchain arguments.

The Docker Hub publish workflow may rebuild with newer pinned versions of `cache-ctrl`, Bun, Java 21, Java 25, Rust/rustup, Docker CLI, and Docker Buildx resolved at publish time and passed as Docker build args.
When that happens, the workflow uploads the resolved versions as CI artifacts for traceability.

The image and Docker Hub publish workflow support `linux/amd64` only. Arm64 is unsupported.

Canonical default image: `felixdock/open-docker-nest:latest`.
For reproducible runs, replace `latest` with a specific version tag or image digest.

## Usage

```bash
open-docker-nest [--project <host-path>] [--image <image-ref>] [--java <21|25>] [--shell] [--host-docker] [--] [command ...args]
```

- `open-docker-nest` is the published command.
- `--java <21|25>` selects the default JDK inside the container for that run (default: `21`).
- `--shell` opens an interactive shell as user `opencode` with `HOME=/home/opencode`.
- `--host-docker` enables host Docker daemon access for the entire in-container session (explicit high-privilege mode).
- With no command args and no `--shell`, the wrapper still runs `opencode` by default.
- Commands provided after `--` are passed through unchanged (`-- <command> ...args`).
- `--repo-command` is removed; use `--host-docker` for session-wide host Docker access.
- On implicit default-image runs (no `--image`, no `OPEN_DOCKER_NEST_IMAGE`), the wrapper may emit non-blocking warnings if `felixdock/open-docker-nest:latest` is missing locally or appears outdated. It never auto-pulls.

### Host Docker mode (`--host-docker`)

Use this mode when tooling inside `/workspace` needs host Docker daemon access for a full OpenCode, shell, or pass-through session:

```bash
open-docker-nest --host-docker
open-docker-nest --shell --host-docker
open-docker-nest --host-docker -- docker version
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
open-docker-nest
```

Run any OpenCode command with the same pass-through shape:

```bash
open-docker-nest -- opencode --help
```

Open an interactive shell in the container:

```bash
open-docker-nest --shell
```

Mount a different project directory:

```bash
open-docker-nest --project /path/to/project -- opencode --help
```

Switch the in-container default JDK to Java 25 for one run:

```bash
open-docker-nest --java 25 -- /usr/bin/env bash -lc 'java -version && printf "%s\n" "$JAVA_HOME"'
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
- If `~/.gitconfig` exists, resolves to a regular file, and is readable, it is mounted read-only into the container at `/home/opencode/.gitconfig`.
- If `~/la_briguade` exists and is readable, it is mounted into the container at `/home/opencode/la_briguade`.
- Local la-briguade symlink workflows are supported through `LA_BRIGUADE_LOCAL_MODE` (`auto`, `force`, `off`) and optional `LA_BRIGUADE_LOCAL_PATH`; the authoritative source is `~/.config/opencode/plugins/index.js`, whose resolved target must be `<la-briguade-repo>/dist/index.js`. When active, the wrapper derives and mounts the local project root at `<resolved ~/.config/opencode/plugins/index.js target>/../..`.

## Project config (`open-docker-nest.json`)

The wrapper reads two config levels and merges them as: defaults < user < project.

- User config: `~/.config/open-docker-nest/open-docker-nest.json`
- Project config: `<project-root>/open-docker-nest.json`

Both files use `.json` naming, and JSONC comments are supported.

Current supported field:

```json
{
  "extraContainerEnvironment": {
    "OPENAI_API_KEY": "{env:OPENAI_API_KEY}",
    "FEATURE_FLAG": "enabled"
  }
}
```

Behavior:

- `{env:ENV_VAR_NAME}` placeholders are resolved from the host environment before `docker run`.
- Placeholder syntax must match exactly `{env:ENV_VAR_NAME}` (no surrounding whitespace).
- Missing referenced host env vars fail fast with remediation.
- Runtime planning consumes only validated plain key/value pairs.
- For each configured key, docker args use `--env KEY` (name only), and the value is supplied via the wrapper process environment at launch time.
- This keeps secret values out of `docker run` CLI arguments while still exposing them in-container.

Generate JSON Schema (off hot path):

```bash
bun run schema:generate
```

Output: `schema/open-docker-nest.schema.json`

## More detail

- Operational workflow: `docs/docker-workflow.md`
- Behavior/spec source of truth: `openspec/specs/dockerized-open-docker-nest-workflow/spec.md`

## Published package and image

`open-docker-nest` is published for public use:

- npm package: `open-docker-nest`
- Docker Hub default image: `felixdock/open-docker-nest:latest`
- Package license: `MIT`

Repository publication checks still run through `prepublishOnly`:

```bash
bun run typecheck
bun run test
bun run test:e2e
npm pack --dry-run
```

Note: `install.sh`/`uninstall.sh` are local-dev helpers for repository clones and are not required for npm consumers.

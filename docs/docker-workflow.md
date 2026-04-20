# Dockerized OpenCode Workflow

This repository supports running OpenCode/OpenSpec workflows inside a single Docker image using the published `open-docker-nest` command.

## Prerequisites

- Docker CLI/runtime installed and running.
- Local clone of this repository.

## Local development install / uninstall (POSIX)

For repository-clone workflows, install the `open-docker-nest` command into `~/.local/bin`:

```bash
./install.sh
```

Remove it later:

```bash
./uninstall.sh
```

Contract:

- Scripts are non-interactive, idempotent, and symlink-based.
- They refuse to overwrite/remove unrelated paths.
- Install warns if `~/.local/bin` is not in `PATH` for the current shell.
- Uninstall only removes the managed symlink and leaves directories untouched.

If your shell cannot find `open-docker-nest`, add `~/.local/bin` to `PATH`:

```bash
# POSIX sh / bash / zsh
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.profile

# fish
set -U fish_user_paths $HOME/.local/bin $fish_user_paths
```

## Build the image

```bash
docker build -t open-docker-nest:latest .
```

The image installs `cache-ctrl`, Java 24 (`java`/`javac`), and a pinned Rust toolchain (`rustc`/`cargo`, default `1.84.0`) during build, with deterministic amd64/arm64 artifact selection, so runtime commands can rely on them without startup-time installation.

## Wrapper usage

```bash
open-docker-nest [--project <host-path>] [--image <image-ref>] [--shell] [--host-docker] [--] [command ...args]
```

- `open-docker-nest` is the published command (mapped to `bin/open-docker-nest.js` in `package.json`).
- Default project mount is the current directory.
- Override project mount with `--project <host-path>`.
- Override image with `--image <image-ref>`.
- `--shell` starts an interactive shell at `/workspace` as user `opencode` with `HOME=/home/opencode`.
- `--host-docker` enables host Docker daemon access for the entire in-container session.
- `--repo-command` is removed; use `--host-docker`.
- Without `--shell` and without command args, default command is `opencode`.
- Any command after `--` is passed through unchanged.

### Host Docker mode (`--host-docker`)

Use this mode for OpenCode/shell/pass-through sessions that need Docker daemon access from inside the container:

```bash
open-docker-nest --host-docker
open-docker-nest --shell --host-docker
open-docker-nest --host-docker -- docker version
```

Behavior and scope:

- Execution remains in-container at `/workspace` via the standard entrypoint and remapped non-root `opencode` user.
- Host Docker daemon access is enabled only by bind-mounting `/var/run/docker.sock` for active `--host-docker` runs.
- The wrapper sets in-container `DOCKER_HOST=unix:///var/run/docker.sock` for active `--host-docker` runs.
- This mode does **not** execute commands on the host and is **not** a generic host-command bridge.

Platform/prerequisite constraints:

- Supported on Linux/macOS only when a usable local Unix-socket Docker daemon is available at `/var/run/docker.sock`.
- Requires the active Docker context to be the default/local context.
- Best-effort supported for Linux invocation inside WSL when the Linux environment has a usable `/var/run/docker.sock`.
- Unsupported on native Windows host invocation in this change (explicit fail-fast boundary).
- Unsupported when `DOCKER_HOST` points to non-local endpoints.
- Unsupported when `DOCKER_CONTEXT` selects a non-default context.
- Fails fast before `docker run` if `/var/run/docker.sock` is missing, not a socket, or not read/write accessible.

Out of scope in this slice:

- Host Docker credential/config parity (`~/.docker`, credential helpers, custom context material).
- Sibling-container bind-mount source path translation from in-container `/workspace/...` paths to host-visible paths.

Security posture:

- `--host-docker` intentionally grants high-privilege host daemon control to any process started in that flagged session.
- Keep usage explicit and limited to trusted repository automation.

Rollback guidance:

- Operational rollback is immediate: omit `--host-docker`; existing default, `--shell`, and normal pass-through behavior are unchanged.

### Manual verification: Linux in WSL host-docker path

Automated CI coverage for WSL is not required in this slice. Use this manual checklist when validating from Linux inside WSL:

```bash
# 1) Confirm Linux-in-WSL has a usable local socket path
test -S /var/run/docker.sock

# 2) Confirm host context/endpoint are supported for this slice
test -z "${DOCKER_CONTEXT:-}" || test "${DOCKER_CONTEXT}" = "default"
test -z "${DOCKER_HOST:-}" || test "${DOCKER_HOST}" = "unix:///var/run/docker.sock"

# 3) Launch wrapper with session-wide host docker bridge and verify daemon reachability
open-docker-nest --host-docker -- docker info --format '{{.ServerVersion}}'
```

Expected result: command exits zero with a non-empty daemon version string.

## Windows support

Windows hosts support core flows only: default mode, `--shell`, and direct command pass-through.

Advanced local-dev modes remain Unix-like and are not supported on Windows in this change:

- `--host-docker` mode (host Docker socket bridge)
- la-briguade local symlink/plugin-dev mode
- `cache-ctrl` local-dev mode

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

### Project-level wrapper config (`open-docker-nest.json`)

The wrapper loads two config levels and merges them in this order: defaults < user < project.

- User config: `~/.config/open-docker-nest/open-docker-nest.json`
- Project config: `<project-root>/open-docker-nest.json`

Both files keep the `.json` extension, and JSONC comments are supported.

Supported shape in this slice:

```json
{
  "extraContainerEnvironment": {
    "OPENAI_API_KEY": "{env:OPENAI_API_KEY}",
    "FEATURE_FLAG": "enabled"
  }
}
```

Rules:

- Config is validated with Zod as source of truth.
- `extraContainerEnvironment` values may be literals or exact `{env:ENV_VAR_NAME}` placeholders (no surrounding whitespace).
- Placeholder syntax is strict; malformed placeholders fail startup before `docker run`.
- Missing host env references fail startup with remediation.
- Runtime planning receives only validated plain env key/value data.
- For each configured env key, docker args pass `--env KEY` (name only).
- The wrapper provides the corresponding value from its own process environment when invoking Docker, so secret values are not embedded in `docker run` arguments.

Schema generation is available as an explicit command and is not used on runtime hot paths:

```bash
bun run schema:generate
```

The generated JSON Schema is for editor/tooling integration; runtime validation continues to use the Zod schema directly.

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
- It derives a local project root by walking `../..` from the resolved symlink target path and resolving to an absolute directory.
- It bind-mounts that derived project root into the same absolute path in-container.
- If `LA_BRIGUADE_LOCAL_PATH` is set, it must exactly match the derived project root; mismatch fails preflight.
- If `LA_BRIGUADE_LOCAL_PATH` is unset, the derived project root is used.

When `LA_BRIGUADE_LOCAL_MODE=off`, `LA_BRIGUADE_LOCAL_PATH` is ignored.

### Local cache-ctrl development mode (auto/force/off)

The wrapper supports a cache-ctrl local-dev contract that is fully gated by resolved local mode.

Environment contract:

- `CACHE_CTRL_LOCAL_MODE=auto|force|off` (default: `auto`)
- `CACHE_CTRL_LOCAL_PATH` (optional)

Canonical host inputs used by local-dev activation:

- `~/.local/bin/cache-ctrl`
- `~/.config/opencode/skills/cache-ctrl-caller/SKILL.md`

Mode behavior:

- `auto`: activate cache-ctrl local-dev only when both canonical inputs are valid/readable and derive the same local checkout root.
- `force`: require cache-ctrl local-dev; preflight fails before `docker run` when canonical inputs are missing, broken, unreadable, inaccessible, or inconsistent.
- `off`: disable cache-ctrl local-dev and ignore cache-ctrl local-dev inputs.

When cache-ctrl local-dev mode is active:

- The wrapper derives one authoritative absolute cache-ctrl checkout root from resolved canonical inputs.
- It bind-mounts that checkout root into the same absolute path in-container so host-backed skill symlinks stay resolvable without rewriting `~/.config/opencode`.
- It passes the resolved host-backed cache-ctrl executable target path to container startup.
- During container entrypoint, `/home/opencode/.local/bin/cache-ctrl` is created as a symlink to that mounted checkout executable path.
- It prepends `/home/opencode/.local/bin` to `PATH` for that run only, so local `cache-ctrl` takes precedence over the image-installed binary.
- If `CACHE_CTRL_LOCAL_PATH` is set in active mode, it must resolve to the same derived absolute checkout root.

When local-dev does not activate (or `CACHE_CTRL_LOCAL_MODE=off`), no cache-ctrl local-dev mounts or `PATH` override are added and image-installed `cache-ctrl` remains default.

### Migration from legacy persistence paths

If you previously used `~/.open-docker-nest/{config,state,share}`, migrate existing data into the new defaults before your next run:

```bash
mkdir -p ~/.config/opencode ~/.local/state/opencode ~/.local/share/opencode
cp -a ~/.open-docker-nest/config/. ~/.config/opencode/
cp -a ~/.open-docker-nest/state/. ~/.local/state/opencode/
cp -a ~/.open-docker-nest/share/. ~/.local/share/opencode/
```

After confirming data is present in the new locations, you can archive or remove `~/.open-docker-nest`.

## Examples

Run OpenCode help:

```bash
open-docker-nest -- opencode --help
```

Start an interactive shell:

```bash
open-docker-nest --shell
```

Validate shell user + home contract:

```bash
printf 'id -un\nprintf "%s\\n" "$HOME"\nexit\n' | script -q -c "open-docker-nest --shell" /dev/null
# Expected output includes:
# opencode
# /home/opencode
```

Validate shell-mode host ownership mapping:

```bash
rm -f .tmp-shell-ownership-check
printf 'echo shell-write > /workspace/.tmp-shell-ownership-check\nexit\n' | script -q -c "open-docker-nest --shell" /dev/null
ls -n .tmp-shell-ownership-check
# Expected UID/GID match host `id -u` / `id -g` (and are not 0)
```

Run OpenSpec command parity checks:

```bash
open-docker-nest -- opencode --help
open-docker-nest -- opencode run "/opsx-propose demo-change"
open-docker-nest -- opencode run "/opsx-explore demo-change"
open-docker-nest -- opencode run "/opsx-apply demo-change"
open-docker-nest -- opencode run "/opsx-archive demo-change"
```

Validate unchanged default and pass-through behavior:

```bash
# Default no-arg mode still launches opencode (not implicit shell)
timeout 8 open-docker-nest </dev/null

# Direct command pass-through remains unchanged
open-docker-nest -- /usr/bin/env bash -lc 'printf "%s\n" "$0" "$1" "$2"' passthrough-check alpha beta
# Expected:
# passthrough-check
# alpha
# beta
```

Validate Java 24 and Rust availability as non-root `opencode` runtime user:

```bash
open-docker-nest -- /usr/bin/env bash -lc 'java -version && javac -version && rustc --version && cargo --version'
```

## Permissions and file ownership

The wrapper passes host UID/GID into the container. At startup, `docker/user-map.sh` remaps the container `opencode` user to match host IDs before executing commands.

Result: files created or edited in `/workspace` are owned by the invoking host user, not root.

## Troubleshooting

- `Docker CLI is required but was not found`: install Docker and ensure `docker` is on `PATH`.
- `--repo-command has been removed`: use `--host-docker` for session-wide in-container host Docker access.
- `--host-docker currently supports only local Unix-socket Docker hosts`: unset/adjust `DOCKER_HOST` to `unix:///var/run/docker.sock` or run without `--host-docker`.
- `Unsupported DOCKER_CONTEXT`: unset `DOCKER_CONTEXT` or set it to `default` before using `--host-docker`.
- `--host-docker requires a local Docker daemon socket at /var/run/docker.sock`: start Docker and verify socket provisioning.
- `--host-docker requires /var/run/docker.sock to be a Unix socket`: use a local Unix-socket Docker daemon for this mode.
- `--host-docker cannot access /var/run/docker.sock with read/write permissions`: fix host user access to docker socket (for example docker group membership).
- `--host-docker could not reach a usable host Docker daemon`: ensure Docker daemon is running and reachable via `unix:///var/run/docker.sock` (for example `docker --host unix:///var/run/docker.sock version`).
- `--host-docker is not supported for native Windows hosts in this slice`: run from Linux/macOS (or Linux inside WSL with usable socket), or omit `--host-docker`.
- `Project path does not exist`: pass a valid directory with `--project`.
- `Unable to create persistence directory`: fix permissions/ownership for the reported path (or create it manually), then rerun.
- `Invalid LA_BRIGUADE_LOCAL_MODE`: use one of `auto`, `force`, `off`.
- `LA_BRIGUADE local-link mode requires .../plugins/index.js to be a symlink`: create/update `plugins/index.js` to point to your local la-briguade build output.
- `Unable to derive la-briguade local project root...`: ensure `plugins/index.js` points into a local la-briguade layout where `<resolved-target>/../..` reaches the project root (or disable local mode).
- `LA_BRIGUADE_LOCAL_PATH must exactly match...`: set `LA_BRIGUADE_LOCAL_PATH` to the derived project root path or unset it.
- `Invalid CACHE_CTRL_LOCAL_MODE`: use one of `auto`, `force`, `off`.
- `CACHE_CTRL local-dev auto mode did not activate...`: auto mode found invalid/missing/inconsistent local inputs and safely fell back to image-installed `cache-ctrl`; fix reported inputs or set `CACHE_CTRL_LOCAL_MODE=off` to disable probing.
- `CACHE_CTRL local-dev preflight failed...`: in force mode one or more local-dev prerequisites failed (for example missing `~/.local/bin/cache-ctrl`, broken `cache-ctrl-caller/SKILL.md` symlink, unreadable targets, inaccessible or mismatched checkout roots); fix the reported input(s) or disable with `CACHE_CTRL_LOCAL_MODE=off`.
- `CACHE_CTRL_LOCAL_PATH must match the derived cache-ctrl checkout root...`: set `CACHE_CTRL_LOCAL_PATH` to the derived absolute checkout path (or unset it).

## Release plugin installation behavior

Standard/release la-briguade plugin installation via the OpenCode plugin array is unchanged and requires no additional repository-side setup.

# Dockerized OpenCode Workflow

This repository supports running OpenCode/OpenSpec workflows inside a single Docker image using `bin/opencode-docker.js` as the authoritative entrypoint. `bin/opencode-docker` remains a thin compatibility shim.

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
bin/opencode-docker.js [--project <host-path>] [--image <image-ref>] [--shell] [--] [command ...args]
```

- `bin/opencode-docker.js` is the published entrypoint.
- `bin/opencode-docker` forwards directly to `bin/opencode-docker.js` for compatibility.
- Default project mount is the current directory.
- Override project mount with `--project <host-path>`.
- Override image with `--image <image-ref>`.
- `--shell` starts an interactive shell at `/workspace` as user `opencode` with `HOME=/home/opencode`.
- Without `--shell` and without command args, default command is `opencode`.
- Any command after `--` is passed through unchanged.

## Windows support

Windows hosts support core flows only: default mode, `--shell`, and direct command pass-through.

Advanced local-dev modes remain Unix-like and are not supported on Windows in this change:

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
bin/opencode-docker.js --shell
```

Validate shell user + home contract:

```bash
printf 'id -un\nprintf "%s\\n" "$HOME"\nexit\n' | script -q -c "bin/opencode-docker.js --shell" /dev/null
# Expected output includes:
# opencode
# /home/opencode
```

Validate shell-mode host ownership mapping:

```bash
rm -f .tmp-shell-ownership-check
printf 'echo shell-write > /workspace/.tmp-shell-ownership-check\nexit\n' | script -q -c "bin/opencode-docker.js --shell" /dev/null
ls -n .tmp-shell-ownership-check
# Expected UID/GID match host `id -u` / `id -g` (and are not 0)
```

Run OpenSpec command parity checks:

```bash
bin/opencode-docker.js -- opencode --help
bin/opencode-docker.js -- opencode run "/opsx-propose demo-change"
bin/opencode-docker.js -- opencode run "/opsx-explore demo-change"
bin/opencode-docker.js -- opencode run "/opsx-apply demo-change"
bin/opencode-docker.js -- opencode run "/opsx-archive demo-change"
```

Validate unchanged default and pass-through behavior:

```bash
# Default no-arg mode still launches opencode (not implicit shell)
timeout 8 bin/opencode-docker.js </dev/null

# Direct command pass-through remains unchanged
bin/opencode-docker.js -- /usr/bin/env bash -lc 'printf "%s\n" "$0" "$1" "$2"' passthrough-check alpha beta
# Expected:
# passthrough-check
# alpha
# beta
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
- `Unable to derive la-briguade local project root...`: ensure `plugins/index.js` points into a local la-briguade layout where `<resolved-target>/../..` reaches the project root (or disable local mode).
- `LA_BRIGUADE_LOCAL_PATH must exactly match...`: set `LA_BRIGUADE_LOCAL_PATH` to the derived project root path or unset it.
- `Invalid CACHE_CTRL_LOCAL_MODE`: use one of `auto`, `force`, `off`.
- `CACHE_CTRL local-dev auto mode did not activate...`: auto mode found invalid/missing/inconsistent local inputs and safely fell back to image-installed `cache-ctrl`; fix reported inputs or set `CACHE_CTRL_LOCAL_MODE=off` to disable probing.
- `CACHE_CTRL local-dev preflight failed...`: in force mode one or more local-dev prerequisites failed (for example missing `~/.local/bin/cache-ctrl`, broken `cache-ctrl-caller/SKILL.md` symlink, unreadable targets, inaccessible or mismatched checkout roots); fix the reported input(s) or disable with `CACHE_CTRL_LOCAL_MODE=off`.
- `CACHE_CTRL_LOCAL_PATH must match the derived cache-ctrl checkout root...`: set `CACHE_CTRL_LOCAL_PATH` to the derived absolute checkout path (or unset it).

## Release plugin installation behavior

Standard/release la-briguade plugin installation via the OpenCode plugin array is unchanged and requires no additional repository-side setup.

## Context

The current Dockerized workflow already supports two cache-ctrl runtime modes implicitly: the default image-installed binary and host-mounted OpenCode config under `~/.config/opencode`. It also already has an explicit local-dev pattern for `la_briguade`: detect or force a local mode, validate host paths before `docker run`, and bind-mount a local checkout into the same absolute path inside the container so host-side symlinks remain valid.

This change extends that pattern to `cache-ctrl` local development. In local-dev mode, the container must use:

- host-backed cache-ctrl skill content already referenced from the mounted OpenCode config; and
- a host-backed cache-ctrl binary exposed from `~/.local/bin/cache-ctrl`.

Outside local-dev mode, behavior must remain unchanged: the image-provided `cache-ctrl` binary stays authoritative, existing non-root execution remains intact, and no new mounts are added.

## Goals / Non-Goals

**Goals**
- Define an explicit cache-ctrl local-dev contract analogous to the existing la_briguade local-link contract.
- Ensure host-backed cache-ctrl skill symlinks resolve inside the container without rewriting user config.
- Prefer a host-backed cache-ctrl binary only when local-dev mode is active.
- Preserve fail-fast preflight validation, non-root execution, safe mount handling, and unchanged default behavior.

**Non-Goals**
- Changing the default image installation of `cache-ctrl`.
- Reworking UID/GID remapping, persistence mounts, or the general wrapper CLI.
- Introducing a generic plugin/tool local-dev framework beyond cache-ctrl scope.

## Decisions

1. **Add an explicit cache-ctrl local-dev mode contract**
   - Add `CACHE_CTRL_LOCAL_MODE=auto|force|off` with default `auto`.
   - Add optional `CACHE_CTRL_LOCAL_PATH` as an explicit assertion of the local cache-ctrl checkout root.
   - Mode precedence matches la_briguade: explicit env value first, auto-detection second.

2. **Use two host signals for local-dev activation**
   - Validate the host binary entry at `~/.local/bin/cache-ctrl`.
   - Validate the canonical host skill link at `~/.config/opencode/skills/cache-ctrl-caller/SKILL.md`.
   - In `auto`, activate local-dev only when both inputs are present, readable, and resolve to the same local checkout root.
   - In `force`, missing/broken/inconsistent inputs fail preflight with actionable diagnostics.
   - In `off`, ignore cache-ctrl local-dev inputs entirely.

3. **Preserve host symlink validity by path-preserving checkout mounts**
   - When local-dev is active, resolve the local cache-ctrl checkout root from the validated binary/skill targets.
   - Bind-mount that checkout root into the same absolute path inside the container.
   - This keeps the existing mounted OpenCode config usable as-is because host-backed skill symlinks continue to resolve without rewriting files under `~/.config/opencode`.

4. **Use a local binary only in active local-dev mode**
   - Do not replace the image-installed `/usr/local/bin/cache-ctrl`.
   - Instead, expose the host-backed binary at `/home/opencode/.local/bin/cache-ctrl` only for local-dev runs and prepend `${HOME}/.local/bin` to `PATH` only for those runs.
   - To avoid Docker bind-mount ambiguity around symlink sources, mount the cache-ctrl checkout root at the same absolute path and create `/home/opencode/.local/bin/cache-ctrl` as an entrypoint symlink to the mounted executable target.

5. **Keep validation strict and fallback behavior safe**
   - Invalid `CACHE_CTRL_LOCAL_MODE` values fail before `docker run`.
   - In `auto`, invalid local-dev inputs should emit actionable warnings and fall back to the default image runtime.
   - In `force`, invalid binary path, broken skill symlink, unreadable targets, or mismatched derived roots fail startup.
   - Validation must happen before any extra mount arguments are added.

6. **Derive and verify one authoritative local checkout root**
   - Implementation should derive a single absolute cache-ctrl project root and use it for all local-dev mounts.
   - If `CACHE_CTRL_LOCAL_PATH` is set in active local-dev mode, it must exactly match the derived root.
   - Root derivation should be based on resolved host paths plus repository markers needed for confidence (at minimum a readable project directory; ideally also expected cache-ctrl structure such as `skills/`).

## Risks / Trade-offs

- **Auto-detection can misclassify partial setups** → Mitigate by requiring both binary and canonical skill inputs to agree before activating local-dev automatically.
- **Docker bind-mount behavior for symlink sources is easy to get wrong** → Mitigate by same-path checkout mounting and creating the local binary path as an entrypoint symlink to the mounted executable target.
- **Extra local-dev logic increases wrapper complexity** → Mitigate by mirroring existing la_briguade helper structure and keeping all new behavior gated behind explicit/auto local mode resolution.
- **Local checkout path exposure broadens mount surface** → Mitigate by mounting only the validated checkout root, preserving same-path semantics, and leaving default runs unchanged.

## Migration Plan

1. Extend the `dockerized-opencode-workflow` spec with cache-ctrl local-dev requirements and scenarios.
2. Update `bin/opencode-docker` to resolve cache-ctrl local mode, validate host inputs, and add gated mounts/env only when active.
3. Update runtime startup so local-dev runs prepend `${HOME}/.local/bin` to `PATH` without changing non-local-dev runs.
4. Update workflow documentation with setup, validation, and troubleshooting for cache-ctrl local-dev.
5. Verify rollback safety by confirming `CACHE_CTRL_LOCAL_MODE=off` and unset local-dev inputs still use the image-installed cache-ctrl runtime.

## Open Questions

- What is the most reliable repository-marker rule for deriving the cache-ctrl checkout root from the local binary target without overfitting to one build layout?
- Is `cache-ctrl-caller/SKILL.md` sufficient as the canonical skill health check, or should implementation validate additional cache-ctrl skill entries if they are introduced later?

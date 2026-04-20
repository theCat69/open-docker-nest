---
name: project-coding
description: Coding standards for Bash/Docker/OpenSpec workflow code in this repository.
---

## Scope
Applies to production code and config changes in `bin/`, `docker/`, `Dockerfile`, `.opencode/`, and `openspec/` artifacts.

## Invariants
- Bash scripts use `#!/usr/bin/env bash` and `set -euo pipefail`.
- Wrapper scripts fail fast with actionable error messages.
- Runtime behavior keeps host-mounted workspace ownership aligned via UID/GID mapping.
- OpenSpec artifacts remain the source of truth for requirement intent.

## Code Style
- Prefer small Bash functions with clear single-purpose names (`fail`, `ensure_dir`, `resolve_path`).
- Quote all expansions and use arrays for argument construction.
- Keep Dockerfile instructions deterministic and explicit (pinned tool versions where practical).

## Naming Conventions
- Shell scripts: kebab-case filenames in `bin/` and `docker/`.
- Env vars: uppercase snake case (`HOST_UID`, `HOST_GID`, `OPENCODE_RUNTIME_UID`).
- Functions: verb-first snake case (`ensure_dir`, `resolve_path`).

## Import Ordering
- Bash: constants first, then helper functions, then argument parsing, then execution path.
- Dockerfile: base image, package installs, runtime installs, user setup, filesystem setup, copy scripts, permissions, entrypoint/cmd.

## Error Handling
- Validate prerequisites before work (`docker` availability, valid project paths, numeric UID/GID).
- Emit remediation text for operational failures.
- Never silently ignore validation failures; terminate non-zero.

## Patterns & Architecture
- Thin host wrapper (`bin/open-docker-nest`) orchestrates container runtime and mounts.
- Container entrypoint (`docker/entrypoint.sh`) handles privilege drop and default command.
- User mapping helper (`docker/user-map.sh`) isolates UID/GID remap and validation.
- OpenSpec capability/spec lifecycle remains in `openspec/specs` with archival deltas under `openspec/changes/archive/`.

## Code Examples
- Reference `.code-examples-for-ai/` for real snippets to imitate.

## Validation Checklist
- Script changes preserve `set -euo pipefail` and safe quoting.
- New CLI options include usage text and validation.
- Container startup still defaults to `opencode` when no command is passed.
- No root remap path introduced for runtime execution.

## Failure Handling
- On broken prerequisites, stop early and print fix guidance.
- On invalid identity mapping, reject execution rather than falling back to root.
- On unresolved ambiguity in OpenSpec intent, update spec/docs before code behavior changes.

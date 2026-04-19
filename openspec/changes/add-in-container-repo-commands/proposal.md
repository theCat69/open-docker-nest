## Why

The wrapper already runs commands inside Docker through the host `docker` CLI, but repository-local commands that themselves need Docker cannot currently reach the host daemon from inside the container. This change adds an explicit in-container repo-command workflow so repository automation can run in the mounted workspace without turning the wrapper into a generic host-command bridge.

## What Changes

- Add an explicit `--repo-command` wrapper mode for running repository-local commands inside `/workspace`.
- Extend the container/runtime contract so repo-command runs have Docker CLI availability in-container and opt-in access to the host Docker daemon on supported Unix-like hosts.
- Preserve existing default, `--shell`, and direct pass-through behavior when repo-command mode is not requested.
- Keep Windows scope limited to current core flows; repo-command mode is unsupported there in this change.
- Add fail-fast diagnostics, documentation, and verification for prerequisite, security, and rollback behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dockerized-opencode-workflow`: add an explicit in-container repository-command mode with opt-in host Docker daemon access, supported-platform limits, and safety diagnostics.

## Impact

- Affected areas: `src/validation/cli.ts`, `src/shared/{constants,types,io}.ts`, `src/runtime/{context,runtime-plan,process}.ts`, `Dockerfile`, `README.md`, `docs/docker-workflow.md`, and wrapper test coverage.
- Runtime impact: only `--repo-command` runs gain host-daemon wiring; existing wrapper modes remain unchanged.
- Security/operations impact: repo-command mode intentionally exposes host Docker daemon control to the in-container process for that run, so the mode must stay explicit, diagnosable, and easy to disable by not using the flag.

## Why

Users want to keep using normal `./bin/opencode-docker.js` sessions, then run repository commands from inside that session that can talk to host Docker when needed. The existing explicit `--repo-command` design is too narrow because it scopes Docker access to one wrapper-invoked command instead of the whole in-container session.

## What Changes

- Replace the proposed `--repo-command` flow with a session-level `--host-docker` flag on `bin/opencode-docker.js`.
- When `--host-docker` is enabled, make host Docker available to the full in-container session so commands launched later inside OpenCode, `--shell`, or direct pass-through sessions can use Docker.
- Preserve existing default, `--shell`, and direct pass-through behavior exactly as today when `--host-docker` is not requested.
- Support a production-safe first slice for Linux/macOS local Unix-socket Docker hosts and Linux-in-WSL invocation when a usable local Docker socket path is available; address native Windows explicitly with clear constraints/phasing and fail-fast behavior instead of implied support.
- Treat sibling-container bind-mount path translation between in-container `/workspace/...` paths and host paths as an explicit non-goal for this slice.
- Add fail-fast diagnostics, documentation, rollback guidance, and verification for host/daemon prerequisites and the elevated security posture.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dockerized-opencode-workflow`: add a session-level `--host-docker` mode that grants explicit in-container access to host Docker for supported environments, while preserving existing behavior when the flag is absent.

## Impact

- Affected areas: `src/validation/cli.ts`, `src/shared/{constants,types,io}.ts`, `src/runtime/{context,runtime-plan,process}.ts`, `Dockerfile`, `README.md`, `docs/docker-workflow.md`, and wrapper test coverage.
- Runtime impact: only sessions started with `--host-docker` gain host-daemon wiring; default behavior, `--shell`, and direct pass-through remain unchanged when the flag is absent.
- Security/operations impact: `--host-docker` intentionally gives the whole in-container session host Docker daemon control for that run, so the flag must remain explicit, documented as high privilege, and easy to disable by omission.

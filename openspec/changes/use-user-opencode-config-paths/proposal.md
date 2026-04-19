## Why

The current Docker wrapper persists OpenCode data under `~/.opencode-docker/*`, which diverges from users’ real OpenCode directories and fragments configuration/state across two locations. Aligning persistence with the user’s actual OpenCode config/share/state paths improves continuity between native and Dockerized usage and reduces setup confusion.

## What Changes

- Modify the Dockerized workflow requirements to use the user’s real OpenCode host directories for persistence instead of `~/.opencode-docker/{config,state,share}`.
- Define the expected host path contract for config, state, and share mounts and keep container mount targets unchanged.
- Require wrapper validation and actionable failures when required host directories are unavailable or cannot be prepared.
- Update parity expectations/documentation scope so Docker runs preserve the same OpenCode identity and persisted data a user already has locally.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `dockerized-opencode-workflow`: Update persistence requirements to mount the user’s real OpenCode config/state/share directories on the host.

## Impact

- Affected spec surface: `openspec/specs/dockerized-opencode-workflow/spec.md` (persistence behavior requirements).
- Expected implementation touchpoints after apply: `bin/opencode-docker`, runtime mount wiring, and workflow documentation.
- Operational impact: Docker wrapper persistence aligns with existing local OpenCode data paths, reducing duplicate state locations.

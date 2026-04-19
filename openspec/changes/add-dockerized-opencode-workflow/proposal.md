## Why

Developers need a predictable way to run OpenCode/OpenSpec workflows inside Docker against host-mounted projects without re-creating local setup on every machine. Standardizing this workflow now reduces onboarding friction, avoids environment drift, and preserves interactive development ergonomics.

## What Changes

- Define a Dockerized OpenCode workflow using a single container image and a thin host-side wrapper command.
- Specify host↔container mount behavior for project files and persistent OpenCode state/config/share directories.
- Define command-parity expectations so existing OpenCode/OpenSpec commands work the same way when invoked through the wrapper.
- Add documentation and acceptance checks for interactive usage, persistence across runs, and smoke-validation of key workflows.
- **No Docker runtime implementation in this change artifact set**; this proposal only establishes implementation-ready planning artifacts.

## Non-Goals

- Implementing runtime files in this change (`Dockerfile`, wrapper scripts, entrypoint, docs) — those are follow-up apply work.
- Kubernetes deployment patterns.
- Remote development orchestration.
- CI integration and pipeline automation.

## Success Criteria

- `openspec/changes/add-dockerized-opencode-workflow/specs/dockerized-opencode-workflow/spec.md` exists and defines normative requirements for:
  - host project bind mount,
  - persistent config/state/share mounts,
  - interactive terminal behavior,
  - command-parity smoke validation.
- `design.md` contains implementation-ready decisions with no unresolved blockers for:
  - default host persistence directories,
  - wrapper behavior for missing directories (auto-create vs fail-fast),
  - wrapper CLI contract and pass-through behavior,
  - minimum command-parity smoke set.
- Proposal/design/spec scope is aligned to v1 boundaries: single image only, excluding Kubernetes, remote-dev, and CI.

## Capabilities

### New Capabilities
- `dockerized-opencode-workflow`: Run OpenCode/OpenSpec workflows in a Docker container against host-mounted projects with persistent user state and interactive terminal support.

### Modified Capabilities
- None.

## Impact

- Expected implementation touchpoints (future work): `Dockerfile`, `docker/entrypoint.sh`, `docker/user-map.sh`, `bin/opencode-docker`, `docs/docker-workflow.md`.
- Operational impact: introduces a containerized execution path while preserving existing local workflow behavior.
- User impact: adds a simpler, reproducible host-side entrypoint for running OpenCode/OpenSpec in Docker.
- Dependencies/systems: Docker CLI/runtime on developer machines; host filesystem mounts for project + persistent OpenCode directories.

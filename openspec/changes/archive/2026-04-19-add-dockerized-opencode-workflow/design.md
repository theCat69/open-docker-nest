## Context

This repository follows an OpenSpec/OpenCode workflow with proposal/design/tasks artifacts used to drive implementation. The current baseline has no established Dockerized workflow artifacts under `openspec/changes` for this capability. The requested change defines how to deliver a production-ready Docker execution path for OpenCode/OpenSpec commands while preserving local developer ergonomics:

- Host project must be mounted and editable from inside the container.
- Existing OpenCode/OpenSpec commands must work through a wrapper with parity to local usage.
- OpenCode config/state/share must persist across container runs.
- Interactive terminal usage must be supported.
- v1 uses a single image (no Kubernetes/remote-dev/CI scope).

## Goals / Non-Goals

**Goals:**
- Specify a concrete container runtime model (single image + entrypoint/bootstrap + wrapper contract).
- Define mount topology for project and persistent OpenCode data directories.
- Define user/permission strategy (UID/GID mapping) to avoid root-owned artifacts on host-mounted projects.
- Define wrapper command behavior for interactive shell and command pass-through modes.
- Define documentation and smoke-validation criteria for workflow parity.

**Non-Goals:**
- Implementing the Docker runtime in this change (code is explicitly deferred to follow-up apply phase).
- Kubernetes deployment patterns.
- Remote development orchestration.
- CI integration or pipeline automation.

## Decisions

1. **Single-image runtime for v1**
   - **Decision:** Use one Docker image as the execution environment for all OpenCode/OpenSpec workflows.
   - **Rationale:** Minimizes setup complexity and aligns with snapshot guidance for initial adoption.
   - **Alternatives considered:**
     - Multi-image split (CLI image + helper image): rejected for added build/maintenance overhead in v1.

2. **Thin host wrapper as primary entrypoint**
   - **Decision:** Introduce `bin/opencode-docker` as the host-facing command that normalizes docker run flags and forwards user commands.
   - **Rationale:** Keeps invocation simple and consistent while centralizing run/mount/user options.
   - **Alternatives considered:**
     - Raw `docker run` docs-only approach: rejected due to high error rate and poor usability.

3. **Explicit persistent mount contract**
   - **Decision:** Persist OpenCode config/state/share through dedicated host directories mounted into the container, in addition to project mount.
   - **Default host directories:**
     - `~/.opencode-docker/config`
     - `~/.opencode-docker/state`
     - `~/.opencode-docker/share`
   - **Container mount targets:**
     - `/home/opencode/.config/opencode`
     - `/home/opencode/.local/state/opencode`
     - `/home/opencode/.local/share/opencode`
   - **Rationale:** Required for continuity across sessions and repeatable user experience.
   - **Alternatives considered:**
      - Ephemeral container-only storage: rejected because it loses user state each run.

4. **Wrapper-managed persistence directory creation**
   - **Decision:** Wrapper auto-creates missing default persistence directories (`mkdir -p`) before running the container and fails fast only when creation is impossible (permission denied, invalid parent path).
   - **Rationale:** Keeps first-run UX simple while still providing deterministic error handling.
   - **Failure contract:** Errors must name the failing path and provide remediation (e.g., fix ownership/permissions or override path).
   - **Alternatives considered:**
     - Pure fail-fast for missing dirs: rejected because it adds avoidable onboarding friction.

5. **UID/GID remapping in runtime bootstrap**
   - **Decision:** Include bootstrap logic (`docker/user-map.sh` + entrypoint) to run container processes using host-equivalent UID/GID.
   - **Rationale:** Prevents host filesystem permission conflicts and root-owned artifacts.
   - **Alternatives considered:**
      - Always run as root: rejected due to poor security posture and host permission issues.
      - Require manual user flags every invocation: rejected as error-prone.

6. **Concrete wrapper CLI contract**
   - **Decision:** `bin/opencode-docker` is the stable host entrypoint with the following contract:
     - `bin/opencode-docker [--project <host-path>] [--image <image-ref>] [--shell] [--] [command ...args]`
     - Default `--project` is current working directory.
     - When `--shell` is set, open an interactive shell in the container rooted at mounted project.
     - Without `--shell`, pass all remaining args through as the container command.
     - Without command args, default command is `opencode`.
   - **Rationale:** Removes invocation ambiguity and keeps behavior testable.
   - **Alternatives considered:**
     - Multiple wrapper scripts/modes: rejected for unnecessary complexity in v1.

7. **Command parity as acceptance baseline**
   - **Decision:** Define smoke checks around key OpenCode/OpenSpec command paths executed through wrapper.
   - **Minimum parity smoke set (v1):**
     - `opencode --help`
     - `opencode run "/opsx-propose <change-name>"`
     - `opencode run "/opsx-explore <change-name>"`
     - `opencode run "/opsx-apply <change-name>"`
     - `opencode run "/opsx-archive <change-name>"`
   - **Rationale:** Ensures Docker path is a true substitute for local workflow.
   - **Alternatives considered:**
      - Minimal “container starts” validation only: rejected because it does not prove workflow compatibility.

## Risks / Trade-offs

- **[Risk] Host OS/path differences break mount assumptions** → **Mitigation:** document supported path conventions and validate mount path existence early in wrapper.
- **[Risk] Permission mismatches on mounted volumes** → **Mitigation:** enforce UID/GID mapping and add explicit verification steps in smoke checks.
- **[Risk] Wrapper drift from underlying command behavior** → **Mitigation:** keep wrapper thin (argument pass-through), test representative commands directly.
- **[Trade-off] Single image increases image scope/size** → **Mitigation:** accept for v1 simplicity; revisit layering or slimming in future optimization change.

## Migration Plan

1. Add Docker runtime artifacts and wrapper scripts in repository (implementation phase).
2. Publish usage documentation describing first-time setup, mounts, persistence, and command examples.
3. Run smoke checks for interactive shell and command parity.
4. Rollout recommendation: allow opt-in Dockerized workflow while retaining existing local path.
5. Rollback path: stop using wrapper and continue existing local workflow; no production data migration required.

## Open Questions

- No blocker-level open questions remain for implementation planning. Any future adjustments (e.g., optional shell customization) are post-v1 enhancements.

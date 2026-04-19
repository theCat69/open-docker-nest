## Context

Observed facts: the authoritative wrapper is `bin/opencode-docker.js`; `bin/opencode-docker` is a compatibility shim; the host wrapper currently launches containers through the host `docker` CLI; the image does not currently install Docker CLI; and the runtime plan does not mount Docker daemon access into the container. Existing workflow invariants include `/workspace` project mounting, non-root execution, fail-fast validation, optional local-dev bridges, and Windows support limited to core flows.

Inference: supporting repository-local commands that depend on Docker requires new in-container daemon access wiring rather than a host-side command proxy, because command execution already happens inside the container today.

## Goals / Non-Goals

**Goals:**
- Add a first-class repo-command workflow for running repository-local commands inside `/workspace`.
- Let repo-command runs talk to the host Docker daemon on supported Unix-like hosts.
- Preserve current wrapper semantics and safety invariants for all non-repo-command flows.
- Provide actionable diagnostics and a simple rollback path.

**Non-Goals:**
- Introducing arbitrary host-command execution outside the existing `docker run` path.
- Changing default, `--shell`, or normal pass-through semantics.
- Supporting Windows named-pipe Docker bridging in this change.
- Guaranteeing parity for remote Docker contexts, custom `DOCKER_HOST` endpoints, or host credential-helper setups.

## Decisions

1. **Use an explicit `--repo-command` mode instead of overloading normal pass-through**
   - Decision: repo-command mode is activated only when `--repo-command` is present, and the command payload is still supplied after `--`.
   - Rationale: keeps host-daemon access opt-in, preserves current pass-through semantics, and avoids silently broadening the privilege of existing command flows.
   - Alternative considered: always expose Docker daemon access for any pass-through command (rejected because it expands privilege for existing behavior and weakens operational safety).

2. **Keep execution inside the existing container, not on the host**
   - Decision: repo-command requests still execute through the container entrypoint in `/workspace` as the remapped non-root `opencode` user.
   - Rationale: matches current workflow semantics, avoids a host-command bridge, and preserves existing mount/env/local-dev behavior.
   - Alternative considered: proxying the command back to the host shell (rejected because it breaks the container boundary and conflicts with the stated scope).

3. **Install Docker CLI in the image and mount only the host Unix socket for active repo-command runs**
   - Decision: add Docker CLI to the image, and when repo-command mode is active on a supported Unix-like host, bind-mount `/var/run/docker.sock` into the container at the same path.
   - Rationale: avoids depending on host-binary compatibility, keeps the workflow generic for repo-local tooling, and limits daemon exposure to explicit runs.
   - Alternative considered: bind-mounting the host Docker binary into the container (rejected because host binary/library compatibility is brittle and less production-safe).

4. **Scope support to local Unix-socket Docker hosts**
   - Decision: repo-command mode supports Linux/macOS hosts where the Docker daemon is reachable through the standard local Unix socket; Windows and non-socket/remote Docker endpoints fail fast as unsupported.
   - Rationale: aligns with current platform limits and keeps the first implementation small, testable, and diagnosable.
   - Alternative considered: supporting Windows named pipes and remote `DOCKER_HOST` values immediately (rejected due to added platform and security complexity).

5. **Preserve rollback simplicity**
   - Decision: rollback is operationally trivial: stop using `--repo-command` and fall back to existing wrapper modes.
   - Rationale: no default behavior changes should require emergency reconfiguration.

## Risks / Trade-offs

- **Host Docker daemon access is high privilege** → Mitigation: keep it behind explicit `--repo-command`, mount the socket only for that mode, and document that it is an opt-in privileged workflow.
- **Repo-command runs can fail on hosts without a usable local Unix socket** → Mitigation: preflight validation must fail before `docker run` with the exact unsupported/missing prerequisite.
- **Adding Docker CLI increases image surface area** → Mitigation: keep the dependency limited to the existing image and validate build/runtime behavior through targeted tests.
- **Users may expect a generic host-command bridge** → Mitigation: document and spec the mode as in-container repository-command execution only.

## Migration Plan

1. Extend CLI parsing/help and shared types for `--repo-command`.
2. Add image/runtime wiring for Docker CLI plus opt-in socket mounting.
3. Add diagnostics/docs/tests for supported and unsupported paths.
4. Roll back operationally by not using `--repo-command`; implementation rollback is removal of the new flag and socket/image wiring if needed.

## Open Questions

- Follow-up only, not blocking: whether private-registry credential/config parity (`~/.docker`, credential helpers, custom contexts) needs a separate change once the basic local-socket workflow ships.

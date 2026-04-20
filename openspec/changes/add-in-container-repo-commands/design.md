## Context

Observed facts: the authoritative wrapper is `bin/open-docker-nest.js`; `bin/open-docker-nest` is a compatibility shim; the host wrapper currently launches containers through the host `docker` CLI; the image does not currently install Docker CLI; and the runtime plan does not mount Docker daemon access into the container. Existing workflow invariants include `/workspace` project mounting, non-root execution, fail-fast validation, optional local-dev bridges, and Windows support limited to core flows.

Inference: enabling Docker-aware repo workflows from inside normal OpenCode sessions requires session-scoped in-container daemon access wiring rather than a wrapper-level one-shot command mode, because follow-on commands are launched after the session starts.

## Goals / Non-Goals

**Goals:**
- Add a first-class `--host-docker` session flag for normal in-container sessions.
- Let sessions started with `--host-docker` talk to the host Docker daemon on supported local Unix-socket hosts.
- Preserve current wrapper semantics and safety invariants for all sessions where `--host-docker` is absent.
- Address Windows explicitly in the artifact set with a realistic first-slice boundary and diagnostics.
- Provide actionable diagnostics and a simple rollback path.

**Non-Goals:**
- Preserving `--repo-command` as a compatibility or migration surface.
- Introducing arbitrary host-command execution outside the existing `docker run` path.
- Changing default, `--shell`, or normal pass-through semantics.
- Supporting remote Docker contexts, TCP Docker hosts, or host credential-helper/config parity in this change.
- Shipping native Windows named-pipe Docker bridging in the first implementation slice without separate validation.
- Translating sibling-container bind-mount host paths from in-container `/workspace/...` paths for Docker workloads started from inside the session.
- Guaranteeing parity for remote Docker contexts, custom `DOCKER_HOST` endpoints, or host credential-helper setups.

## Decisions

1. **Replace `--repo-command` with an explicit session-level `--host-docker` flag**
   - Decision: `--host-docker` augments the launched container session instead of introducing a separate command mode.
   - Rationale: matches the updated user intent of starting a normal OpenCode or shell session first and letting later in-session commands use Docker.
   - Alternative considered: keeping `--repo-command` for one-shot commands (rejected because it does not satisfy session-wide usage and would create overlapping designs).

2. **Keep execution inside the existing container, not on the host**
   - Decision: `--host-docker` sessions still execute through the standard container entrypoint in `/workspace` as the remapped non-root `opencode` user.
   - Rationale: matches current workflow semantics, avoids a host-command bridge, and preserves existing mount/env/local-dev behavior.
   - Alternative considered: proxying individual Docker-dependent commands back to the host shell (rejected because it breaks the container boundary and does not provide session-wide semantics).

3. **Install Docker CLI in the image and mount only the supported local daemon bridge for active `--host-docker` sessions**
   - Decision: add Docker CLI to the image, and when `--host-docker` is active on a supported host, bind-mount `/var/run/docker.sock` into the container at the same path and set `DOCKER_HOST=unix:///var/run/docker.sock` inside the session.
   - Rationale: avoids depending on host-binary compatibility, gives later in-session processes a stable Docker client target, and limits daemon exposure to explicit runs.
   - Alternative considered: bind-mounting the host Docker binary into the container (rejected because host binary/library compatibility is brittle and less production-safe).

4. **Define session-wide semantics explicitly**
   - Decision: once a session is started with `--host-docker`, any process launched within that container session can use Docker; without the flag, no new Docker bridge is added.
   - Rationale: removes ambiguity between wrapper-invoked commands and follow-on commands executed later by OpenCode, shells, or repo tooling.
   - Alternative considered: limiting Docker access to the wrapper's initial command only (rejected because it recreates the same command-scoped problem under a new name).

5. **Constrain the first slice to local Unix-socket hosts, including Linux invocation inside WSL, and make native Windows a phased compatibility boundary**
   - Decision: the initial implementation supports Linux/macOS hosts using the standard local Unix socket and default local Docker context, plus Linux-in-WSL invocation when the wrapper runs inside WSL and a usable local Docker socket path is available in that Linux environment. Native Windows host invocation remains an explicit first-slice non-support case and must fail fast with diagnostics that named-pipe/Docker Desktop bridging needs a follow-up design.
   - Rationale: this keeps the slice shippable and testable while recognizing confirmed WSL usage as a Linux-hosted path rather than a separate native Windows transport.
   - Alternative considered: promising same-slice native Windows support via named-pipe bridging (rejected because the required runtime/mount model and verification path are not yet grounded in the current repository behavior).

6. **Do not forward broader Docker host identity/config in the first slice**
   - Decision: `--host-docker` support is limited to the local daemon bridge and in-container Docker CLI; the wrapper does not mount host `~/.docker`, credential helpers, or arbitrary context metadata in this change.
   - Rationale: reduces accidental credential exposure and avoids underspecified parity promises.
   - Alternative considered: forwarding host Docker config to maximize compatibility (rejected because it broadens secret/material exposure and needs separate design).

7. **Do not solve sibling-container host path translation in this slice**
   - Decision: the change does not translate in-container `/workspace/...` paths into host-visible bind-mount paths for Docker workloads launched from inside the flagged session.
   - Rationale: path translation rules depend on host/container topology and would expand the slice into a separate nested-container compatibility feature.
   - Alternative considered: auto-rewriting bind-mount paths for sibling containers (rejected because it is underspecified, high-risk, and not required for the confirmed first slice).

8. **Preserve rollback simplicity**
   - Decision: rollback is operationally trivial: stop using `--host-docker` and fall back to existing wrapper modes.
   - Rationale: no default behavior changes should require emergency reconfiguration.

## Risks / Trade-offs

- **Host Docker daemon access is high privilege for the full session** → Mitigation: keep it behind explicit `--host-docker`, mount the socket only for flagged sessions, and document that any process in that session gains daemon control.
- **Supported host detection can be surprising when `DOCKER_HOST` or `DOCKER_CONTEXT` is customized** → Mitigation: fail preflight with exact unsupported host/context diagnostics instead of attempting partial compatibility.
- **Sibling containers may still fail when users pass `/workspace/...` bind-mount paths to host Docker** → Mitigation: document this as an explicit non-goal and require no path-translation compatibility promise in this slice.
- **Windows users may expect native support immediately** → Mitigation: specify first-slice Windows behavior precisely as fail-fast plus documented phase boundary, not implied support.
- **Adding Docker CLI increases image surface area** → Mitigation: keep the dependency limited to the existing image and validate build/runtime behavior through targeted tests.
- **Users may expect broader Docker config/credential parity** → Mitigation: explicitly scope the change to daemon reachability only and defer config/credential forwarding to a separate change.

## Migration Plan

1. Replace `--repo-command` proposal content with `--host-docker` parsing/help and shared-type updates, with no compatibility requirement for the old flag.
2. Add image/runtime wiring for Docker CLI plus opt-in session socket mounting and Docker env normalization.
3. Add diagnostics/docs/tests for supported Unix-socket paths, supported Linux-in-WSL socket usage, unsupported contexts, explicit native Windows phase-boundary behavior, and the sibling-container path-translation non-goal.
4. Roll back operationally by not using `--host-docker`; implementation rollback is removal of the new flag and socket/image wiring if needed.

## Open Questions

- Follow-up only, not blocking: whether private-registry credential/config parity (`~/.docker`, credential helpers, custom contexts) needs a separate change once the basic local-socket workflow ships.

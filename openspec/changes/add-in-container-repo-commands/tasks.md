## 1. CLI and validation surface

- [x] 1.1 Replace the proposed `--repo-command` option with `--host-docker` parsing, usage text, and shared types.
- [x] 1.2 Ensure `--host-docker` can augment default OpenCode sessions, `--shell`, and direct pass-through sessions without changing command-selection behavior when the flag is absent.
- [x] 1.3 Fail preflight before `docker run` when `--host-docker` is requested with unsupported host Docker configuration, including non-local `DOCKER_HOST`, non-default/remote `DOCKER_CONTEXT`, or missing/inaccessible local socket prerequisites.
- [x] 1.4 Detect native Windows host invocation explicitly and return actionable diagnostics that first-slice support is not shipped for Windows named-pipe/Docker Desktop bridging.
- [x] 1.5 Treat Linux invocation inside WSL as a supported first-slice path when a usable local Docker socket path is available in the Linux environment.

## 2. Runtime and image wiring

- [x] 2.1 Install Docker CLI in the image so in-container sessions can use Docker without host-binary bind mounts.
- [x] 2.2 Extend runtime planning so only active `--host-docker` sessions bind-mount `/var/run/docker.sock` and inject the minimal Docker client environment needed for the in-container session.
- [x] 2.3 Preserve existing mounts, env, entrypoint behavior, non-root execution, default mode, `--shell`, and direct pass-through behavior for all sessions when `--host-docker` is absent.
- [x] 2.4 Keep host Docker config/credential material out of scope for this slice unless a later change explicitly adds and validates it.
- [x] 2.5 Do not add sibling-container bind-mount path translation logic for `/workspace/...` paths in this slice.

## 3. Diagnostics, documentation, and rollback

- [x] 3.1 Remove `--repo-command` references from docs/artifacts and replace them with `--host-docker` session semantics.
- [x] 3.2 Document the security posture: `--host-docker` grants host Docker daemon control to any process started in that flagged session.
- [x] 3.3 Document supported host prerequisites, including Linux-in-WSL socket-based usage, unsupported remote/custom endpoint cases, explicit native Windows phase boundary, sibling-container path-translation non-goal, and rollback guidance (`omit --host-docker`).

## 4. Verification

- [x] 4.1 Add unit coverage for CLI parsing and runtime-plan gating so Docker bridge state appears only for active `--host-docker` sessions.
- [x] 4.2 Add integration or smoke coverage for a supported Unix-like session where a command launched inside the flagged container can successfully reach host Docker.
- [x] 4.3 Add verification for the supported Linux-in-WSL path when CI/manual coverage is available, or explicitly document the required manual validation steps if automated coverage is not practical in this slice.
- [x] 4.4 Add regression coverage confirming existing default, `--shell`, and direct pass-through behavior remains unchanged when `--host-docker` is absent.
- [x] 4.5 Add unsupported-path coverage for native Windows diagnostics and for unsupported `DOCKER_HOST` / `DOCKER_CONTEXT` combinations.

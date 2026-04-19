## 1. CLI and validation surface

- [ ] 1.1 Add `--repo-command` parsing and usage text while preserving existing default, `--shell`, and normal pass-through behavior.
- [ ] 1.2 Require repo-command payload tokens after `--` and fail preflight with actionable diagnostics when they are missing.
- [ ] 1.3 Reject repo-command mode on unsupported platforms/endpoints (Windows and non-local/unsupported Docker host configurations) before `docker run`.

## 2. Runtime and image wiring

- [ ] 2.1 Install Docker CLI in the image so in-container repo-command runs can talk to a mounted host daemon without host-binary bind mounts.
- [ ] 2.2 Extend runtime planning so only active repo-command runs bind-mount `/var/run/docker.sock` into the container and preserve all existing mounts/env/local-dev wiring.
- [ ] 2.3 Ensure repo-command runs still execute in `/workspace` through the standard entrypoint as the remapped non-root `opencode` user.

## 3. Diagnostics and documentation

- [ ] 3.1 Add actionable error messages for unsupported repo-command hosts, missing/inaccessible Docker socket, and invalid repo-command invocation.
- [ ] 3.2 Update `README.md` and `docs/docker-workflow.md` to document repo-command usage, platform scope, security posture, non-goals, and rollback guidance.

## 4. Verification

- [ ] 4.1 Add unit coverage for CLI parsing and runtime-plan gating so daemon access appears only for active repo-command runs.
- [ ] 4.2 Add happy-path E2E or smoke coverage for a Unix-like repo-command invocation that reaches the host Docker daemon from inside the container.
- [ ] 4.3 Add unsupported-path coverage for Windows/unsupported host diagnostics and confirm existing default, `--shell`, and normal pass-through modes remain unchanged.

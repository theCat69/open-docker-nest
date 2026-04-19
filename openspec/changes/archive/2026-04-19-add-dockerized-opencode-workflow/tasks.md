## 1. Change Scaffolding and Spec Alignment

- [x] 1.1 Create `openspec/changes/add-dockerized-opencode-workflow/specs/dockerized-opencode-workflow/spec.md` with requirements for project mount, persistence mounts, interactive terminal support, and command parity.
- [x] 1.2 Validate artifact consistency: proposal, design, and spec all share the same scope boundaries (single image v1; no Kubernetes/remote-dev/CI).
- [x] 1.3 Confirm OpenSpec status reports `proposal`, `design`, and `specs` as complete prerequisites for implementation.

## 2. Container Runtime Artifacts

- [x] 2.1 Implement `Dockerfile` for a single-image OpenCode runtime with required tooling.
- [x] 2.2 Implement `docker/entrypoint.sh` bootstrap flow for runtime initialization and command execution.
- [x] 2.3 Implement `docker/user-map.sh` for UID/GID remapping to host user identity.
- [x] 2.4 Add executable permissions and shell safety checks for Docker helper scripts.

## 3. Host Wrapper Command

- [x] 3.1 Implement `bin/opencode-docker` to normalize `docker run` invocation and pass-through user commands.
- [x] 3.2 Add wrapper handling for project bind mount and persistent OpenCode config/state/share mounts.
- [x] 3.3 Add wrapper mode for interactive terminal sessions and non-interactive command execution.
- [x] 3.4 Add fail-fast validation for missing Docker runtime, invalid mount paths, and actionable error messages.

## 4. Documentation and Developer UX

- [x] 4.1 Create `docs/docker-workflow.md` with setup, wrapper usage, mount model, and troubleshooting.
- [x] 4.2 Document expected directory persistence behavior across runs with concrete examples.
- [x] 4.3 Document security/permissions expectations (UID/GID mapping and host file ownership outcomes).

## 5. Verification and Workflow Smoke Checks

- [ ] 5.1 Add and run smoke checks proving key OpenCode/OpenSpec commands execute correctly through the wrapper.
- [x] 5.2 Verify interactive shell sessions work end-to-end inside the container.
- [x] 5.3 Verify persistent OpenCode config/state/share survives container restart cycles.
- [x] 5.4 Verify host-mounted project files created/edited in container keep correct host ownership.
- [ ] 5.5 Run repository test/build/lint commands and confirm all pass before marking the change complete.

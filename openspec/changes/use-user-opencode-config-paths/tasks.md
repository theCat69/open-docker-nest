## 1. Spec and Wrapper Persistence Contract Updates

- [ ] 1.1 Update wrapper persistence source defaults to `~/.config/opencode`, `~/.local/state/opencode`, and `~/.local/share/opencode`.
- [ ] 1.2 Ensure container mount targets remain `/home/opencode/.config/opencode`, `/home/opencode/.local/state/opencode`, and `/home/opencode/.local/share/opencode`.
- [ ] 1.3 Keep persistence path preparation behavior aligned with spec (auto-create missing directories before container start).

## 2. Validation and Failure Semantics

- [ ] 2.1 Update persistence-path validation to emit actionable non-zero failures when required host directories cannot be prepared.
- [ ] 2.2 Confirm failure messaging includes the failing path and practical remediation guidance.

## 3. Documentation and Migration Guidance

- [ ] 3.1 Update Docker workflow documentation to describe the new default host persistence paths.
- [ ] 3.2 Add migration guidance for users with existing data under `~/.opencode-docker/{config,state,share}`.

## 4. Verification

- [ ] 4.1 Run Dockerized workflow smoke checks to confirm command parity remains functional with the new persistence defaults.
- [ ] 4.2 Verify persistence survives container restart cycles using the updated host paths.
- [ ] 4.3 Verify host-mounted project files remain owned by the invoking host user after wrapper execution.

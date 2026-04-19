## 1. Spec Alignment and Runtime Dependency Wiring

- [ ] 1.1 Update `openspec/specs/dockerized-opencode-workflow/spec.md` to include delta requirements for cache-ctrl image installation and la-briguade integration behavior.
- [ ] 1.2 Add deterministic cache-ctrl installation to `Dockerfile` so runtime commands can assume dependency presence.
- [ ] 1.3 Validate build-time failure semantics for cache-ctrl install failures (fail non-zero; no partial runtime dependency state).

## 2. La-briguade Configuration Import and Mode Selection

- [ ] 2.1 Implement wrapper/runtime handling to auto-import la-briguade user configuration from `~/la_briguade` into the same home-relative in-container path `~/la_briguade` when present, independent of plugin installation mode.
- [ ] 2.2 Ensure la-briguade config import remains best-effort only: auto-import from `~/la_briguade` when present, remain non-fatal when absent, and continue startup with actionable diagnostics when an expected import source is invalid/inaccessible.
- [ ] 2.3 Implement local plugin-dev symlink detection logic against the mounted project plugin target (for example `./plugins/index.js` mapped to `/workspace/plugins/index.js`) and explicit environment-variable override controls using `LA_BRIGUADE_LOCAL_MODE` (`auto|force|off`).
- [ ] 2.4 In active local-link mode, bind-mount the host absolute symlink target path into the same absolute path inside the container so existing symlink targets remain valid.
- [ ] 2.5 Enforce strict active-mode path contract: when local-link mode is active, `LA_BRIGUADE_LOCAL_PATH` (if set) must exactly match the absolute symlink target from `./plugins/index.js`; mismatch fails preflight with actionable diagnostics; if unset, use the resolved symlink target.
- [ ] 2.6 Ensure regular/release la-briguade plugin installation via OpenCode plugin array remains unchanged and does not require new repo-side setup.

## 3. Documentation and Operator Guidance

- [ ] 3.1 Update `docs/docker-workflow.md` to document cache-ctrl availability and la-briguade config import behavior.
- [ ] 3.2 Document auto-detect and explicit environment-variable override behavior for local symlink plugin-dev mode, including exact env contract (`LA_BRIGUADE_LOCAL_MODE=auto|force|off`, optional `LA_BRIGUADE_LOCAL_PATH`), host source expectations (symlink target on host), same-absolute-path bind-mount behavior, prerequisites, and troubleshooting guidance.
- [ ] 3.3 Document explicitly that standard/release plugin installation via OpenCode plugin array requires no additional repository-side changes.

## 4. Verification and Parity Safety

- [ ] 4.1 Build the image and verify cache-ctrl is available in the runtime command environment.
- [ ] 4.2 Run command parity smoke checks through `bin/opencode-docker` using workflow-spec slash-command form (`opencode --help`, `opencode run "/opsx-propose demo-change"`, `opencode run "/opsx-explore demo-change"`, `opencode run "/opsx-apply demo-change"`, `opencode run "/opsx-archive demo-change"`).
- [ ] 4.3 Verify non-root ownership invariants and existing command syntax remain intact after integration changes.
- [ ] 4.4 Verify local symlink plugin-dev mode with concrete cases: (a) `LA_BRIGUADE_LOCAL_MODE=auto` auto-detects when `/workspace/plugins/index.js` is a symlink, (b) same-absolute-path target bind mount is present in local-link mode, (c) `LA_BRIGUADE_LOCAL_MODE=off` disables local mode, (d) `LA_BRIGUADE_LOCAL_MODE=force` forces local mode and fails fast with actionable diagnostics when symlink prerequisites are missing, (e) invalid `LA_BRIGUADE_LOCAL_MODE` fails fast listing allowed values, (f) in active local-link mode `LA_BRIGUADE_LOCAL_PATH` must match the resolved absolute symlink target and mismatch fails preflight with actionable diagnostics, (g) when active local-link mode and `LA_BRIGUADE_LOCAL_PATH` is unset, resolved symlink target is used, (h) `LA_BRIGUADE_LOCAL_PATH` is ignored in `off` mode.
- [ ] 4.5 Verify regular/release la-briguade plugin installation via OpenCode plugin array remains unchanged (no additional repository-side setup required).

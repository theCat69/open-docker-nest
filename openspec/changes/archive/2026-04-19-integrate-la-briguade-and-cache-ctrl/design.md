## Context

The Dockerized OpenCode workflow currently defines project mounting, persistence, execution modes, and parity checks, but it does not yet define cache-ctrl as an image dependency or a corrected la-briguade contract for containerized runs. The corrected contract has two separate tracks:

1. import user configuration from `~/la_briguade`; and
2. support a local developer workflow for symlink-based plugin development.

Regular/release la-briguade plugin installation is already handled through OpenCode plugin configuration and is not a repo-side workflow change.

The implementation must preserve existing operational invariants: non-root runtime, stable in-container paths where possible, fail-fast validation with actionable messages, and stable wrapper command syntax unless explicitly justified.

Related archived work (`use-user-opencode-config-paths`) aligned persistence behavior with user-native OpenCode directories; this change should build on that direction and avoid introducing a parallel config model.

## Goals / Non-Goals

**Goals:**
- Define requirement-level behavior for installing cache-ctrl in the Docker image.
- Define requirement-level behavior for importing user la-briguade configuration from `~/la_briguade` into Dockerized runs.
- Specify a recommended Dockerized local la-briguade plugin-development approach that auto-detects symlinked local setups while allowing explicit override controls.
- Explicitly preserve no-op behavior for regular/release la-briguade plugin installation (no additional repo-side changes required).
- Preserve runtime safety and compatibility guarantees (non-root, fail-fast, stable command contract).

**Non-Goals:**
- Reworking UID/GID remap architecture or container privilege model.
- Changing the default OpenCode command path or introducing breaking CLI syntax changes.
- Designing a full plugin manager beyond cache-ctrl/la-briguade scope.

## Decisions

1. **Treat cache-ctrl as a required runtime dependency in the image**
   - **Decision:** Docker image requirements will mandate cache-ctrl installation during image build so commands can assume availability at runtime.
   - **Rationale:** Runtime determinism is better when dependency presence is guaranteed by image build, not ad-hoc startup behavior.
   - **Alternatives considered:**
     - Install cache-ctrl on container start: rejected due to startup variability and network-dependent failures.
     - Rely on host-provided binaries: rejected because it breaks container portability.

2. **Import la-briguade user configuration from a stable host source path with non-fatal absence**
   - **Decision:** Define wrapper behavior that auto-imports from `~/la_briguade` when present and maps that config into the same home-relative path in-container (`~/la_briguade`); absence of `~/la_briguade` does not fail startup.
   - **Rationale:** A single well-known host source path keeps behavior predictable and aligns with user expectations from local setup, while non-fatal absence avoids breaking users who do not use la-briguade config.
   - **Alternatives considered:**
     - Require manual per-run path flags only: rejected due to high friction.
     - Copy config into image at build time: rejected because user config is host-specific and mutable.

3. **Support local symlink-based la-briguade plugin development using auto-detect + explicit override with path-preserving mounts**
   - **Decision:** Recommended path is automatic detection of a symlinked plugin entrypoint under the mounted project plugin target (for example `/workspace/plugins/index.js` as a symlink), with explicit override controls exposed through environment variables to force local-link mode or disable it.
   - **Decision:** The override contract is fixed as:
     - `LA_BRIGUADE_LOCAL_MODE` with allowed values `auto`, `force`, `off`
     - optional `LA_BRIGUADE_LOCAL_PATH` for the host local build output path
   - **Decision:** Mode semantics are fixed as:
     - `auto`: use auto-detect for `/workspace/plugins/index.js` symlink local-link eligibility
     - `force`: require local-link mode and fail fast if prerequisites are missing/invalid
     - `off`: disable local-link mode even if auto-detect would match
    - **Decision:** In active local-link mode, the plugin symlink target remains the source of truth: `LA_BRIGUADE_LOCAL_PATH` (if set) must exactly match the absolute symlink target resolved from `./plugins/index.js`; preflight fails on mismatch with actionable diagnostics.
    - **Decision:** If `LA_BRIGUADE_LOCAL_PATH` is not set in active local-link mode, resolve and use the absolute symlink target from `./plugins/index.js` as the host source path.
   - **Decision:** When local-link mode is active, preserve existing symlink behavior by bind-mounting the host absolute symlink target path into the same absolute path in the container.
   - **Rationale:** This matches the known developer example (`ln -s /host/la-briguade/dist/index.js ./plugins/index.js`) and keeps `/workspace/plugins/index.js` valid without rewriting symlink targets.
   - **Alternatives considered:**
      - Auto-detect only (no override): rejected because it is hard to troubleshoot edge cases.
      - Override only (no auto-detect): rejected because it creates unnecessary manual configuration overhead.
      - Mounting to different in-container target paths: rejected because it breaks existing symlink expectations.

4. **Environment variables are explicit precedence controls for local-link mode**
   - **Decision:** Local-link mode selection order is: explicit `LA_BRIGUADE_LOCAL_MODE` first, auto-detect second.
   - **Rationale:** Operators need deterministic control in CI/debug workflows where auto-detect may be ambiguous.
   - **Decision:** Invalid `LA_BRIGUADE_LOCAL_MODE` values fail preflight with actionable diagnostics listing allowed values.
   - **Decision:** `LA_BRIGUADE_LOCAL_PATH` is ignored when mode resolves to `off`; in `force`, invalid/inaccessible paths fail preflight.

5. **Keep regular/release plugin installation path unchanged**
    - **Decision:** Requirements will explicitly state that standard release installation configured via OpenCode plugin array does not require repository-side wrapper/image changes.
    - **Rationale:** Avoids unnecessary churn and protects current working setups.
    - **Decision:** Verification coverage explicitly includes proving that OpenCode plugin-array installation behavior for regular/release la-briguade remains unchanged.

   - **Alternatives considered:**
      - Always add new wrapper switches regardless of install mode: rejected as unnecessary complexity.

## Risks / Trade-offs

- **[Risk] Auto-detection heuristics may misclassify unusual local setups** → **Mitigation:** constrain auto-detect to a stable in-project plugin target plus symlink presence checks, provide explicit override to force/disable local symlink handling, and require fail-fast diagnostics.
- **[Risk] Mapping host config paths can fail due to missing path/permissions** → **Mitigation:** keep proactive path validation and actionable remediation messaging before `docker run`.
- **[Trade-off] Additional dependency in image increases build surface** → **Mitigation:** keep installation deterministic and document expected version/verification strategy during implementation.

## Migration Plan

1. Update spec requirements for Dockerized workflow to include cache-ctrl and la-briguade config/link behavior.
2. Implement image/runtime changes while preserving current command contract and non-root execution.
3. Validate parity commands, ownership behavior, and local symlink mode auto-detect/override behavior still match existing workflow invariants.
4. Rollback path: remove/disable new dependency/config handling and revert to previous image/runtime behavior if regressions occur.

## Open Questions

- No blocker-level questions for artifact generation.

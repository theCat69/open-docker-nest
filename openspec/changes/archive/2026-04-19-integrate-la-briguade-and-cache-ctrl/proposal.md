## Why

The Dockerized workflow does not yet define cache-ctrl as a runtime dependency in the image and lacks a clear contract for two distinct la-briguade concerns:

1. user configuration import from `~/la_briguade`; and
2. local plugin-development via symlinked plugin entrypoints.

Separating these concerns in requirements prevents ad-hoc implementation choices, avoids regressions in regular plugin usage, and protects existing non-root, fail-fast wrapper behavior.

## What Changes

- Modify Dockerized workflow requirements to require cache-ctrl installation in the Docker image used by `bin/open-docker-nest`.
- Define behavior for importing user la-briguade user config from `~/la_briguade` into Dockerized runs as a config concern independent of plugin installation mode, mapped to the same home-relative in-container path `~/la_briguade`.
- Set user config import default to auto-import when `~/la_briguade` exists, while treating path absence as non-fatal startup behavior.
- Explicitly state that regular/release la-briguade plugin installation is handled by OpenCode plugin configuration and requires no repository-side wrapper or image changes.
- Define a recommended Dockerized local-development workflow for symlink-based la-briguade plugin installs (example form: `ln -s /host/la-briguade/dist/index.js ./plugins/index.js`) using auto-detect plus explicit override.
- Define the explicit local plugin-dev override contract:
  - `LA_BRIGUADE_LOCAL_MODE` with allowed values `auto`, `force`, `off`
  - optional `LA_BRIGUADE_LOCAL_PATH` as the host local build output path used for local-link behavior
- Require local-link mode to preserve existing symlink semantics by bind-mounting the host absolute symlink target path into the same absolute path in-container when local-link mode is active.
- Require `LA_BRIGUADE_LOCAL_MODE` and `LA_BRIGUADE_LOCAL_PATH` behavior to be validated with fail-fast, actionable diagnostics for invalid values or unmet forced-mode prerequisites.
- Require a strict local-link contract: when local-link mode is active, `LA_BRIGUADE_LOCAL_PATH` (if set) MUST exactly match the absolute symlink target referenced by `./plugins/index.js`; mismatch fails preflight with actionable diagnostics.
- Require environment-variable overrides for local-link mode to take precedence over auto-detect outcomes.
- Add explicit verification coverage that regular/release la-briguade plugin installation via the OpenCode plugin array remains unchanged.
- Preserve existing workflow invariants: non-root runtime, stable in-container mount targets where possible, fail-fast validation, and stable command syntax unless explicitly justified.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `dockerized-open-docker-nest-workflow`: Add requirements for cache-ctrl image availability, user config import from `~/la_briguade`, and local symlink plugin-development mode with auto-detect plus explicit override semantics.

## Impact

- Affected spec surface: `openspec/specs/dockerized-open-docker-nest-workflow/spec.md`.
- Expected implementation touchpoints after apply: `Dockerfile`, `bin/open-docker-nest`, runtime environment/mount wiring, and `docs/docker-workflow.md`.
- Runtime/dependency impact: cache-ctrl becomes a required image dependency; regular/release la-briguade plugin installation remains unchanged; user config import and local symlink plugin-dev behavior are explicitly defined as separate contracts.

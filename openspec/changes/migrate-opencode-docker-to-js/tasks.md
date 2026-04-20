# Tasks

## 1. Wrapper contract migration
- [x] Implement `bin/open-docker-nest.js` as the authoritative host wrapper for in-scope behavior.
- [x] Keep the executable adapter thin and delegate substantive behavior into modules under `./src/`.

## 2. JS source organization
- [x] Establish a `./src/` organization that separates concerns for entry orchestration, validation, runtime planning, process execution, and shared errors/types/utilities.
- [x] Avoid hardcoding spec-visible guarantees about exact internal folder names beyond the `./src/` and thin-entrypoint requirements.

## 3. Behavior parity
- [x] Preserve existing Linux/macOS behavior for mounts, diagnostics, env propagation, TTY handling, and advanced local-dev modes.
- [x] Support Windows core flows only, with explicit unsupported diagnostics for advanced local-dev requests.

## 4. Validation and rollout
- [x] Use existing smoke and E2E coverage to confirm parity after modularization.
- [x] Confirm published-bin and repository entrypoints stay aligned before retiring Bash-wrapper ownership.

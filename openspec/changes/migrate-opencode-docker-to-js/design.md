# Context

The active wrapper behavior still lives in Bash, while `bin/open-docker-nest.js` is the published entry. The migration must make JS authoritative for in-scope flows without regressing current Unix-like behavior.

# Goals

- Make `bin/open-docker-nest.js` authoritative for core flows on Linux, macOS, and Windows.
- Preserve current behavior for command selection, validation, mounts, env propagation, TTY handling, diagnostics, and Unix-only advanced local-dev modes.
- Keep the JS implementation maintainable by placing substantive logic under `./src/` with separated concerns and reusable shared modules.

# Non-Goals

- Windows parity for advanced local-dev modes.
- Hardcoding a specific internal folder taxonomy beyond requiring `./src/` and separation of concerns.

# Decisions

- `bin/open-docker-nest.js` remains a thin executable adapter that delegates to modules under `./src/`.
- The `./src/` implementation must separate entry orchestration, validation, runtime planning, process execution, and shared errors/types/utilities so the wrapper does not become monolithic.
- This change uses principle-level modularity guidance inspired by cache-ctrl, but does not standardize exact subdirectory names.
- Existing smoke and E2E harnesses remain the main parity checks.

# Risks & Trade-offs

- Over-specifying layout would reduce flexibility; under-specifying it could allow another monolith.
- Refactoring for modularity must not change runtime semantics.

# Migration Plan

1. Update proposal, spec, and tasks with `./src/` modularity requirements.
2. Implement JS behavior behind a thin executable adapter.
3. Validate parity for core flows and Unix-like advanced modes.

# Why

`bin/opencode-docker` is still the active wrapper in Bash while the published bin already points to `bin/opencode-docker.js`. This change keeps the migration focused on behavior parity for core Linux/macOS/Windows flows while also requiring a maintainable JavaScript implementation organized under `./src/` with separation of concerns inspired by cache-ctrl-style modularity.

# What Changes

- Move the active host-wrapper contract into `bin/opencode-docker.js` for default mode, `--shell`, command pass-through, mount planning, persistence planning, and actionable diagnostics.
- Preserve existing Unix-like behavior for validation, TTY handling, env propagation, Docker execution, and advanced local-dev contracts.
- Organize the JS implementation under `./src/` using concern-based modular boundaries and shared validation/error/type handling, with the executable file kept as a thin adapter rather than a monolithic implementation.
- Keep Windows scope limited to core flows only; advanced local-dev parity remains out of scope there.

# Capabilities

- Modified: `dockerized-opencode-workflow`

# Impact

- Aligns the repository with the published JS entrypoint.
- Improves maintainability by avoiding a single large wrapper file and by separating concerns without hardcoding one folder layout.
- Requires parity validation so source-layout refactoring does not regress runtime behavior.

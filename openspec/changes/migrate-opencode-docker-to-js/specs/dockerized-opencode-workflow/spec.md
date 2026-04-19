## MODIFIED Requirements

### Requirement: Dockerized OpenCode workflow via JS host wrapper
The system SHALL define a Dockerized workflow invoked from a host-side wrapper, with `bin/opencode-docker.js` as the authoritative host entrypoint for supported core flows across Linux, macOS, and Windows.

#### Scenario: Core command modes remain cross-platform
- **GIVEN** a supported host
- **WHEN** the developer invokes default mode, `--shell`, or command pass-through through `bin/opencode-docker.js`
- **THEN** the wrapper preserves existing command-selection, validation, mount-planning, env, TTY, and diagnostic semantics for in-scope flows.

### Requirement: JS wrapper implementation remains modular and source-organized
The JS wrapper implementation SHALL place substantive host-wrapper logic under `./src/` and SHALL use separation of concerns so the executable entrypoint stays thin.

#### Scenario: Thin executable adapter delegates to source modules
- **GIVEN** the JS wrapper implementation
- **WHEN** the executable entrypoint is reviewed
- **THEN** it primarily performs startup delegation into `./src/` rather than embedding the full wrapper behavior inline.

#### Scenario: Source layout uses principle-based separation of concerns
- **GIVEN** the host-wrapper implementation under `./src/`
- **WHEN** runtime behavior is organized for maintenance
- **THEN** validation, runtime planning, process execution, and shared error/type utilities are separated by concern
- **AND** the requirement does not mandate exact internal folder names.

### Requirement: Advanced local-dev scope remains platform-limited
The system SHALL preserve existing `CACHE_CTRL_LOCAL_*` and `LA_BRIGUADE_LOCAL_*` semantics on currently supported Unix-like hosts during JS wrapper migration, and SHALL NOT require equivalent Windows parity in this change.

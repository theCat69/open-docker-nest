## MODIFIED Requirements

### Requirement: Persistent OpenCode config/state/share across runs
The system SHALL persist OpenCode config, state, and share directories across container runs using host-mounted directories.

#### Scenario: Default persistence directories are used
- **GIVEN** no persistence path overrides are configured
- **WHEN** the wrapper prepares container mounts
- **THEN** it uses host directories:
  - `~/.config/opencode`
  - `~/.local/state/opencode`
  - `~/.local/share/opencode`
- **AND** mounts them to:
  - `/home/opencode/.config/opencode`
  - `/home/opencode/.local/state/opencode`
  - `/home/opencode/.local/share/opencode`

#### Scenario: Missing persistence directories are auto-created
- **GIVEN** one or more default persistence directories are missing
- **WHEN** the wrapper is invoked
- **THEN** it creates the missing directories before `docker run`
- **AND** proceeds with container execution when creation succeeds

#### Scenario: Persistence directory creation fails
- **GIVEN** a persistence directory cannot be created (for example permission denied)
- **WHEN** the wrapper attempts preparation
- **THEN** it exits non-zero before container startup
- **AND** prints an actionable message that includes the failing path and remediation guidance

## ADDED Requirements

### Requirement: Dockerized OpenCode workflow via host wrapper
The system SHALL define a Dockerized workflow that is invoked from a host-side wrapper and runs against a host-mounted project directory.

#### Scenario: Wrapper mounts host project by default
- **GIVEN** a developer runs `bin/opencode-docker` from inside a project directory
- **WHEN** no explicit project path is provided
- **THEN** the wrapper uses the current working directory as the project mount source
- **AND** mounts it into the container as the working project path

#### Scenario: Wrapper allows explicit project path override
- **GIVEN** a developer provides `--project <host-path>`
- **WHEN** the wrapper starts the container
- **THEN** it mounts the provided host path as the project directory in-container
- **AND** fails fast with an actionable error if the project path does not exist

### Requirement: Persistent OpenCode config/state/share across runs
The system SHALL persist OpenCode config, state, and share directories across container runs using host-mounted directories.

#### Scenario: Default persistence directories are used
- **GIVEN** no persistence path overrides are configured
- **WHEN** the wrapper prepares container mounts
- **THEN** it uses host directories:
  - `~/.opencode-docker/config`
  - `~/.opencode-docker/state`
  - `~/.opencode-docker/share`
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

### Requirement: Interactive and command pass-through execution modes
The system SHALL support both interactive shell sessions and direct command execution through a single wrapper contract.

#### Scenario: Interactive shell mode
- **GIVEN** a developer invokes `bin/opencode-docker --shell`
- **WHEN** the container starts
- **THEN** an interactive shell session is opened in the mounted project context

#### Scenario: Direct command mode
- **GIVEN** a developer invokes `bin/opencode-docker -- <command> ...args`
- **WHEN** the wrapper executes the container
- **THEN** the provided command and arguments are passed through unchanged

#### Scenario: Default command mode
- **GIVEN** a developer invokes `bin/opencode-docker` with no command arguments and no `--shell`
- **WHEN** the wrapper runs
- **THEN** the container executes `opencode` as the default command

### Requirement: Minimum command-parity smoke validation
The system SHALL define a minimum smoke set that demonstrates parity for key OpenCode/OpenSpec workflows through the Docker wrapper.

#### Scenario: Required parity smoke commands
- **GIVEN** a repository configured with OpenCode/OpenSpec commands
- **WHEN** parity smoke validation is executed via `bin/opencode-docker`
- **THEN** the minimum command set includes:
  - `opencode --help`
  - `opencode run "/opsx-propose <change-name>"`
  - `opencode run "/opsx-explore <change-name>"`
  - `opencode run "/opsx-apply <change-name>"`
  - `opencode run "/opsx-archive <change-name>"`

#### Scenario: Host file ownership is preserved
- **GIVEN** commands executed via wrapper create or modify files under the host-mounted project
- **WHEN** execution completes
- **THEN** resulting host files are owned by the invoking host user (not root)

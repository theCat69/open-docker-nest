## MODIFIED Requirements

### Requirement: Interactive and command pass-through execution modes
The system SHALL support interactive shell sessions, direct command execution, and default command execution through a single wrapper contract. When `--shell` is used, the wrapper MUST open an interactive shell in the mounted project context as the `opencode` user with `/home/opencode` as the runtime home directory. When `--shell` is not used, the wrapper MUST preserve existing direct command pass-through behavior and MUST continue to default to `opencode` when no command arguments are provided.

#### Scenario: Interactive shell mode runs as opencode
- **GIVEN** a developer invokes `bin/opencode-docker --shell`
- **WHEN** the container starts
- **THEN** an interactive shell session is opened in the mounted project context
- **AND** the session runs as user `opencode`
- **AND** the session uses `/home/opencode` as the runtime home directory

#### Scenario: Direct command mode remains unchanged
- **GIVEN** a developer invokes `bin/opencode-docker -- <command> ...args`
- **WHEN** the wrapper executes the container
- **THEN** the provided command and arguments are passed through unchanged
- **AND** shell-mode behavior is not applied to that run

#### Scenario: Default command mode remains unchanged
- **GIVEN** a developer invokes `bin/opencode-docker` with no command arguments and no `--shell`
- **WHEN** the wrapper runs
- **THEN** the container executes `opencode` as the default command
- **AND** an interactive shell is not started implicitly

### Requirement: Minimum command-parity smoke validation
The system SHALL define a minimum smoke set that demonstrates parity for key OpenCode/OpenSpec workflows through the Docker wrapper. The smoke set MUST verify that shell mode runs as `opencode` while preserving non-root host ownership behavior, and MUST verify that direct command mode and default command mode continue to behave as specified.

#### Scenario: Required parity smoke commands and shell identity checks
- **GIVEN** a repository configured with OpenCode/OpenSpec commands
- **WHEN** parity smoke validation is executed via `bin/opencode-docker`
- **THEN** the minimum command set includes:
  - `opencode --help`
  - `opencode run "/opsx-propose <change-name>"`
  - `opencode run "/opsx-explore <change-name>"`
  - `opencode run "/opsx-apply <change-name>"`
  - `opencode run "/opsx-archive <change-name>"`
- **AND** shell-mode validation confirms `bin/opencode-docker --shell` opens as user `opencode`

#### Scenario: Host file ownership is preserved across execution modes
- **GIVEN** commands or shell-session actions executed via the wrapper create or modify files under the host-mounted project
- **WHEN** execution completes
- **THEN** resulting host files are owned by the invoking host user
- **AND** resulting host files are not owned by root
- **AND** shell mode preserves the same ownership expectation as default command mode and direct command mode

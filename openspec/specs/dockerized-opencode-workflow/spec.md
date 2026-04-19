## Purpose

Define the Dockerized OpenCode workflow contract for wrapper behavior, runtime modes, persistence, parity validation, and local development integration expectations.

## Requirements

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

### Requirement: Docker image includes cache-ctrl runtime dependency
The system SHALL install cache-ctrl in the Docker image so containerized OpenCode workflows can rely on cache-ctrl availability at runtime without startup-time package installation.

#### Scenario: Cache-ctrl is available in default runtime path
- **GIVEN** the image is built from the repository Dockerfile
- **WHEN** a container is started through `bin/opencode-docker`
- **THEN** cache-ctrl is available to the runtime command environment
- **AND** no additional startup installation step is required to use it

#### Scenario: Cache-ctrl installation failure stops image build
- **GIVEN** cache-ctrl cannot be installed during Docker build
- **WHEN** the image build executes
- **THEN** the build fails non-zero
- **AND** runtime execution does not proceed with a partial dependency state

### Requirement: Local cache-ctrl development mode supports explicit env contract
The system SHALL support a local cache-ctrl development mode that uses `CACHE_CTRL_LOCAL_MODE` (`auto`, `force`, `off`) as the explicit mode contract and supports optional `CACHE_CTRL_LOCAL_PATH` as an explicit assertion of the derived local cache-ctrl checkout root.

#### Scenario: Auto-detect selects local cache-ctrl mode only when canonical inputs agree
- **GIVEN** `CACHE_CTRL_LOCAL_MODE` is unset or `auto`
- **AND** `~/.config/opencode/skills/cache-ctrl-caller/SKILL.md` and `~/.local/bin/cache-ctrl` both resolve to readable host paths
- **WHEN** the wrapper derives the local cache-ctrl checkout root from those resolved paths
- **THEN** local cache-ctrl mode activates only when both inputs resolve to the same absolute checkout root
- **AND** the wrapper uses that derived checkout root as the authoritative local-dev source

#### Scenario: Active local mode preserves host-backed cache-ctrl skill symlinks
- **GIVEN** local cache-ctrl mode is active
- **AND** the mounted OpenCode config contains cache-ctrl skill symlinks that target absolute paths under the derived local checkout root
- **WHEN** the wrapper prepares Docker mounts
- **THEN** it bind-mounts the derived local checkout root into the same absolute path inside the container
- **AND** the existing host-backed cache-ctrl skill symlinks remain resolvable without rewriting user config

#### Scenario: Active local mode prefers the local cache-ctrl binary
- **GIVEN** local cache-ctrl mode is active
- **AND** `~/.local/bin/cache-ctrl` resolves to a readable host path under the derived local checkout root
- **WHEN** runtime environment variables and mounts are prepared
- **THEN** the wrapper MUST expose the local cache-ctrl binary at `/home/opencode/.local/bin/cache-ctrl`
- **AND** MUST give `/home/opencode/.local/bin` precedence over the image-installed cache-ctrl path for that run

#### Scenario: Forced local mode fails fast when prerequisites are missing or inconsistent
- **GIVEN** `CACHE_CTRL_LOCAL_MODE=force`
- **WHEN** the canonical skill link, local binary path, resolved targets, or derived checkout roots are missing, unreadable, inaccessible, or inconsistent
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics identify the failing input and required remediation

#### Scenario: Invalid CACHE_CTRL_LOCAL_MODE value fails preflight
- **GIVEN** an operator provides `CACHE_CTRL_LOCAL_MODE` with a value outside `auto`, `force`, `off`
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics list allowed values and remediation

#### Scenario: CACHE_CTRL_LOCAL_PATH must match the derived checkout root in active local mode
- **GIVEN** local cache-ctrl mode is active
- **AND** `CACHE_CTRL_LOCAL_PATH` is set
- **WHEN** wrapper preflight validation runs
- **THEN** `CACHE_CTRL_LOCAL_PATH` MUST exactly equal the derived absolute local cache-ctrl checkout root
- **AND** wrapper startup fails before `docker run` with actionable diagnostics when they differ

#### Scenario: Default runtime behavior remains unchanged outside local mode
- **GIVEN** `CACHE_CTRL_LOCAL_MODE=off`, or `auto` does not activate local cache-ctrl mode
- **WHEN** the wrapper prepares runtime mounts and command environment
- **THEN** it MUST NOT add cache-ctrl local-dev checkout mounts or local binary precedence
- **AND** the image-installed cache-ctrl runtime remains the default runtime behavior

### Requirement: Wrapper imports user la-briguade configuration from home directory
The system SHALL support importing user la-briguade configuration from `~/la_briguade` for Dockerized runs by mapping it to the same home-relative in-container path `~/la_briguade`, with default auto-import when present and non-fatal absence.

#### Scenario: User la-briguade configuration path is present
- **GIVEN** `~/la_briguade` exists on the host
- **WHEN** `bin/opencode-docker` prepares runtime mounts/configuration
- **THEN** the wrapper uses that path as the la-briguade configuration source
- **AND** maps it into the container at the same home-relative path `~/la_briguade`

#### Scenario: User la-briguade configuration path is absent
- **GIVEN** `~/la_briguade` does not exist on the host
- **WHEN** `bin/opencode-docker` prepares runtime mounts/configuration
- **THEN** startup continues without la-briguade config import mount
- **AND** absence is not treated as a startup failure

#### Scenario: Best-effort la-briguade configuration import handles invalid source path safely
- **GIVEN** `~/la_briguade` exists but the source path cannot be used for import due to invalid/inaccessible state
- **WHEN** wrapper validation runs before container startup
- **THEN** startup continues without adding a broken config import mount
- **AND** wrapper output includes actionable diagnostics describing the failing path and remediation

#### Scenario: Config import and plugin installation mode are treated as independent concerns
- **GIVEN** la-briguade user configuration import from `~/la_briguade` is enabled
- **WHEN** plugin installation mode is evaluated
- **THEN** config import behavior does not imply or replace plugin installation behavior
- **AND** local symlink plugin-dev mode is evaluated separately

### Requirement: Local symlink-based la-briguade plugin-development mode supports explicit env contract
The system SHALL support a local symlink-based la-briguade plugin-development mode that uses `LA_BRIGUADE_LOCAL_MODE` (`auto`, `force`, `off`) as the explicit mode contract and supports optional `LA_BRIGUADE_LOCAL_PATH` as an explicit assertion of the derived host local project root path.

#### Scenario: Auto-detect selects local symlink mode
- **GIVEN** the project plugin target path exists in the mounted workspace and `/workspace/plugins/index.js` is a symlink to a host-managed local build artifact
- **WHEN** the wrapper initializes la-briguade integration without explicit override
- **THEN** it enables local symlink mode automatically
- **AND** uses local linkage behavior without changing default command syntax

#### Scenario: Local-link mode mounts derived local project root from symlink target
- **GIVEN** local symlink mode is active
- **AND** `/workspace/plugins/index.js` points to a host absolute symlink target path
- **WHEN** the wrapper prepares Docker mounts
- **THEN** it derives a host local project root by resolving `<symlink-target>/../..`
- **AND** bind-mounts that derived host project-root directory into the same absolute path inside the container
- **AND** wrapper preflight fails with actionable diagnostics if `<symlink-target>/../..` cannot be resolved to an accessible directory

#### Scenario: Explicit override disables auto-detected local mode
- **GIVEN** local symlink mode would be auto-detected
- **WHEN** the operator sets `LA_BRIGUADE_LOCAL_MODE=off`
- **THEN** auto-detected local linkage is not used
- **AND** wrapper behavior follows the explicitly requested mode

#### Scenario: Explicit override forces local mode when auto-detect does not trigger
- **GIVEN** local symlink mode is not auto-detected
- **WHEN** the operator sets `LA_BRIGUADE_LOCAL_MODE=force`
- **THEN** the wrapper attempts local linkage behavior
- **AND** fails fast with actionable diagnostics if forced local linkage prerequisites are unmet

#### Scenario: Environment-variable override takes precedence over auto-detect
- **GIVEN** local symlink mode is auto-detected
- **WHEN** `LA_BRIGUADE_LOCAL_MODE` requests a different local-link mode outcome
- **THEN** wrapper mode selection follows the explicit environment value
- **AND** auto-detect outcome is ignored for that run

#### Scenario: Invalid LA_BRIGUADE_LOCAL_MODE value fails preflight
- **GIVEN** an operator provides `LA_BRIGUADE_LOCAL_MODE` with a value outside `auto`, `force`, `off`
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics list allowed values and remediation

#### Scenario: LA_BRIGUADE_LOCAL_PATH must match derived project root in active local mode
- **GIVEN** local-link mode resolves active (`LA_BRIGUADE_LOCAL_MODE=force` or `auto` with symlink match)
- **AND** `./plugins/index.js` resolves to an absolute host symlink target path
- **AND** `LA_BRIGUADE_LOCAL_PATH` is set
- **WHEN** wrapper preflight validation runs
- **THEN** `LA_BRIGUADE_LOCAL_PATH` must exactly equal the derived local project root path (`<resolved-symlink-target>/../..`)
- **AND** wrapper fails before `docker run` with actionable diagnostics when they differ

#### Scenario: Active local mode uses derived project root when LA_BRIGUADE_LOCAL_PATH is unset
- **GIVEN** local-link mode resolves active (`LA_BRIGUADE_LOCAL_MODE=force` or `auto` with symlink match)
- **AND** `./plugins/index.js` resolves to an absolute host symlink target path
- **AND** `LA_BRIGUADE_LOCAL_PATH` is unset
- **WHEN** Docker mounts are prepared
- **THEN** wrapper derives local project root at `<resolved-symlink-target>/../..` and uses it as local-link host source path
- **AND** bind-mounts that derived project-root path into the same absolute path in the container

#### Scenario: Invalid LA_BRIGUADE_LOCAL_PATH fails in forced local mode
- **GIVEN** `LA_BRIGUADE_LOCAL_MODE=force`
- **AND** `LA_BRIGUADE_LOCAL_PATH` is set but does not exist or is inaccessible
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics identify `LA_BRIGUADE_LOCAL_PATH` and remediation

#### Scenario: LA_BRIGUADE_LOCAL_PATH is ignored when local mode is off
- **GIVEN** `LA_BRIGUADE_LOCAL_MODE=off`
- **AND** `LA_BRIGUADE_LOCAL_PATH` is set
- **WHEN** wrapper prepares runtime configuration
- **THEN** local-link mode remains disabled
- **AND** no local-link mount is added from `LA_BRIGUADE_LOCAL_PATH`

#### Scenario: Forced local mode validates expected plugin target path
- **GIVEN** local plugin-dev mode is explicitly forced
- **WHEN** `/workspace/plugins/index.js` is missing or is not a symlink
- **THEN** wrapper preflight fails before container startup
- **AND** diagnostic output names the expected plugin target path and remediation to create/update the symlink

### Requirement: Regular npm la-briguade installation remains repo-change neutral
The system SHALL keep regular/release la-briguade plugin installation behavior unchanged and SHALL NOT require additional repository-side wrapper/image configuration solely for that standard installation mode.

#### Scenario: Standard npm-installed la-briguade is used
- **GIVEN** la-briguade plugin is installed through regular/release OpenCode plugin configuration
- **WHEN** Dockerized OpenCode workflow runs
- **THEN** no additional repository-side setup is required beyond existing baseline workflow
- **AND** existing OpenCode plugin-array installation behavior remains unchanged
- **AND** existing persistence and execution mode contracts remain intact

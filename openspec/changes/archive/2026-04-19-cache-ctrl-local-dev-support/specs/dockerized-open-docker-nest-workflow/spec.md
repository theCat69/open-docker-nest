## ADDED Requirements

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

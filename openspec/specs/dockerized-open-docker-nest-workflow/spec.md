## Purpose

Define the Dockerized OpenCode workflow contract for wrapper behavior, runtime modes, persistence, parity validation, and local development integration expectations.

## Requirements

### Requirement: Dockerized OpenCode workflow via host wrapper
The system SHALL define a Dockerized workflow that is invoked from a host-side wrapper and runs against a host-mounted project directory.

#### Scenario: Wrapper mounts host project by default
- **GIVEN** a developer runs `bin/open-docker-nest.js` from inside a project directory
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
- **GIVEN** a developer invokes `bin/open-docker-nest.js --shell`
- **WHEN** the container starts
- **THEN** an interactive shell session is opened in the mounted project context

#### Scenario: Direct command mode
- **GIVEN** a developer invokes `bin/open-docker-nest.js -- <command> ...args`
- **WHEN** the wrapper executes the container
- **THEN** the provided command and arguments are passed through unchanged

#### Scenario: Default command mode
- **GIVEN** a developer invokes `bin/open-docker-nest.js` with no command arguments and no `--shell`
- **WHEN** the wrapper runs
- **THEN** the container executes `opencode` as the default command

### Requirement: Image selection provenance and default-image warning behavior
The system SHALL track image selection provenance as `default`, `environment`, or `cli`, and SHALL scope canonical default-image warnings to implicit default-image runs only.

#### Scenario: Image selection provenance is explicit and ordered
- **GIVEN** wrapper startup resolves the container image reference
- **WHEN** no override is supplied
- **THEN** provenance is `default` and the canonical default image reference is used
- **AND** when `OPEN_DOCKER_NEST_IMAGE` is set, provenance is `environment`
- **AND** when `--image <image-ref>` is supplied, provenance is `cli`

#### Scenario: Implicit default-image run may emit advisory canonical-image warnings
- **GIVEN** image provenance is `default`
- **WHEN** startup performs local and short best-effort canonical-image checks
- **THEN** the wrapper MAY warn if the canonical default image is missing locally
- **AND** the wrapper MAY warn if the local canonical default image appears outdated
- **AND** these warnings are advisory and do not block startup
- **AND** the wrapper does not auto-pull images

#### Scenario: Explicit image selection bypasses canonical default-image warning path
- **GIVEN** image provenance is `environment` or `cli`
- **WHEN** startup runs
- **THEN** canonical default-image missing/outdated warnings are not emitted for that run

### Requirement: Explicit host-docker mode enables Docker-aware in-container sessions
The system SHALL provide an explicit `--host-docker` mode that grants host Docker daemon access to the launched in-container session only when a usable local Unix-socket daemon is available and the active Docker context is the default/local context.

#### Scenario: Host-docker mode is restricted to supported local Unix-socket host/context
- **GIVEN** a developer invokes `bin/open-docker-nest.js --host-docker`
- **WHEN** `DOCKER_HOST` is non-local, `DOCKER_CONTEXT` is non-default, or `/var/run/docker.sock` is missing/inaccessible/unusable
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics identify the unsupported host/context or socket prerequisite with remediation

#### Scenario: Host-docker mode mounts host socket only when explicitly active
- **GIVEN** host-docker mode is active on a supported local Unix-socket host/context
- **WHEN** runtime planning prepares docker arguments
- **THEN** `/var/run/docker.sock` is bind-mounted into the container for that run
- **AND** in-container Docker client environment targets `unix:///var/run/docker.sock`
- **AND** non-host-docker runs do not add that host Docker socket bridge

#### Scenario: Native Windows host invocation is rejected for host-docker mode in this slice
- **GIVEN** a developer invokes `bin/open-docker-nest.js --host-docker` from a native Windows host
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics state that Windows named-pipe/Docker Desktop bridging is follow-up work for host-docker mode

#### Scenario: Linux invocation inside WSL follows Linux host-docker path when local socket exists
- **GIVEN** a developer invokes `bin/open-docker-nest.js --host-docker` from Linux inside WSL
- **AND** a usable local `/var/run/docker.sock` is available in that Linux environment
- **WHEN** preflight validation and runtime planning run
- **THEN** host-docker mode uses the same local Unix-socket validation and mount flow as other Linux runs

#### Scenario: Host-docker mode does not introduce a generic host-command bridge
- **GIVEN** a developer invokes `bin/open-docker-nest.js --host-docker`
- **WHEN** runtime planning and execution run
- **THEN** command execution remains in-container through the standard entrypoint
- **AND** the wrapper does not execute session commands directly on the host

#### Scenario: Host-docker mode does not forward broader host Docker config or credentials in this slice
- **GIVEN** a developer invokes `bin/open-docker-nest.js --host-docker`
- **WHEN** runtime planning prepares mounts and environment
- **THEN** the wrapper does not promise or add host Docker credential/config/context forwarding beyond the supported local daemon bridge

#### Scenario: Host-docker mode does not translate sibling-container bind-mount source paths in this slice
- **GIVEN** a developer invokes `bin/open-docker-nest.js --host-docker`
- **WHEN** Docker workloads launched inside the session reference in-container `/workspace/...` paths as bind-mount sources
- **THEN** the workflow does not rewrite those paths into host-visible paths
- **AND** bind-mount path translation remains out of scope for this slice

### Requirement: Docker image includes Docker CLI for host-docker daemon workflows
The system SHALL include Docker CLI in the container image so in-container host-docker workflows can reach the mounted host daemon without host-binary bind mounts.

#### Scenario: Docker CLI is available in-container for host-docker workflows
- **GIVEN** the repository Docker image is built successfully
- **WHEN** a host-docker run starts inside the container
- **THEN** Docker CLI is available in the in-container command environment
- **AND** repository automation can query host-daemon server data via the mounted socket

#### Scenario: Docker CLI installation failure stops image build
- **GIVEN** Docker CLI cannot be installed during Docker build
- **WHEN** the image build runs
- **THEN** the build fails non-zero
- **AND** host-docker mode is not shipped with a partial runtime dependency state

### Requirement: Docker image support is limited to amd64 with Java 21 by default, Java 25 opt-in, and a pinned Rust runtime toolchain
The system SHALL support amd64 container images only, and SHALL install both Java 21 and Java 25 plus a pinned Rust toolchain so non-root wrapper sessions can use both toolchains without runtime bootstrap steps, with Java 21 as the default JDK and Java 25 selectable explicitly per run.

#### Scenario: Java 21 default and Rust are available to non-root opencode runtime
- **GIVEN** the repository Docker image is built successfully
- **WHEN** a container is started through `bin/open-docker-nest.js` as the remapped non-root runtime user
- **THEN** `java` and `javac` from Java 21 are available in the runtime command environment by default
- **AND** `rustc` and `cargo` are available in the runtime command environment

#### Scenario: Java 25 can be selected explicitly for a container run
- **GIVEN** the repository Docker image is built successfully
- **WHEN** a developer invokes `bin/open-docker-nest.js --java 25 -- <command>`
- **THEN** `java`, `javac`, and `JAVA_HOME` resolve to Java 25 for that run
- **AND** Java 21 remains installed in the image

#### Scenario: Non-amd64 image builds are rejected
- **GIVEN** the repository Docker image is built for a non-amd64 architecture
- **WHEN** image build validation runs
- **THEN** the build fails non-zero with unsupported architecture guidance

#### Scenario: Java installation or Rust installation failure stops image build
- **GIVEN** Java 21, Java 25, or Rust cannot be installed during Docker build
- **WHEN** the image build executes
- **THEN** the build fails non-zero
- **AND** runtime execution does not proceed with a partial toolchain dependency state

### Requirement: Minimum command-parity smoke validation
The system SHALL define a minimum smoke set that demonstrates parity for key OpenCode/OpenSpec workflows through the Docker wrapper.

#### Scenario: Required parity smoke commands
- **GIVEN** a repository configured with OpenCode/OpenSpec commands
- **WHEN** parity smoke validation is executed via `bin/open-docker-nest.js`
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
- **WHEN** a container is started through `bin/open-docker-nest.js`
- **THEN** cache-ctrl is available to the runtime command environment
- **AND** no additional startup installation step is required to use it

#### Scenario: Cache-ctrl installation failure stops image build
- **GIVEN** cache-ctrl cannot be installed during Docker build
- **WHEN** the image build executes
- **THEN** the build fails non-zero
- **AND** runtime execution does not proceed with a partial dependency state

### Requirement: Docker image includes pinned Playwright CLI with bundled browser support
The system SHALL install a pinned Playwright CLI release in the Docker image and SHALL bundle a documented browser set that is readable by non-root runtime sessions without startup-time browser installation.

#### Scenario: Pinned Playwright build arg is resolved and applied in publish workflow
- **GIVEN** the Docker publish workflow resolves pinned build-tool versions
- **WHEN** build args are generated and passed to Docker build
- **THEN** `PLAYWRIGHT_VERSION` is included in resolved build args
- **AND** workflow metadata/summary expose the resolved Playwright version for traceability

#### Scenario: Playwright CLI and bundled Chromium are available to non-root runtime user
- **GIVEN** the repository Docker image is built successfully
- **WHEN** a container is started through `bin/open-docker-nest.js` as the remapped non-root runtime user
- **THEN** `playwright --version` succeeds
- **AND** Chromium can be launched headlessly without additional runtime browser install steps

#### Scenario: Playwright install or browser bundle install failure stops image build
- **GIVEN** pinned Playwright CLI install or bundled browser install fails during Docker build
- **WHEN** image build executes
- **THEN** the build fails non-zero
- **AND** runtime execution is not shipped with a partial Playwright dependency state

#### Scenario: Browser bundle scope is intentionally constrained for image-size control
- **GIVEN** the repository Docker image is built in this slice
- **WHEN** Playwright browser support is installed
- **THEN** the image bundles Chromium support only
- **AND** documentation explicitly records this scope choice as an image-size/coupling trade-off

#### Scenario: Playwright browser bundle path and non-root permission contract are documented
- **GIVEN** the repository Docker image pins Playwright with bundled browser artifacts
- **WHEN** maintainers read Docker workflow documentation
- **THEN** documentation states the fixed `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright` contract
- **AND** documentation states that `/ms-playwright` is expected to remain readable/executable for non-root runtime sessions

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
- **WHEN** `bin/open-docker-nest.js` prepares runtime mounts/configuration
- **THEN** the wrapper uses that path as the la-briguade configuration source
- **AND** maps it into the container at the same home-relative path `~/la_briguade`

#### Scenario: User la-briguade configuration path is absent
- **GIVEN** `~/la_briguade` does not exist on the host
- **WHEN** `bin/open-docker-nest.js` prepares runtime mounts/configuration
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
- **GIVEN** the host OpenCode config plugin entry `~/.config/opencode/plugins/index.js` is a symlink to a host-managed local build artifact
- **WHEN** the wrapper initializes la-briguade integration without explicit override
- **THEN** it enables local symlink mode automatically
- **AND** uses local linkage behavior without changing default command syntax

#### Scenario: Local-link mode mounts derived local project root from symlink target
- **GIVEN** local symlink mode is active
- **AND** `~/.config/opencode/plugins/index.js` points to a host absolute symlink target path
- **WHEN** the wrapper prepares Docker mounts
- **THEN** it derives a host local project root by resolving `<symlink-target>/../..`
- **AND** bind-mounts that derived host project-root directory into the same absolute path inside the container
- **AND** wrapper preflight fails with actionable diagnostics if `<symlink-target>/../..` cannot be resolved to an accessible directory

#### Scenario: Active local-link mode requires dist entry target shape
- **GIVEN** local symlink mode is active
- **AND** `~/.config/opencode/plugins/index.js` resolves to a host absolute symlink target path
- **WHEN** wrapper preflight validation runs
- **THEN** the resolved target MUST be `<la-briguade-repo>/dist/index.js`
- **AND** wrapper startup fails before `docker run` with actionable diagnostics when target shape differs

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
- **AND** `~/.config/opencode/plugins/index.js` resolves to an absolute host symlink target path
- **AND** `LA_BRIGUADE_LOCAL_PATH` is set
- **WHEN** wrapper preflight validation runs
- **THEN** `LA_BRIGUADE_LOCAL_PATH` must exactly equal the derived local project root path (`<resolved-symlink-target>/../..`)
- **AND** wrapper fails before `docker run` with actionable diagnostics when they differ

#### Scenario: Active local mode uses derived project root when LA_BRIGUADE_LOCAL_PATH is unset
- **GIVEN** local-link mode resolves active (`LA_BRIGUADE_LOCAL_MODE=force` or `auto` with symlink match)
- **AND** `~/.config/opencode/plugins/index.js` resolves to an absolute host symlink target path
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
- **WHEN** `~/.config/opencode/plugins/index.js` is missing or is not a symlink
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

### Requirement: Layered open-docker-nest config supports validated extra container environment values
The system SHALL support a minimal config surface using `open-docker-nest.json` at both user and project levels, with merge precedence defaults < user < project and Zod as the schema source of truth for wrapper-consumed config.

#### Scenario: Wrapper loads and merges user and project config levels
- **GIVEN** `~/.config/open-docker-nest/open-docker-nest.json` and/or `<project-root>/open-docker-nest.json` exist
- **WHEN** wrapper startup validation runs
- **THEN** each present config file is validated against the Zod-defined project schema
- **AND** merged config is resolved with precedence defaults < user < project
- **AND** `extraContainerEnvironment` key/value entries are passed into docker runtime planning as plain validated env values

#### Scenario: JSONC comments are accepted in .json config files
- **GIVEN** either config file includes JSONC comments while retaining the `.json` extension
- **WHEN** wrapper startup validation runs
- **THEN** config parsing succeeds when the remaining JSON payload is valid

#### Scenario: Exact `{env:ENV_VAR_NAME}` placeholders resolve from host environment
- **GIVEN** project config defines `extraContainerEnvironment` values with exact placeholder syntax `{env:ENV_VAR_NAME}` (no surrounding whitespace)
- **WHEN** wrapper resolves project config before runtime planning
- **THEN** each placeholder resolves from the host process environment
- **AND** resolved values are injected as standard container env entries

#### Scenario: Project-config env values are exposed without embedding secret values in docker run arguments
- **GIVEN** project config provides one or more `extraContainerEnvironment` entries (literal or resolved from `{env:ENV_VAR_NAME}`)
- **WHEN** runtime planning builds docker invocation arguments
- **THEN** each configured key is added as `--env <KEY>` argument without inline value payload
- **AND** the corresponding value is supplied from the wrapper process environment for Docker execution
- **AND** secret values are not embedded in `docker run` argument strings

#### Scenario: Malformed placeholder syntax fails fast
- **GIVEN** project config contains malformed placeholder syntax for an env value (not exact `{env:ENV_VAR_NAME}`)
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics identify malformed placeholder syntax and remediation

#### Scenario: Missing host env variable reference fails fast
- **GIVEN** project config contains `{env:ENV_VAR_NAME}` for a host env variable that is not set
- **WHEN** wrapper resolves config values
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics identify the missing host env variable and remediation

#### Scenario: JSON Schema generation remains off runtime hot path
- **GIVEN** project config schema is defined in Zod
- **WHEN** schema generation is requested through explicit tooling command
- **THEN** JSON Schema is generated from the Zod source of truth
- **AND** generated JSON Schema is for editor/tooling integration
- **AND** runtime startup and runtime planning do not require JSON Schema generation to execute

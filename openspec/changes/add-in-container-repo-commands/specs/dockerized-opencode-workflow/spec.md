## ADDED Requirements

### Requirement: Explicit session-level host Docker mode enables Docker-aware in-container sessions
The system SHALL provide an explicit `--host-docker` wrapper flag that grants host Docker daemon access to the entire launched in-container session only when a usable local Unix-socket daemon is available and the active Docker context is the default/local context.

#### Scenario: Default OpenCode session gains host Docker access only when flagged
- **GIVEN** a developer invokes `bin/opencode-docker.js --host-docker` on a supported host
- **WHEN** the wrapper starts the container
- **THEN** the standard OpenCode session starts inside `/workspace`
- **AND** commands launched later from inside that session can use Docker through the configured in-container client and daemon bridge
- **AND** execution still occurs through the standard container entrypoint as the remapped non-root runtime user

#### Scenario: Shell sessions may opt in to host Docker access
- **GIVEN** a developer invokes `bin/opencode-docker.js --shell --host-docker` on a supported host
- **WHEN** the wrapper starts the container
- **THEN** the interactive shell session starts with host Docker available inside the container
- **AND** the flag does not otherwise change shell-session startup behavior

#### Scenario: Direct pass-through sessions may opt in to host Docker access
- **GIVEN** a developer invokes `bin/opencode-docker.js --host-docker -- <command> ...args` on a supported host
- **WHEN** the wrapper starts the container
- **THEN** the provided command and arguments run unchanged inside the container
- **AND** that session has host Docker access for the duration of the run

#### Scenario: Existing modes keep current behavior when host Docker mode is inactive
- **GIVEN** a developer uses default mode, `--shell`, or normal direct pass-through without `--host-docker`
- **WHEN** the wrapper prepares runtime state
- **THEN** the existing command-selection and runtime behavior remain unchanged
- **AND** no host Docker daemon bridge is added for that run

### Requirement: Host Docker mode exposes the daemon only through an explicit supported local bridge
The system SHALL expose host Docker daemon access for `--host-docker` sessions only by explicit supported local daemon bridging, and SHALL NOT introduce a generic host-command execution path.

#### Scenario: Active host Docker mode mounts the local Unix socket on supported hosts
- **GIVEN** `--host-docker` is active on a supported host with a usable local Docker daemon socket at `/var/run/docker.sock`
- **WHEN** the wrapper builds the runtime plan
- **THEN** it bind-mounts `/var/run/docker.sock` into the container at the same path for that run
- **AND** it configures the in-container Docker client to target that mounted local socket
- **AND** the wrapper does not execute session commands on the host outside the container

#### Scenario: Inactive host Docker mode keeps host Docker daemon access unavailable
- **GIVEN** `--host-docker` is not active
- **WHEN** the wrapper builds the runtime plan
- **THEN** it does not mount `/var/run/docker.sock` into the container
- **AND** host Docker daemon access is not newly exposed inside the runtime

#### Scenario: Host Docker mode does not implicitly forward broader Docker config
- **GIVEN** `--host-docker` is active
- **WHEN** the wrapper prepares the runtime environment for this change scope
- **THEN** it does not promise or silently add host Docker credential/config/context forwarding beyond the supported local daemon bridge

#### Scenario: Host Docker mode does not translate sibling-container bind-mount paths
- **GIVEN** `--host-docker` is active
- **WHEN** a user runs Docker workloads from inside the session that reference in-container `/workspace/...` paths as host bind-mount sources
- **THEN** the workflow does not rewrite those paths into host-visible paths in this slice
- **AND** documentation identifies sibling-container path translation as an explicit non-goal

### Requirement: Host Docker mode enforces supported platform and prerequisite diagnostics
The system SHALL fail fast when `--host-docker` is requested on unsupported hosts or without the required local Docker daemon prerequisites.

#### Scenario: Linux invocation inside WSL is supported when local socket prerequisites are met
- **GIVEN** a developer invokes `--host-docker` from a Linux environment inside WSL
- **AND** a usable local Docker socket path is available to that Linux environment
- **WHEN** wrapper preflight validation and runtime planning run
- **THEN** the invocation is treated as a supported Linux host path for this slice
- **AND** the standard local-socket validation and mounting behavior applies

#### Scenario: Native Windows host invocation is rejected in the first slice
- **GIVEN** a developer invokes `--host-docker` from a native Windows host environment
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics state that native Windows host-docker support is not shipped in this slice
- **AND** diagnostics identify Windows named-pipe/Docker Desktop bridging as follow-up work rather than silently falling back

#### Scenario: Missing or inaccessible local Docker socket is rejected
- **GIVEN** a developer invokes `--host-docker` on a Unix-like host
- **WHEN** `/var/run/docker.sock` is missing, unreadable, or otherwise unusable for bind mounting
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics identify the failing prerequisite and remediation

#### Scenario: Unsupported Docker host endpoint is rejected
- **GIVEN** a developer invokes `--host-docker` with host Docker configured through an unsupported non-local endpoint
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics state that the mode currently supports only local Unix-socket Docker hosts

#### Scenario: Unsupported Docker context selection is rejected
- **GIVEN** a developer invokes `--host-docker` with `DOCKER_CONTEXT` selecting a non-default or remote context
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics state that the mode currently supports only default local Unix-socket Docker context

### Requirement: Docker image includes Docker CLI for host Docker sessions
The system SHALL include Docker CLI in the container image so `--host-docker` workflows can talk to the mounted host Docker daemon without relying on host-command passthrough.

#### Scenario: Docker CLI is available in-container for host Docker workflows
- **GIVEN** the repository Docker image is built successfully
- **WHEN** a `--host-docker` session starts inside the container
- **THEN** Docker CLI is available in the in-container command environment
- **AND** in-session tooling can target the mounted host Docker daemon through that client

#### Scenario: Docker CLI installation failure stops image build
- **GIVEN** Docker CLI cannot be installed during image build
- **WHEN** the Docker build runs
- **THEN** the image build fails non-zero
- **AND** `--host-docker` mode is not shipped with a partial runtime dependency state

## ADDED Requirements

### Requirement: Explicit repository-command mode enables in-container repo commands with host Docker daemon access
The system SHALL provide an explicit `--repo-command` wrapper mode for running repository-local commands inside the mounted project workspace while allowing those commands to use the host Docker daemon on supported Unix-like hosts.

#### Scenario: Repo-command mode runs inside the mounted workspace
- **GIVEN** a developer invokes `bin/opencode-docker.js --repo-command -- <command> ...args` on a supported host
- **WHEN** the wrapper starts the container
- **THEN** the requested command runs inside `/workspace`
- **AND** execution still occurs through the standard container entrypoint as the remapped non-root runtime user

#### Scenario: Repo-command mode requires an explicit command payload
- **GIVEN** a developer invokes `bin/opencode-docker.js --repo-command` without command tokens after `--`
- **WHEN** CLI validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics explain the required repo-command invocation shape

#### Scenario: Existing modes keep current behavior when repo-command mode is inactive
- **GIVEN** a developer uses default mode, `--shell`, or normal direct pass-through without `--repo-command`
- **WHEN** the wrapper prepares runtime state
- **THEN** the existing command-selection and runtime behavior remain unchanged
- **AND** no host Docker daemon bridge is added for that run

### Requirement: Repo-command mode exposes the host Docker daemon only through an explicit Unix-socket bridge
The system SHALL expose host Docker daemon access for repo-command runs only by opt-in Unix-socket mounting on supported Unix-like hosts, and SHALL NOT introduce a generic host-command execution path.

#### Scenario: Active repo-command mode mounts the host Docker socket
- **GIVEN** repo-command mode is active on a supported Unix-like host with a usable local Docker daemon socket at `/var/run/docker.sock`
- **WHEN** the wrapper builds the runtime plan
- **THEN** it bind-mounts `/var/run/docker.sock` into the container at the same path for that run
- **AND** the wrapper does not execute the repo command on the host outside the container

#### Scenario: Inactive repo-command mode keeps host Docker daemon access unavailable
- **GIVEN** repo-command mode is not active
- **WHEN** the wrapper builds the runtime plan
- **THEN** it does not mount `/var/run/docker.sock` into the container
- **AND** host Docker daemon access is not newly exposed inside the runtime

### Requirement: Repo-command mode enforces supported platform and prerequisite diagnostics
The system SHALL fail fast when repo-command mode is requested on unsupported hosts or without the required local Docker daemon prerequisites.

#### Scenario: Unsupported Windows host is rejected
- **GIVEN** a developer invokes repo-command mode on Windows
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics state that repo-command mode is not supported on Windows in this change

#### Scenario: Missing or inaccessible local Docker socket is rejected
- **GIVEN** a developer invokes repo-command mode on a Unix-like host
- **WHEN** `/var/run/docker.sock` is missing, unreadable, or otherwise unusable for bind mounting
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics identify the failing prerequisite and remediation

#### Scenario: Unsupported Docker host endpoint is rejected
- **GIVEN** a developer invokes repo-command mode with host Docker configured through an unsupported non-local endpoint
- **WHEN** wrapper preflight validation runs
- **THEN** wrapper startup fails before `docker run`
- **AND** diagnostics state that the mode currently supports only local Unix-socket Docker hosts

### Requirement: Docker image includes Docker CLI for repo-command runs
The system SHALL include Docker CLI in the container image so repo-command workflows can talk to the mounted host Docker daemon without relying on host-command passthrough.

#### Scenario: Docker CLI is available in-container for repo-command workflows
- **GIVEN** the repository Docker image is built successfully
- **WHEN** a repo-command run starts inside the container
- **THEN** Docker CLI is available in the in-container command environment
- **AND** repo-local tooling can target the mounted host Docker daemon through that client

#### Scenario: Docker CLI installation failure stops image build
- **GIVEN** Docker CLI cannot be installed during image build
- **WHEN** the Docker build runs
- **THEN** the image build fails non-zero
- **AND** repo-command mode is not shipped with a partial runtime dependency state

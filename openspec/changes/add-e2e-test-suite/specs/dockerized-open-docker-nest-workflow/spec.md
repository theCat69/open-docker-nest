## ADDED Requirements

### Requirement: Dockerized workflow includes Bun E2E happy-path smoke coverage
The system SHALL include Bun-based E2E smoke validation for Dockerized OpenCode workflow features using low-brittleness happy-path scenarios.

#### Scenario: E2E smoke suite covers critical workflow features
- **GIVEN** representative workflow-facing features in the Dockerized OpenCode path
- **WHEN** the E2E suite is maintained
- **THEN** each covered feature area includes a few happy-path smoke scenarios that validate expected user-visible outcomes
- **AND** scenario design favors stable contract checks over implementation-detail assertions

#### Scenario: E2E minimum smoke anchors preserve wrapper execution-mode parity
- **GIVEN** minimum E2E coverage is kept intentionally lightweight
- **WHEN** Dockerized workflow happy-path E2E scenarios are selected
- **THEN** the suite includes representative happy-path coverage for interactive shell mode (`bin/open-docker-nest --shell`), default command mode (`bin/open-docker-nest`), and command pass-through mode (`bin/open-docker-nest -- <command> ...args`)
- **AND** the suite avoids broad negative-path expansion by default

#### Scenario: E2E minimum smoke anchors preserve one representative wrapper-invoked OpenCode CLI/help command
- **GIVEN** wrapper-invoked OpenCode CLI/help smoke coverage is intentionally minimal for this capability
- **WHEN** workflow-level happy-path E2E scenarios are selected
- **THEN** representative smoke coverage invokes one OpenCode CLI/help command through `bin/open-docker-nest` (`bin/open-docker-nest -- opencode --help`)
- **AND** assertions validate successful completion and externally visible workflow outcomes

#### Scenario: E2E smoke suite runs with the standard repository command
- **WHEN** workflow-level E2E validation is executed
- **THEN** contributors run `bun run test:e2e` as the standard suite entrypoint
- **AND** the command is treated as part of the expected validation workflow for this capability

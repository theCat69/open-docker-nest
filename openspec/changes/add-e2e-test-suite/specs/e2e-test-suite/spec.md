## ADDED Requirements

### Requirement: Bun-based E2E suite is the canonical smoke test workflow
The system SHALL define a Bun + Vitest end-to-end test suite as the canonical repository workflow for happy-path E2E smoke validation.

#### Scenario: E2E suite executes through the standard command
- **WHEN** a contributor runs `bun run test:e2e`
- **THEN** the repository executes E2E tests using the dedicated E2E Vitest configuration
- **AND** test discovery is limited to E2E test files under `e2e/tests/`

### Requirement: E2E coverage is feature-oriented and happy-path focused
The system SHALL require a small set of representative happy-path E2E scenarios per feature area and SHALL NOT require broad error-path coverage in this suite.

#### Scenario: Representative happy-path selection per feature
- **GIVEN** a feature area with externally visible workflow behavior
- **WHEN** E2E tests are defined for that feature area
- **THEN** the suite includes only a few representative happy-path scenarios for that behavior
- **AND** does not expand into exhaustive negative-path matrices by default

#### Scenario: Wrapper-invoked OpenCode CLI/help smoke coverage uses one representative command
- **GIVEN** wrapper-invoked OpenCode CLI/help smoke coverage in this suite is intentionally scoped down
- **WHEN** Docker wrapper E2E smoke validation runs through `bin/open-docker-nest`
- **THEN** one representative command (`bin/open-docker-nest -- opencode --help`) is covered
- **AND** full propose/explore/apply/archive workflow coverage is out of scope for this change

### Requirement: E2E assertions prioritize low brittleness
The system SHALL structure E2E assertions around stable external outcomes rather than internal implementation details.

#### Scenario: Smoke assertions validate contract outcomes
- **WHEN** an E2E scenario validates a workflow
- **THEN** the test asserts durable contract outcomes such as successful command completion and expected externally visible artifacts/state
- **AND** avoids assertions that tightly couple to transient internal output formatting or implementation internals

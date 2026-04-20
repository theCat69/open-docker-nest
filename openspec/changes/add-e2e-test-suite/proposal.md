## Why

The project currently lacks a structured, maintainable end-to-end smoke suite that validates core happy-path behavior across the Docker wrapper and one representative wrapper-invoked OpenCode CLI/help anchor. Adding a Bun-based E2E suite now reduces regression risk while preserving fast feedback in daily development.

## What Changes

- Introduce an explicit E2E testing capability and expectations for low-brittleness happy-path smoke coverage.
- Define suite organization and test-selection guidance so each feature area has a small number of representative happy-path scenarios.
- Standardize the execution workflow around the existing `bun run test:e2e` command and current E2E configuration.
- Add implementation-ready planning/tasks for creating and maintaining representative E2E tests without expanding into broad error-path coverage.
- Clarify the minimum intended smoke anchors: interactive shell mode (`--shell`), default command mode, command pass-through mode, and one representative wrapper-invoked OpenCode CLI/help command (`bin/open-docker-nest -- opencode --help`).

## Capabilities

### New Capabilities

- `e2e-test-suite`: Defines the required happy-path E2E smoke-testing strategy, execution command, and maintenance expectations for Bun-based E2E coverage.

### Modified Capabilities

- `dockerized-open-docker-nest-workflow`: Add requirement-level expectations that critical wrapper/OpenSpec flows are covered by representative happy-path E2E smoke tests and run via the established E2E command workflow.

## Impact

- Affected areas: `e2e/` tests and configuration, `package.json` scripts, and OpenSpec artifacts under `openspec/`.
- Runtime behavior impact: none; this change adds/clarifies test and spec artifacts only.
- Process impact: strengthens spec-first quality gates by making E2E smoke expectations explicit and repeatable.

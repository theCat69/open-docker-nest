---
name: project-test
description: Testing guidance for Docker wrapper, container entrypoint, and OpenSpec parity checks.
---

## Scope
Verification of wrapper behavior, container startup modes, and OpenSpec command parity in Dockerized runs.

## Invariants
- Default command path launches `opencode`.
- Shell mode and pass-through command modes remain functional.
- Host ownership behavior is preserved for workspace writes.

## Test Framework
- No dedicated unit test framework detected.
- Primary validation model: integration smoke checks via `bin/opencode-docker` and OpenSpec command flows.

## Test Location & File Naming
- Existing verification is documented in `docs/docker-workflow.md` and OpenSpec tasks/spec artifacts.
- If adding test scripts, place under `bin/` or `docker/` with clear purpose names (kebab-case).

## Writing Tests
- Prefer behavior-first checks: prerequisites, mount creation, default command behavior, and mode switching.
- Cover negative paths: missing Docker, invalid project path, non-numeric UID/GID.

## Mocking & Fixtures
- Prefer real Docker invocation for parity checks in this repo.
- Keep fixtures minimal; rely on temporary directories when validating mount/persistence logic.

## Coverage Requirements
- No numeric threshold defined.
- Required practical coverage: build success + command parity (`help`, `opsx-propose`, `opsx-explore`, `opsx-apply`, `opsx-archive`).

## Running Tests
- `docker build -t opencode-docker:latest .`
- `bin/opencode-docker -- opencode --help`
- `bin/opencode-docker -- opencode run "/opsx-propose demo-change"`
- `bin/opencode-docker -- opencode run "/opsx-explore demo-change"`
- `bin/opencode-docker -- opencode run "/opsx-apply demo-change"`
- `bin/opencode-docker -- opencode run "/opsx-archive demo-change"`

## Validation Checklist
- Build and all parity commands complete without regressions.
- Fail-fast messages remain actionable for known error states.
- No root-owned files appear in mounted project after runs.

## Failure Handling
- Stop at first failing parity command and capture exact invocation + stderr.
- Distinguish host setup failures from container logic failures before patching scripts.

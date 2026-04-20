## 1. E2E Suite Baseline and Structure

- [x] 1.1 Confirm `e2e/vitest.config.ts` and `bun run test:e2e` remain the canonical E2E execution path for this change.
- [x] 1.2 Replace the placeholder/sample E2E test with workflow-oriented test files under `e2e/tests/` using descriptive, feature-aligned naming.
- [x] 1.3 Define a small, explicit feature-area coverage map in test organization so each targeted feature has only a few representative happy-path scenarios.

## 2. Happy-Path Scenario Implementation

- [x] 2.1 Add representative happy-path E2E tests for core Docker wrapper invocation flows: interactive shell mode (`--shell`), default command path, and command pass-through path.
- [x] 2.2 Add representative happy-path E2E smoke coverage for one wrapper-invoked OpenCode CLI/help command explicitly invoked through `bin/open-docker-nest` (`bin/open-docker-nest -- opencode --help`); full propose/explore/apply/archive workflow coverage remains out of scope.
- [x] 2.3 Ensure scenario assertions validate stable external outcomes (success/completion and expected artifacts/state) rather than internal implementation details.

## 3. Low-Brittleness and Maintenance Guards

- [x] 3.1 Audit E2E tests to remove brittle assertions tied to transient output formatting or timing-sensitive internals.
- [x] 3.2 Keep E2E scope constrained to happy-path smoke behavior and explicitly avoid broad error-path matrix expansion.
- [x] 3.3 Add concise maintainer notes in E2E test files describing scenario intent and feature contract being protected.

## 4. Validation and Workflow Integration

- [x] 4.1 Run `bun run test:e2e` and confirm the suite passes with the updated representative happy-path coverage.
- [x] 4.2 Verify the updated E2E suite can run alongside existing project validation flow without changing Docker wrapper runtime behavior.
- [x] 4.3 Record final verification results in the change workflow before apply/archive.

### Verification Results (2026-04-19)

- `bun run test:e2e` ✅ passed (`2` files, `4` tests)
- `bun run test` ✅ passed (`1` file, `1` test)
- `bun run build` ✅ passed (TypeScript noEmit)
- Wrapper behavior spot-checks remained unchanged during implementation:
  - `bin/open-docker-nest -- opencode --help` ✅
  - `printf '...\n' | script -q -c "bin/open-docker-nest --shell" /dev/null` ✅
  - `timeout 8 bin/open-docker-nest </dev/null` ✅ (expected timeout behavior)
  - `bin/open-docker-nest -- /usr/bin/env bash -lc 'printf ...' passthrough-check alpha beta` ✅

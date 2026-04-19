## Context

The repository already has Bun, TypeScript, Vitest, a dedicated E2E Vitest config (`e2e/vitest.config.ts`), an E2E test location (`e2e/tests/`), and an executable script (`bun run test:e2e`). However, there is no explicit OpenSpec contract defining what E2E coverage is required, how tests should be selected, and how to keep the suite low-brittleness as wrapper and workflow behavior evolves.

This change defines implementation-ready OpenSpec artifacts for adding lightweight E2E smoke tests. It preserves current Docker wrapper/runtime behavior and reinforces a spec-first implementation workflow while planning concrete test additions.

## Goals / Non-Goals

**Goals:**
- Define a stable E2E suite structure for Bun + Vitest in this repository.
- Specify a happy-path-only scenario selection strategy with a few representative tests per feature area.
- Define maintenance principles that keep the suite reliable and resistant to brittle assertions.
- Align E2E expectations with existing Docker workflow validation, including one representative wrapper-invoked OpenCode CLI/help smoke anchor from the Dockerized workflow spec.
- Make minimum intended E2E smoke coverage explicit: interactive shell mode, default command mode, command pass-through mode, and one representative wrapper-invoked OpenCode CLI/help command.

**Non-Goals:**
- Adding or modifying production wrapper/runtime code.
- Expanding E2E coverage to broad error-path or edge-case matrices.
- Replacing existing smoke/parity checks with E2E tests.

## Decisions

1. **Keep Bun + Vitest as the E2E execution baseline**
   - Decision: Standardize execution on `bun run test:e2e` and the existing dedicated E2E config.
   - Rationale: Lowest adoption cost and consistent with current repository tooling.
   - Alternative considered: introducing another E2E runner (rejected due to added complexity and duplication).

2. **Define feature-level happy-path smoke slices**
   - Decision: Require a small set of representative happy-path tests per feature area instead of exhaustive coverage.
   - Rationale: Maximizes signal-to-noise and minimizes test fragility while still catching major regressions.
    - Alternative considered: broad scenario matrices (rejected as high maintenance and brittle).

3. **Keep minimum workflow-mode parity explicit and lightweight**
   - Decision: Require representative happy-path E2E coverage for the three key wrapper execution modes (interactive shell, default command, command pass-through) and preserve one representative wrapper-invoked OpenCode CLI/help smoke anchor explicitly invoked via `bin/opencode-docker` (`bin/opencode-docker -- opencode --help`).
   - Rationale: Protects core user-facing workflow behavior with minimal test count and stable assertions.
   - Alternative considered: validating only wrapper-invoked OpenCode CLI/help commands without wrapper mode anchors (rejected because it can miss regressions in interactive/default/pass-through behavior).

4. **Organize tests by workflow-facing feature intent**
   - Decision: E2E tests should be grouped under `e2e/tests/` using descriptive names tied to user-visible workflow outcomes.
   - Rationale: Keeps suite readable, discoverable, and aligned with OpenSpec requirements.
   - Alternative considered: organizing by internal module structure (rejected because module structure changes more often than external behavior).

5. **Prefer contract assertions over implementation-detail assertions**
   - Decision: Tests should assert observable outcomes (command success, expected artifact/state presence, ownership/parity behavior where applicable), not incidental internals.
   - Rationale: Reduces brittleness and false failures during refactoring.
   - Alternative considered: deep implementation coupling in assertions (rejected for fragility).

## Risks / Trade-offs

- **Too little coverage misses regressions** → Mitigation: require at least one representative happy-path scenario for each minimum anchor (interactive shell, default, pass-through, representative wrapper-invoked OpenCode CLI/help command) and keep assertions contract-focused.
- **Tests become flaky in environment-sensitive flows** → Mitigation: favor deterministic smoke assertions and avoid timing-sensitive or over-specific output matching.
- **Scope creep into negative-path suites** → Mitigation: codify non-goal that this suite is happy-path focused.

## Migration Plan

1. Add OpenSpec deltas for the new E2E capability and workflow capability updates.
2. Add implementation tasks defining representative test additions and execution/maintenance expectations.
3. Keep existing wrapper behavior untouched while future implementation work follows the new spec/tasks.

## Open Questions

- Which exact feature buckets should be treated as mandatory E2E smoke anchors as the workflow surface grows?

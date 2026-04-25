---
name: project-code-examples
description: Index and maintenance guidance for project-specific code examples used by AI agents.
---

## Scope
Defines how to use and maintain examples under `.code-examples-for-ai/` for this Dockerized OpenCode project.

## Invariants
- Examples must come from real repository patterns, not generic pseudocode.
- One pattern per file, concise, and presented as a focused excerpt (not a full drop-in file).
- Example filenames stay kebab-case and descriptive.

## Intro
Use these examples as canonical style references for Bash wrappers, Docker runtime wiring, and OpenSpec configuration patterns.
Examples are intentionally focused excerpts copied from real project code. They may omit surrounding setup (variable declarations, helper functions, or file-level context) and are meant for adaptation, not copy-paste as standalone files.

## Available Examples
- `fail-fast-wrapper-validation.md` — prerequisite/path validation with actionable failures.
- `safe-bash-argument-forwarding.md` — array-safe command forwarding into `docker run`.
- `container-uid-gid-remap.md` — non-root UID/GID remapping with UID-conflict-safe reassignment before export.
- `docker-non-root-entrypoint.md` — Dockerfile pattern for tini + custom entrypoint.
- `openspec-spec-driven-config.md` — minimal OpenSpec `schema: spec-driven` config baseline.
- `conditional-runtime-bind-mounts.md` — conditional bind-mount wiring for optional runtime integration paths.
- `js-wrapper-runtime-plan-modules.md` — thin JS entrypoint delegation to modular runtime planning/execution.
- `host-docker-socket-bridge-gating.md` — explicit host-docker gating for host Docker socket bridge wiring.
- `docker-toolchain-checksum-install.md` — Dockerfile pattern for pinned toolchain downloads with SHA-256 verification.
- `playwright-chromium-bundled-install.md` — pinned Playwright CLI install with Chromium-only browser bundle and non-root-readable browser artifacts.
- `optional-host-gitconfig-readonly-mount.md` — optional host `~/.gitconfig` validation and read-only bind-mount wiring.
- `zod-project-config-env-expansion.md` — Zod-defined project config with strict `{env:VAR}` expansion to validated runtime env values.
- `local-cli-symlink-install-guards.md` — idempotent local CLI symlink install/uninstall with unrelated-target protection.

## Location
- Root example directory: `.code-examples-for-ai/`

## Maintenance
- When introducing a new architectural pattern, add one focused example file.
- Prefer short snippets with brief inline comments over long files.
- Keep example content synchronized with current production code.
- Keep excerpt framing explicit so readers know when setup/context lives outside the snippet.

## Validation Checklist
- New examples are derived from existing source files.
- No example exposes secrets or machine-specific sensitive paths.
- Index list in this file matches files present in `.code-examples-for-ai/`.

## Failure Handling
- If no trustworthy project snippet exists for a pattern, do not invent one; defer until code exists.
- If an example becomes stale after refactors, update or remove it in the same change.

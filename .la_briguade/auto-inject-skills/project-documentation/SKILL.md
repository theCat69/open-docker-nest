---
name: project-documentation
description: Documentation standards for Dockerized OpenCode and OpenSpec-driven workflows.
---

## Scope
Applies to Markdown docs in `docs/`, root guidance files, and OpenSpec artifacts.

## Invariants
- Operational docs match current wrapper flags, mount paths, and default command behavior.
- OpenSpec specs reflect implemented behavior and archive history.
- Examples are runnable and repository-relative.

## Code Documentation
- For Bash entrypoints/wrappers, document externally visible flags, env vars, and failure modes in docs.
- Keep inline script comments for non-obvious decisions only.

## README Format
- Include: purpose, prerequisites, build/run commands, mount model, persistence behavior, troubleshooting.
- Prefer short command blocks that can be copied directly.

## API Documentation
- This repo exposes CLI interfaces, not HTTP APIs.
- Treat `bin/opencode-docker` usage contract and accepted options as the primary public interface.

## Changelog
- No dedicated changelog file detected.
- Track behavior and requirement evolution through OpenSpec change artifacts and archived change folders.

## Validation Checklist
- Every changed behavior has matching docs update.
- Documentation command examples are consistent with current script syntax.
- OpenSpec spec artifacts remain aligned with documented workflow.

## Failure Handling
- If behavior and docs diverge, update docs in the same change before merge.
- If requirement intent is unclear, resolve in OpenSpec artifacts first.

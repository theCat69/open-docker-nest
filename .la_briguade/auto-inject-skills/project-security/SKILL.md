---
name: project-security
description: Security guardrails for Dockerized CLI workflows and Bash orchestration scripts.
---

## Scope
Security controls across Docker image build, wrapper scripts, runtime identity mapping, and host mounts.

## Invariants
- Container execution does not run as root for normal workflow paths.
- Secrets are never baked into image layers via Dockerfile `ARG`/`ENV` values.
- Host-mounted project/state/config paths are explicit and minimal.

## Secrets Management
- Keep credentials outside repository and inject at runtime when required.
- Never commit token files, SSH private keys, or secret env defaults.

## Input Validation
- Validate CLI flags and path existence before invoking Docker.
- Enforce numeric/non-root UID/GID for runtime remap.
- Quote all Bash variables and avoid unsafe eval patterns.

## Dependency Security
- Prefer official minimal images and pinned tool versions where feasible.
- Rebuild images regularly to pick up base-image security updates.

## Authentication & Authorization
- Respect host user identity mapping to prevent privileged file ownership drift.
- Limit mounted directories to required project and OpenCode persistence paths.

## Common Vulnerabilities
- Avoid command injection through unvalidated shell interpolation.
- Avoid privilege escalation by rejecting UID/GID 0 remaps.
- Avoid accidental secret exposure in logs or docs examples.

## Validation Checklist
- Dockerfile contains no embedded secrets.
- Scripts retain fail-fast mode and strict validation checks.
- Runtime privilege drop path (`setpriv`) remains intact.

## Failure Handling
- On security validation failure, abort with explicit remediation instructions.
- If a secret leak is suspected, rotate secrets and purge exposed artifacts immediately.

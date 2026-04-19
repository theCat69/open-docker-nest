---
name: project-build
description: Build workflow for Dockerized OpenCode runtime and supporting artifacts.
---

## Scope
Build and environment setup for container image and local wrapper execution.

## Invariants
- Build output is a runnable image with `opencode` default command.
- Entrypoint and user-map scripts are copied and executable.
- Runtime remains non-root through UID/GID remapping.

## Prerequisites
- Docker daemon and CLI available on host.
- Repository cloned locally with executable `bin/opencode-docker`.

## Environment Setup
- Build image from repository root.
- Use host persistence directories `~/.config/opencode`, `~/.local/state/opencode`, and `~/.local/share/opencode` (auto-created by wrapper when missing).

## Build Commands
- `docker build -t opencode-docker:latest .`
- Optional override image at run-time: `bin/opencode-docker --image <image-ref> ...`

## Development Server
- Not applicable (CLI container workflow, no long-running app server).

## CI/CD Pipeline
- No CI pipeline detected in repository.
- Minimum CI parity should include image build and command smoke checks documented in `docs/docker-workflow.md`.

## Validation Checklist
- `docker build` succeeds from clean context.
- Container starts via wrapper in default, shell, and pass-through modes.
- Mounted persistence directories are created or fail with remediation guidance.

## Failure Handling
- If Docker is missing/unavailable, fail immediately.
- If image build fails, inspect apt/npm install and script copy/permission layers.
- If runtime fails, verify entrypoint executable bits and UID/GID env propagation.

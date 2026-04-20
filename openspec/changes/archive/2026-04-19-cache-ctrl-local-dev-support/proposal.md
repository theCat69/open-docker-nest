## Why

The Dockerized OpenCode workflow already defines local-development support for `la_briguade`, but it does not yet define the equivalent contract for `cache-ctrl`. As a result, developers working on `cache-ctrl` must rely on the image-installed binary and container-managed skills instead of validating changes against their local development checkout inside the standard Docker workflow.

Defining `cache-ctrl` local-dev support closes that gap, reduces ad hoc local setup, and keeps development expectations consistent across integrated tooling. This change must preserve the workflow's existing safety guarantees: fail-fast validation, non-root execution, safe host/container mount behavior, and unchanged default runtime behavior when local-dev mode is not in use.

## What Changes

- Modify the existing Dockerized workflow requirements to add `cache-ctrl` local-development support analogous to the current `la_briguade` local-dev pattern.
- Define local-dev behavior so the container can use host-backed `cache-ctrl` skills via symlinked skill content and use a host-backed `cache-ctrl` binary symlinked from `~/.local/bin/cache-ctrl`, instead of only the Dockerfile-installed binary.
- Require this behavior to be limited to local-dev mode so standard Dockerized runs continue to use the normal image-provided `cache-ctrl` runtime.
- Preserve existing wrapper invariants for actionable preflight failures, non-root execution, and safe mount/path handling when local-dev support is active.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `dockerized-open-docker-nest-workflow` (`openspec/specs/dockerized-open-docker-nest-workflow/spec.md`): extend the existing workflow spec to cover `cache-ctrl` local-dev support, including host-backed skills linkage and local binary usage in local-dev mode while keeping non-local-dev behavior unchanged.

## Impact

- Affected spec surface: `openspec/specs/dockerized-open-docker-nest-workflow/spec.md`.
- Expected follow-on implementation touchpoints: Docker wrapper runtime mount/link wiring and any workflow documentation that describes local development behavior.
- User impact: developers can validate local `cache-ctrl` changes through the standard Dockerized workflow without regressing regular runtime behavior.
- Operational impact: default runs remain stable, while local-dev mode gains an explicit spec contract that protects fail-fast and non-root guarantees.

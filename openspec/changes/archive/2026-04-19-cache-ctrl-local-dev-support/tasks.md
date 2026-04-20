## 1. Spec Alignment and Local-Mode Contract

- [x] 1.1 Confirm `bin/open-docker-nest` exposes the cache-ctrl local-dev env contract from the spec: `CACHE_CTRL_LOCAL_MODE=auto|force|off` plus optional `CACHE_CTRL_LOCAL_PATH`, without adding new CLI flags.
- [x] 1.2 Add cache-ctrl-specific wrapper constants for the canonical host inputs (`~/.local/bin/cache-ctrl`, `~/.config/opencode/skills/cache-ctrl-caller/SKILL.md`) and the in-container local binary target (`/home/opencode/.local/bin/cache-ctrl`).
- [x] 1.3 Keep all cache-ctrl local-dev behavior behind resolved mode state so default runs remain on the image-installed `cache-ctrl` path when local mode is inactive.

## 2. Cache-ctrl Local-Dev Resolution and Preflight Validation

- [x] 2.1 Add a cache-ctrl local-mode validator that accepts only `auto`, `force`, or `off` and fails preflight before `docker run` for invalid values.
- [x] 2.2 Implement host-path resolution for the canonical cache-ctrl binary entry and skill link, including broken-symlink, readability, and accessibility checks on resolved targets.
- [x] 2.3 Derive one authoritative absolute cache-ctrl checkout root from the resolved binary and skill inputs and verify expected repository markers before treating it as mountable local-dev state.
- [x] 2.4 Implement `auto` mode activation so cache-ctrl local-dev turns on only when both canonical inputs are valid, readable, and resolve to the same checkout root.
- [x] 2.5 Implement `auto` mode fallback behavior so partial or inconsistent cache-ctrl local-dev inputs emit actionable warnings and continue with the default image runtime.
- [x] 2.6 Implement `force` mode failure behavior so missing binary input, broken skill link, unreadable targets, inaccessible roots, or root mismatches fail startup before `docker run` with actionable diagnostics.
- [x] 2.7 Enforce `CACHE_CTRL_LOCAL_PATH` equality with the derived absolute checkout root when local mode is active, and ignore it when mode resolves to `off`.

## 3. Wrapper and Runtime Wiring

- [x] 3.1 Add the derived cache-ctrl checkout root as a same-absolute-path bind mount only when cache-ctrl local-dev mode is active so existing host-backed skill symlinks remain valid inside the container.
- [x] 3.2 Create `/home/opencode/.local/bin/cache-ctrl` as an entrypoint symlink to the mounted cache-ctrl executable target only for active local-dev runs so Docker does not depend on bind-mounting the symlink source directly.
- [x] 3.3 Prepend `/home/opencode/.local/bin` to `PATH` only for active cache-ctrl local-dev runs so the host-backed binary takes precedence without replacing the image-installed binary globally.
- [x] 3.4 Preserve existing project/config/state/share mounts, la_briguade handling, non-root UID/GID mapping, shell mode, and passthrough command behavior while adding cache-ctrl local-dev support.

## 4. Documentation and Operator Guidance

- [x] 4.1 Update `docs/docker-workflow.md` to document cache-ctrl local-dev setup, canonical host inputs, mode semantics, same-path checkout mounting, local binary precedence, and `CACHE_CTRL_LOCAL_PATH` behavior.
- [x] 4.2 Add troubleshooting guidance for invalid `CACHE_CTRL_LOCAL_MODE`, broken skill symlinks, unreadable binary targets, derived-root mismatches, and safe fallback/disable behavior with `CACHE_CTRL_LOCAL_MODE=off`.

## 5. Verification and Rollback Safety

- [x] 5.1 Verify inactive local mode (`CACHE_CTRL_LOCAL_MODE=off` or `auto` without valid inputs) adds no cache-ctrl local-dev mounts or `PATH` override and still uses the image-installed runtime.
- [x] 5.2 Verify `auto` mode activates only when the canonical skill link and binary entry both resolve to the same readable checkout root, and otherwise warns then falls back cleanly.
- [x] 5.3 Verify `force` mode fails fast before `docker run` for each prerequisite failure class: invalid mode value, missing binary path, broken skill symlink, unreadable target, inaccessible derived root, and `CACHE_CTRL_LOCAL_PATH` mismatch.
- [x] 5.4 Verify active local-dev mode keeps host-backed cache-ctrl skill symlinks resolvable inside the container and resolves `cache-ctrl` from `/home/opencode/.local/bin/cache-ctrl` under the non-root runtime user.
- [x] 5.5 Re-run Docker workflow smoke checks through `bin/open-docker-nest` (`opencode --help`, `/opsx-propose`, `/opsx-explore`, `/opsx-apply`, `/opsx-archive`) to confirm command parity after cache-ctrl local-dev wiring.
- [x] 5.6 Verify files written under `/workspace` during cache-ctrl local-dev runs still retain host UID/GID ownership and that `CACHE_CTRL_LOCAL_MODE=off` remains the rollback path for disabling the new behavior.

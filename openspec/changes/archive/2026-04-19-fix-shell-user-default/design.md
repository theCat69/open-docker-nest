## Context

`bin/opencode-docker --shell` currently selects `/bin/bash`, but the container entrypoint defaults to the image’s current runtime user when no explicit user switch is requested. In practice this yields an interactive session as `node` instead of `opencode`, which breaks the documented Docker workflow contract and can diverge from the `/home/opencode` mounts and non-root ownership expectations already used by default `opencode` execution. The change needs to correct shell-mode identity without changing default command mode, direct command pass-through, `/workspace` mounting, `/home/opencode` persistence mounts, or unrelated la-briguade behavior.

## Goals / Non-Goals

**Goals:**
- Make `--shell` open an interactive shell as `opencode` in the mounted project context.
- Preserve the existing non-root runtime model, including `/home/opencode` and host UID/GID ownership behavior.
- Keep direct command pass-through and default `opencode` command behavior unchanged.
- Make the shell-mode contract explicit and testable in the Dockerized workflow spec.

**Non-Goals:**
- Redesigning the container entrypoint or UID/GID remap architecture.
- Changing wrapper CLI syntax or adding new execution modes.
- Changing project mounts, persistence paths, or la-briguade integration behavior.
- Expanding the capability beyond this shell-user correction.

## Decisions

1. **Treat shell mode as part of the existing `opencode` runtime contract**
   - **Decision:** `--shell` must run under the same intended application user context as the rest of the Dockerized workflow: `opencode`, with `/home/opencode` as home.
   - **Rationale:** Shell mode is an alternate interaction surface for the same environment, not a separate runtime persona.

2. **Constrain the fix to wrapper/runtime user selection behavior**
   - **Decision:** Correct the shell invocation path without changing default command mode or pass-through argument forwarding.
   - **Rationale:** The reported defect is limited to shell identity; preserving current command semantics minimizes compatibility risk.

3. **Keep mount and ownership contracts unchanged**
   - **Decision:** Continue using the existing `/workspace` project mount, `/home/opencode` persistence mounts, and host UID/GID mapping expectations.
   - **Rationale:** These behaviors are already part of the capability contract and should remain stable while shell mode is brought back into alignment.

4. **Add explicit acceptance coverage for shell identity**
   - **Decision:** Update the delta spec so shell mode, default command mode, pass-through mode, and host ownership expectations remain independently testable.
   - **Rationale:** The current defect exists because shell behavior was not specified precisely enough.

## Risks / Trade-offs

- **[Risk] Shell-specific user forcing could bypass existing non-root safeguards** → **Mitigation:** require shell mode to preserve the same non-root and host-ownership expectations as standard runtime execution.
- **[Risk] Tightening shell semantics could unintentionally change pass-through behavior** → **Mitigation:** explicitly preserve unchanged forwarding for `bin/opencode-docker -- <command> ...args` and unchanged default `opencode` behavior when `--shell` is absent.
- **[Trade-off] The spec becomes more explicit about one execution sub-mode** → **Mitigation:** keep the delta narrowly scoped to behavior that already exists and is already user-visible.

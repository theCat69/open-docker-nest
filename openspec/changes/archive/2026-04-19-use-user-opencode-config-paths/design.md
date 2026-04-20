## Context

The current Dockerized workflow persists OpenCode data in wrapper-owned host directories under `~/.open-docker-nest/{config,state,share}`. This introduces a second persistence location that diverges from native OpenCode usage, where user data already lives in standard user paths. The change requires updating the persistence contract so Docker runs reuse the user’s real OpenCode directories while preserving existing wrapper guarantees (actionable validation failures, stable container mount targets, and command parity).

## Goals / Non-Goals

**Goals:**
- Replace wrapper default persistence sources with the user’s real host OpenCode directories.
- Keep in-container OpenCode paths unchanged to avoid behavior drift inside the runtime.
- Preserve fail-fast, actionable wrapper error handling for invalid/unavailable persistence paths.
- Keep command invocation modes and UID/GID ownership behavior unchanged.

**Non-Goals:**
- Redesigning container entrypoint or UID/GID remap architecture.
- Changing wrapper command syntax beyond persistence-path behavior.
- Introducing new persistence backends or synchronization logic.

## Decisions

1. **Use user OpenCode host paths as persistence source of truth**
   - **Decision:** Mount host paths `~/.config/opencode`, `~/.local/state/opencode`, and `~/.local/share/opencode` as the default persistence sources.
   - **Rationale:** These paths align Dockerized and native OpenCode usage, eliminating split state across parallel directory trees.
   - **Alternatives considered:**
     - Keep `~/.open-docker-nest/*`: rejected because it continues duplicating user state and configuration.

2. **Keep container mount targets unchanged**
   - **Decision:** Continue mounting to `/home/opencode/.config/opencode`, `/home/opencode/.local/state/opencode`, and `/home/opencode/.local/share/opencode`.
   - **Rationale:** Existing runtime and tool behavior already expects these container locations; changing only host sources minimizes migration risk.
   - **Alternatives considered:**
     - Introduce new in-container targets: rejected because it adds unnecessary churn without user-facing benefit.

3. **Retain wrapper-managed path preparation with explicit failures**
   - **Decision:** Wrapper continues preparing missing host directories before container start and fails non-zero with remediation guidance if preparation is impossible.
   - **Rationale:** First-run UX remains smooth while preserving deterministic failure semantics.
   - **Alternatives considered:**
     - Require pre-created directories only: rejected due to avoidable operator friction.

4. **Scope requirement changes to persistence behavior only**
   - **Decision:** Modify only the persistence requirement block in `dockerized-open-docker-nest-workflow`; leave project mount, execution modes, and parity command requirements unchanged.
   - **Rationale:** The proposal is narrowly focused on path contract updates, so unrelated requirement churn is avoided.
   - **Alternatives considered:**
     - Rewrite full spec set: rejected because it obscures targeted behavioral change.

## Risks / Trade-offs

- **[Risk] Existing users may still have historical data in `~/.open-docker-nest/*` and perceive missing data after switch** → **Mitigation:** include migration guidance in implementation docs and preserve clear fallback/override messaging.
- **[Risk] Host environments with restricted home-directory writes can block directory preparation** → **Mitigation:** keep fail-fast messaging actionable, including failing path and required permission remediation.
- **[Trade-off] Using real user directories increases coupling between native and Docker sessions** → **Mitigation:** this is intentional for continuity; preserve explicit mount contract and verification checks.

## Migration Plan

1. Update wrapper persistence defaults from `~/.open-docker-nest/*` to real user OpenCode paths.
2. Keep runtime mount targets unchanged and validate ownership behavior remains correct.
3. Update workflow documentation to describe new defaults and how to migrate old persisted data.
4. Validate parity commands and persistence behavior using the updated mount contract.
5. Rollback option: temporarily restore old defaults if regression is discovered.

## Open Questions

- No blocker-level open questions for artifact completion. Implementation can proceed with the path contract defined above.

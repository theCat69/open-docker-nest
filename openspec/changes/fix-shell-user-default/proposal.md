# Why

`bin/opencode-docker --shell` currently opens an interactive session as `node`, not `opencode`. This conflicts with the repository’s documented Docker workflow, creates an inconsistent user experience between shell mode and default command mode, and risks breaking expected home-directory and ownership behavior tied to `/home/opencode`. The change is needed to restore the intended contract: shell mode should run as `opencode` while preserving non-root execution, host-mounted `/workspace`, and correct host file ownership.

# What Changes

Define shell mode as an `opencode`-user interactive session within the existing Dockerized workflow contract. Clarify that this adjustment must not change default `opencode` command behavior, direct command pass-through behavior, `/workspace` mounting, persistent `/home/opencode` mounts, or unrelated la-briguade integration behavior. Update repository documentation and spec language so the expected shell-user behavior is explicit and testable.

# Capabilities

## New Capabilities

- None.

## Modified Capabilities

- **Dockerized OpenCode workflow via host wrapper**  
  Clarify that interactive shell mode opens in the mounted project context as the `opencode` user.

- **Interactive and command pass-through execution modes**  
  Tighten the shell-mode contract so `--shell` preserves the same non-root user and home-directory expectations as normal runtime execution, without changing default command or pass-through behavior.

- **Minimum command-parity smoke validation**  
  Extend acceptance coverage to confirm shell mode uses `opencode` and continues to preserve correct host ownership semantics.

# Impact

This is a behavior-correction change to an existing capability, not a scope expansion. It affects wrapper/runtime expectations, spec accuracy, and user-facing documentation. The main compatibility requirement is preserving current mounts, persistence paths, default command mode, pass-through semantics, and host ownership behavior while correcting only the shell-mode user identity.

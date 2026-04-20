## 1. Shell-Mode Runtime Correction

- [x] 1.1 Update the `--shell` execution path so `bin/open-docker-nest --shell` opens an interactive shell in the mounted project context as user `opencode`.
- [x] 1.2 Ensure shell mode uses `/home/opencode` as the runtime home directory.
- [x] 1.3 Keep the shell-mode fix isolated to user-selection behavior so `bin/open-docker-nest` still defaults to `opencode` when no command is provided.
- [x] 1.4 Preserve direct command pass-through behavior so `bin/open-docker-nest -- <command> ...args` is forwarded unchanged and does not inherit shell-mode behavior.
- [x] 1.5 Preserve existing non-root execution, `/workspace` mounting, `/home/opencode` persistence mounts, and host UID/GID ownership mapping while correcting shell-mode identity.

## 2. Documentation Alignment

- [x] 2.1 Update `docs/docker-workflow.md` to state that `--shell` opens as `opencode` in the mounted project context with `/home/opencode` as the runtime home directory.
- [x] 2.2 Keep wrapper documentation explicit that default command behavior and direct command pass-through behavior remain unchanged after the shell-mode correction.
- [x] 2.3 Confirm documentation for mounts, host ownership behavior, and la-briguade integration remains unchanged except where shell-mode identity must be clarified.

## 3. Verification and Regression Safety

- [x] 3.1 Add or update smoke validation for `bin/open-docker-nest --shell` to assert the interactive session runs as user `opencode`.
- [x] 3.2 Add or update smoke validation for `bin/open-docker-nest --shell` to assert the runtime home directory is `/home/opencode`.
- [x] 3.3 Verify `bin/open-docker-nest` with no command arguments still executes the default `opencode` command and does not implicitly start a shell.
- [x] 3.4 Verify `bin/open-docker-nest -- <command> ...args` still passes the provided command and arguments through unchanged.
- [x] 3.5 Verify files created or modified through shell mode remain owned by the invoking host user and not by root.
- [x] 3.6 Re-run command-parity smoke checks to confirm the shell-mode fix does not regress mounts, persistence behavior, or unrelated la-briguade behavior.

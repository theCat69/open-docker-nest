# Optional host gitconfig read-only mount

Focused excerpt from `src/runtime/runtime-plan.ts` showing the guard-and-mount pattern for importing host `~/.gitconfig` only when valid and readable.

```ts
function prepareHostGitConfigMount(
  hostSourcePath: string,
  containerTargetPath: string,
  dockerRunArgs: string[],
): void {
  if (!pathExistsOrSymlink(hostSourcePath) || isBrokenSymlink(hostSourcePath) || !isFile(hostSourcePath) || !isReadablePath(hostSourcePath)) {
    return;
  }

  dockerRunArgs.push("--volume", `${hostSourcePath}:${containerTargetPath}:ro`);
}

prepareHostGitConfigMount(runtimeContext.hostGitConfigFilePath, `${CONTAINER_HOME_DIR}/.gitconfig`, dockerRunArgs);
```

<!-- Focused excerpt from production wrapper runtime planning (src/runtime/runtime-plan.ts); helper functions are defined elsewhere in the same module. -->
```ts
if (hostDockerMode && !runtimeContext.isWindows) {
  validateHostDockerPrerequisites();
}

if (hostDockerMode) {
  const dockerSocketGroupId = getPathGroupId(HOST_DOCKER_SOCKET_PATH);
  dockerRunArgs.push("--volume", `${HOST_DOCKER_SOCKET_PATH}:${HOST_DOCKER_SOCKET_PATH}`);
  dockerRunArgs.push("--env", `DOCKER_HOST=${LOCAL_UNIX_DOCKER_HOST}`);
  dockerRunArgs.push("--env", `OPENCODE_DOCKER_SOCKET_GID=${dockerSocketGroupId}`);
}
```

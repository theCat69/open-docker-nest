# JS wrapper runtime planning from modular concerns

Demonstrates the modular JS wrapper flow where a thin entrypoint delegates to context-building, runtime planning, and process execution.

```ts
// src/index.ts
const runtimeContext = buildRuntimeContext(resolvedProjectPath);

const runtimePlan = buildDockerRuntimePlan(
  runtimeContext,
  parsedCliOptions.imageRef,
  parsedCliOptions.shellMode,
  parsedCliOptions.passthroughCommand,
);

executeDockerRun(runtimePlan);
```

```ts
// src/runtime/runtime-plan.ts
if (cacheCtrlLocalState.active) {
  dockerRunArgs.push("--volume", `${cacheCtrlLocalState.projectRoot}:${cacheCtrlLocalState.projectRoot}`);
  dockerRunArgs.push("--env", `OPENCODE_CACHE_CTRL_LOCAL_TARGET=${cacheCtrlLocalState.binaryTarget}`);
  dockerRunArgs.push("--env", `OPENCODE_PREPEND_PATH=${CACHE_CTRL_CONTAINER_BIN_DIR}`);
}
```

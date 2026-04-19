import {
  CACHE_CTRL_CONTAINER_BIN_DIR,
  CONTAINER_HOME_DIR,
  CONTAINER_PROJECT_DIR,
  LA_BRIGUADE_HOST_CONFIG_RELATIVE,
} from "../shared/constants.js";
import type { DockerRuntimePlan, RuntimeContext } from "../shared/types.js";
import { warn } from "../shared/io.js";
import {
  isBrokenSymlink,
  isReadableDirectory,
  isReadablePath,
  pathExistsOrSymlink,
} from "../validation/filesystem.js";
import { resolveCacheCtrlLocalState } from "./cache-ctrl-local.js";
import { resolveLaBriguadeLocalProjectRoot } from "./la-briguade-local.js";
import { enforceWindowsAdvancedModeSupport } from "./windows-support.js";

function prepareLaBriguadeConfigMount(
  hostSourcePath: string,
  containerTargetPath: string,
  dockerRunArgs: string[],
): void {
  if (!pathExistsOrSymlink(hostSourcePath)) {
    return;
  }

  if (isBrokenSymlink(hostSourcePath)) {
    warn(
      `Skipping la-briguade config import from ${hostSourcePath}: path is a broken symlink. Remediation: fix symlink target or remove the path if unused.`,
    );
    return;
  }

  if (!isReadablePath(hostSourcePath)) {
    warn(
      `Skipping la-briguade config import from ${hostSourcePath}: source exists but is not readable. Remediation: grant read permissions or remove the path if unused.`,
    );
    return;
  }

  dockerRunArgs.push("--volume", `${hostSourcePath}:${containerTargetPath}`);
}

function resolveCommandToRun(
  shellMode: boolean,
  passthroughCommand: readonly string[],
): readonly string[] {
  if (shellMode) {
    return ["/bin/bash"];
  }

  if (passthroughCommand.length === 0) {
    return ["opencode"];
  }

  return passthroughCommand;
}

function shouldAllocateInteractiveTty(shellMode: boolean): boolean {
  return shellMode || (process.stdin.isTTY === true && process.stdout.isTTY === true);
}

export function buildDockerRuntimePlan(
  runtimeContext: RuntimeContext,
  imageRef: string,
  shellMode: boolean,
  passthroughCommand: readonly string[],
): DockerRuntimePlan {
  if (runtimeContext.isWindows) {
    enforceWindowsAdvancedModeSupport({
      localModeLaBriguade: runtimeContext.laBriguadeLocalMode,
      localPathLaBriguade: runtimeContext.laBriguadeLocalPath,
      localModeCacheCtrl: runtimeContext.cacheCtrlLocalMode,
      localPathCacheCtrl: runtimeContext.cacheCtrlLocalPath,
      cacheCtrlHostBinaryEntryPath: runtimeContext.cacheCtrlHostBinaryEntryPath,
      cacheCtrlHostSkillEntryPath: runtimeContext.cacheCtrlHostSkillEntryPath,
      resolvedProjectPath: runtimeContext.resolvedProjectPath,
    });
  }

  const commandToRun = resolveCommandToRun(shellMode, passthroughCommand);

  const dockerRunArgs: string[] = [
    "--rm",
    "--workdir",
    CONTAINER_PROJECT_DIR,
    "--env",
    `HOST_UID=${runtimeContext.hostUid}`,
    "--env",
    `HOST_GID=${runtimeContext.hostGid}`,
    "--volume",
    `${runtimeContext.resolvedProjectPath}:${CONTAINER_PROJECT_DIR}`,
    "--volume",
    `${runtimeContext.hostConfigDirectoryPath}:/home/opencode/.config/opencode`,
    "--volume",
    `${runtimeContext.hostStateDirectoryPath}:/home/opencode/.local/state/opencode`,
    "--volume",
    `${runtimeContext.hostShareDirectoryPath}:${CONTAINER_HOME_DIR}/.local/share/opencode`,
  ];

  prepareLaBriguadeConfigMount(
    runtimeContext.hostLaBriguadeConfigDirectoryPath,
    `${CONTAINER_HOME_DIR}/${LA_BRIGUADE_HOST_CONFIG_RELATIVE}`,
    dockerRunArgs,
  );

  const laBriguadeLocalProjectRoot = runtimeContext.isWindows
    ? ""
    : resolveLaBriguadeLocalProjectRoot(
        runtimeContext.laBriguadeLocalMode,
        runtimeContext.resolvedProjectPath,
        runtimeContext.laBriguadeLocalPath,
      );
  if (laBriguadeLocalProjectRoot.length > 0) {
    dockerRunArgs.push("--volume", `${laBriguadeLocalProjectRoot}:${laBriguadeLocalProjectRoot}`);
  }

  const cacheCtrlLocalState = runtimeContext.isWindows
    ? { active: false, projectRoot: "", binaryTarget: "" }
    : resolveCacheCtrlLocalState(
        runtimeContext.cacheCtrlLocalMode,
        runtimeContext.cacheCtrlLocalPath,
        runtimeContext.cacheCtrlHostBinaryEntryPath,
        runtimeContext.cacheCtrlHostSkillEntryPath,
      );
  if (cacheCtrlLocalState.active) {
    dockerRunArgs.push("--volume", `${cacheCtrlLocalState.projectRoot}:${cacheCtrlLocalState.projectRoot}`);
    dockerRunArgs.push("--env", `OPENCODE_CACHE_CTRL_LOCAL_TARGET=${cacheCtrlLocalState.binaryTarget}`);
    dockerRunArgs.push("--env", `OPENCODE_PREPEND_PATH=${CACHE_CTRL_CONTAINER_BIN_DIR}`);
  }

  if (shouldAllocateInteractiveTty(shellMode)) {
    dockerRunArgs.push("--interactive", "--tty");
  }

  return {
    imageRef,
    dockerRunArgs,
    commandToRun,
  };
}

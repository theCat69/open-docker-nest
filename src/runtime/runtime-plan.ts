import { spawnSync } from "node:child_process";

import {
  CACHE_CTRL_CONTAINER_BIN_DIR,
  CONTAINER_HOME_DIR,
  CONTAINER_PROJECT_DIR,
  HOST_DOCKER_SOCKET_PATH,
  LA_BRIGUADE_HOST_CONFIG_RELATIVE,
  LOCAL_UNIX_DOCKER_HOST,
} from "../shared/constants.js";
import type { DockerRuntimePlan, RuntimeContext } from "../shared/types.js";
import { fail, warn } from "../shared/io.js";
import {
  getPathGroupId,
  hasFileReadWriteAccess,
  isBrokenSymlink,
  isReadableDirectory,
  isReadablePath,
  isUnixSocket,
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

function resolveActiveDockerContext(): string {
  const contextProbe = spawnSync("docker", ["context", "show"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (contextProbe.error !== undefined || contextProbe.status !== 0) {
    const probeError = contextProbe.error?.message ?? (contextProbe.stderr.trim() || "unknown docker context probe failure");
    fail(
      `--host-docker could not determine the active Docker context before startup (${probeError}). Remediation: ensure 'docker context show' works and active context is default, or run without --host-docker.`,
    );
  }

  const activeContext = contextProbe.stdout.trim();
  if (activeContext.length === 0) {
    fail(
      "--host-docker could not determine the active Docker context before startup (empty response from 'docker context show'). Remediation: ensure Docker is running and active context is default, or run without --host-docker.",
    );
  }

  return activeContext;
}

function validateHostDockerDaemonReachability(): void {
  const daemonProbe = spawnSync(
    "docker",
    ["--host", LOCAL_UNIX_DOCKER_HOST, "version", "--format", "{{.Server.Version}}"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (daemonProbe.error !== undefined || daemonProbe.status !== 0) {
    const probeError = daemonProbe.error?.message ?? (daemonProbe.stderr.trim() || "unknown daemon probe failure");
    fail(
      `--host-docker could not reach a usable host Docker daemon at ${LOCAL_UNIX_DOCKER_HOST} (${probeError}). Remediation: ensure Docker daemon is running and reachable via ${HOST_DOCKER_SOCKET_PATH}, then retry or run without --host-docker.`,
    );
  }

  if (daemonProbe.stdout.trim().length === 0) {
    fail(
      `--host-docker could not verify host Docker daemon server version via ${LOCAL_UNIX_DOCKER_HOST}. Remediation: ensure Docker daemon is healthy and reachable via ${HOST_DOCKER_SOCKET_PATH}, then retry or run without --host-docker.`,
    );
  }
}

function validateHostDockerPrerequisites(): void {
  const dockerContext = process.env.DOCKER_CONTEXT;
  if (dockerContext !== undefined && dockerContext.length > 0 && dockerContext !== "default") {
    fail(
      `--host-docker currently supports only local Unix-socket Docker hosts (${LOCAL_UNIX_DOCKER_HOST}) with the default local Docker context. Unsupported DOCKER_CONTEXT: ${dockerContext}. Remediation: unset DOCKER_CONTEXT or set it to default.`,
    );
  }

  const activeDockerContext = resolveActiveDockerContext();
  if (activeDockerContext !== "default") {
    fail(
      `--host-docker currently supports only the default local Docker context. Active Docker context is unsupported: ${activeDockerContext}. Remediation: run 'docker context use default' and retry, or run without --host-docker.`,
    );
  }

  const dockerHost = process.env.DOCKER_HOST;
  if (dockerHost !== undefined && dockerHost.length > 0 && dockerHost !== LOCAL_UNIX_DOCKER_HOST) {
    fail(
      `--host-docker currently supports only local Unix-socket Docker hosts (${LOCAL_UNIX_DOCKER_HOST}). Unsupported DOCKER_HOST: ${dockerHost}. Remediation: unset DOCKER_HOST or set it to ${LOCAL_UNIX_DOCKER_HOST}.`,
    );
  }

  if (!pathExistsOrSymlink(HOST_DOCKER_SOCKET_PATH)) {
    fail(
      `--host-docker requires a local Docker daemon socket at ${HOST_DOCKER_SOCKET_PATH}, but it was not found. Remediation: start Docker and verify the socket exists before retrying.`,
    );
  }

  if (isBrokenSymlink(HOST_DOCKER_SOCKET_PATH)) {
    fail(
      `--host-docker requires a usable Docker daemon socket, but ${HOST_DOCKER_SOCKET_PATH} is a broken symlink. Remediation: repair Docker socket provisioning or restart Docker, then retry.`,
    );
  }

  if (!isUnixSocket(HOST_DOCKER_SOCKET_PATH)) {
    fail(
      `--host-docker requires ${HOST_DOCKER_SOCKET_PATH} to be a Unix socket. Remediation: use a local Unix-socket Docker host or run without --host-docker.`,
    );
  }

  if (!hasFileReadWriteAccess(HOST_DOCKER_SOCKET_PATH)) {
    fail(
      `--host-docker cannot access ${HOST_DOCKER_SOCKET_PATH} with read/write permissions. Remediation: run with a user that can access the Docker socket (for example add your user to the docker group), then retry.`,
    );
  }

  validateHostDockerDaemonReachability();
}

export function buildDockerRuntimePlan(
  runtimeContext: RuntimeContext,
  imageRef: string,
  shellMode: boolean,
  hostDockerMode: boolean,
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
      hostDockerMode,
    });
  }

  if (hostDockerMode && !runtimeContext.isWindows) {
    validateHostDockerPrerequisites();
  }

  const commandToRun = resolveCommandToRun(shellMode, passthroughCommand);
  const dockerClientEnvironment: Record<string, string> = {};

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

  for (const environmentVariableName of Object.keys(runtimeContext.extraContainerEnvironment)) {
    dockerRunArgs.push("--env", environmentVariableName);
    const resolvedValue = runtimeContext.extraContainerEnvironment[environmentVariableName];
    if (resolvedValue === undefined) {
      continue;
    }

    dockerClientEnvironment[environmentVariableName] = resolvedValue;
  }

  if (hostDockerMode) {
    const dockerSocketGroupId = getPathGroupId(HOST_DOCKER_SOCKET_PATH);
    dockerRunArgs.push("--volume", `${HOST_DOCKER_SOCKET_PATH}:${HOST_DOCKER_SOCKET_PATH}`);
    dockerRunArgs.push("--env", `DOCKER_HOST=${LOCAL_UNIX_DOCKER_HOST}`);
    dockerRunArgs.push("--env", `OPENCODE_DOCKER_SOCKET_GID=${dockerSocketGroupId}`);
  }

  if (shouldAllocateInteractiveTty(shellMode)) {
    dockerRunArgs.push("--interactive", "--tty");
  }

  return {
    imageRef,
    dockerRunArgs,
    dockerClientEnvironment,
    commandToRun,
  };
}

import { homedir } from "node:os";
import { join } from "node:path";

import {
  CACHE_CTRL_HOST_BINARY_ENTRY_RELATIVE,
  CACHE_CTRL_HOST_SKILL_ENTRY_RELATIVE,
  CACHE_CTRL_LOCAL_MODE_DEFAULT,
  LA_BRIGUADE_HOST_CONFIG_RELATIVE,
  LA_BRIGUADE_LOCAL_MODE_DEFAULT,
} from "../shared/constants.js";
import type { RuntimeContext } from "../shared/types.js";
import { validateCacheCtrlLocalMode, validateLaBriguadeLocalMode } from "../validation/local-modes.js";
import { loadProjectExtraContainerEnvironment } from "../config/project-config.js";

export function buildRuntimeContext(resolvedProjectPath: string): RuntimeContext {
  const hostHomeDirectory = homedir();
  const laBriguadeLocalMode = validateLaBriguadeLocalMode(
    process.env.LA_BRIGUADE_LOCAL_MODE ?? LA_BRIGUADE_LOCAL_MODE_DEFAULT,
  );
  const cacheCtrlLocalMode = validateCacheCtrlLocalMode(
    process.env.CACHE_CTRL_LOCAL_MODE ?? CACHE_CTRL_LOCAL_MODE_DEFAULT,
  );
  const extraContainerEnvironment = loadProjectExtraContainerEnvironment(resolvedProjectPath, process.env);

  return {
    resolvedProjectPath,
    extraContainerEnvironment,
    hostGitConfigFilePath: join(hostHomeDirectory, ".gitconfig"),
    hostConfigDirectoryPath: join(hostHomeDirectory, ".config", "opencode"),
    hostStateDirectoryPath: join(hostHomeDirectory, ".local", "state", "opencode"),
    hostShareDirectoryPath: join(hostHomeDirectory, ".local", "share", "opencode"),
    hostCacheDirectoryPath: join(hostHomeDirectory, ".cache", "open-docker-nest"),
    hostLaBriguadeConfigDirectoryPath: join(hostHomeDirectory, LA_BRIGUADE_HOST_CONFIG_RELATIVE),
    laBriguadeLocalMode,
    laBriguadeLocalPath: process.env.LA_BRIGUADE_LOCAL_PATH ?? "",
    cacheCtrlLocalMode,
    cacheCtrlLocalPath: process.env.CACHE_CTRL_LOCAL_PATH ?? "",
    cacheCtrlHostBinaryEntryPath: join(hostHomeDirectory, CACHE_CTRL_HOST_BINARY_ENTRY_RELATIVE),
    cacheCtrlHostSkillEntryPath: join(hostHomeDirectory, CACHE_CTRL_HOST_SKILL_ENTRY_RELATIVE),
    hostUid: typeof process.getuid === "function" ? process.getuid() : 1000,
    hostGid: typeof process.getgid === "function" ? process.getgid() : 1000,
    isWindows: process.platform === "win32",
  };
}

import { basename, dirname, join, resolve } from "node:path";

import type { LocalMode } from "../shared/types.js";
import { LA_BRIGUADE_HOST_PLUGIN_ENTRY_RELATIVE } from "../shared/constants.js";
import { fail } from "../shared/io.js";
import { resolvePath, resolveSymlinkTargetAbsolute } from "../shared/path-utils.js";
import {
  hasFileReadAccess,
  isReadableDirectory,
  isSymbolicLink,
  pathExistsOrSymlink,
} from "../validation/filesystem.js";

function validateExpectedLaBriguadeBuildTargetShape(resolvedTargetPath: string): void {
  const normalizedTargetPath = resolve(resolvedTargetPath);
  const normalizedTargetDirectoryPath = dirname(normalizedTargetPath);

  if (
    basename(normalizedTargetPath) !== "index.js" ||
    basename(normalizedTargetDirectoryPath) !== "dist"
  ) {
    fail(
      `Resolved la-briguade symlink target must point to '<la-briguade-repo>/dist/index.js'. Received '${resolvedTargetPath}'. Remediation: repoint ~/.config/opencode/${LA_BRIGUADE_HOST_PLUGIN_ENTRY_RELATIVE} to your local la-briguade dist/index.js build output, or disable local mode with LA_BRIGUADE_LOCAL_MODE=off.`,
    );
  }
}

function deriveLocalProjectRootFromSymlinkTarget(symlinkTargetPath: string): string {
  const derivedProjectRoot = resolvePath(resolve(dirname(symlinkTargetPath), ".."));
  const packageManifestPath = join(derivedProjectRoot, "package.json");

  if (!isReadableDirectory(derivedProjectRoot)) {
    fail(
      `Unable to derive la-briguade local project root from '${symlinkTargetPath}'. Expected directory at '<resolved-target>/../..' (resolved to '${derivedProjectRoot}'). Remediation: ensure ~/.config/opencode/plugins/index.js points into a local la-briguade layout where '../../' reaches the project root, or disable local mode with LA_BRIGUADE_LOCAL_MODE=off.`,
    );
  }

  if (!hasFileReadAccess(packageManifestPath)) {
    fail(
      `Derived la-briguade local project root is invalid: ${derivedProjectRoot}. Expected a readable package manifest at '${packageManifestPath}' to confirm a project-root mount target. Remediation: ensure ~/.config/opencode/plugins/index.js points to a local la-briguade build output where '<resolved-target>/../..' is the project root, or disable local mode with LA_BRIGUADE_LOCAL_MODE=off.`,
    );
  }

  return derivedProjectRoot;
}

export function resolveLaBriguadeLocalProjectRoot(
  localMode: LocalMode,
  hostConfigDirectoryPath: string,
  configuredLocalPath: string,
): string {
  const pluginEntryPath = join(hostConfigDirectoryPath, LA_BRIGUADE_HOST_PLUGIN_ENTRY_RELATIVE);

  let activeMode = false;
  switch (localMode) {
    case "off":
      return "";
    case "auto":
      activeMode = isSymbolicLink(pluginEntryPath);
      break;
    case "force":
      activeMode = true;
      break;
  }

  if (!activeMode) {
    return "";
  }

  if (!isSymbolicLink(pluginEntryPath)) {
    fail(
      `LA_BRIGUADE local-link mode requires ${pluginEntryPath} to be a symlink. Remediation: replace ~/.config/opencode/${LA_BRIGUADE_HOST_PLUGIN_ENTRY_RELATIVE} with a symlink to your local la-briguade dist/index.js build output.`,
    );
  }

  if (!pathExistsOrSymlink(pluginEntryPath) || !hasFileReadAccess(pluginEntryPath)) {
    fail(
      `LA_BRIGUADE local-link mode found a broken symlink at ${pluginEntryPath}. Remediation: rebuild la-briguade local output or update ~/.config/opencode/${LA_BRIGUADE_HOST_PLUGIN_ENTRY_RELATIVE} to a valid target.`,
    );
  }

  const detectedSymlinkTarget = resolveSymlinkTargetAbsolute(pluginEntryPath);
  if (!hasFileReadAccess(detectedSymlinkTarget)) {
    fail(
      `Resolved la-briguade symlink target is not readable: ${detectedSymlinkTarget}. Remediation: fix permissions on the local build target.`,
    );
  }

  validateExpectedLaBriguadeBuildTargetShape(detectedSymlinkTarget);

  const detectedProjectRoot = deriveLocalProjectRootFromSymlinkTarget(detectedSymlinkTarget);

  if (configuredLocalPath.length > 0) {
    if (localMode === "force" && !isReadableDirectory(configuredLocalPath)) {
      fail(
        `Invalid LA_BRIGUADE_LOCAL_PATH '${configuredLocalPath}'. In force mode this path must be an accessible directory (exists with read/execute permissions).`,
      );
    }

    if (configuredLocalPath !== detectedProjectRoot) {
      fail(
        `LA_BRIGUADE_LOCAL_PATH must exactly match the project root derived from the resolved symlink target ('${detectedProjectRoot}', from '${detectedSymlinkTarget}/../..') when local-link mode is active. Received '${configuredLocalPath}'.`,
      );
    }
  }

  return detectedProjectRoot;
}

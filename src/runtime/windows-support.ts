import { join } from "node:path";

import type { LocalMode } from "../shared/types.js";
import { LA_BRIGUADE_PLUGIN_ENTRY_RELATIVE } from "../shared/constants.js";
import { fail } from "../shared/io.js";
import { isSymbolicLink } from "../validation/filesystem.js";

interface WindowsSupportInput {
  readonly localModeLaBriguade: LocalMode;
  readonly localPathLaBriguade: string;
  readonly localModeCacheCtrl: LocalMode;
  readonly localPathCacheCtrl: string;
  readonly cacheCtrlHostBinaryEntryPath: string;
  readonly cacheCtrlHostSkillEntryPath: string;
  readonly resolvedProjectPath: string;
}

function failUnsupported(featureName: string): never {
  fail(
    `Windows host support for ${featureName} is not available in this change. Remediation: run core flows only on Windows (default mode, --shell, pass-through) with local-dev features disabled, or use Linux/macOS for advanced local-dev modes.`,
  );
}

export function enforceWindowsAdvancedModeSupport(input: WindowsSupportInput): void {
  const pluginEntryPath = join(input.resolvedProjectPath, LA_BRIGUADE_PLUGIN_ENTRY_RELATIVE);

  const requestedLaBriguadeMode =
    input.localModeLaBriguade === "force" ||
    input.localPathLaBriguade.length > 0 ||
    (input.localModeLaBriguade === "auto" && isSymbolicLink(pluginEntryPath));
  if (requestedLaBriguadeMode) {
    failUnsupported("LA_BRIGUADE local-dev mode");
  }

  const requestedCacheCtrlMode =
    input.localModeCacheCtrl === "force" ||
    input.localPathCacheCtrl.length > 0 ||
    (input.localModeCacheCtrl === "auto" &&
      (isSymbolicLink(input.cacheCtrlHostBinaryEntryPath) ||
        isSymbolicLink(input.cacheCtrlHostSkillEntryPath)));
  if (requestedCacheCtrlMode) {
    failUnsupported("CACHE_CTRL local-dev mode");
  }
}

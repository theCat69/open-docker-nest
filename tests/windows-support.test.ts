import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { enforceWindowsAdvancedModeSupport } from "../src/runtime/windows-support.js";
import { LA_BRIGUADE_HOST_PLUGIN_ENTRY_RELATIVE } from "../src/shared/constants.js";

const temporaryDirectoriesToRemove: string[] = [];

afterEach(() => {
  while (temporaryDirectoriesToRemove.length > 0) {
    const directoryPath = temporaryDirectoriesToRemove.pop();
    if (directoryPath !== undefined) {
      rmSync(directoryPath, { recursive: true, force: true });
    }
  }
});

function createSymlinkEntry(): string {
  const rootDirectoryPath = mkdtempSync(join(tmpdir(), "open-docker-nest-windows-support-"));
  temporaryDirectoriesToRemove.push(rootDirectoryPath);

  const targetPath = join(rootDirectoryPath, "target-file");
  writeFileSync(targetPath, "target\n");

  const symlinkPath = join(rootDirectoryPath, ".local", "bin", "cache-ctrl");
  mkdirSync(dirname(symlinkPath), { recursive: true });
  symlinkSync(targetPath, symlinkPath);
  return symlinkPath;
}

function createHostConfigPluginSymlinkPath(): { readonly hostConfigDirectoryPath: string; readonly pluginSymlinkPath: string } {
  const rootDirectoryPath = mkdtempSync(join(tmpdir(), "open-docker-nest-la-briguade-windows-"));
  temporaryDirectoriesToRemove.push(rootDirectoryPath);

  const hostConfigDirectoryPath = join(rootDirectoryPath, ".config", "opencode");
  const pluginSymlinkPath = join(hostConfigDirectoryPath, LA_BRIGUADE_HOST_PLUGIN_ENTRY_RELATIVE);
  const pluginTargetPath = join(rootDirectoryPath, "dist", "index.js");

  mkdirSync(dirname(pluginSymlinkPath), { recursive: true });
  mkdirSync(dirname(pluginTargetPath), { recursive: true });
  writeFileSync(pluginTargetPath, "module.exports = {};\n");
  symlinkSync(pluginTargetPath, pluginSymlinkPath);

  return { hostConfigDirectoryPath, pluginSymlinkPath };
}

describe("enforceWindowsAdvancedModeSupport", () => {
  it("fails with explicit diagnostics when --host-docker mode is requested", () => {
    expect(() =>
      enforceWindowsAdvancedModeSupport({
        localModeLaBriguade: "off",
        localPathLaBriguade: "",
        localModeCacheCtrl: "off",
        localPathCacheCtrl: "",
        cacheCtrlHostBinaryEntryPath: join(tmpdir(), "cache-ctrl"),
        cacheCtrlHostSkillEntryPath: join(tmpdir(), "skill"),
        hostConfigDirectoryPath: tmpdir(),
        hostDockerMode: true,
      }),
    ).toThrow(/--host-docker is not supported for native Windows hosts in this slice/);
  });

  it("fails with explicit diagnostics for cache-ctrl auto activation inputs", () => {
    const cacheCtrlBinarySymlinkPath = createSymlinkEntry();
    const cacheCtrlSkillEntryPath = join(tmpdir(), "non-symlink-skill-entry");

    expect(() =>
      enforceWindowsAdvancedModeSupport({
        localModeLaBriguade: "off",
        localPathLaBriguade: "",
        localModeCacheCtrl: "auto",
        localPathCacheCtrl: "",
        cacheCtrlHostBinaryEntryPath: cacheCtrlBinarySymlinkPath,
        cacheCtrlHostSkillEntryPath: cacheCtrlSkillEntryPath,
        hostConfigDirectoryPath: tmpdir(),
        hostDockerMode: false,
      }),
    ).toThrow(/Windows host support for CACHE_CTRL local-dev mode is not available/);
  });

  it("fails with explicit diagnostics for la-briguade auto activation via host config plugin symlink", () => {
    const fixture = createHostConfigPluginSymlinkPath();

    expect(() =>
      enforceWindowsAdvancedModeSupport({
        localModeLaBriguade: "auto",
        localPathLaBriguade: "",
        localModeCacheCtrl: "off",
        localPathCacheCtrl: "",
        cacheCtrlHostBinaryEntryPath: join(tmpdir(), "cache-ctrl"),
        cacheCtrlHostSkillEntryPath: join(tmpdir(), "skill"),
        hostConfigDirectoryPath: fixture.hostConfigDirectoryPath,
        hostDockerMode: false,
      }),
    ).toThrow(/Windows host support for LA_BRIGUADE local-dev mode is not available/);
  });
});

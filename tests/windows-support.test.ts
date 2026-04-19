import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { enforceWindowsAdvancedModeSupport } from "../src/runtime/windows-support.js";

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
  const rootDirectoryPath = mkdtempSync(join(tmpdir(), "dock-opencode-windows-support-"));
  temporaryDirectoriesToRemove.push(rootDirectoryPath);

  const targetPath = join(rootDirectoryPath, "target-file");
  writeFileSync(targetPath, "target\n");

  const symlinkPath = join(rootDirectoryPath, ".local", "bin", "cache-ctrl");
  mkdirSync(dirname(symlinkPath), { recursive: true });
  symlinkSync(targetPath, symlinkPath);
  return symlinkPath;
}

describe("enforceWindowsAdvancedModeSupport", () => {
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
        resolvedProjectPath: tmpdir(),
      }),
    ).toThrow(/Windows host support for CACHE_CTRL local-dev mode is not available/);
  });
});

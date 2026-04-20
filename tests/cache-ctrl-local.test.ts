import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { resolveCacheCtrlLocalState } from "../src/runtime/cache-ctrl-local.js";

const temporaryDirectoriesToRemove: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  while (temporaryDirectoriesToRemove.length > 0) {
    const directoryPath = temporaryDirectoriesToRemove.pop();
    if (directoryPath !== undefined) {
      rmSync(directoryPath, { recursive: true, force: true });
    }
  }
});

function createCacheCtrlFixtureRoot(): { readonly rootPath: string; readonly binaryTargetPath: string; readonly skillTargetPath: string } {
  const rootPath = mkdtempSync(join(tmpdir(), "open-docker-nest-cache-ctrl-"));
  temporaryDirectoriesToRemove.push(rootPath);

  const binDirectoryPath = join(rootPath, "bin");
  const skillDirectoryPath = join(rootPath, "skills", "cache-ctrl-caller");

  mkdirSync(binDirectoryPath, { recursive: true });
  mkdirSync(skillDirectoryPath, { recursive: true });

  const binaryTargetPath = join(binDirectoryPath, "cache-ctrl");
  const skillTargetPath = join(skillDirectoryPath, "SKILL.md");
  writeFileSync(binaryTargetPath, "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
  writeFileSync(skillTargetPath, "# skill\n");

  return { rootPath, binaryTargetPath, skillTargetPath };
}

function createCanonicalEntries(
  binaryTargetPath: string,
  skillTargetPath: string,
): { readonly binaryEntryPath: string; readonly skillEntryPath: string } {
  const homeDirectoryPath = mkdtempSync(join(tmpdir(), "open-docker-nest-cache-ctrl-home-"));
  temporaryDirectoriesToRemove.push(homeDirectoryPath);

  const binaryEntryPath = join(homeDirectoryPath, ".local", "bin", "cache-ctrl");
  const skillEntryPath = join(
    homeDirectoryPath,
    ".config",
    "opencode",
    "skills",
    "cache-ctrl-caller",
    "SKILL.md",
  );

  mkdirSync(dirname(binaryEntryPath), { recursive: true });
  mkdirSync(dirname(skillEntryPath), { recursive: true });
  symlinkSync(binaryTargetPath, binaryEntryPath);
  symlinkSync(skillTargetPath, skillEntryPath);

  return { binaryEntryPath, skillEntryPath };
}

describe("resolveCacheCtrlLocalState", () => {
  it("falls back with warning in auto mode when binary entry is a broken symlink", () => {
    const fixture = createCacheCtrlFixtureRoot();
    const canonicalEntries = createCanonicalEntries(fixture.binaryTargetPath, fixture.skillTargetPath);

    rmSync(canonicalEntries.binaryEntryPath, { force: true });
    symlinkSync(join(fixture.rootPath, "missing-binary-target"), canonicalEntries.binaryEntryPath);

    const warnSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);

    const state = resolveCacheCtrlLocalState(
      "auto",
      fixture.rootPath,
      canonicalEntries.binaryEntryPath,
      canonicalEntries.skillEntryPath,
    );

    expect(state).toEqual({
      active: false,
      projectRoot: "",
      binaryTarget: "",
    });
    expect(warnSpy).toHaveBeenCalled();
  });
});

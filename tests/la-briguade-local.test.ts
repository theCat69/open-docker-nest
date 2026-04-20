import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { resolveLaBriguadeLocalProjectRoot } from "../src/runtime/la-briguade-local.js";

const temporaryDirectoriesToRemove: string[] = [];

afterEach(() => {
  while (temporaryDirectoriesToRemove.length > 0) {
    const directoryPath = temporaryDirectoriesToRemove.pop();
    if (directoryPath !== undefined) {
      rmSync(directoryPath, { recursive: true, force: true });
    }
  }
});

function createLaBriguadeFixture(): {
  readonly hostConfigDirectoryPath: string;
  readonly projectRootPath: string;
  readonly pluginEntryPath: string;
  readonly distEntryPath: string;
} {
  const rootDirectoryPath = mkdtempSync(join(tmpdir(), "open-docker-nest-la-briguade-local-"));
  temporaryDirectoriesToRemove.push(rootDirectoryPath);

  const projectRootPath = join(rootDirectoryPath, "la-briguade-repo");
  const distEntryPath = join(projectRootPath, "dist", "index.js");
  const hostConfigDirectoryPath = join(rootDirectoryPath, "host-home", ".config", "opencode");
  const pluginEntryPath = join(hostConfigDirectoryPath, "plugins", "index.js");

  mkdirSync(dirname(distEntryPath), { recursive: true });
  mkdirSync(dirname(pluginEntryPath), { recursive: true });
  writeFileSync(join(projectRootPath, "package.json"), "{}\n");
  writeFileSync(distEntryPath, "module.exports = {};\n");

  return {
    hostConfigDirectoryPath,
    projectRootPath,
    pluginEntryPath,
    distEntryPath,
  };
}

describe("resolveLaBriguadeLocalProjectRoot", () => {
  it("does not activate in auto mode when host config plugin entry is not a symlink", () => {
    const fixture = createLaBriguadeFixture();

    writeFileSync(fixture.pluginEntryPath, "not-a-symlink\n");

    expect(resolveLaBriguadeLocalProjectRoot("auto", fixture.hostConfigDirectoryPath, "")).toBe("");
  });

  it("derives project root from ~/.config/opencode/plugins/index.js -> <repo>/dist/index.js", () => {
    const fixture = createLaBriguadeFixture();
    symlinkSync(fixture.distEntryPath, fixture.pluginEntryPath);

    expect(resolveLaBriguadeLocalProjectRoot("auto", fixture.hostConfigDirectoryPath, "")).toBe(
      fixture.projectRootPath,
    );
  });

  it("fails fast when symlink target is not <repo>/dist/index.js", () => {
    const fixture = createLaBriguadeFixture();
    const invalidTargetPath = join(fixture.projectRootPath, "src", "index.js");
    mkdirSync(dirname(invalidTargetPath), { recursive: true });
    writeFileSync(invalidTargetPath, "module.exports = {};\n");
    symlinkSync(invalidTargetPath, fixture.pluginEntryPath);

    expect(() =>
      resolveLaBriguadeLocalProjectRoot("force", fixture.hostConfigDirectoryPath, ""),
    ).toThrow(/must point to '<la-briguade-repo>\/dist\/index.js'/);
  });

  it("fails fast when LA_BRIGUADE_LOCAL_PATH does not match derived root", () => {
    const fixture = createLaBriguadeFixture();
    symlinkSync(fixture.distEntryPath, fixture.pluginEntryPath);
    const mismatchedExistingDirectoryPath = join(dirname(fixture.projectRootPath), "other-repo");
    mkdirSync(mismatchedExistingDirectoryPath, { recursive: true });

    expect(() =>
      resolveLaBriguadeLocalProjectRoot(
        "force",
        fixture.hostConfigDirectoryPath,
        mismatchedExistingDirectoryPath,
      ),
    ).toThrow(/LA_BRIGUADE_LOCAL_PATH must exactly match/);
  });
});

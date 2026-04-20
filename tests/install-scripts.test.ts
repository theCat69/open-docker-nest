import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

const temporaryPathsToRemove: string[] = [];
const currentFilePath = fileURLToPath(import.meta.url);
const repositoryRootPath = resolve(dirname(currentFilePath), "..");

afterEach(() => {
  while (temporaryPathsToRemove.length > 0) {
    const pathToRemove = temporaryPathsToRemove.pop();
    if (pathToRemove !== undefined) {
      rmSync(pathToRemove, { recursive: true, force: true });
    }
  }
});

function createTemporaryHomeDirectory(): string {
  const homePath = mkdtempSync(join(tmpdir(), "open-docker-nest-install-test-home-"));
  temporaryPathsToRemove.push(homePath);
  return homePath;
}

function runScript(scriptName: "install.sh" | "uninstall.sh", homePath: string, pathValue: string) {
  return spawnSync("sh", [scriptName], {
    cwd: repositoryRootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      HOME: homePath,
      PATH: pathValue,
    },
  });
}

describe("local install scripts", () => {
  it("installs and uninstalls the managed symlink idempotently", () => {
    const homePath = createTemporaryHomeDirectory();
    const pathValue = "/usr/bin:/bin";

    const firstInstall = runScript("install.sh", homePath, pathValue);
    expect(firstInstall.status).toBe(0);
    expect(firstInstall.stdout).toContain("Installed open-docker-nest");

    const secondInstall = runScript("install.sh", homePath, pathValue);
    expect(secondInstall.status).toBe(0);
    expect(secondInstall.stdout).toContain("already installed");

    const firstUninstall = runScript("uninstall.sh", homePath, pathValue);
    expect(firstUninstall.status).toBe(0);
    expect(firstUninstall.stdout).toContain("Uninstalled open-docker-nest");

    const secondUninstall = runScript("uninstall.sh", homePath, pathValue);
    expect(secondUninstall.status).toBe(0);
    expect(secondUninstall.stdout).toContain("is not installed");
  });

  it("refuses to overwrite unrelated non-symlink install targets", () => {
    const homePath = createTemporaryHomeDirectory();
    const installPath = join(homePath, ".local", "bin", "open-docker-nest");
    const installDirectoryPath = join(homePath, ".local", "bin");
    rmSync(installDirectoryPath, { recursive: true, force: true });

    mkdirSync(installDirectoryPath, { recursive: true });
    writeFileSync(installPath, "#!/usr/bin/env sh\necho unmanaged\n");

    const result = runScript("install.sh", homePath, "/usr/bin:/bin");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to overwrite non-symlink path");
  });

  it("refuses to remove unrelated symlink targets", () => {
    const homePath = createTemporaryHomeDirectory();
    const installDirectoryPath = join(homePath, ".local", "bin");
    const installPath = join(installDirectoryPath, "open-docker-nest");
    const unrelatedTargetPath = join(homePath, "another-script.sh");

    mkdirSync(installDirectoryPath, { recursive: true });
    writeFileSync(unrelatedTargetPath, "#!/usr/bin/env sh\necho unrelated\n");
    symlinkSync(unrelatedTargetPath, installPath);

    const result = runScript("uninstall.sh", homePath, "/usr/bin:/bin");
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to remove unrelated symlink");
  });

  it("warns when ~/.local/bin is not in PATH", () => {
    const homePath = createTemporaryHomeDirectory();
    const result = runScript("install.sh", homePath, "/usr/bin:/bin");

    expect(result.status).toBe(0);
    expect(result.stderr).toContain("is not in PATH");
  });
});

import { afterEach, describe, expect, it } from "vitest";

import {
  createTemporaryDirectory,
  getRepositoryRootPath,
  removeDirectoryIfPresent,
  runShellModeSmoke,
  runWrapper,
  runWrapperThroughTimeout,
} from "./helpers/wrapper-test-harness";

/**
 * Maintainer note:
 * This file protects wrapper-mode behavior only (shell/default/pass-through).
 * Keep assertions stable and user-visible; avoid output-format-level coupling.
 */

const temporaryPathsToClean: string[] = [];

afterEach(() => {
  while (temporaryPathsToClean.length > 0) {
    const pathToRemove = temporaryPathsToClean.pop();
    if (pathToRemove !== undefined) {
      removeDirectoryIfPresent(pathToRemove);
    }
  }
});

describe("docker wrapper mode smoke coverage", () => {
  it("supports interactive shell mode via --shell", () => {
    const projectPath = getRepositoryRootPath();
    const result = runShellModeSmoke(projectPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("opencode");
    expect(result.stdout).toContain("/home/opencode");
  });

  it("keeps default no-arg mode running the default command", () => {
    const projectPath = getRepositoryRootPath();
    const result = runWrapperThroughTimeout(projectPath, 8);

    // timeout returns 124 because the default TUI keeps running.
    expect(result.status).toBe(124);
  });

  it("forwards pass-through command arguments unchanged", () => {
    const fixtureProjectPath = createTemporaryDirectory("dock-opencode-e2e-pass-through-");
    temporaryPathsToClean.push(fixtureProjectPath);

    const result = runWrapper(fixtureProjectPath, [
      "--",
      "/usr/bin/env",
      "bash",
      "-lc",
      'printf "%s\\n" "$0" "$1" "$2"',
      "passthrough-check",
      "alpha",
      "beta",
    ]);

    expect(result.status).toBe(0);
    const outputLines = result.stdout.split(/\r?\n/).filter((line) => line.length > 0);
    expect(outputLines).toEqual(["passthrough-check", "alpha", "beta"]);
  });
});

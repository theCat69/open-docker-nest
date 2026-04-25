import { afterEach, describe, expect, it } from "vitest";

import {
  createTemporaryDirectory,
  getRepositoryRootPath,
  removeDirectoryIfPresent,
  runShellModeSmoke,
  runWrapper,
  runWrapperWithEnvironmentOverrides,
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
    const fixtureProjectPath = createTemporaryDirectory("open-docker-nest-e2e-pass-through-");
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

  it("exposes Java 25 and Rust native-build baseline to the non-root runtime user", () => {
    const fixtureProjectPath = createTemporaryDirectory("open-docker-nest-e2e-toolchains-");
    temporaryPathsToClean.push(fixtureProjectPath);

    const result = runWrapper(fixtureProjectPath, [
      "--java",
      "25",
      "--",
      "/usr/bin/env",
      "bash",
      "-lc",
      "java -version >/dev/null && javac -version >/dev/null && command -v cc >/dev/null && rustc --version >/dev/null && cargo --version >/dev/null && printf 'fn main() { println!(\"rust-linker-ok\"); }\n' > /tmp/rust-linker-smoke.rs && rustc /tmp/rust-linker-smoke.rs -o /tmp/rust-linker-smoke && /tmp/rust-linker-smoke >/dev/null",
    ]);

    expect(result.status).toBe(0);
  });

  it("exposes Playwright CLI and bundled Chromium to the non-root runtime user", () => {
    const fixtureProjectPath = createTemporaryDirectory("open-docker-nest-e2e-playwright-");
    temporaryPathsToClean.push(fixtureProjectPath);

    const result = runWrapper(fixtureProjectPath, [
      "--",
      "/usr/bin/env",
      "bash",
      "-lc",
      "playwright --version >/dev/null && test \"${PLAYWRIGHT_BROWSERS_PATH:-}\" = \"/ms-playwright\" && test -d /ms-playwright && test -r /ms-playwright && test -x /ms-playwright && playwright screenshot --browser=chromium --timeout=20000 about:blank /tmp/playwright-smoke.png >/dev/null",
    ]);

    expect(result.status).toBe(0);
  });

  it("runs host-docker mode on Unix-like hosts and reaches host daemon from inside container", () => {
    const fixtureProjectPath = createTemporaryDirectory("open-docker-nest-e2e-host-docker-");
    temporaryPathsToClean.push(fixtureProjectPath);

    const result = runWrapperWithEnvironmentOverrides(
      fixtureProjectPath,
      ["--host-docker", "--", "docker", "info", "--format", "{{.ServerVersion}}"],
      { DOCKER_HOST: undefined, DOCKER_CONTEXT: undefined },
    );

    expect(result.status).toBe(0);
    expect(result.stdout.trim().length).toBeGreaterThan(0);
  }, 120_000);

  it("fails fast with unsupported host diagnostics for host-docker non-local docker hosts", () => {
    const fixtureProjectPath = createTemporaryDirectory("open-docker-nest-e2e-host-docker-unsupported-");
    temporaryPathsToClean.push(fixtureProjectPath);

    const result = runWrapperWithEnvironmentOverrides(
      fixtureProjectPath,
      ["--host-docker", "--", "docker", "version"],
      { DOCKER_HOST: "tcp://127.0.0.1:2375" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("currently supports only local Unix-socket Docker hosts");
  });

  it("fails fast with unsupported host diagnostics for host-docker non-default docker context", () => {
    const fixtureProjectPath = createTemporaryDirectory("open-docker-nest-e2e-host-docker-context-");
    temporaryPathsToClean.push(fixtureProjectPath);

    const result = runWrapperWithEnvironmentOverrides(
      fixtureProjectPath,
      ["--host-docker", "--", "docker", "version"],
      { DOCKER_CONTEXT: "remote-prod", DOCKER_HOST: undefined },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Unsupported DOCKER_CONTEXT");
  });

  it("fails fast for removed --repo-command flag with migration guidance", () => {
    const fixtureProjectPath = createTemporaryDirectory("open-docker-nest-e2e-removed-repo-command-");
    temporaryPathsToClean.push(fixtureProjectPath);

    const result = runWrapper(fixtureProjectPath, ["--repo-command", "--", "docker", "version"]);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--repo-command has been removed");
    expect(result.stderr).toContain("use --host-docker");
  });
});

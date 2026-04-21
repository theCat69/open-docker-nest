import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RuntimeContext } from "../src/shared/types.js";

const mockSpawnSync = vi.hoisted(() => vi.fn());
const mockPathExistsOrSymlink = vi.hoisted(() => vi.fn());
const mockIsBrokenSymlink = vi.hoisted(() => vi.fn());
const mockIsUnixSocket = vi.hoisted(() => vi.fn());
const mockHasFileReadWriteAccess = vi.hoisted(() => vi.fn());
const mockGetPathGroupId = vi.hoisted(() => vi.fn());
const mockIsReadablePath = vi.hoisted(() => vi.fn());
const mockIsReadableDirectory = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

vi.mock("../src/validation/filesystem.js", () => ({
  pathExistsOrSymlink: mockPathExistsOrSymlink,
  isBrokenSymlink: mockIsBrokenSymlink,
  isUnixSocket: mockIsUnixSocket,
  hasFileReadWriteAccess: mockHasFileReadWriteAccess,
  getPathGroupId: mockGetPathGroupId,
  isReadablePath: mockIsReadablePath,
  isReadableDirectory: mockIsReadableDirectory,
}));

vi.mock("../src/runtime/la-briguade-local.js", () => ({
  resolveLaBriguadeLocalProjectRoot: () => "",
}));

vi.mock("../src/runtime/cache-ctrl-local.js", () => ({
  resolveCacheCtrlLocalState: () => ({
    active: false,
    projectRoot: "",
    binaryTarget: "",
  }),
}));

vi.mock("../src/runtime/windows-support.js", () => ({
  enforceWindowsAdvancedModeSupport: vi.fn(),
}));

import { buildDockerRuntimePlan } from "../src/runtime/runtime-plan.js";

const temporaryDirectoriesToRemove: string[] = [];

beforeEach(() => {
  mockSpawnSync.mockReset();
  mockSpawnSync.mockReturnValue({
    error: undefined,
    status: 0,
    stdout: "default\n",
    stderr: "",
  });
});

afterEach(() => {
  while (temporaryDirectoriesToRemove.length > 0) {
    const directoryPath = temporaryDirectoriesToRemove.pop();
    if (directoryPath !== undefined) {
      rmSync(directoryPath, { recursive: true, force: true });
    }
  }

  vi.unstubAllEnvs();
  mockPathExistsOrSymlink.mockReset();
  mockIsBrokenSymlink.mockReset();
  mockIsUnixSocket.mockReset();
  mockHasFileReadWriteAccess.mockReset();
  mockGetPathGroupId.mockReset();
  mockIsReadablePath.mockReset();
  mockIsReadableDirectory.mockReset();
});

function createRuntimeContextFixture(): RuntimeContext {
  const rootDirectoryPath = mkdtempSync(join(tmpdir(), "open-docker-nest-runtime-plan-"));
  temporaryDirectoriesToRemove.push(rootDirectoryPath);

  const projectPath = join(rootDirectoryPath, "project");
  const configPath = join(rootDirectoryPath, "config");
  const statePath = join(rootDirectoryPath, "state");
  const sharePath = join(rootDirectoryPath, "share");
  const cachePath = join(rootDirectoryPath, "cache");

  mkdirSync(projectPath, { recursive: true });
  mkdirSync(configPath, { recursive: true });
  mkdirSync(statePath, { recursive: true });
  mkdirSync(sharePath, { recursive: true });

  const cacheCtrlBinaryPath = join(rootDirectoryPath, "cache-ctrl");
  const cacheCtrlSkillPath = join(rootDirectoryPath, "skill.md");
  writeFileSync(cacheCtrlBinaryPath, "#!/usr/bin/env bash\nexit 0\n", { mode: 0o755 });
  writeFileSync(cacheCtrlSkillPath, "# skill\n");

  return {
    resolvedProjectPath: projectPath,
    extraContainerEnvironment: {},
    hostConfigDirectoryPath: configPath,
    hostStateDirectoryPath: statePath,
    hostShareDirectoryPath: sharePath,
    hostCacheDirectoryPath: cachePath,
    hostLaBriguadeConfigDirectoryPath: join(rootDirectoryPath, "la_briguade"),
    laBriguadeLocalMode: "off",
    laBriguadeLocalPath: "",
    cacheCtrlLocalMode: "off",
    cacheCtrlLocalPath: "",
    cacheCtrlHostBinaryEntryPath: cacheCtrlBinaryPath,
    cacheCtrlHostSkillEntryPath: cacheCtrlSkillPath,
    hostUid: 1000,
    hostGid: 1000,
    isWindows: false,
  };
}

describe("buildDockerRuntimePlan", () => {
  it("adds docker socket bridge only when host-docker mode is active", () => {
    const context = createRuntimeContextFixture();
    mockIsReadablePath.mockReturnValue(false);

    const regularPlan = buildDockerRuntimePlan(context, "open-docker-nest:latest", false, false, ["opencode", "--help"]);

    expect(regularPlan.dockerRunArgs).not.toContain("/var/run/docker.sock:/var/run/docker.sock");

    mockPathExistsOrSymlink.mockReturnValue(true);
    mockIsBrokenSymlink.mockReturnValue(false);
    mockIsUnixSocket.mockReturnValue(true);
    mockHasFileReadWriteAccess.mockReturnValue(true);
    mockGetPathGroupId.mockReturnValue(1234);

    const hostDockerPlan = buildDockerRuntimePlan(context, "open-docker-nest:latest", false, true, ["docker", "version"]);

    expect(hostDockerPlan.dockerRunArgs).toContain("/var/run/docker.sock:/var/run/docker.sock");
    expect(hostDockerPlan.dockerRunArgs).toContain("DOCKER_HOST=unix:///var/run/docker.sock");
    expect(hostDockerPlan.dockerRunArgs).toContain("OPEN_DOCKER_NEST_SOCKET_GID=1234");
  });

  it("rejects unsupported non-local docker host for host-docker mode", () => {
    const context = createRuntimeContextFixture();
    vi.stubEnv("DOCKER_HOST", "tcp://127.0.0.1:2375");

    expect(() =>
      buildDockerRuntimePlan(context, "open-docker-nest:latest", false, true, ["docker", "version"]),
    ).toThrow(/--host-docker currently supports only local Unix-socket Docker hosts/);
  });

  it("rejects unsupported non-default docker context for host-docker mode", () => {
    const context = createRuntimeContextFixture();
    vi.stubEnv("DOCKER_CONTEXT", "remote-prod");

    expect(() =>
      buildDockerRuntimePlan(context, "open-docker-nest:latest", false, true, ["docker", "version"]),
    ).toThrow(/Unsupported DOCKER_CONTEXT/);
  });

  it("rejects unsupported non-default active docker context even when DOCKER_CONTEXT is unset", () => {
    const context = createRuntimeContextFixture();
    mockSpawnSync.mockReturnValue({
      error: undefined,
      status: 0,
      stdout: "remote-prod\n",
      stderr: "",
    });

    expect(() =>
      buildDockerRuntimePlan(context, "open-docker-nest:latest", false, true, ["docker", "version"]),
    ).toThrow(/Active Docker context is unsupported: remote-prod/);
  });

  it("fails fast when host docker daemon is unreachable despite valid socket metadata", () => {
    const context = createRuntimeContextFixture();
    mockPathExistsOrSymlink.mockReturnValue(true);
    mockIsBrokenSymlink.mockReturnValue(false);
    mockIsUnixSocket.mockReturnValue(true);
    mockHasFileReadWriteAccess.mockReturnValue(true);
    mockSpawnSync
      .mockReturnValueOnce({
        error: undefined,
        status: 0,
        stdout: "default\n",
        stderr: "",
      })
      .mockReturnValueOnce({
        error: undefined,
        status: 1,
        stdout: "",
        stderr: "Cannot connect to the Docker daemon at unix:///var/run/docker.sock",
      });

    expect(() =>
      buildDockerRuntimePlan(context, "open-docker-nest:latest", false, true, ["docker", "version"]),
    ).toThrow(/could not reach a usable host Docker daemon/);
  });

  it("fails fast when docker socket is missing for host-docker mode", () => {
    const context = createRuntimeContextFixture();
    mockPathExistsOrSymlink.mockReturnValue(false);

    expect(() =>
      buildDockerRuntimePlan(context, "open-docker-nest:latest", false, true, ["docker", "version"]),
    ).toThrow(/--host-docker requires a local Docker daemon socket at \/var\/run\/docker.sock, but it was not found/);
  });

  it("fails fast when docker socket is unreadable for host-docker mode", () => {
    const context = createRuntimeContextFixture();
    mockPathExistsOrSymlink.mockReturnValue(true);
    mockIsBrokenSymlink.mockReturnValue(false);
    mockIsUnixSocket.mockReturnValue(true);
    mockHasFileReadWriteAccess.mockReturnValue(false);

    expect(() =>
      buildDockerRuntimePlan(context, "open-docker-nest:latest", false, true, ["docker", "version"]),
    ).toThrow(/--host-docker cannot access \/var\/run\/docker.sock with read\/write permissions/);
  });

  it("adds validated project extra container environment values", () => {
    const context = createRuntimeContextFixture();
    mockIsReadablePath.mockReturnValue(false);

    const contextWithExtraEnvironment: RuntimeContext = {
      ...context,
      extraContainerEnvironment: {
        OPENAI_API_KEY: "secret-value",
        FEATURE_FLAG: "on",
      },
    };

    const runtimePlan = buildDockerRuntimePlan(
      contextWithExtraEnvironment,
      "open-docker-nest:latest",
      false,
      false,
      ["opencode", "--help"],
    );

    expect(runtimePlan.dockerRunArgs).toContain("OPENAI_API_KEY");
    expect(runtimePlan.dockerRunArgs).toContain("FEATURE_FLAG");
    expect(runtimePlan.dockerRunArgs).not.toContain("OPENAI_API_KEY=secret-value");
    expect(runtimePlan.dockerRunArgs).not.toContain("FEATURE_FLAG=on");
    expect(runtimePlan.dockerClientEnvironment).toEqual({
      OPENAI_API_KEY: "secret-value",
      FEATURE_FLAG: "on",
    });
  });
});

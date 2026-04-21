import { afterEach, describe, expect, it, vi } from "vitest";

import type { ParsedCliOptions, RuntimeContext } from "../src/shared/types.js";

const parseCliArgumentsMock = vi.hoisted(() => vi.fn<() => ParsedCliOptions>());
const ensureDockerCliAvailableMock = vi.hoisted(() => vi.fn());
const executeDockerRunMock = vi.hoisted(() => vi.fn());
const printUsageMock = vi.hoisted(() => vi.fn());
const isDirectoryMock = vi.hoisted(() => vi.fn(() => true));
const ensureDirectoryMock = vi.hoisted(() => vi.fn());
const resolvePathMock = vi.hoisted(() => vi.fn((value: string) => value));
const buildRuntimeContextMock = vi.hoisted(() => vi.fn<() => RuntimeContext>());
const buildDockerRuntimePlanMock = vi.hoisted(() => vi.fn());

vi.mock("../src/validation/cli.js", () => ({
  parseCliArguments: parseCliArgumentsMock,
}));

vi.mock("../src/runtime/process.js", () => ({
  ensureDockerCliAvailable: ensureDockerCliAvailableMock,
  executeDockerRun: executeDockerRunMock,
}));

vi.mock("../src/shared/io.js", () => ({
  printUsage: printUsageMock,
  fail: (message: string) => {
    throw new Error(message);
  },
}));

vi.mock("../src/validation/filesystem.js", () => ({
  isDirectory: isDirectoryMock,
  ensureDirectory: ensureDirectoryMock,
}));

vi.mock("../src/shared/path-utils.js", () => ({
  resolvePath: resolvePathMock,
}));

vi.mock("../src/runtime/context.js", () => ({
  buildRuntimeContext: buildRuntimeContextMock,
}));

vi.mock("../src/runtime/runtime-plan.js", () => ({
  buildDockerRuntimePlan: buildDockerRuntimePlanMock,
}));

import { main } from "../src/index.js";

const runtimeContextFixture: RuntimeContext = {
  resolvedProjectPath: "/workspace",
  extraContainerEnvironment: {},
  hostConfigDirectoryPath: "/tmp/config",
  hostStateDirectoryPath: "/tmp/state",
  hostShareDirectoryPath: "/tmp/share",
  hostCacheDirectoryPath: "/tmp/cache",
  hostLaBriguadeConfigDirectoryPath: "/tmp/la_briguade",
  laBriguadeLocalMode: "off",
  laBriguadeLocalPath: "",
  cacheCtrlLocalMode: "off",
  cacheCtrlLocalPath: "",
  cacheCtrlHostBinaryEntryPath: "/tmp/cache-ctrl",
  cacheCtrlHostSkillEntryPath: "/tmp/skill.md",
  hostUid: 1000,
  hostGid: 1000,
  isWindows: false,
};

afterEach(() => {
  parseCliArgumentsMock.mockReset();
  ensureDockerCliAvailableMock.mockReset();
  executeDockerRunMock.mockReset();
  printUsageMock.mockReset();
  isDirectoryMock.mockReset();
  ensureDirectoryMock.mockReset();
  resolvePathMock.mockReset();
  buildRuntimeContextMock.mockReset();
  buildDockerRuntimePlanMock.mockReset();

  isDirectoryMock.mockReturnValue(true);
  resolvePathMock.mockImplementation((value: string) => value);
  buildRuntimeContextMock.mockReturnValue(runtimeContextFixture);
  buildDockerRuntimePlanMock.mockReturnValue({
    imageRef: "open-docker-nest:latest",
    dockerRunArgs: ["--rm"],
    dockerClientEnvironment: {},
    commandToRun: ["opencode"],
  });
});

describe("main startup ordering", () => {
  it("prints help without probing docker CLI", async () => {
    parseCliArgumentsMock.mockReturnValue({
      projectPath: "/workspace",
      imageRef: "open-docker-nest:latest",
      javaVersion: "21",
      shellMode: false,
      hostDockerMode: false,
      passthroughCommand: [],
      helpRequested: true,
    });

    await main();

    expect(printUsageMock).toHaveBeenCalledOnce();
    expect(ensureDockerCliAvailableMock).not.toHaveBeenCalled();
    expect(executeDockerRunMock).not.toHaveBeenCalled();
  });

  it("probes docker CLI before execution when not in help mode", async () => {
    parseCliArgumentsMock.mockReturnValue({
      projectPath: "/workspace",
      imageRef: "open-docker-nest:latest",
      javaVersion: "24",
      shellMode: false,
      hostDockerMode: false,
      passthroughCommand: ["opencode", "--help"],
      helpRequested: false,
    });

    await main();

    expect(ensureDockerCliAvailableMock).toHaveBeenCalledOnce();
    expect(buildDockerRuntimePlanMock).toHaveBeenCalledWith(
      runtimeContextFixture,
      "open-docker-nest:latest",
      "24",
      false,
      false,
      ["opencode", "--help"],
    );
    expect(executeDockerRunMock).toHaveBeenCalledOnce();
  });
});

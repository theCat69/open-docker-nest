import { afterEach, describe, expect, it, vi } from "vitest";

import type { ParsedCliOptions, RuntimeContext } from "../src/shared/types.js";

const parseCliArgumentsMock = vi.hoisted(() => vi.fn<() => ParsedCliOptions>());
const ensureDockerCliAvailableMock = vi.hoisted(() => vi.fn());
const executeDockerRunMock = vi.hoisted(() => vi.fn());
const runExplicitUpdateFlowMock = vi.hoisted(() => vi.fn());
const printUsageMock = vi.hoisted(() => vi.fn());
const isDirectoryMock = vi.hoisted(() => vi.fn(() => true));
const ensureDirectoryMock = vi.hoisted(() => vi.fn());
const resolvePathMock = vi.hoisted(() => vi.fn((value: string) => value));
const buildRuntimeContextMock = vi.hoisted(() => vi.fn<() => RuntimeContext>());
const buildDockerRuntimePlanMock = vi.hoisted(() => vi.fn());
const ensureImplicitDefaultImageAvailableMock = vi.hoisted(() => vi.fn());

vi.mock("../src/validation/cli.js", () => ({
  parseCliArguments: parseCliArgumentsMock,
}));

vi.mock("../src/runtime/process.js", () => ({
  ensureDockerCliAvailable: ensureDockerCliAvailableMock,
  executeDockerRun: executeDockerRunMock,
  runExplicitUpdateFlow: runExplicitUpdateFlowMock,
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

vi.mock("../src/runtime/default-image-warning.js", () => ({
  ensureImplicitDefaultImageAvailable: ensureImplicitDefaultImageAvailableMock,
}));

import { main } from "../src/index.js";

const runtimeContextFixture: RuntimeContext = {
  resolvedProjectPath: "/workspace",
  extraContainerEnvironment: {},
  hostGitConfigFilePath: "/tmp/.gitconfig",
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
  runExplicitUpdateFlowMock.mockReset();
  ensureImplicitDefaultImageAvailableMock.mockReset();

  isDirectoryMock.mockReturnValue(true);
  resolvePathMock.mockImplementation((value: string) => value);
  buildRuntimeContextMock.mockReturnValue(runtimeContextFixture);
  buildDockerRuntimePlanMock.mockReturnValue({
    imageRef: "felixdock/open-docker-nest:latest",
    dockerRunArgs: ["--rm"],
    dockerClientEnvironment: {},
    commandToRun: ["opencode"],
  });
});

describe("main startup ordering", () => {
  it("prints help without probing docker CLI", async () => {
    parseCliArgumentsMock.mockReturnValue({
      projectPath: "/workspace",
      updateRequested: false,
      imageRef: "felixdock/open-docker-nest:latest",
      imageSelectionSource: "default",
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
      updateRequested: false,
      imageRef: "felixdock/open-docker-nest:latest",
      imageSelectionSource: "default",
      javaVersion: "25",
      shellMode: false,
      hostDockerMode: false,
      passthroughCommand: ["opencode", "--help"],
      helpRequested: false,
    });

    await main();

    expect(ensureDockerCliAvailableMock).toHaveBeenCalledOnce();
    expect(ensureImplicitDefaultImageAvailableMock).toHaveBeenCalledOnce();
    expect(buildDockerRuntimePlanMock).toHaveBeenCalledWith(
      runtimeContextFixture,
      "felixdock/open-docker-nest:latest",
      "25",
      false,
      false,
      ["opencode", "--help"],
    );
    expect(executeDockerRunMock).toHaveBeenCalledOnce();
  });

  it("skips implicit default-image warning for explicit image selections", async () => {
    parseCliArgumentsMock.mockReturnValue({
      projectPath: "/workspace",
      updateRequested: false,
      imageRef: "example/custom:image",
      imageSelectionSource: "cli",
      javaVersion: "21",
      shellMode: false,
      hostDockerMode: false,
      passthroughCommand: [],
      helpRequested: false,
    });

    await main();

    expect(ensureImplicitDefaultImageAvailableMock).not.toHaveBeenCalled();
  });

  it("skips implicit default-image warning for environment image selection", async () => {
    parseCliArgumentsMock.mockReturnValue({
      projectPath: "/workspace",
      updateRequested: false,
      imageRef: "example/custom:image",
      imageSelectionSource: "environment",
      javaVersion: "21",
      shellMode: false,
      hostDockerMode: false,
      passthroughCommand: [],
      helpRequested: false,
    });

    await main();

    expect(ensureImplicitDefaultImageAvailableMock).not.toHaveBeenCalled();
  });

  it("runs explicit update flow and skips runtime execution", async () => {
    parseCliArgumentsMock.mockReturnValue({
      projectPath: "/workspace",
      updateRequested: true,
      imageRef: "felixdock/open-docker-nest:latest",
      imageSelectionSource: "default",
      javaVersion: "21",
      shellMode: false,
      hostDockerMode: false,
      passthroughCommand: [],
      helpRequested: false,
    });

    await main();

    expect(ensureDockerCliAvailableMock).not.toHaveBeenCalled();
    expect(runExplicitUpdateFlowMock).toHaveBeenCalledOnce();
    expect(ensureImplicitDefaultImageAvailableMock).not.toHaveBeenCalled();
    expect(buildRuntimeContextMock).not.toHaveBeenCalled();
    expect(executeDockerRunMock).not.toHaveBeenCalled();
  });
});

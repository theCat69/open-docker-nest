import { describe, expect, it, vi, afterEach } from "vitest";

import type { DockerRuntimePlan } from "../src/shared/types.js";
import { DEFAULT_IMAGE, NPM_PACKAGE_LATEST } from "../src/shared/constants.js";

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: spawnSyncMock,
}));

const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit invoked");
});

const processKillSpy = vi.spyOn(process, "kill").mockImplementation(() => true);

import { executeDockerRun, runExplicitUpdateFlow } from "../src/runtime/process.js";

const samplePlan: DockerRuntimePlan = {
  imageRef: "felixdock/open-docker-nest:latest",
  dockerRunArgs: ["--rm"],
  dockerClientEnvironment: {},
  commandToRun: ["opencode", "--help"],
};

afterEach(() => {
  spawnSyncMock.mockReset();
  processExitSpy.mockClear();
  processKillSpy.mockClear();
});

describe("executeDockerRun", () => {
  it("exits with docker status code for normal exits", () => {
    spawnSyncMock.mockReturnValue({
      error: undefined,
      signal: null,
      status: 17,
    });

    expect(() => executeDockerRun(samplePlan)).toThrow("process.exit invoked");
    expect(processExitSpy).toHaveBeenCalledWith(17);
    expect(processKillSpy).not.toHaveBeenCalled();
  });

  it("passes runtime env values via docker client process env", () => {
    spawnSyncMock.mockReturnValue({
      error: undefined,
      signal: null,
      status: 0,
    });

    expect(() =>
      executeDockerRun({
        ...samplePlan,
        dockerClientEnvironment: {
          OPENAI_API_KEY: "secret-value",
        },
      }),
    ).toThrow("process.exit invoked");

    expect(spawnSyncMock).toHaveBeenCalledWith(
      "docker",
      ["run", "--rm", "felixdock/open-docker-nest:latest", "opencode", "--help"],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          OPENAI_API_KEY: "secret-value",
        }),
      }),
    );
  });

  it("re-sends terminating signals to preserve interrupt semantics", () => {
    spawnSyncMock.mockReturnValue({
      error: undefined,
      signal: "SIGINT",
      status: null,
    });

    expect(() => executeDockerRun(samplePlan)).toThrow(/wrapper could not terminate with the same signal/);
    expect(processKillSpy).toHaveBeenCalledWith(process.pid, "SIGINT");
    expect(processExitSpy).not.toHaveBeenCalled();
  });
});

describe("runExplicitUpdateFlow", () => {
  it("runs npm update then docker pull", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 0,
        error: undefined,
        signal: null,
      })
      .mockReturnValueOnce({
        status: 0,
        error: undefined,
        signal: null,
      });

    runExplicitUpdateFlow();

    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      1,
      "npm",
      ["install", "-g", NPM_PACKAGE_LATEST],
      expect.objectContaining({ stdio: "inherit" }),
    );
    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      2,
      "docker",
      ["pull", DEFAULT_IMAGE],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });

  it("fails fast when npm install fails", () => {
    spawnSyncMock.mockReturnValueOnce({
      status: 1,
      error: undefined,
      signal: null,
    });

    expect(() => runExplicitUpdateFlow()).toThrow(/Failed to update npm package/);
  });

  it("fails fast when docker pull fails after npm update", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 0,
        error: undefined,
        signal: null,
      })
      .mockReturnValueOnce({
        status: 1,
        error: undefined,
        signal: null,
      });

    expect(() => runExplicitUpdateFlow()).toThrow(/npm package update succeeded, but failed to pull/);
  });
});

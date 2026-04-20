import { describe, expect, it, vi, afterEach } from "vitest";

import type { DockerRuntimePlan } from "../src/shared/types.js";

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: spawnSyncMock,
}));

const processExitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit invoked");
});

const processKillSpy = vi.spyOn(process, "kill").mockImplementation(() => true);

import { executeDockerRun } from "../src/runtime/process.js";

const samplePlan: DockerRuntimePlan = {
  imageRef: "opencode-docker:latest",
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
      ["run", "--rm", "opencode-docker:latest", "opencode", "--help"],
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

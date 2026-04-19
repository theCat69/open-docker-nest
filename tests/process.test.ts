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

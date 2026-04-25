import { afterEach, describe, expect, it, vi } from "vitest";

const spawnSyncMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: spawnSyncMock,
}));

vi.mock("../src/shared/io.js", () => ({
  fail: (message: string) => {
    throw new Error(message);
  },
}));

import { ensureImplicitDefaultImageAvailable } from "../src/runtime/default-image-warning.js";

afterEach(() => {
  spawnSyncMock.mockReset();
});

describe("ensureImplicitDefaultImageAvailable", () => {
  it("does nothing when the default image exists locally", () => {
    spawnSyncMock.mockReturnValueOnce({
      status: 0,
      error: undefined,
      signal: null,
    });

    ensureImplicitDefaultImageAvailable();

    expect(spawnSyncMock).toHaveBeenCalledOnce();
    expect(spawnSyncMock).toHaveBeenCalledWith(
      "docker",
      ["image", "inspect", "felixdock/open-docker-nest:latest", "--format", "{{.Id}}"],
      expect.objectContaining({ stdio: ["ignore", "ignore", "pipe"], encoding: "utf8" }),
    );
  });

  it("pulls the default image when missing locally", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 1,
        error: undefined,
        signal: null,
        stderr: "Error response from daemon: No such image: felixdock/open-docker-nest:latest",
      })
      .mockReturnValueOnce({
        status: 0,
        error: undefined,
        signal: null,
      });

    ensureImplicitDefaultImageAvailable();

    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      2,
      "docker",
      ["pull", "felixdock/open-docker-nest:latest"],
      expect.objectContaining({ stdio: "inherit" }),
    );
  });

  it("fails fast when pulling a missing image fails", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 1,
        error: undefined,
        signal: null,
        stderr: "Error response from daemon: No such image: felixdock/open-docker-nest:latest",
      })
      .mockReturnValueOnce({
        status: 1,
        error: undefined,
        signal: null,
      });

    expect(() => ensureImplicitDefaultImageAvailable()).toThrow(/Unable to pull missing default image/);
  });

  it("fails fast when inspect fails for non-missing-image reasons", () => {
    spawnSyncMock.mockReturnValueOnce({
      status: 1,
      error: undefined,
      signal: null,
      stderr: "Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?",
    });

    expect(() => ensureImplicitDefaultImageAvailable()).toThrow(/Unable to verify local default image/);
    expect(spawnSyncMock).toHaveBeenCalledOnce();
  });
});

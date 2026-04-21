import { afterEach, describe, expect, it, vi } from "vitest";

const spawnSyncMock = vi.hoisted(() => vi.fn());
const warnMock = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: spawnSyncMock,
}));

vi.mock("../src/shared/io.js", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("../src/shared/io.js")>();
  return {
    ...originalModule,
    warn: warnMock,
  };
});

import { warnAboutImplicitDefaultImageState } from "../src/runtime/default-image-warning.js";

afterEach(() => {
  spawnSyncMock.mockReset();
  warnMock.mockReset();
});

describe("warnAboutImplicitDefaultImageState", () => {
  it("warns when the default image is missing locally", () => {
    spawnSyncMock.mockReturnValueOnce({
      status: 1,
      stdout: "",
    });

    warnAboutImplicitDefaultImageState();

    expect(warnMock).toHaveBeenCalledOnce();
    expect(warnMock.mock.calls[0]?.[0]).toMatch(/not present locally/);
  });

  it("does not warn when local inspect succeeds and remote freshness is unavailable", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 0,
        stdout: "sha256:localid\n",
      })
      .mockReturnValueOnce({
        status: 0,
        stdout: "felixdock/open-docker-nest@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
      })
      .mockReturnValueOnce({
        status: 1,
        stdout: "",
      });

    warnAboutImplicitDefaultImageState();

    expect(warnMock).not.toHaveBeenCalled();
  });

  it("warns when remote digest differs from local digest", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 0,
        stdout: "sha256:localid\n",
      })
      .mockReturnValueOnce({
        status: 0,
        stdout: "felixdock/open-docker-nest@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
      })
      .mockReturnValueOnce({
        status: 0,
        stdout: JSON.stringify({
          Descriptor: {
            digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
          },
        }),
      });

    warnAboutImplicitDefaultImageState();

    expect(warnMock).toHaveBeenCalledOnce();
    expect(warnMock.mock.calls[0]?.[0]).toMatch(/may be outdated locally/);
  });

  it("skips outdated warning on ambiguous multi-arch remote manifest data", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 0,
        stdout: "sha256:localid\n",
      })
      .mockReturnValueOnce({
        status: 0,
        stdout: "felixdock/open-docker-nest@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
      })
      .mockReturnValueOnce({
        status: 0,
        stdout: JSON.stringify({
          manifests: [
            { digest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
            { digest: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" },
          ],
        }),
      });

    warnAboutImplicitDefaultImageState();

    expect(warnMock).not.toHaveBeenCalled();
  });

  it("uses a tightly bounded timeout for remote freshness probe", () => {
    spawnSyncMock
      .mockReturnValueOnce({
        status: 0,
        stdout: "sha256:localid\n",
      })
      .mockReturnValueOnce({
        status: 0,
        stdout: "felixdock/open-docker-nest@sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
      })
      .mockReturnValueOnce({
        status: 1,
        stdout: "",
      });

    warnAboutImplicitDefaultImageState();

    expect(spawnSyncMock).toHaveBeenNthCalledWith(
      3,
      "docker",
      ["manifest", "inspect", "felixdock/open-docker-nest:latest", "--verbose"],
      expect.objectContaining({ timeout: 700 }),
    );
  });
});

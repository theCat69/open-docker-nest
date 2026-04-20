import { describe, expect, it } from "vitest";

import { parseCliArguments } from "../src/validation/cli.js";

describe("parseCliArguments", () => {
  it("enables host-docker mode without requiring command payload shape", () => {
    const parsed = parseCliArguments(["--host-docker", "--", "docker", "version"]);

    expect(parsed.hostDockerMode).toBe(true);
    expect(parsed.passthroughCommand).toEqual(["docker", "version"]);
    expect(parsed.shellMode).toBe(false);
  });

  it("supports host-docker mode with default opencode command", () => {
    const parsed = parseCliArguments(["--host-docker"]);

    expect(parsed.hostDockerMode).toBe(true);
    expect(parsed.passthroughCommand).toEqual([]);
  });

  it("supports host-docker mode combined with shell mode", () => {
    const parsed = parseCliArguments(["--host-docker", "--shell"]);

    expect(parsed.hostDockerMode).toBe(true);
    expect(parsed.shellMode).toBe(true);
  });

  it("fails fast when removed --repo-command flag is used", () => {
    expect(() => parseCliArguments(["--repo-command", "--", "docker", "version"])).toThrow(
      /--repo-command has been removed/,
    );
  });

  it("preserves normal pass-through behavior when host-docker mode is inactive", () => {
    const parsed = parseCliArguments(["--", "opencode", "--help"]);

    expect(parsed.hostDockerMode).toBe(false);
    expect(parsed.passthroughCommand).toEqual(["opencode", "--help"]);
  });
});

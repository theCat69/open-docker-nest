import { afterEach, describe, expect, it, vi } from "vitest";

import { parseCliArguments } from "../src/validation/cli.js";

describe("parseCliArguments", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to the canonical published Docker Hub image", () => {
    const parsed = parseCliArguments([]);

    expect(parsed.imageRef).toBe("felixdock/open-docker-nest:latest");
  });

  it("uses OPEN_DOCKER_NEST_IMAGE when provided", () => {
    vi.stubEnv("OPEN_DOCKER_NEST_IMAGE", "example/custom:image");

    const parsed = parseCliArguments([]);

    expect(parsed.imageRef).toBe("example/custom:image");
  });

  it("prefers --image over OPEN_DOCKER_NEST_IMAGE", () => {
    vi.stubEnv("OPEN_DOCKER_NEST_IMAGE", "example/custom:image");

    const parsed = parseCliArguments(["--image", "felixdock/open-docker-nest:latest"]);

    expect(parsed.imageRef).toBe("felixdock/open-docker-nest:latest");
  });

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

  it("defaults to Java 21 when no Java version is provided", () => {
    const parsed = parseCliArguments(["--host-docker"]);

    expect(parsed.javaVersion).toBe("21");
  });

  it("accepts an explicit Java 24 selection", () => {
    const parsed = parseCliArguments(["--java", "24", "--", "java", "-version"]);

    expect(parsed.javaVersion).toBe("24");
    expect(parsed.passthroughCommand).toEqual(["java", "-version"]);
  });

  it("fails fast when --java is missing a value", () => {
    expect(() => parseCliArguments(["--java"])).toThrow(/--java requires a value/);
  });

  it("fails fast when --java receives an unsupported version", () => {
    expect(() => parseCliArguments(["--java", "17"])).toThrow(/--java must be one of: 21, 24/);
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

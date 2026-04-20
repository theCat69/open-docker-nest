import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockHomedir = vi.hoisted(() => vi.fn<() => string>());

vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("node:os");
  return {
    ...actual,
    homedir: mockHomedir,
  };
});

import { loadProjectExtraContainerEnvironment } from "../src/config/project-config.js";

const temporaryDirectoriesToRemove: string[] = [];
const isRootRunner = typeof process.getuid === "function" && process.getuid() === 0;

beforeEach(() => {
  const fakeHomeDirectoryPath = mkdtempSync(join(tmpdir(), "dock-opencode-home-config-"));
  temporaryDirectoriesToRemove.push(fakeHomeDirectoryPath);
  mockHomedir.mockReturnValue(fakeHomeDirectoryPath);
});

afterEach(() => {
  while (temporaryDirectoriesToRemove.length > 0) {
    const directoryPath = temporaryDirectoriesToRemove.pop();
    if (directoryPath !== undefined) {
      rmSync(directoryPath, { recursive: true, force: true });
    }
  }
});

function createProjectDirectory(): string {
  const projectDirectoryPath = mkdtempSync(join(tmpdir(), "dock-opencode-project-config-"));
  temporaryDirectoriesToRemove.push(projectDirectoryPath);
  return projectDirectoryPath;
}

describe("loadProjectExtraContainerEnvironment", () => {
  it("returns empty map when no user or project config exists", () => {
    const projectDirectoryPath = createProjectDirectory();

    expect(loadProjectExtraContainerEnvironment(projectDirectoryPath, {})).toEqual({});
  });

  it("loads user config when project config does not exist", () => {
    const projectDirectoryPath = createProjectDirectory();
    const userConfigFilePath = join(mockHomedir(), ".config", "dock-opencode", "dock-opencode.json");
    mkdirSync(dirname(userConfigFilePath), { recursive: true });
    writeFileSync(
      userConfigFilePath,
      JSON.stringify(
        {
          extraContainerEnvironment: {
            OPENAI_API_KEY: "{env:OPENAI_API_KEY}",
            FEATURE_FLAG: "enabled",
          },
        },
        null,
        2,
      ),
      { encoding: "utf8", flag: "w" },
    );

    expect(
      loadProjectExtraContainerEnvironment(projectDirectoryPath, {
        OPENAI_API_KEY: "secret",
      }),
    ).toEqual({ OPENAI_API_KEY: "secret", FEATURE_FLAG: "enabled" });
  });

  it("loads project dock-opencode.json config with env expansion", () => {
    const projectDirectoryPath = createProjectDirectory();
    writeFileSync(
      join(projectDirectoryPath, "dock-opencode.json"),
      JSON.stringify(
        {
          extraContainerEnvironment: {
            OPENAI_API_KEY: "{env:OPENAI_API_KEY}",
            FEATURE_FLAG: "enabled",
          },
        },
        null,
        2,
      ),
    );

    expect(
      loadProjectExtraContainerEnvironment(projectDirectoryPath, {
        OPENAI_API_KEY: "secret",
      }),
    ).toEqual({ OPENAI_API_KEY: "secret", FEATURE_FLAG: "enabled" });
  });

  it("loads dock-opencode.json config with JSONC comments", () => {
    const projectDirectoryPath = createProjectDirectory();
    writeFileSync(
      join(projectDirectoryPath, "dock-opencode.json"),
      `{
  // runtime env values
  "extraContainerEnvironment": {
    "TOKEN": "{env:TOKEN}"
  }
}
`,
    );

    expect(loadProjectExtraContainerEnvironment(projectDirectoryPath, { TOKEN: "abc" })).toEqual({ TOKEN: "abc" });
  });

  it("merges defaults < user < project for extraContainerEnvironment", () => {
    const projectDirectoryPath = createProjectDirectory();
    const userConfigFilePath = join(mockHomedir(), ".config", "dock-opencode", "dock-opencode.json");
    mkdirSync(dirname(userConfigFilePath), { recursive: true });
    writeFileSync(
      userConfigFilePath,
      JSON.stringify(
        {
          extraContainerEnvironment: {
            SHARED_KEY: "user-value",
            USER_ONLY_KEY: "user-only",
          },
        },
        null,
        2,
      ),
      { encoding: "utf8", flag: "w" },
    );
    writeFileSync(
      join(projectDirectoryPath, "dock-opencode.json"),
      JSON.stringify(
        {
          extraContainerEnvironment: {
            SHARED_KEY: "project-value",
            PROJECT_ONLY_KEY: "project-only",
          },
        },
        null,
        2,
      ),
      { encoding: "utf8", flag: "w" },
    );

    expect(loadProjectExtraContainerEnvironment(projectDirectoryPath, {})).toEqual({
      SHARED_KEY: "project-value",
      USER_ONLY_KEY: "user-only",
      PROJECT_ONLY_KEY: "project-only",
    });
  });

  it("fails for invalid user config structure", () => {
    const projectDirectoryPath = createProjectDirectory();
    const userConfigFilePath = join(mockHomedir(), ".config", "dock-opencode", "dock-opencode.json");
    mkdirSync(dirname(userConfigFilePath), { recursive: true });
    writeFileSync(userConfigFilePath, JSON.stringify({ extraContainerEnvironment: 42 }));

    expect(() => loadProjectExtraContainerEnvironment(projectDirectoryPath, {})).toThrow(/Config validation failed/);
  });

  it("fails for invalid project config structure", () => {
    const projectDirectoryPath = createProjectDirectory();
    writeFileSync(join(projectDirectoryPath, "dock-opencode.json"), JSON.stringify({ extraContainerEnvironment: 42 }));

    expect(() => loadProjectExtraContainerEnvironment(projectDirectoryPath, {})).toThrow(/Config validation failed/);
  });

  it("fails for malformed JSONC document in .json file", () => {
    const projectDirectoryPath = createProjectDirectory();
    writeFileSync(join(projectDirectoryPath, "dock-opencode.json"), "{\n  \"extraContainerEnvironment\": {\n");

    expect(() => loadProjectExtraContainerEnvironment(projectDirectoryPath, {})).toThrow(/not valid JSON\/JSONC/);
  });

  it.skipIf(isRootRunner)("fails with actionable diagnostics when config exists but is unreadable", () => {
    const projectDirectoryPath = createProjectDirectory();
    const configFilePath = join(projectDirectoryPath, "dock-opencode.json");
    writeFileSync(configFilePath, JSON.stringify({ extraContainerEnvironment: {} }));
    chmodSync(configFilePath, 0o000);

    const loadConfig = () => loadProjectExtraContainerEnvironment(projectDirectoryPath, {});
    expect(loadConfig).toThrow(/could not be read/);
    expect(loadConfig).toThrow(/read permission/);

    chmodSync(configFilePath, 0o600);
  });
});

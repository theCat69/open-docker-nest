import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

const currentFilePath = fileURLToPath(import.meta.url);
const repositoryRootPath = resolve(dirname(currentFilePath), "../../..");
const wrapperScriptPath = join(repositoryRootPath, "bin/opencode-docker.js");
const repositoryEntrypointPath = join(repositoryRootPath, "bin/opencode-docker");

const baseEnvironment = {
  ...process.env,
  LA_BRIGUADE_LOCAL_MODE: "off",
  CACHE_CTRL_LOCAL_MODE: "off",
} as const;

const wrapperCommandTimeoutMs = 600_000;

function buildWrapperEnvironment(
  overrides: Readonly<Record<string, string | undefined>>,
): NodeJS.ProcessEnv {
  return {
    ...baseEnvironment,
    ...overrides,
  };
}

export function createTemporaryDirectory(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function removeDirectoryIfPresent(pathToRemove: string): void {
  rmSync(pathToRemove, { recursive: true, force: true });
}

export function runWrapper(projectPath: string, args: readonly string[]): CommandResult {
  return runWrapperWithEnvironmentOverrides(projectPath, args, {});
}

export function runWrapperWithEnvironmentOverrides(
  projectPath: string,
  args: readonly string[],
  envOverrides: Readonly<Record<string, string | undefined>>,
): CommandResult {
  const result = spawnSync(wrapperScriptPath, ["--project", projectPath, ...args], {
    cwd: repositoryRootPath,
    encoding: "utf8",
    env: buildWrapperEnvironment(envOverrides),
    timeout: wrapperCommandTimeoutMs,
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function runWrapperFromRepositoryEntrypoint(
  projectPath: string,
  args: readonly string[],
): CommandResult {
  const result = spawnSync(repositoryEntrypointPath, ["--project", projectPath, ...args], {
    cwd: repositoryRootPath,
    encoding: "utf8",
    env: baseEnvironment,
    timeout: wrapperCommandTimeoutMs,
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function runWrapperThroughTimeout(projectPath: string, timeoutSeconds: number): CommandResult {
  const command = `timeout ${timeoutSeconds} \"${wrapperScriptPath}\" --project \"${projectPath}\" </dev/null`;
  const result = spawnSync("bash", ["-lc", command], {
    cwd: repositoryRootPath,
    encoding: "utf8",
    env: baseEnvironment,
    timeout: wrapperCommandTimeoutMs,
  });

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function runShellModeSmoke(projectPath: string): CommandResult {
  const result = spawnSync(
    "script",
    ["-q", "-c", `${wrapperScriptPath} --project \"${projectPath}\" --shell`, "/dev/null"],
    {
      cwd: repositoryRootPath,
      encoding: "utf8",
      env: baseEnvironment,
      input: "id -un\nprintf \"%s\\n\" \"$HOME\"\nexit\n",
      timeout: wrapperCommandTimeoutMs,
    },
  );

  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

export function createOpenSpecFixtureProject(): string {
  const fixtureProjectPath = createTemporaryDirectory("dock-opencode-e2e-openspec-");
  cpSync(join(repositoryRootPath, ".opencode"), join(fixtureProjectPath, ".opencode"), {
    recursive: true,
  });
  cpSync(join(repositoryRootPath, "openspec"), join(fixtureProjectPath, "openspec"), {
    recursive: true,
  });
  return fixtureProjectPath;
}

export function getRepositoryRootPath(): string {
  return repositoryRootPath;
}

export function pathExists(pathToCheck: string): boolean {
  return existsSync(pathToCheck);
}

export function listOpenSpecActiveChangeNames(projectPath: string): readonly string[] {
  const changesDirectoryPath = join(projectPath, "openspec", "changes");
  if (!existsSync(changesDirectoryPath)) {
    return [];
  }

  return readdirSync(changesDirectoryPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((entryName) => entryName !== "archive")
    .sort();
}

export function countDirectoryEntriesRecursively(rootDirectoryPath: string): number {
  if (!existsSync(rootDirectoryPath)) {
    return 0;
  }

  const pendingDirectoryPaths: string[] = [rootDirectoryPath];
  let totalEntries = 0;

  while (pendingDirectoryPaths.length > 0) {
    const currentDirectoryPath = pendingDirectoryPaths.pop();
    if (currentDirectoryPath === undefined) {
      break;
    }

    const directoryEntries = readdirSync(currentDirectoryPath, { withFileTypes: true });
    totalEntries += directoryEntries.length;

    for (const directoryEntry of directoryEntries) {
      if (directoryEntry.isDirectory()) {
        pendingDirectoryPaths.push(join(currentDirectoryPath, directoryEntry.name));
      }
    }
  }

  return totalEntries;
}

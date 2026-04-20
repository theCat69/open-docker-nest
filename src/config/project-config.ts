import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { fail } from "../shared/io.js";
import { OPEN_DOCKER_NEST_CONFIG_DIRECTORY_NAME, OPEN_DOCKER_NEST_CONFIG_FILENAME } from "../shared/constants.js";
import { isFile } from "../validation/filesystem.js";
import { projectConfigSchema, resolveExtraContainerEnvironment } from "./schema.js";

interface RawProjectConfigDocument {
  readonly extraContainerEnvironment?: Readonly<Record<string, string>>;
}

const EMPTY_PROJECT_CONFIG: RawProjectConfigDocument = {};

function stripJsonComments(jsonText: string): string {
  let output = "";
  let withinString = false;
  let pendingEscape = false;

  for (let characterIndex = 0; characterIndex < jsonText.length; characterIndex += 1) {
    const currentCharacter = jsonText[characterIndex];
    const nextCharacter = jsonText[characterIndex + 1];
    if (currentCharacter === undefined) {
      break;
    }

    if (withinString) {
      output += currentCharacter;
      if (pendingEscape) {
        pendingEscape = false;
        continue;
      }

      if (currentCharacter === "\\") {
        pendingEscape = true;
        continue;
      }

      if (currentCharacter === '"') {
        withinString = false;
      }

      continue;
    }

    if (currentCharacter === '"') {
      withinString = true;
      output += currentCharacter;
      continue;
    }

    if (currentCharacter === "/" && nextCharacter === "/") {
      characterIndex += 2;
      while (characterIndex < jsonText.length && jsonText[characterIndex] !== "\n") {
        characterIndex += 1;
      }

      if (characterIndex < jsonText.length && jsonText[characterIndex] === "\n") {
        output += "\n";
      }
      continue;
    }

    if (currentCharacter === "/" && nextCharacter === "*") {
      characterIndex += 2;
      while (characterIndex < jsonText.length) {
        if (jsonText[characterIndex] === "*" && jsonText[characterIndex + 1] === "/") {
          characterIndex += 1;
          break;
        }
        characterIndex += 1;
      }
      continue;
    }

    output += currentCharacter;
  }

  return output;
}

function parseConfigDocument(configFilePath: string): unknown {
  let rawConfigText: string;
  try {
    rawConfigText = readFileSync(configFilePath, {
      encoding: "utf8",
      flag: "r",
    });
  } catch {
      fail(
      `Config file could not be read: ${configFilePath}. Remediation: verify the file exists and that your user has read permission, then retry.`,
      );
  }

  const commentFreeConfigText = stripJsonComments(rawConfigText);

  try {
    return JSON.parse(commentFreeConfigText);
  } catch {
      fail(
      `Config file is not valid JSON/JSONC: ${configFilePath}. Remediation: fix syntax and retry.`,
      );
  }
}

function readConfigDocumentIfPresent(configFilePath: string): RawProjectConfigDocument {
  if (!isFile(configFilePath)) {
    return EMPTY_PROJECT_CONFIG;
  }

  const parsedConfigDocument = parseConfigDocument(configFilePath);
  const configParseResult = projectConfigSchema.safeParse(parsedConfigDocument);
  if (!configParseResult.success) {
    fail(
      `Config validation failed for ${configFilePath}. Remediation: ensure the file matches the project schema. Details: ${configParseResult.error.message}`,
    );
  }

  return configParseResult.data;
}

function resolveUserConfigPath(): string {
  return join(homedir(), ".config", OPEN_DOCKER_NEST_CONFIG_DIRECTORY_NAME, OPEN_DOCKER_NEST_CONFIG_FILENAME);
}

function resolveProjectConfigPath(projectRootPath: string): string {
  return join(projectRootPath, OPEN_DOCKER_NEST_CONFIG_FILENAME);
}

export function loadProjectExtraContainerEnvironment(
  resolvedProjectPath: string,
  hostEnvironment: NodeJS.ProcessEnv,
): Readonly<Record<string, string>> {
  const userConfigFilePath = resolveUserConfigPath();
  const projectConfigFilePath = resolveProjectConfigPath(resolvedProjectPath);

  const userConfig = readConfigDocumentIfPresent(userConfigFilePath);
  const projectConfig = readConfigDocumentIfPresent(projectConfigFilePath);

  const mergedConfigDocument = {
    ...EMPTY_PROJECT_CONFIG,
    ...userConfig,
    ...projectConfig,
    extraContainerEnvironment: {
      ...userConfig.extraContainerEnvironment,
      ...projectConfig.extraContainerEnvironment,
    },
  };

  const mergedConfigResult = projectConfigSchema.safeParse(mergedConfigDocument);
  if (!mergedConfigResult.success) {
    fail(
      `Merged config validation failed. Remediation: ensure user and project config files match the project schema. Details: ${mergedConfigResult.error.message}`,
    );
  }

  try {
    return resolveExtraContainerEnvironment(mergedConfigResult.data.extraContainerEnvironment, hostEnvironment);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    fail(`Merged config resolution failed. ${errorMessage}`);
  }
}

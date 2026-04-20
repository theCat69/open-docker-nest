<!-- Focused excerpt from production TypeScript wrapper config logic (src/config/schema.ts and src/config/project-config.ts); surrounding wiring lives in runtime context assembly. -->
```ts
const EMPTY_PROJECT_CONFIG = {};

function resolveUserConfigPath(): string {
  return join(homedir(), ".config", "dock-opencode", "dock-opencode.json");
}

function resolveProjectConfigPath(projectRootPath: string): string {
  return join(projectRootPath, "dock-opencode.json");
}

const projectConfigSchema = z
  .object({
    extraContainerEnvironment: z
      .record(
        z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
        z.union([
          z.string().regex(/^(?:(?!\{env:)[\s\S])*$/),
          z.string().regex(/^\{env:[A-Z_][A-Z0-9_]*\}$/),
        ]),
      )
      .default({}),
  })
  .strict();

const envPlaceholderPattern = /^\{env:([A-Z_][A-Z0-9_]*)\}$/;

export function resolveExtraContainerEnvironment(
  extraContainerEnvironment: Readonly<Record<string, string>>,
  hostEnvironment: NodeJS.ProcessEnv,
): Readonly<Record<string, string>> {
  const resolvedEntries: Array<readonly [string, string]> = [];

  for (const [environmentVariableKey, rawValue] of Object.entries(extraContainerEnvironment)) {
    if (!rawValue.includes("{env:")) {
      resolvedEntries.push([environmentVariableKey, rawValue]);
      continue;
    }

    const matchedPlaceholder = envPlaceholderPattern.exec(rawValue);
    if (matchedPlaceholder === null) {
      throw new Error(
        `Project config env placeholder is malformed: '${rawValue}'. Expected exact syntax {env:ENV_VAR_NAME}.`,
      );
    }

    const environmentVariableName = matchedPlaceholder[1];
    if (environmentVariableName === undefined) {
      throw new Error("Invalid env placeholder syntax.");
    }

    const resolvedValue = hostEnvironment[environmentVariableName];
    if (resolvedValue === undefined) {
      throw new Error(
        `Project config env reference {env:${environmentVariableName}} could not be resolved. Remediation: define ${environmentVariableName} in the host environment or replace the placeholder with a literal value.`,
      );
    }

    resolvedEntries.push([environmentVariableKey, resolvedValue]);
  }

  return Object.fromEntries(resolvedEntries);
}

export function loadProjectExtraContainerEnvironment(
  resolvedProjectPath: string,
  hostEnvironment: NodeJS.ProcessEnv,
): Readonly<Record<string, string>> {
  const userConfig = readConfigDocumentIfPresent(resolveUserConfigPath());
  const projectConfig = readConfigDocumentIfPresent(resolveProjectConfigPath(resolvedProjectPath));

  const mergedConfigDocument = {
    ...EMPTY_PROJECT_CONFIG,
    ...userConfig,
    ...projectConfig,
    extraContainerEnvironment: {
      ...userConfig.extraContainerEnvironment,
      ...projectConfig.extraContainerEnvironment,
    },
  };

  const parsed = projectConfigSchema.parse(mergedConfigDocument);
  return resolveExtraContainerEnvironment(parsed.extraContainerEnvironment, hostEnvironment);
}
```

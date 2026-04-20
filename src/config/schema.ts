import { z } from "zod";

const envPlaceholderPattern = /^\{env:([A-Z_][A-Z0-9_]*)\}$/;
const environmentVariableKeyPattern = /^[A-Za-z_][A-Za-z0-9_]*$/;
const noEnvPlaceholderMarkerPattern = /^(?:(?!\{env:)[\s\S])*$/;

export const projectConfigSchema = z
  .object({
    extraContainerEnvironment: z
      .record(
        z.string().regex(environmentVariableKeyPattern, {
          message:
            "Environment variable keys must match /^[A-Za-z_][A-Za-z0-9_]*$/ (for example: OPENAI_API_KEY).",
        }),
        z.union([
          z.string().regex(noEnvPlaceholderMarkerPattern, {
            message:
              "Environment variable values containing '{env:' must use exact syntax {env:ENV_VAR_NAME}.",
          }),
          z.string().regex(envPlaceholderPattern, {
            message:
              "Environment variable values containing '{env:' must use exact syntax {env:ENV_VAR_NAME}.",
          }),
        ]),
      )
      .default({}),
  })
  .strict();

export type ProjectConfig = z.infer<typeof projectConfigSchema>;

interface ExpandEnvReferenceSuccess {
  readonly kind: "success";
  readonly value: string;
}

interface ExpandEnvReferenceNoReference {
  readonly kind: "no-reference";
}

type ExpandEnvReferenceResult = ExpandEnvReferenceSuccess | ExpandEnvReferenceNoReference;

export function expandEnvReference(rawValue: string, hostEnvironment: NodeJS.ProcessEnv): ExpandEnvReferenceResult {
  if (rawValue.includes("{env:")) {
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

    return {
      kind: "success",
      value: resolvedValue,
    };
  }

  return { kind: "no-reference" };
}

export function resolveExtraContainerEnvironment(
  extraContainerEnvironment: Readonly<Record<string, string>>,
  hostEnvironment: NodeJS.ProcessEnv,
): Readonly<Record<string, string>> {
  const resolvedEntries: Array<readonly [string, string]> = [];

  for (const [environmentVariableKey, rawValue] of Object.entries(extraContainerEnvironment)) {
    const expandedValue = expandEnvReference(rawValue, hostEnvironment);
    if (expandedValue.kind === "success") {
      resolvedEntries.push([environmentVariableKey, expandedValue.value]);
      continue;
    }

    resolvedEntries.push([environmentVariableKey, rawValue]);
  }

  return Object.fromEntries(resolvedEntries);
}

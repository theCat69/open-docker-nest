#!/usr/bin/env bun

import { isDirectory } from "./validation/filesystem.js";
import { parseCliArguments } from "./validation/cli.js";
import { ensureDirectory } from "./validation/filesystem.js";
import { buildRuntimeContext } from "./runtime/context.js";
import { buildDockerRuntimePlan } from "./runtime/runtime-plan.js";
import { ensureDockerCliAvailable, executeDockerRun, runExplicitUpdateFlow } from "./runtime/process.js";
import { ensureImplicitDefaultImageAvailable } from "./runtime/default-image-warning.js";
import { printUsage, fail } from "./shared/io.js";
import { resolvePath } from "./shared/path-utils.js";

function validateProjectPath(projectPath: string): string {
  if (!isDirectory(projectPath)) {
    fail(
      `Project path does not exist or is not a directory: ${projectPath}. Remediation: pass a valid directory with --project.`,
    );
  }

  const resolvedProjectPath = resolvePath(projectPath);
  if (!isDirectory(resolvedProjectPath)) {
    fail(`Resolved project path is not a directory: ${resolvedProjectPath}.`);
  }

  return resolvedProjectPath;
}

export async function main(): Promise<void> {
  const parsedCliOptions = parseCliArguments(process.argv.slice(2));
  if (parsedCliOptions.helpRequested) {
    printUsage();
    return;
  }

  if (parsedCliOptions.updateRequested) {
    runExplicitUpdateFlow();
    return;
  }

  ensureDockerCliAvailable();

  const resolvedProjectPath = validateProjectPath(parsedCliOptions.projectPath);
  const runtimeContext = buildRuntimeContext(resolvedProjectPath);

  ensureDirectory(runtimeContext.hostConfigDirectoryPath);
  ensureDirectory(runtimeContext.hostStateDirectoryPath);
  ensureDirectory(runtimeContext.hostShareDirectoryPath);
  ensureDirectory(runtimeContext.hostCacheDirectoryPath);

  const runtimePlan = buildDockerRuntimePlan(
    runtimeContext,
    parsedCliOptions.imageRef,
    parsedCliOptions.javaVersion,
    parsedCliOptions.shellMode,
    parsedCliOptions.hostDockerMode,
    parsedCliOptions.passthroughCommand,
  );

  if (parsedCliOptions.imageSelectionSource === "default") {
    ensureImplicitDefaultImageAvailable();
  }

  executeDockerRun(runtimePlan);
}

import { spawnSync } from "node:child_process";

import { DEFAULT_IMAGE, NPM_PACKAGE_LATEST } from "../shared/constants.js";
import { fail } from "../shared/io.js";
import type { DockerRuntimePlan } from "../shared/types.js";

export function ensureDockerCliAvailable(): void {
  const checkResult = spawnSync("docker", ["--version"], {
    stdio: "ignore",
  });

  if (checkResult.status !== 0) {
    fail("Docker CLI is required but was not found in PATH. Install Docker and re-run.");
  }
}

export function executeDockerRun(plan: DockerRuntimePlan): never {
  const dockerProcessEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    ...plan.dockerClientEnvironment,
  };

  const execution = spawnSync("docker", ["run", ...plan.dockerRunArgs, plan.imageRef, ...plan.commandToRun], {
    stdio: "inherit",
    env: dockerProcessEnvironment,
  });

  if (execution.error !== undefined) {
    fail(`Failed to execute docker run: ${execution.error.message}`);
  }

  if (execution.signal !== null) {
    process.kill(process.pid, execution.signal);
    fail(
      `Docker run exited by signal ${execution.signal} but wrapper could not terminate with the same signal.`,
    );
  }

  process.exit(execution.status ?? 1);
}

export function runExplicitUpdateFlow(): void {
  const npmInstallResult = spawnSync("npm", ["install", "-g", NPM_PACKAGE_LATEST], {
    stdio: "inherit",
  });

  if (npmInstallResult.error !== undefined || npmInstallResult.status !== 0) {
    const details = npmInstallResult.error?.message ?? "npm install exited non-zero";
    fail(`Failed to update npm package ${NPM_PACKAGE_LATEST} (${details}).`);
  }

  const dockerPullResult = spawnSync("docker", ["pull", DEFAULT_IMAGE], {
    stdio: "inherit",
  });

  if (dockerPullResult.error !== undefined || dockerPullResult.status !== 0) {
    const details = dockerPullResult.error?.message ?? "docker pull exited non-zero";
    fail(`npm package update succeeded, but failed to pull ${DEFAULT_IMAGE} (${details}).`);
  }
}

import { spawnSync } from "node:child_process";

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
  const execution = spawnSync("docker", ["run", ...plan.dockerRunArgs, plan.imageRef, ...plan.commandToRun], {
    stdio: "inherit",
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

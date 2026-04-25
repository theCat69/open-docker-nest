import { spawnSync } from "node:child_process";

import { DEFAULT_IMAGE } from "../shared/constants.js";
import { fail } from "../shared/io.js";

interface LocalImageCheckResultPresent {
  readonly kind: "present";
}

interface LocalImageCheckResultMissing {
  readonly kind: "missing";
}

interface LocalImageCheckResultError {
  readonly kind: "error";
  readonly details: string;
}

type LocalImageCheckResult =
  | LocalImageCheckResultPresent
  | LocalImageCheckResultMissing
  | LocalImageCheckResultError;

function inspectResultIndicatesMissingImage(stderrOutput: string): boolean {
  const normalizedOutput = stderrOutput.toLowerCase();
  return normalizedOutput.includes("no such image");
}

function checkDefaultImageLocally(): LocalImageCheckResult {
  const inspectResult = spawnSync("docker", ["image", "inspect", DEFAULT_IMAGE, "--format", "{{.Id}}"], {
    stdio: ["ignore", "ignore", "pipe"],
    encoding: "utf8",
  });

  if (inspectResult.error !== undefined) {
    return {
      kind: "error",
      details: inspectResult.error.message,
    };
  }

  if (inspectResult.status === 0) {
    return { kind: "present" };
  }

  if (inspectResult.signal !== null) {
    return {
      kind: "error",
      details: `docker image inspect terminated by signal ${inspectResult.signal}`,
    };
  }

  const inspectStderr = typeof inspectResult.stderr === "string" ? inspectResult.stderr : "";
  if (inspectResultIndicatesMissingImage(inspectStderr)) {
    return { kind: "missing" };
  }

  const statusDetails = inspectResult.status === null
    ? "docker image inspect exited with null status"
    : `docker image inspect exited with status ${inspectResult.status}`;

  const stderrDetails = inspectStderr.trim().length > 0 ? `: ${inspectStderr.trim()}` : "";
  return {
    kind: "error",
    details: `${statusDetails}${stderrDetails}`,
  };
}

export function ensureImplicitDefaultImageAvailable(): void {
  const localImageCheck = checkDefaultImageLocally();
  if (localImageCheck.kind === "present") {
    return;
  }

  if (localImageCheck.kind === "error") {
    fail(`Unable to verify local default image ${DEFAULT_IMAGE} (${localImageCheck.details}). Remediation: ensure Docker daemon/context/auth is healthy and retry.`);
  }

  const pullResult = spawnSync("docker", ["pull", DEFAULT_IMAGE], {
    stdio: "inherit",
  });

  if (pullResult.error !== undefined || pullResult.status !== 0) {
    const details = pullResult.error?.message ?? "docker pull exited non-zero";
    fail(`Unable to pull missing default image ${DEFAULT_IMAGE} (${details}). Remediation: run 'docker pull ${DEFAULT_IMAGE}' and retry.`);
  }
}

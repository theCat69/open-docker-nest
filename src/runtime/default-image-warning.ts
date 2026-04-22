import { spawnSync } from "node:child_process";

import { DEFAULT_IMAGE } from "../shared/constants.js";
import { warn } from "../shared/io.js";

const SHORT_REMOTE_CHECK_TIMEOUT_MS = 700;
const SHA256_DIGEST_PATTERN = /^sha256:[a-f0-9]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function runDockerReadOnlyCommand(argumentsToRun: readonly string[], timeoutMs?: number): string | null {
  const result = spawnSync("docker", argumentsToRun, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: timeoutMs,
  });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function warnWhenDefaultImageMissingLocally(): boolean {
  const localImageIdentifier = runDockerReadOnlyCommand([
    "image",
    "inspect",
    DEFAULT_IMAGE,
    "--format",
    "{{.Id}}",
  ]);

  if (localImageIdentifier !== null) {
    return false;
  }

  warn(
    `Default image ${DEFAULT_IMAGE} is not present locally. Remediation: pull it with 'docker pull ${DEFAULT_IMAGE}' before normal runs.`,
  );
  return true;
}

function parseShaDigest(candidate: unknown): string | null {
  return typeof candidate === "string" && SHA256_DIGEST_PATTERN.test(candidate) ? candidate : null;
}

function tryReadSingleManifestArrayDigest(remoteManifest: Record<string, unknown>): string | null {
  const manifestsValue = remoteManifest.manifests;
  if (!Array.isArray(manifestsValue)) {
    return null;
  }

  if (manifestsValue.length !== 1) {
    return null;
  }

  const singleManifest = manifestsValue[0];
  if (!isRecord(singleManifest)) {
    return null;
  }

  return parseShaDigest(singleManifest.digest);
}

function tryReadDescriptorDigest(remoteManifest: Record<string, unknown>): string | null {
  const descriptorValue = remoteManifest.Descriptor;
  if (!isRecord(descriptorValue)) {
    return null;
  }

  return parseShaDigest(descriptorValue.digest);
}

function tryReadHighConfidenceRemoteDigest(remoteManifestJson: string): string | null {
  try {
    const parsedManifest: unknown = JSON.parse(remoteManifestJson);
    if (!isRecord(parsedManifest)) {
      return null;
    }

    const hasManifestArray = Array.isArray(parsedManifest.manifests);
    if (hasManifestArray) {
      return tryReadSingleManifestArrayDigest(parsedManifest);
    }

    return tryReadDescriptorDigest(parsedManifest);
  } catch {
    return null;
  }
}

function tryReadRemoteDefaultDigest(): string | null {
  const remoteManifestJson = runDockerReadOnlyCommand(
    ["manifest", "inspect", DEFAULT_IMAGE, "--verbose"],
    SHORT_REMOTE_CHECK_TIMEOUT_MS,
  );

  if (remoteManifestJson === null || remoteManifestJson.length === 0) {
    return null;
  }

  return tryReadHighConfidenceRemoteDigest(remoteManifestJson);
}

function tryReadLocalRepoDigest(): string | null {
  const repoDigest = runDockerReadOnlyCommand([
    "image",
    "inspect",
    DEFAULT_IMAGE,
    "--format",
    "{{index .RepoDigests 0}}",
  ]);

  if (repoDigest === null || repoDigest.length === 0 || !repoDigest.includes("@")) {
    return null;
  }

  const digest = repoDigest.split("@")[1] ?? null;
  if (digest === null || !SHA256_DIGEST_PATTERN.test(digest)) {
    return null;
  }

  return digest;
}

function warnWhenDefaultImageAppearsOutdated(): void {
  const localDigest = tryReadLocalRepoDigest();
  if (localDigest === null) {
    return;
  }

  const remoteDigest = tryReadRemoteDefaultDigest();
  if (remoteDigest === null) {
    return;
  }

  if (localDigest === remoteDigest) {
    return;
  }

  warn(
    `Default image ${DEFAULT_IMAGE} may be outdated locally. Advisory: compare/pull with 'docker pull ${DEFAULT_IMAGE}' if you want the latest tag contents.`,
  );
}

export function warnAboutImplicitDefaultImageState(): void {
  const missingLocally = warnWhenDefaultImageMissingLocally();
  if (missingLocally) {
    return;
  }

  warnWhenDefaultImageAppearsOutdated();
}

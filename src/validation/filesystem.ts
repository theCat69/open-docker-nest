import { accessSync, constants as fsConstants, existsSync, lstatSync, mkdirSync, statSync } from "node:fs";

import { fail } from "../shared/io.js";

export function ensureDirectory(directoryPath: string): void {
  if (isDirectory(directoryPath)) {
    return;
  }

  try {
    mkdirSync(directoryPath, { recursive: true });
  } catch {
    fail(
      `Unable to create persistence directory: ${directoryPath}. Remediation: verify parent directory ownership/permissions or create it manually, then re-run.`,
    );
  }
}

export function isDirectory(pathToCheck: string): boolean {
  try {
    return statSync(pathToCheck).isDirectory();
  } catch {
    return false;
  }
}

export function isFile(pathToCheck: string): boolean {
  try {
    return statSync(pathToCheck).isFile();
  } catch {
    return false;
  }
}

export function pathExistsOrSymlink(pathToCheck: string): boolean {
  if (existsSync(pathToCheck)) {
    return true;
  }

  try {
    const status = lstatSync(pathToCheck);
    return status.isSymbolicLink();
  } catch {
    return false;
  }
}

export function isSymbolicLink(pathToCheck: string): boolean {
  try {
    return lstatSync(pathToCheck).isSymbolicLink();
  } catch {
    return false;
  }
}

export function isBrokenSymlink(pathToCheck: string): boolean {
  if (!isSymbolicLink(pathToCheck)) {
    return false;
  }

  return !existsSync(pathToCheck);
}

export function hasFileReadAccess(pathToCheck: string): boolean {
  try {
    accessSync(pathToCheck, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

export function hasFileReadExecuteAccess(pathToCheck: string): boolean {
  try {
    accessSync(pathToCheck, fsConstants.R_OK | fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function isReadableDirectory(pathToCheck: string): boolean {
  if (!isDirectory(pathToCheck)) {
    return false;
  }

  try {
    accessSync(pathToCheck, fsConstants.R_OK | fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function isReadablePath(pathToCheck: string): boolean {
  if (!pathExistsOrSymlink(pathToCheck)) {
    return false;
  }

  const accessMode = isDirectory(pathToCheck)
    ? fsConstants.R_OK | fsConstants.X_OK
    : fsConstants.R_OK;

  try {
    accessSync(pathToCheck, accessMode);
    return true;
  } catch {
    return false;
  }
}

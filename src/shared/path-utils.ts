import { readlinkSync, realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { fail } from "./io.js";

export function resolvePath(inputPath: string): string {
  try {
    return realpathSync(inputPath);
  } catch {
    fail(`Unable to resolve path '${inputPath}'. Install 'realpath' or 'python3'.`);
  }
}

export function resolveSymlinkTargetAbsolute(symlinkPath: string): string {
  let rawTarget = "";
  try {
    rawTarget = readlinkSync(symlinkPath);
  } catch {
    fail(`Unable to read symlink target for '${symlinkPath}'.`);
  }

  if (rawTarget.startsWith("/")) {
    return rawTarget;
  }

  const symlinkDirectory = dirname(symlinkPath);
  return resolvePath(resolve(symlinkDirectory, rawTarget));
}

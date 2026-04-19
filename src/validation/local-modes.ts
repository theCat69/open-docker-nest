import { z } from "zod";

import type { LocalMode } from "../shared/types.js";
import { fail } from "../shared/io.js";

const localModeSchema = z.enum(["auto", "force", "off"]);

function parseLocalMode(rawValue: string): LocalMode {
  const parsed = localModeSchema.safeParse(rawValue);
  if (!parsed.success) {
    return "auto";
  }

  return parsed.data;
}

export function validateLaBriguadeLocalMode(rawValue: string): LocalMode {
  const mode = parseLocalMode(rawValue);
  if (mode !== rawValue) {
    fail(`Invalid LA_BRIGUADE_LOCAL_MODE value '${rawValue}'. Allowed values: auto, force, off.`);
  }

  return mode;
}

export function validateCacheCtrlLocalMode(rawValue: string): LocalMode {
  const mode = parseLocalMode(rawValue);
  if (mode !== rawValue) {
    fail(
      `Invalid CACHE_CTRL_LOCAL_MODE value '${rawValue}'. Allowed values: auto, force, off. Remediation: set CACHE_CTRL_LOCAL_MODE to one of the allowed values or unset it to use default auto mode.`,
    );
  }

  return mode;
}

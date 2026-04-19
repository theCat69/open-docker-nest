import { dirname, join } from "node:path";

import type { CacheCtrlLocalState, LocalMode } from "../shared/types.js";
import { fail, warn } from "../shared/io.js";
import { resolvePath } from "../shared/path-utils.js";
import {
  hasFileReadAccess,
  hasFileReadExecuteAccess,
  isBrokenSymlink,
  isFile,
  isReadableDirectory,
  isSymbolicLink,
  pathExistsOrSymlink,
} from "../validation/filesystem.js";

function deriveCacheCtrlCheckoutRootFromTarget(
  resolvedTargetPath: string,
  sourceLabel: string,
): { readonly ok: true; readonly root: string } | { readonly ok: false; readonly reason: string } {
  let searchDirectory = resolvePath(dirname(resolvedTargetPath));

  while (true) {
    const expectedSkillPath = join(searchDirectory, "skills", "cache-ctrl-caller", "SKILL.md");
    if (isReadableDirectory(searchDirectory) && hasFileReadAccess(expectedSkillPath)) {
      return { ok: true, root: searchDirectory };
    }

    if (searchDirectory === "/") {
      break;
    }

    searchDirectory = dirname(searchDirectory);
  }

  return {
    ok: false,
    reason: `Unable to derive cache-ctrl checkout root from ${sourceLabel} '${resolvedTargetPath}'. Expected an accessible ancestor containing 'skills/cache-ctrl-caller/SKILL.md'. Remediation: point ~/.local/bin/cache-ctrl and ~/.config/opencode/skills/cache-ctrl-caller/SKILL.md to the same local cache-ctrl checkout, or disable local mode with CACHE_CTRL_LOCAL_MODE=off.`,
  };
}

export function resolveCacheCtrlLocalState(
  localMode: LocalMode,
  configuredLocalPath: string,
  hostBinaryEntryPath: string,
  hostSkillEntryPath: string,
): CacheCtrlLocalState {
  if (localMode === "off") {
    return {
      active: false,
      projectRoot: "",
      binaryTarget: "",
    };
  }

  const preflightIssues: string[] = [];

  let resolvedBinaryTarget = "";
  let resolvedSkillTarget = "";
  let derivedRootFromBinary = "";
  let derivedRootFromSkill = "";

  if (isSymbolicLink(hostBinaryEntryPath) && isBrokenSymlink(hostBinaryEntryPath)) {
    preflightIssues.push(`Host binary entry '${hostBinaryEntryPath}' is a broken symlink.`);
  } else if (!pathExistsOrSymlink(hostBinaryEntryPath)) {
    preflightIssues.push(`Missing host binary entry '${hostBinaryEntryPath}'.`);
  } else {
    resolvedBinaryTarget = resolvePath(hostBinaryEntryPath);

    if (!pathExistsOrSymlink(resolvedBinaryTarget)) {
      preflightIssues.push(`Resolved binary target does not exist: ${resolvedBinaryTarget}.`);
    } else if (!isFile(resolvedBinaryTarget)) {
      preflightIssues.push(`Resolved binary target is not a file: ${resolvedBinaryTarget}.`);
    } else if (!hasFileReadExecuteAccess(resolvedBinaryTarget)) {
      preflightIssues.push(`Resolved binary target is not readable/executable: ${resolvedBinaryTarget}.`);
    } else {
      const derived = deriveCacheCtrlCheckoutRootFromTarget(
        resolvedBinaryTarget,
        "resolved binary target",
      );
      if (!derived.ok) {
        preflightIssues.push(derived.reason);
      } else {
        derivedRootFromBinary = derived.root;
      }
    }
  }

  if (isSymbolicLink(hostSkillEntryPath) && isBrokenSymlink(hostSkillEntryPath)) {
    preflightIssues.push(`Canonical skill link '${hostSkillEntryPath}' is a broken symlink.`);
  } else if (!pathExistsOrSymlink(hostSkillEntryPath)) {
    preflightIssues.push(`Missing canonical skill link '${hostSkillEntryPath}'.`);
  } else if (!isSymbolicLink(hostSkillEntryPath)) {
    preflightIssues.push(
      `Canonical skill entry '${hostSkillEntryPath}' must be a symlink in local-dev mode.`,
    );
  } else {
    resolvedSkillTarget = resolvePath(hostSkillEntryPath);
    if (!pathExistsOrSymlink(resolvedSkillTarget) || !isFile(resolvedSkillTarget) || !hasFileReadAccess(resolvedSkillTarget)) {
      preflightIssues.push(`Resolved skill target is not a readable file: ${resolvedSkillTarget}.`);
    } else {
      const derived = deriveCacheCtrlCheckoutRootFromTarget(
        resolvedSkillTarget,
        "resolved skill target",
      );
      if (!derived.ok) {
        preflightIssues.push(derived.reason);
      } else {
        derivedRootFromSkill = derived.root;
      }
    }
  }

  if (
    derivedRootFromBinary.length > 0 &&
    derivedRootFromSkill.length > 0 &&
    derivedRootFromBinary !== derivedRootFromSkill
  ) {
    preflightIssues.push(
      `Resolved cache-ctrl roots disagree: binary-derived='${derivedRootFromBinary}', skill-derived='${derivedRootFromSkill}'.`,
    );
  }

  const authoritativeRoot =
    derivedRootFromBinary.length > 0 && derivedRootFromSkill.length > 0 ? derivedRootFromBinary : "";

  if (configuredLocalPath.length > 0 && authoritativeRoot.length > 0) {
    if (!isReadableDirectory(configuredLocalPath)) {
      preflightIssues.push(
        `CACHE_CTRL_LOCAL_PATH '${configuredLocalPath}' must be an accessible directory when local mode is active.`,
      );
    } else {
      const resolvedConfiguredLocalPath = resolvePath(configuredLocalPath);
      if (resolvedConfiguredLocalPath !== authoritativeRoot) {
        preflightIssues.push(
          `CACHE_CTRL_LOCAL_PATH must match the derived cache-ctrl checkout root. Derived='${authoritativeRoot}', received='${resolvedConfiguredLocalPath}'.`,
        );
      }
    }
  }

  if (preflightIssues.length > 0) {
    if (localMode === "force") {
      fail(
        `CACHE_CTRL local-dev preflight failed: ${preflightIssues.join(" ")} Remediation: fix the reported local cache-ctrl inputs or disable local mode with CACHE_CTRL_LOCAL_MODE=off.`,
      );
    }

    warn(
      `CACHE_CTRL local-dev auto mode did not activate. Continuing with image-installed cache-ctrl runtime. Reasons: ${preflightIssues.join(" ")} Remediation: fix local cache-ctrl links, or set CACHE_CTRL_LOCAL_MODE=off to silence this warning.`,
    );

    return {
      active: false,
      projectRoot: "",
      binaryTarget: "",
    };
  }

  return {
    active: true,
    projectRoot: authoritativeRoot,
    binaryTarget: resolvedBinaryTarget,
  };
}

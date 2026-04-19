import { describe, expect, it } from "vitest";

import {
  getRepositoryRootPath,
  runWrapper,
} from "./helpers/wrapper-test-harness";

/**
 * Maintainer note:
 * This file keeps wrapper help-path smoke coverage lightweight.
 * Assert command completion and durable filesystem outcomes only.
 */

describe("Wrapper-invoked opencode --help smoke coverage", () => {
  it("runs the wrapper-invoked opencode --help smoke path", () => {
    const projectPath = getRepositoryRootPath();
    const helpResult = runWrapper(projectPath, ["--", "opencode", "--help"]);
    expect(helpResult.status).toBe(0);
  }, 900_000);
});

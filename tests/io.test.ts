import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_IMAGE } from "../src/shared/constants.js";
import { printUsage } from "../src/shared/io.js";

describe("printUsage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("includes the canonical default image from shared constants", () => {
    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    printUsage();

    expect(writeSpy).toHaveBeenCalledOnce();

    const usageOutput = String(writeSpy.mock.calls[0]?.[0] ?? "");
    expect(usageOutput).toContain(`Docker image reference (default: ${DEFAULT_IMAGE})`);
    expect(usageOutput).toContain("open-docker-nest update");
    expect(usageOutput).toContain("update                 Update CLI package and default Docker image");
  });
});

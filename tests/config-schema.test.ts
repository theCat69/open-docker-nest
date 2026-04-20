import { describe, expect, it } from "vitest";

import { expandEnvReference, projectConfigSchema, resolveExtraContainerEnvironment } from "../src/config/schema.js";

describe("projectConfigSchema", () => {
  it("parses minimal config with default empty env map", () => {
    const parsed = projectConfigSchema.parse({});
    expect(parsed).toEqual({ extraContainerEnvironment: {} });
  });

  it("rejects unknown top-level fields", () => {
    expect(() => projectConfigSchema.parse({ unknownField: true })).toThrow(/Unrecognized key/);
  });

  it("rejects invalid extraContainerEnvironment keys", () => {
    expect(() => projectConfigSchema.parse({ extraContainerEnvironment: { "": "x" } })).toThrow(
      /Environment variable keys must match/,
    );
    expect(() => projectConfigSchema.parse({ extraContainerEnvironment: { "HAS SPACE": "x" } })).toThrow(
      /Environment variable keys must match/,
    );
    expect(() => projectConfigSchema.parse({ extraContainerEnvironment: { "HAS=EQUALS": "x" } })).toThrow(
      /Environment variable keys must match/,
    );
  });

  it("rejects malformed placeholder-like values in extraContainerEnvironment", () => {
    expect(() =>
      projectConfigSchema.parse({
        extraContainerEnvironment: {
          OPENAI_API_KEY: "prefix-{env:OPENAI_API_KEY}",
        },
      }),
    ).toThrow(/must use exact syntax \{env:ENV_VAR_NAME\}/);
  });

  it("rejects placeholder values with surrounding whitespace", () => {
    expect(() =>
      projectConfigSchema.parse({
        extraContainerEnvironment: {
          OPENAI_API_KEY: "  {env:OPENAI_API_KEY}  ",
        },
      }),
    ).toThrow(/must use exact syntax \{env:ENV_VAR_NAME\}/);
  });
});

describe("env placeholder expansion", () => {
  it("expands exact {env:VAR} placeholders", () => {
    const result = expandEnvReference("{env:OPENAI_API_KEY}", { OPENAI_API_KEY: "resolved" });
    expect(result).toEqual({ kind: "success", value: "resolved" });
  });

  it("fails malformed placeholder syntax", () => {
    expect(() => expandEnvReference("prefix-{env:OPENAI_API_KEY}", { OPENAI_API_KEY: "resolved" })).toThrow(
      /malformed/,
    );
  });

  it("fails when referenced host env variable is missing", () => {
    expect(() => expandEnvReference("{env:MISSING_KEY}", {})).toThrow(/could not be resolved/);
  });

  it("returns no-reference for literal values", () => {
    expect(expandEnvReference("literal-value", {})).toEqual({ kind: "no-reference" });
  });

  it("resolves mixed literal and referenced values", () => {
    expect(
      resolveExtraContainerEnvironment(
        {
          OPENAI_API_KEY: "{env:OPENAI_API_KEY}",
          FEATURE_FLAG: "on",
        },
        { OPENAI_API_KEY: "resolved" },
      ),
    ).toEqual({ OPENAI_API_KEY: "resolved", FEATURE_FLAG: "on" });
  });
});

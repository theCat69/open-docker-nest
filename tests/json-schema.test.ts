import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildProjectConfigJsonSchema } from "../src/config/json-schema.js";

function readObject(value: unknown): Record<string, unknown> {
  return z.record(z.string(), z.unknown()).parse(value);
}

describe("buildProjectConfigJsonSchema", () => {
  it("emits draft-2020-12 object schema with optional extraContainerEnvironment", () => {
    const schema = readObject(buildProjectConfigJsonSchema());
    const properties = readObject(schema.properties);
    const extraContainerEnvironment = readObject(properties.extraContainerEnvironment);
    const additionalProperties = readObject(extraContainerEnvironment.additionalProperties);
    const anyOf = z.array(z.unknown()).parse(additionalProperties.anyOf);
    const nonPlaceholderVariant = readObject(anyOf[0]);
    const placeholderVariant = readObject(anyOf[1]);

    expect(schema.$schema).toBe("https://json-schema.org/draft/2020-12/schema");
    expect(schema.type).toBe("object");
    expect(schema.required).toBeUndefined();
    expect(schema.additionalProperties).toBe(false);
    expect(extraContainerEnvironment.type).toBe("object");
    expect(anyOf).toHaveLength(2);
    expect(nonPlaceholderVariant.type).toBe("string");
    expect(nonPlaceholderVariant.pattern).toBe("^(?:(?!\\{env:)[\\s\\S])*$");
    expect(placeholderVariant.type).toBe("string");
    expect(placeholderVariant.pattern).toBe("^\\{env:([A-Z_][A-Z0-9_]*)\\}$");
  });
});

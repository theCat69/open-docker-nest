import { z } from "zod";

import { projectConfigSchema } from "./schema.js";

export function buildProjectConfigJsonSchema(): unknown {
  return z.toJSONSchema(projectConfigSchema, {
    target: "draft-2020-12",
    io: "input",
  });
}

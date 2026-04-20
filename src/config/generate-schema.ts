#!/usr/bin/env bun

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { buildProjectConfigJsonSchema } from "./json-schema.js";
import { OPEN_DOCKER_NEST_CONFIG_FILENAME } from "../shared/constants.js";

const outputPath = resolve(process.cwd(), "schema", `${OPEN_DOCKER_NEST_CONFIG_FILENAME.replace(/\.json$/, "")}.schema.json`);
const outputDirectoryPath = dirname(outputPath);

mkdirSync(outputDirectoryPath, { recursive: true });
const generatedSchema = buildProjectConfigJsonSchema();
writeFileSync(outputPath, `${JSON.stringify(generatedSchema, null, 2)}\n`, "utf8");

process.stdout.write(`Generated schema: ${outputPath}\n`);

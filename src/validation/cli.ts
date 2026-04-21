import {
  DEFAULT_IMAGE,
} from "../shared/constants.js";
import type {
  ImageSelectionSource,
  JavaVersion,
  ParsedCliOptions,
} from "../shared/types.js";
import { fail } from "../shared/io.js";

function parseJavaVersion(value: string): JavaVersion {
  if (value === "21" || value === "24") {
    return value;
  }

  fail(`--java must be one of: 21, 24. Received: ${value}`);
}

export function parseCliArguments(argv: readonly string[]): ParsedCliOptions {
  let projectPath = process.cwd();
  const environmentImageRef = process.env.OPEN_DOCKER_NEST_IMAGE;
  let imageRef = environmentImageRef ?? DEFAULT_IMAGE;
  let imageSelectionSource: ImageSelectionSource = environmentImageRef === undefined ? "default" : "environment";
  let javaVersion: JavaVersion = "21";
  let shellMode = false;
  let hostDockerMode = false;
  let passthroughCommand: readonly string[] = [];
  let helpRequested = false;

  let index = 0;
  while (index < argv.length) {
    const argument = argv[index];
    if (argument === undefined) {
      break;
    }

    switch (argument) {
      case "--project": {
        const value = argv[index + 1];
        if (value === undefined) {
          fail("--project requires a value");
        }

        projectPath = value;
        index += 2;
        break;
      }
      case "--image": {
        const value = argv[index + 1];
        if (value === undefined) {
          fail("--image requires a value");
        }

        imageRef = value;
        imageSelectionSource = "cli";
        index += 2;
        break;
      }
      case "--java": {
        const value = argv[index + 1];
        if (value === undefined) {
          fail("--java requires a value");
        }

        javaVersion = parseJavaVersion(value);
        index += 2;
        break;
      }
      case "--shell":
        shellMode = true;
        index += 1;
        break;
      case "--host-docker":
        hostDockerMode = true;
        index += 1;
        break;
      case "--repo-command":
        fail(
          "--repo-command has been removed. Remediation: use --host-docker for a session-wide in-container host Docker bridge.",
        );
      case "--":
        passthroughCommand = argv.slice(index + 1);
        index = argv.length;
        break;
      case "-h":
      case "--help":
        helpRequested = true;
        index = argv.length;
        break;
      default:
        passthroughCommand = argv.slice(index);
        index = argv.length;
        break;
    }
  }

  return {
    projectPath,
    imageRef,
    imageSelectionSource,
    javaVersion,
    shellMode,
    hostDockerMode,
    passthroughCommand,
    helpRequested,
  };
}

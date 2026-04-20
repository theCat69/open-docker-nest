import {
  DEFAULT_IMAGE,
} from "../shared/constants.js";
import type { ParsedCliOptions } from "../shared/types.js";
import { fail } from "../shared/io.js";

export function parseCliArguments(argv: readonly string[]): ParsedCliOptions {
  let projectPath = process.cwd();
  let imageRef = process.env.OPEN_DOCKER_NEST_IMAGE ?? DEFAULT_IMAGE;
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
    shellMode,
    hostDockerMode,
    passthroughCommand,
    helpRequested,
  };
}

import { WrapperError } from "./errors.js";
import { DEFAULT_IMAGE, NPM_PACKAGE_LATEST, SCRIPT_NAME } from "./constants.js";

export function fail(message: string): never {
  throw new WrapperError(`${SCRIPT_NAME}: ${message}`);
}

export function warn(message: string): void {
  process.stderr.write(`${SCRIPT_NAME}: Warning: ${message}\n`);
}

export function printUsage(): void {
  process.stdout.write(`Usage:
  open-docker-nest update
  open-docker-nest [--project <host-path>] [--image <image-ref>] [--java <21|25>] [--shell] [--host-docker] [--] [command ...args]

Options:
  update                 Update CLI package and default Docker image
  --project <host-path>  Host project directory to mount (default: current directory)
  --image <image-ref>    Docker image reference (default: ${DEFAULT_IMAGE})
  --java <21|25>         Select the default JDK inside the container for this run (default: 21)
  --shell                Start an interactive shell inside the container
  --host-docker          Enable host Docker daemon access for the entire in-container session (supported local Unix-socket hosts only)
  -h, --help             Show this help message

Explicit update flow:
  npm install -g ${NPM_PACKAGE_LATEST}
  docker pull ${DEFAULT_IMAGE}
`);
}

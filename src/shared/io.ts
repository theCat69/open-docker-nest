import { WrapperError } from "./errors.js";
import { SCRIPT_NAME } from "./constants.js";

export function fail(message: string): never {
  throw new WrapperError(`${SCRIPT_NAME}: ${message}`);
}

export function warn(message: string): void {
  process.stderr.write(`${SCRIPT_NAME}: Warning: ${message}\n`);
}

export function printUsage(): void {
  process.stdout.write(`Usage:
  bin/opencode-docker [--project <host-path>] [--image <image-ref>] [--shell] [--] [command ...args]

Options:
  --project <host-path>  Host project directory to mount (default: current directory)
  --image <image-ref>    Docker image reference (default: opencode-docker:latest)
  --shell                Start an interactive shell inside the container
  -h, --help             Show this help message
`);
}

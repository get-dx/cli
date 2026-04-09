import { Command, CommanderError } from "commander";

import { CliError, EXIT_CODES, HttpError } from "./errors.js";
import { printJson } from "./output.js";
import type { CliContext } from "./types.js";

export function getContext(command: Command): CliContext {
  const root = command.optsWithGlobals();
  return {
    json: Boolean(root.json),
    agent: root.agent || process.env.DX_AGENT_NAME,
    agentSessionId: root.agentSessionId || process.env.DX_AGENT_SESSION_ID,
  };
}

export function wrapAction<T extends unknown[]>(
  action: (...args: T) => Promise<void>,
): (...args: T) => Promise<void> {
  return async (...args: T) => {
    try {
      await action(...args);
    } catch (error) {
      const command = args[args.length - 1] as Command | undefined;
      handleError(error, command, undefined);
    }
  };
}

export function handleError(
  error: unknown,
  command?: Command,
  argv?: string[],
): never {
  const context = inferContext(command, argv);

  if (error instanceof CommanderError && error.exitCode === 0) {
    // help or version was displayed.
    // Commander already printed the output, so just exit cleanly.
    process.exit(0);
  }

  if (context.json) {
    if (error instanceof HttpError) {
      printJson({
        ok: false,
        error: error.message,
        http_status: error.status,
        body: error.body,
      });
    } else if (error instanceof CliError) {
      printJson({
        ok: false,
        error: error.message,
      });
    } else if (error instanceof CommanderError) {
      // Strip the "error: " prefix Commander adds — it's terminal formatting,
      // not appropriate in a JSON payload.
      const message = error.message.replace(/^error:\s+/i, "");
      printJson({ ok: false, error: message });
    } else {
      printJson({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  } else {
    if (error instanceof HttpError) {
      process.stderr.write(
        `The API returned an error with status code ${error.status}:\n\n${JSON.stringify(error.body, null, 2)}\n`,
      );
    } else {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }

  const exitCode = (() => {
    if (error instanceof CliError) {
      return error.exitCode;
    } else if (error instanceof CommanderError) {
      return EXIT_CODES.ARGUMENT_ERROR;
    } else {
      return EXIT_CODES.RETRY_RECOMMENDED;
    }
  })();

  process.exit(exitCode);
}

export function parsePositiveIntOption(value: string, flag: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new CliError(
      `${flag} must be a positive integer`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return n;
}

type Example = {
  label: string;
  command: string;
};

export function createExampleText(examples: Example[]): string {
  const lines = [];

  lines.push(""); // separate from the rest of the help text
  lines.push("Examples:");

  for (const example of examples) {
    lines.push(`  ${example.label}:`);
    lines.push(`    ${example.command}`);
  }

  return lines.join("\n");
}

function inferContext(command?: Command, argv?: string[]): CliContext {
  if (command) {
    return getContext(command);
  } else {
    const hasJsonFlag = Boolean(argv?.find((arg) => arg === "--json"));
    return { json: hasJsonFlag };
  }
}

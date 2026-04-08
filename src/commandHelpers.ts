import { Command } from "commander";

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
      handleError(error, args[args.length - 1] as Command | undefined);
    }
  };
}

export function handleError(error: unknown, command?: Command): never {
  const context = command ? getContext(command) : { json: false };

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

  process.exit(error instanceof CliError ? error.exitCode : 1);
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

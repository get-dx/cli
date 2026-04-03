import { Command } from "commander";

import { CliError, HttpError } from "./errors.js";
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
        status: error.status,
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
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
  }

  process.exit(error instanceof CliError ? error.exitCode : 1);
}

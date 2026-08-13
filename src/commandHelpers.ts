import pc from "picocolors";
import { Command, CommanderError } from "commander";

import { CliError, EXIT_CODES, HttpError } from "./errors.js";
import type { CliContext } from "./types.js";

export function getContext(command: Command): CliContext {
  const root = command.optsWithGlobals();
  return {
    json: Boolean(root.json),
    agent: root.agent || process.env.DX_AGENT_NAME,
    agentModel: root.agentModel || process.env.DX_AGENT_MODEL,
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
  if (error instanceof CommanderError && error.exitCode === 0) {
    // help or version was displayed.
    // Commander already printed the output, so just exit cleanly.
    process.exit(0);
  }

  const context = inferContext(command, argv);
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
      process.stderr.write(pc.red(formatHttpError(error)));
    } else if (
      error instanceof CommanderError &&
      (error.code === "commander.help" || error.message === "(outputHelp)")
    ) {
      // Commander already printed the relevant help text.
    } else {
      process.stderr.write(
        pc.red(`${error instanceof Error ? error.message : String(error)}\n`),
      );
    }
  }

  const exitCode = (() => {
    if (error instanceof CliError) {
      return error.exitCode;
    } else if (error instanceof CommanderError) {
      return EXIT_CODES.ARGUMENT_ERROR;
    } else {
      // Should be unreachable
      return 1;
    }
  })();

  process.exit(exitCode);
}

/**
 * `status` and `body` are only populated when the API actually answered.
 * Network, TLS, and non-JSON failures carry their detail in `message` alone, so
 * these helpers coalesce so we display full details.
 */
function formatHttpError(error: HttpError): string {
  const heading = formatHttpErrorHeading(error);
  const body = formatHttpErrorBody(error.body);
  return body === null ? `${heading}\n` : `${heading}\n\n${body}\n`;
}

function formatHttpErrorHeading(error: HttpError): string {
  if (error.status === undefined) {
    return error.message;
  }

  // A successful or redirect status that still failed the request — an
  // unparseable body, or a redirect missing its Location — isn't an error the
  // API reported, so don't describe it as one.
  if (error.status < 400) {
    return `${error.message} (HTTP ${error.status})`;
  }

  return `The API returned an error with status code ${error.status}: ${error.message}`;
}

function formatHttpErrorBody(body: unknown): string | null {
  if (body === undefined || body === "") {
    return null;
  }

  // Non-JSON bodies (proxy block pages, HTML error pages) are far more legible
  // raw than as a JSON string literal full of escaped newlines.
  if (typeof body === "string") {
    return body;
  }

  return JSON.stringify(body, null, 2) ?? String(body);
}

function printJson(value: Record<string, unknown>): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
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

export function createNoteText(paragraphs: string[]): string {
  const width = getHelpWidth();
  const indent = "  ";
  const output = [];

  output.push(""); // separate from the rest of the help text
  output.push("Notes:");

  paragraphs.forEach((paragraph, index) => {
    if (index > 0) {
      output.push(""); // blank line between paragraphs
    }
    output.push(...wrapParagraph(paragraph, width, indent));
  });

  return output.join("\n");
}

function getHelpWidth(): number {
  return process.stdout.isTTY && process.stdout.columns
    ? process.stdout.columns
    : 80;
}

function wrapParagraph(text: string, width: number, indent: string): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && indent.length + candidate.length > width) {
      lines.push(`${indent}${current}`);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) {
    lines.push(`${indent}${current}`);
  }

  return lines;
}

function inferContext(command?: Command, argv?: string[]): CliContext {
  if (command) {
    return getContext(command);
  } else {
    const rawArgv = argv && argv.length > 0 ? argv : process.argv;
    const hasJsonFlag = Boolean(rawArgv.find((arg) => arg === "--json"));
    return {
      json: hasJsonFlag,
    };
  }
}

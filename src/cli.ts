import { Command, Option } from "commander";

import { getAuthInfo, getEntity } from "./api.js";
import { persistBaseUrl, resolveBaseUrl } from "./config.js";
import { CliError, HttpError } from "./errors.js";
import { printJson } from "./output.js";
import { renderAuthInfo, renderStructuredResponse } from "./renderers.js";
import { deleteToken, setToken } from "./secrets.js";
import { buildRuntime } from "./runtime.js";
import type { CliContext } from "./types.js";

import cliPackage from "../package.json" with { type: "json" };

export function createProgram(): Command {
  const program = new Command();

  program
    .name("dx")
    .description("DX CLI")
    .version(cliPackage.version)
    .addOption(new Option("--json", "Print machine-readable JSON"))
    .addOption(
      new Option("--agent <name>", "Agent name to send as an HTTP header"),
    )
    .addOption(
      new Option(
        "--agent-session-id <id>",
        "Agent session ID to send as an HTTP header",
      ),
    );

  const auth = program.command("auth").description("Manage DX authentication");

  auth
    .command("login")
    .requiredOption("--token <token>", "Account web API token")
    .action(
      wrapAction(async (commandOptions, command) => {
        const context = getContext(command);
        const baseUrl = resolveBaseUrl();
        const runtime = {
          baseUrl,
          token: commandOptions.token,
          context,
          version: cliPackage.version,
        };

        const response = await getAuthInfo(runtime);
        persistBaseUrl(baseUrl);
        setToken(baseUrl, commandOptions.token);
        renderAuthInfo(response, commandOptions.token, baseUrl, context.json);
      }),
    );

  auth.command("logout").action(
    wrapAction(async (_options, command) => {
      const context = getContext(command);
      const baseUrl = resolveBaseUrl();
      deleteToken(baseUrl);
      if (context.json) {
        printJson({ ok: true, base_url: baseUrl, logged_out: true });
        return;
      }

      renderStructuredResponse({ ok: true, baseUrl, loggedOut: true }, false);
    }),
  );

  auth.command("status").action(
    wrapAction(async (_options, command) => {
      const runtime = buildRuntime(getContext(command));
      const response = await getAuthInfo(runtime);
      renderAuthInfo(
        response,
        runtime.token,
        runtime.baseUrl,
        runtime.context.json,
      );
    }),
  );

  const entities = program.command("entities").description("Manage entities");

  entities
    .command("get")
    .argument("<identifier>", "Entity identifier")
    .action(
      wrapAction(async (identifier, _options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await getEntity(runtime, identifier);
        renderStructuredResponse(response, runtime.context.json);
      }),
    );

  return program;
}

export async function run(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

function getContext(command: Command): CliContext {
  const root = command.optsWithGlobals();
  return {
    json: Boolean(root.json),
    agent: root.agent || process.env.DX_AGENT_NAME,
    agentSessionId: root.agentSessionId || process.env.DX_AGENT_SESSION_ID,
  };
}

function wrapAction<T extends any[]>(
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

function handleError(error: unknown, command?: Command): never {
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

import { Command, Option } from "commander";

import { authCommand } from "./commands/auth.js";
import { catalogCommand } from "./commands/catalog.js";
import { scorecardsCommand } from "./commands/scorecards.js";
import { handleError } from "./commandHelpers.js";
import { initializeLogger } from "./logger.js";

import cliPackage from "../package.json" with { type: "json" };

export async function run(argv = process.argv): Promise<void> {
  try {
    initializeLogger({
      json: argv.includes("--json") || !process.stderr.isTTY,
    });
    await createProgram().parseAsync(argv);
  } catch (error) {
    handleError(error, undefined, argv);
  }
}

function createProgram(): Command {
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

  program.addCommand(authCommand());
  program.addCommand(catalogCommand());
  program.addCommand(scorecardsCommand());

  applyExitOverride(program);

  return program;
}

/**
 * Make Commander throw CommanderError instead of calling process.exit(), and
 * suppress its own stderr writes so we can control all error output ourselves.
 *
 * exitOverride() and configureOutput() are not inherited by subcommands, so
 * apply them to the full command tree after all subcommands are registered.
 */
function applyExitOverride(cmd: Command): void {
  cmd.exitOverride();
  cmd.configureOutput({ writeErr: () => {} });
  for (const sub of cmd.commands) {
    applyExitOverride(sub);
  }
}

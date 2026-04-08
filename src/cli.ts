import { Command, Option } from "commander";

import { authCommand } from "./commands/auth.js";
import { catalogCommand } from "./commands/catalog.js";
import { scorecardsCommand } from "./commands/scorecards.js";
import { handleError } from "./commandHelpers.js";

import cliPackage from "../package.json" with { type: "json" };

export async function run(argv = process.argv): Promise<void> {
  try {
    await createProgram().parseAsync(argv);
  } catch (error) {
    handleError(error);
  }
}

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

  program.addCommand(authCommand());
  program.addCommand(catalogCommand());
  program.addCommand(scorecardsCommand());

  return program;
}

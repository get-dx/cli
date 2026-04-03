import { Command, Option } from "commander";

import { authCommand } from "./commands/auth.js";
import { entitiesCommand } from "./commands/entities.js";

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

  program.addCommand(authCommand());
  program.addCommand(entitiesCommand());

  return program;
}

export async function run(argv = process.argv): Promise<void> {
  await createProgram().parseAsync(argv);
}

import { Command } from "commander";

import { queryCommand } from "./studio/query.js";
import { reportsCommand } from "./studio/reports.js";
import { variablesCommand } from "./studio/variables.js";

export function studioCommand() {
  const studio = new Command()
    .name("studio")
    .description("Perform data studio actions");

  studio.addCommand(queryCommand());
  studio.addCommand(reportsCommand());
  studio.addCommand(variablesCommand());

  return studio;
}

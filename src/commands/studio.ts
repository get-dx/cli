import { Command } from "commander";

import { queryCommand } from "./studio/query.js";

export function studioCommand() {
  const studio = new Command()
    .name("studio")
    .description("Perform data studio actions");

  studio.addCommand(queryCommand());

  return studio;
}

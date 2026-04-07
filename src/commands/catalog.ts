import { Command } from "commander";

import { entitiesCommand } from "./catalog/entities.js";
import { entityTypesCommand } from "./catalog/entityTypes.js";

export function catalogCommand() {
  const catalog = new Command()
    .name("catalog")
    .description("Manage the Software Catalog");

  catalog.addCommand(entitiesCommand());
  catalog.addCommand(entityTypesCommand());

  return catalog;
}

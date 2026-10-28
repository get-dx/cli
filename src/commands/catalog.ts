import { Command } from "commander";

import { entitiesCommand } from "./catalog/entities.js";
import { entityTypesCommand } from "./catalog/entityTypes.js";
import { relationEdgesCommand } from "./catalog/relationEdges.js";
import { relationsCommand } from "./catalog/relations.js";

export function catalogCommand() {
  const catalog = new Command()
    .name("catalog")
    .description("Manage the Software Catalog");

  catalog.addCommand(entitiesCommand());
  catalog.addCommand(entityTypesCommand());
  catalog.addCommand(relationEdgesCommand());
  catalog.addCommand(relationsCommand());

  return catalog;
}

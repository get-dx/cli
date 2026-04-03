import { Command } from "commander";

import { wrapAction } from "../../commandHelpers.js";
import { buildRuntime } from "../../runtime.js";
import { getContext } from "../../commandHelpers.js";
import { getEntity } from "../../api.js";
import { renderStructuredResponse } from "../../renderers.js";

export function entitiesCommand() {
  const entities = new Command()
    .name("entities")
    .description("Manage entities");

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

  return entities;
}

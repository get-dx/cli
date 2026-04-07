import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../../commandHelpers.js";
import { listEntityTypes } from "../../api.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { renderStructuredResponse } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";

export function entityTypesCommand() {
  const entityTypes = new Command()
    .name("entityTypes")
    .description("Manage catalog entity types");

  entityTypes
    .command("list")
    .description("List all entity types in your software catalog")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option(
      "--limit <n>",
      "Max entity types per page (default is 50)",
      (value) => parsePositiveIntOption(value, "--limit"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List the first page of entity types",
          command: "dx catalog entityTypes list",
        },
        {
          label: "List with a limit and return JSON",
          command: "dx catalog entityTypes list --limit 10 --json",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command:
            "dx catalog entityTypes list --cursor avsgf30ccan3",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await listEntityTypes(runtime, {
          cursor: options.cursor,
          limit: options.limit,
        });
        renderStructuredResponse(response, runtime.context.json);
      }),
    );

  return entityTypes;
}

function parsePositiveIntOption(value: string, flag: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new CliError(
      `${flag} must be a positive integer`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return n;
}

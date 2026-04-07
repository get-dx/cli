import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { request } from "../../http.js";
import { renderStructuredResponse } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";

export function entityTypesCommand() {
  const entityTypes = new Command()
    .name("entityTypes")
    .description("Manage catalog entity types");

  entityTypes
    .command("info")
    .argument("<identifier>", "Entity type identifier")
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, properties, aliases",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for the `service` entity type",
          command: "dx catalog entityTypes info service",
        },
        {
          label: "Fetch info and return as JSON",
          command: "dx catalog entityTypes info service --json",
        },
        {
          label: "Fetch info but only include the `core` and `properties` sections",
          command: "dx catalog entityTypes info service --include core,properties",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await getEntityType(runtime, identifier);
        const processedEntityType = processEntityTypeIncludes(
          response.entity_type as Record<string, unknown>,
          options,
        );
        renderStructuredResponse(
          { ...response, entity_type: processedEntityType },
          runtime.context.json,
        );
      }),
    );

  entityTypes
    .command("list")
    .description("List all entity types in your software catalog")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option(
      "--limit <n>",
      "Max entity types per page (default is 50)",
      (value) => parsePositiveIntOption(value, "--limit"),
    )
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, properties, aliases",
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
          command: "dx catalog entityTypes list --cursor avsgf30ccan3",
        },
        {
          label: "List and only include the core section",
          command: "dx catalog entityTypes list --include core",
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
        const processedEntityTypes = response.entity_types.map((entityType) =>
          processEntityTypeIncludes(
            entityType as Record<string, unknown>,
            options,
          ),
        );
        renderStructuredResponse(
          { ...response, entity_types: processedEntityTypes },
          runtime.context.json,
        );
      }),
    );

  return entityTypes;
}

// --- API ---

type ListEntityTypesParams = {
  cursor?: string;
  limit?: number;
};

type ListEntityTypesResponse = {
  ok: true;
  entity_types: unknown[];
  response_metadata?: { next_cursor?: string | null };
};

function requestOptions(runtime: Runtime) {
  return {
    token: runtime.token,
    agent: runtime.context.agent,
    agentSessionId: runtime.context.agentSessionId,
    userAgent: `dx-cli/${runtime.version}`,
  };
}

type GetEntityTypeResponse = {
  ok: true;
  entity_type: unknown;
};

async function getEntityType(
  runtime: Runtime,
  identifier: string,
): Promise<GetEntityTypeResponse> {
  const response = await request(
    runtime.baseUrl,
    "/catalog.entityTypes.info",
    {
      ...requestOptions(runtime),
      method: "GET",
      query: { identifier },
    },
  );

  return response as GetEntityTypeResponse;
}

async function listEntityTypes(
  runtime: Runtime,
  params: ListEntityTypesParams,
): Promise<ListEntityTypesResponse> {
  const query: Record<string, string | number | undefined> = {};
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;

  const response = await request(runtime.baseUrl, "/catalog.entityTypes.list", {
    ...requestOptions(runtime),
    method: "GET",
    query,
  });

  return response as ListEntityTypesResponse;
}

// --- Include helpers ---

const ENTITY_TYPE_INCLUDE_SECTIONS = ["core", "properties", "aliases"] as const;

type EntityTypeIncludeSection = (typeof ENTITY_TYPE_INCLUDE_SECTIONS)[number];

const ENTITY_TYPE_SECTION_KEYS: Record<
  EntityTypeIncludeSection,
  readonly string[]
> = {
  core: [
    "identifier",
    "name",
    "description",
    "icon",
    "ordering",
    "created_at",
    "updated_at",
  ],
  properties: ["properties"],
  aliases: ["aliases"],
};

function processEntityTypeIncludes(
  entityType: Record<string, unknown>,
  options: { include?: string },
): Record<string, unknown> {
  const includeSections = parseEntityTypeIncludeSections(options.include);

  if (includeSections.length === 0) {
    return entityType;
  }

  const out: Record<string, unknown> = {};
  for (const section of includeSections) {
    for (const key of ENTITY_TYPE_SECTION_KEYS[section]) {
      if (key in entityType) {
        out[key] = entityType[key];
      }
    }
  }
  return out;
}

function parseEntityTypeIncludeSections(
  include?: string,
): EntityTypeIncludeSection[] {
  if (!include) {
    return [];
  }

  const results = include.split(",");
  for (const result of results) {
    if (
      !ENTITY_TYPE_INCLUDE_SECTIONS.includes(result as EntityTypeIncludeSection)
    ) {
      throw new CliError(
        `Invalid --include "${result}". Expected one of: ${ENTITY_TYPE_INCLUDE_SECTIONS.join(", ")}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }
  return results as EntityTypeIncludeSection[];
}

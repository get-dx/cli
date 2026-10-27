import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { request } from "../../http.js";
import { renderJson } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";
import {
  renderRelation,
  renderRelationDeleted,
  renderRelationList,
} from "./relationsRendering.js";

const RELATION_TYPES = [
  "consumes",
  "depends on",
  "parent of",
  "part of",
  "provides",
  "manages",
];

const RELATION_CARDINALITIES = [
  "one_to_one",
  "one_to_many",
  "many_to_one",
  "many_to_many",
];

const RELATION_TYPE_HELP = `Relation type. One of: ${RELATION_TYPES.map((t) => `"${t}"`).join(", ")}`;

export function relationsCommand() {
  const relations = new Command()
    .name("relations")
    .description("Manage relation definitions between entity types");

  relations
    .command("create")
    .description(
      "Create a new relation definition between two entity types in your software catalog",
    )
    .option(
      "--identifier <identifier>",
      "Unique identifier for the new relation (required)",
    )
    .option(
      "--source-type <type>",
      "Entity type identifier for the source side of the relation (required)",
    )
    .option(
      "--target-type <type>",
      "Entity type identifier for the target side of the relation (required)",
    )
    .option("--type <type>", `${RELATION_TYPE_HELP} (required)`)
    .option(
      "--cardinality <cardinality>",
      `Relation cardinality. One of: ${RELATION_CARDINALITIES.join(", ")} (required)`,
    )
    .option("--description <desc>", "Description of the relation")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Create a relation between services",
          command:
            'dx catalog relations create --identifier service-depends-on-service --source-type service --target-type service --type "depends on" --cardinality many_to_many',
        },
        {
          label: "Create with a description and return JSON",
          command:
            'dx catalog relations create --identifier service-provides-package --source-type service --target-type package --type provides --cardinality one_to_many --description "Service provides a client SDK" --json',
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const requiredFlags: [string, unknown][] = [
          ["--identifier", options.identifier],
          ["--source-type", options.sourceType],
          ["--target-type", options.targetType],
          ["--type", options.type],
          ["--cardinality", options.cardinality],
        ];
        for (const [flag, value] of requiredFlags) {
          if (!value) {
            throw new CliError(
              `${flag} is required`,
              EXIT_CODES.ARGUMENT_ERROR,
            );
          }
        }

        const runtime = await buildRuntime(getContext(command));
        const response = await createRelation(runtime, {
          identifier: options.identifier,
          source_entity_type_identifier: options.sourceType,
          target_entity_type_identifier: options.targetType,
          type: options.type,
          cardinality: options.cardinality,
          description: options.description,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelation(
            response.relation,
            `${ui.success(ui.GLYPHS.CHECK)} Relation created`,
          );
        }
      }),
    );

  relations
    .command("delete")
    .description("Delete a relation definition from your software catalog")
    .argument("<identifier>", "Relation identifier")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Delete the `service-depends-on-service` relation",
          command: "dx catalog relations delete service-depends-on-service",
        },
        {
          label: "Delete a relation and return JSON",
          command:
            "dx catalog relations delete service-depends-on-service --json",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, _options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await deleteRelation(runtime, identifier);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelationDeleted(response.relation);
        }
      }),
    );

  relations
    .command("info")
    .description("Get information about a relation definition")
    .argument("<identifier>", "Relation identifier")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for the `service-depends-on-service` relation",
          command: "dx catalog relations info service-depends-on-service",
        },
        {
          label: "Fetch info and return as JSON",
          command:
            "dx catalog relations info service-depends-on-service --json",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, _options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getRelation(runtime, identifier);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelation(response.relation);
        }
      }),
    );

  relations
    .command("list")
    .description("List relation definitions in your software catalog")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option("--limit <n>", "Max relations per page (default is 50)", (value) =>
      parsePositiveIntOption(value, "--limit"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List the first page of relations",
          command: "dx catalog relations list",
        },
        {
          label: "List with a limit and return JSON",
          command: "dx catalog relations list --limit 10 --json",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command: "dx catalog relations list --cursor avsgf30ccan3",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await listRelations(runtime, {
          cursor: options.cursor,
          limit: options.limit,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelationList(
            response.relations,
            response.response_metadata?.next_cursor ?? null,
          );
        }
      }),
    );

  relations
    .command("update")
    .description(
      "Update a relation definition. The identifier, source and target entity types, and cardinality cannot be changed.",
    )
    .argument("<identifier>", "Relation identifier")
    .option("--type <type>", RELATION_TYPE_HELP)
    .option("--description <desc>", "Description of the relation")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Update a relation's description",
          command:
            'dx catalog relations update service-depends-on-service --description "Runtime dependencies between services"',
        },
        {
          label: "Change the relation type and return JSON",
          command:
            "dx catalog relations update service-provides-package --type provides --json",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await updateRelation(runtime, identifier, {
          type: options.type,
          description: options.description,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelation(
            response.relation,
            `${ui.success(ui.GLYPHS.CHECK)} Relation updated`,
          );
        }
      }),
    );

  return relations;
}

// --- API ---

export type Relation = {
  identifier: string;
  type: string;
  inverse_type: string;
  cardinality: string;
  description: string | null;
  source_entity_type_identifier: string;
  target_entity_type_identifier: string;
  created_at: string;
  updated_at: string;
};

type RelationResponse = {
  ok: true;
  relation: Relation;
};

type ListRelationsParams = {
  cursor?: string;
  limit?: number;
};

type ListRelationsResponse = {
  ok: true;
  relations: Relation[];
  response_metadata?: { next_cursor?: string | null };
};

type CreateRelationParams = {
  identifier: string;
  source_entity_type_identifier: string;
  target_entity_type_identifier: string;
  type: string;
  cardinality: string;
  description?: string;
};

type UpdateRelationParams = {
  type?: string;
  description?: string;
};

async function createRelation(
  runtime: Runtime,
  params: CreateRelationParams,
): Promise<RelationResponse> {
  const body: Record<string, unknown> = {
    identifier: params.identifier,
    source_entity_type_identifier: params.source_entity_type_identifier,
    target_entity_type_identifier: params.target_entity_type_identifier,
    type: params.type,
    cardinality: params.cardinality,
  };
  if (params.description !== undefined) body.description = params.description;

  const response = await request<RelationResponse>(
    runtime,
    "/catalog.relations.create",
    {
      method: "POST",
      body,
    },
  );

  return response.body;
}

async function deleteRelation(
  runtime: Runtime,
  identifier: string,
): Promise<RelationResponse> {
  const response = await request<RelationResponse>(
    runtime,
    "/catalog.relations.delete",
    {
      method: "POST",
      query: { identifier },
    },
  );

  return response.body;
}

async function getRelation(
  runtime: Runtime,
  identifier: string,
): Promise<RelationResponse> {
  const response = await request<RelationResponse>(
    runtime,
    "/catalog.relations.info",
    {
      method: "GET",
      query: { identifier },
    },
  );

  return response.body;
}

async function listRelations(
  runtime: Runtime,
  params: ListRelationsParams,
): Promise<ListRelationsResponse> {
  const query: Record<string, string | number | undefined> = {};
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;

  const response = await request<ListRelationsResponse>(
    runtime,
    "/catalog.relations.list",
    {
      method: "GET",
      query,
    },
  );

  return response.body;
}

async function updateRelation(
  runtime: Runtime,
  identifier: string,
  params: UpdateRelationParams,
): Promise<RelationResponse> {
  const body: Record<string, unknown> = { identifier };
  if (params.type !== undefined) body.type = params.type;
  if (params.description !== undefined) body.description = params.description;

  const response = await request<RelationResponse>(
    runtime,
    "/catalog.relations.update",
    {
      method: "POST",
      body,
    },
  );

  return response.body;
}

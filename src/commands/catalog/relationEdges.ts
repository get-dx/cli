import fs from "fs";

import { Command } from "commander";
import { parse as parseYaml } from "yaml";

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
import {
  renderRelationEdgeAdded,
  renderRelationEdgeList,
  renderRelationEdgeRemoved,
  renderRelationEdgesTemplateWritten,
  renderRelationEdgesUpserted,
} from "./relationEdgesRendering.js";

const RELATION_EDGES_BLANK_TEMPLATE_YAML = fs.readFileSync(
  new URL("./relation-edges-blank-template.yaml", import.meta.url),
  "utf8",
);

export function relationEdgesCommand() {
  const relationEdges = new Command()
    .name("relationEdges")
    .description("Manage relation edges between entities");

  relationEdges
    .command("add")
    .description("Add a relation edge between two entities")
    .option("--relation <identifier>", "Relation identifier (required)")
    .option("--source <identifier>", "Source entity identifier (required)")
    .option("--target <identifier>", "Target entity identifier (required)")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Record that `login-frontend` depends on `authn-backend`",
          command:
            "dx catalog relationEdges add --relation service-depends-on-service --source login-frontend --target authn-backend",
        },
        {
          label: "Add an edge and return JSON",
          command:
            "dx catalog relationEdges add --relation service-depends-on-service --source login-frontend --target authn-backend --json",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const edge = requireEdgeOptions(options);
        const runtime = await buildRuntime(getContext(command));
        const response = await addRelationEdge(runtime, edge);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelationEdgeAdded(edge);
        }
      }),
    );

  relationEdges
    .command("bulkUpsert")
    .description(
      "Create or update many relation edges for one relation from a YAML or JSON file or stdin. The file maps each source entity identifier to a list of target entity identifiers.",
    )
    .option("--relation <identifier>", "Relation identifier (required)")
    .option(
      "--from-file <path>",
      "Path to a YAML or JSON file of edges. Use `initBulkUpsert` to generate a template.",
    )
    .option("--from-stdin", "Read YAML or JSON edges from stdin")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Generate a template first",
          command: "dx catalog relationEdges initBulkUpsert ./edges.yaml",
        },
        {
          label: "Upsert edges from a YAML file",
          command:
            "dx catalog relationEdges bulkUpsert --relation service-depends-on-service --from-file ./edges.yaml",
        },
        {
          label: "Upsert edges from stdin",
          command:
            'echo \'{"login-frontend": ["authn-backend", "feature-flag-backend"]}\' | dx catalog relationEdges bulkUpsert --relation service-depends-on-service --from-stdin',
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        if (!options.relation) {
          throw new CliError(
            "--relation is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (!options.fromFile && !options.fromStdin) {
          throw new CliError(
            "One of --from-file or --from-stdin is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (options.fromFile && options.fromStdin) {
          throw new CliError(
            "--from-file and --from-stdin are mutually exclusive",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const raw = options.fromFile
          ? readYamlFile(options.fromFile as string)
          : await readYamlStdin();
        const edges = parseEdgesMap(
          raw,
          options.fromFile ? (options.fromFile as string) : "stdin",
        );

        const runtime = await buildRuntime(getContext(command));
        const response = await bulkUpsertRelationEdges(
          runtime,
          options.relation as string,
          edges,
        );

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelationEdgesUpserted(options.relation as string, edges);
        }
      }),
    );

  relationEdges
    .command("initBulkUpsert")
    .description(
      "Write a blank YAML template of relation edges to use with `bulkUpsert`",
    )
    .argument("<path>", "File path to write the YAML to")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Write a blank relation edges template",
          command: "dx catalog relationEdges initBulkUpsert ./edges.yaml",
        },
        {
          label: "Upsert edges from the template",
          command:
            "dx catalog relationEdges bulkUpsert --relation service-depends-on-service --from-file ./edges.yaml",
        },
      ]),
    )
    .action(
      wrapAction(async (path, _options, command) => {
        const runtime = await buildRuntime(getContext(command));

        fs.writeFileSync(path, RELATION_EDGES_BLANK_TEMPLATE_YAML, "utf8");

        if (runtime.context.json) {
          renderJson({ ok: true, path });
        } else {
          renderRelationEdgesTemplateWritten(path);
        }
      }),
    );

  relationEdges
    .command("list")
    .description("List the entities connected to an entity through a relation")
    .option("--entity <identifier>", "Entity identifier (required)")
    .option("--relation <identifier>", "Relation identifier (required)")
    .option(
      "--direction <direction>",
      "Treat the entity as the source (`outgoing`) or target (`incoming`) of the relation (default is outgoing)",
    )
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option(
      "--limit <n>",
      "Max edges per page, up to 50 (default is 25)",
      (value) => parsePositiveIntOption(value, "--limit"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List the APIs that `payments-service` consumes",
          command:
            "dx catalog relationEdges list --entity payments-service --relation service-consumes-api",
        },
        {
          label: "List incoming edges and return JSON",
          command:
            "dx catalog relationEdges list --entity core-api --relation service-consumes-api --direction incoming --json",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command:
            "dx catalog relationEdges list --entity payments-service --relation service-consumes-api --cursor d0d93f40-e534-51ac-0a0a-c839dfa2ff35",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        if (!options.entity) {
          throw new CliError("--entity is required", EXIT_CODES.ARGUMENT_ERROR);
        }
        if (!options.relation) {
          throw new CliError(
            "--relation is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = await buildRuntime(getContext(command));
        const response = await listRelationEdges(runtime, {
          entity_identifier: options.entity,
          relation_identifier: options.relation,
          direction: options.direction,
          cursor: options.cursor,
          limit: options.limit,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelationEdgeList(
            response.entity_relations,
            {
              entity: options.entity,
              relation: options.relation,
              direction: options.direction ?? "outgoing",
            },
            response.response_metadata?.next_cursor ?? null,
          );
        }
      }),
    );

  relationEdges
    .command("remove")
    .description("Remove a relation edge between two entities")
    .option("--relation <identifier>", "Relation identifier (required)")
    .option("--source <identifier>", "Source entity identifier (required)")
    .option("--target <identifier>", "Target entity identifier (required)")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Remove the edge from `login-frontend` to `authn-backend`",
          command:
            "dx catalog relationEdges remove --relation service-depends-on-service --source login-frontend --target authn-backend",
        },
        {
          label: "Remove an edge and return JSON",
          command:
            "dx catalog relationEdges remove --relation service-depends-on-service --source login-frontend --target authn-backend --json",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const edge = requireEdgeOptions(options);
        const runtime = await buildRuntime(getContext(command));
        const response = await removeRelationEdge(runtime, edge);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRelationEdgeRemoved(edge);
        }
      }),
    );

  return relationEdges;
}

// --- API ---

export type RelationEdge = {
  relation: string;
  source: string;
  target: string;
};

export type RelatedEntity = {
  identifier: string;
  name: string | null;
};

export type RelationEdgesMap = Record<string, string[]>;

type ListRelationEdgesParams = {
  entity_identifier: string;
  relation_identifier: string;
  direction?: string;
  cursor?: string;
  limit?: number;
};

type ListRelationEdgesResponse = {
  ok: true;
  entity_relations: RelatedEntity[];
  response_metadata?: { next_cursor?: string | null };
};

async function addRelationEdge(
  runtime: Runtime,
  edge: RelationEdge,
): Promise<{ ok: true }> {
  const response = await request<{ ok: true }>(
    runtime,
    "/catalog.relationEdges.add",
    {
      method: "POST",
      body: edgeBody(edge),
    },
  );

  return response.body;
}

async function bulkUpsertRelationEdges(
  runtime: Runtime,
  relation: string,
  edges: RelationEdgesMap,
): Promise<{ ok: true }> {
  const response = await request<{ ok: true }>(
    runtime,
    "/catalog.relationEdges.bulkUpsert",
    {
      method: "POST",
      body: { relation_identifier: relation, edges },
    },
  );

  return response.body;
}

async function listRelationEdges(
  runtime: Runtime,
  params: ListRelationEdgesParams,
): Promise<ListRelationEdgesResponse> {
  const query: Record<string, string | number | undefined> = {
    entity_identifier: params.entity_identifier,
    relation_identifier: params.relation_identifier,
  };
  if (params.direction !== undefined) query.direction = params.direction;
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;

  const response = await request<ListRelationEdgesResponse>(
    runtime,
    "/catalog.relationEdges.list",
    {
      method: "GET",
      query,
    },
  );

  return response.body;
}

async function removeRelationEdge(
  runtime: Runtime,
  edge: RelationEdge,
): Promise<{ ok: true }> {
  const response = await request<{ ok: true }>(
    runtime,
    "/catalog.relationEdges.remove",
    {
      method: "POST",
      body: edgeBody(edge),
    },
  );

  return response.body;
}

function edgeBody(edge: RelationEdge): Record<string, unknown> {
  return {
    relation_identifier: edge.relation,
    source_entity_identifier: edge.source,
    target_entity_identifier: edge.target,
  };
}

// --- Input helpers ---

function requireEdgeOptions(options: {
  relation?: string;
  source?: string;
  target?: string;
}): RelationEdge {
  for (const flag of ["relation", "source", "target"] as const) {
    if (!options[flag]) {
      throw new CliError(`--${flag} is required`, EXIT_CODES.ARGUMENT_ERROR);
    }
  }
  return {
    relation: options.relation!,
    source: options.source!,
    target: options.target!,
  };
}

function parseEdgesMap(raw: unknown, sourceLabel: string): RelationEdgesMap {
  if (raw === null || raw === undefined) {
    throw noEdgesError(sourceLabel);
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new CliError(
      "Edges must be an object mapping each source entity identifier to a list of target entity identifiers",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  for (const [source, targets] of Object.entries(raw)) {
    if (
      !Array.isArray(targets) ||
      !targets.every((target) => typeof target === "string")
    ) {
      throw new CliError(
        `Targets for source "${source}" must be a list of entity identifiers`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }

  const edges = raw as RelationEdgesMap;
  if (Object.values(edges).every((targets) => targets.length === 0)) {
    throw noEdgesError(sourceLabel);
  }

  return edges;
}

function noEdgesError(sourceLabel: string): CliError {
  return new CliError(
    `No edges found in ${sourceLabel}`,
    EXIT_CODES.ARGUMENT_ERROR,
  );
}

function readYamlFile(filePath: string): unknown {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new CliError(
      `Could not read file "${filePath}": ${(err as Error).message}`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  try {
    return parseYaml(content);
  } catch (err) {
    throw new CliError(
      `Failed to parse YAML from "${filePath}": ${(err as Error).message}`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
}

async function readYamlStdin(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => {
      const content = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(parseYaml(content));
      } catch (err) {
        reject(
          new CliError(
            `Failed to parse YAML from stdin: ${(err as Error).message}`,
            EXIT_CODES.ARGUMENT_ERROR,
          ),
        );
      }
    });
    process.stdin.on("error", (err) => {
      reject(
        new CliError(
          `Failed to read from stdin: ${err.message}`,
          EXIT_CODES.ARGUMENT_ERROR,
        ),
      );
    });
  });
}

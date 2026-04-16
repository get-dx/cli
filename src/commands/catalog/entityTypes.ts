import fs from "fs";

import { Command } from "commander";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES, HttpError } from "../../errors.js";
import { request } from "../../http.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";
import {
  renderEntityType,
  renderEntityTypeDeleted,
  renderEntityTypeList,
} from "./entityTypesRendering.js";

export function entityTypesCommand() {
  const entityTypes = new Command()
    .name("entityTypes")
    .description("Manage catalog entity types");

  entityTypes
    .command("create")
    .description(
      "Create a new entity type from a YAML file or stdin. The `init` command can be used to generate a starting template.",
    )
    .option(
      "--from-file <path>",
      "Read a YAML file and create an entity type from its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML from stdin and create an entity type from its contents",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Generate a blank template first",
          command: "dx catalog entityTypes init ./my-entity-type.yaml",
        },
        {
          label: "Create an entity type from a YAML file",
          command:
            "dx catalog entityTypes create --from-file ./my-entity-type.yaml",
        },
        {
          label: "Create an entity type from stdin",
          command:
            "cat ./my-entity-type.yaml | dx catalog entityTypes create --from-stdin",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const modeCount = [options.fromFile, options.fromStdin].filter(
          Boolean,
        ).length;
        if (modeCount === 0) {
          throw new CliError(
            "One of --from-file or --from-stdin is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (modeCount > 1) {
          throw new CliError(
            "--from-file and --from-stdin are mutually exclusive",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = buildRuntime(getContext(command));

        let raw: unknown;
        if (options.fromFile) {
          raw = readYamlFile(options.fromFile as string);
        } else {
          raw = await readYamlStdin();
        }

        const payload = buildCreatePayload(raw);
        const response = await createEntityType(runtime, payload);

        if (runtime.context.json) {
          renderJson({ ok: true, entity_type: response.entity_type });
        } else {
          renderEntityType(
            response.entity_type,
            `${ui.success(ui.GLYPHS.CHECK)} Entity type created`,
          );
        }
      }),
    );

  entityTypes
    .command("delete")
    .description("Delete an entity type from your software catalog")
    .argument("<identifier>", "Entity type identifier")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Delete the `service` entity type",
          command: "dx catalog entityTypes delete service",
        },
        {
          label: "Delete an entity type and return JSON",
          command: "dx catalog entityTypes delete service --json",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, _options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await deleteEntityType(runtime, identifier);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderEntityTypeDeleted(response.entity_type);
        }
      }),
    );

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
          label:
            "Fetch info but only include the `core` and `properties` sections",
          command:
            "dx catalog entityTypes info service --include core,properties",
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

        if (runtime.context.json) {
          renderJson(processedEntityType);
        } else {
          renderEntityType(processedEntityType as Partial<EntityType>);
        }
      }),
    );

  entityTypes
    .command("init")
    .description(
      "Write an entity type YAML file, either from an existing entity type or as a blank template",
    )
    .argument("<path>", "File path to write the YAML to")
    .option(
      "--identifier <identifier>",
      "Fetch an existing entity type and use it as the template",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Write a blank entity type template",
          command: "dx catalog entityTypes init ./my-entity-type.yaml",
        },
        {
          label: "Initialize from an existing entity type",
          command:
            "dx catalog entityTypes init ./my-entity-type.yaml --identifier service",
        },
      ]),
    )
    .action(
      wrapAction(async (path, options, command) => {
        const runtime = buildRuntime(getContext(command));

        if (options.identifier) {
          const identifier = options.identifier as string;
          let entityTypeResponse;
          try {
            entityTypeResponse = await getEntityType(runtime, identifier);
          } catch (err) {
            const exitCode =
              err instanceof HttpError &&
              err.status !== undefined &&
              err.status < 500
                ? EXIT_CODES.ARGUMENT_ERROR
                : EXIT_CODES.RETRY_RECOMMENDED;
            throw new CliError(
              `Failed to fetch entity type "${identifier}": ${err instanceof Error ? err.message : String(err)}`,
              exitCode,
            );
          }
          const yaml = entityTypeToYaml(entityTypeResponse.entity_type);
          fs.writeFileSync(path, yaml, "utf8");
          if (runtime.context.json) {
            renderJson({ ok: true, identifier, path });
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Entity type written to ${ui.code(path)}.`,
              ),
              ui.p(
                `Edit the file, then run: ${ui.code(`dx catalog entityTypes update ${identifier} --from-file ${path}`)}`,
              ),
            ]);
          }
        } else {
          fs.writeFileSync(path, ENTITY_TYPE_BLANK_TEMPLATE_YAML, "utf8");
          if (runtime.context.json) {
            renderJson({ ok: true, path });
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Blank template written to ${ui.code(path)}.`,
              ),
              ui.p(
                `Edit the file, then run: ${ui.code(`dx catalog entityTypes create --from-file ${path}`)}`,
              ),
            ]);
          }
        }
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
        if (runtime.context.json) {
          renderJson({ ...response, entity_types: processedEntityTypes });
        } else {
          renderEntityTypeList(
            processedEntityTypes,
            response.response_metadata?.next_cursor ?? null,
          );
        }
      }),
    );

  entityTypes
    .command("update")
    .description(
      "Update an existing entity type from a YAML file or stdin. The `init` command can be used to initialize the entity type file.",
    )
    .argument("<identifier>", "The unique identifier of the entity type")
    .option(
      "--from-file <path>",
      "Read a YAML file and update the entity type with its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML from stdin and update the entity type with its contents",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Initialize a file first",
          command:
            "dx catalog entityTypes init --identifier service ./my-entity-type.yaml",
        },
        {
          label: "Update an entity type from a YAML file",
          command:
            "dx catalog entityTypes update service --from-file ./my-entity-type.yaml",
        },
        {
          label: "Update an entity type from stdin",
          command:
            "cat ./my-entity-type.yaml | dx catalog entityTypes update service --from-stdin",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const modeCount = [options.fromFile, options.fromStdin].filter(
          Boolean,
        ).length;
        if (modeCount === 0) {
          throw new CliError(
            "One of --from-file or --from-stdin is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (modeCount > 1) {
          throw new CliError(
            "--from-file and --from-stdin are mutually exclusive",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = buildRuntime(getContext(command));

        let raw: unknown;
        if (options.fromFile) {
          raw = readYamlFile(options.fromFile as string);
        } else {
          raw = await readYamlStdin();
        }

        const payload = buildUpdatePayload(identifier, raw);
        const response = await updateEntityType(runtime, payload);

        if (runtime.context.json) {
          renderJson({ ok: true, entity_type: response.entity_type });
        } else {
          renderEntityType(
            response.entity_type,
            `${ui.success(ui.GLYPHS.CHECK)} Entity type updated`,
          );
        }
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
  entity_types: EntityType[];
  response_metadata?: { next_cursor?: string | null };
};

type GetEntityTypeResponse = {
  ok: true;
  entity_type: EntityType;
};

type DeleteEntityTypeResponse = {
  ok: true;
  entity_type: EntityType;
};

// TODO: double-check fields
type CreateEntityTypePayload = {
  identifier: string;
  name: string;
  description?: string;
  properties?: Property[];
  aliases?: Record<string, boolean>;
};

type CreateEntityTypeResponse = {
  ok: true;
  entity_type: EntityType;
};

type UpdateEntityTypePayload = {
  identifier: string;
  name?: string;
  description?: string;
  properties?: Property[];
  aliases?: Record<string, boolean>;
};

type UpdateEntityTypeResponse = {
  ok: true;
  entity_type: EntityType;
};

export type EntityType = {
  identifier: string;
  name: string | null;
  description: string;
  icon: string | null;
  ordering: number;
  created_at: string;
  updated_at: string;
  properties: Property[];
  aliases: Record<string, unknown[]>;
};

export type Property = {
  identifier: string;
  name: string;
  description: string;
  type: PropertyType;
  ordering: number;
  created_at: string;
  updated_at: string;
  definition: Record<string, unknown>;
  is_required: boolean;
  visibility: "visible" | "hidden";
};

export type PropertyType =
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "multi_select"
  | "computed"
  | "date"
  | "json"
  | "url"
  | "user"
  | "file_matching_rule"
  | "list"
  | "openapi"
  | "slack_channel"
  | "msteams_channel"
  | "email";

export async function getEntityType(
  runtime: Runtime,
  identifier: string,
): Promise<GetEntityTypeResponse> {
  const response = await request<GetEntityTypeResponse>(
    runtime,
    "/catalog.entityTypes.info",
    {
      method: "GET",
      query: { identifier },
    },
  );

  return response.body;
}

async function deleteEntityType(
  runtime: Runtime,
  identifier: string,
): Promise<DeleteEntityTypeResponse> {
  const response = await request<DeleteEntityTypeResponse>(
    runtime,
    "/catalog.entityTypes.delete",
    {
      method: "POST",
      query: { identifier },
    },
  );

  return response.body;
}

async function listEntityTypes(
  runtime: Runtime,
  params: ListEntityTypesParams,
): Promise<ListEntityTypesResponse> {
  const query: Record<string, string | number | undefined> = {};
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;

  const response = await request<ListEntityTypesResponse>(
    runtime,
    "/catalog.entityTypes.list",
    {
      method: "GET",
      query,
    },
  );

  return response.body;
}

async function createEntityType(
  runtime: Runtime,
  payload: CreateEntityTypePayload,
): Promise<CreateEntityTypeResponse> {
  const response = await request<CreateEntityTypeResponse>(
    runtime,
    "/catalog.entityTypes.create",
    {
      method: "POST",
      body: payload,
    },
  );

  return response.body;
}

async function updateEntityType(
  runtime: Runtime,
  payload: UpdateEntityTypePayload,
): Promise<UpdateEntityTypeResponse> {
  const response = await request<UpdateEntityTypeResponse>(
    runtime,
    "/catalog.entityTypes.update",
    {
      method: "POST",
      body: payload,
    },
  );

  return response.body;
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

// --- YAML helpers ---

const ENTITY_TYPE_BLANK_TEMPLATE_YAML = fs.readFileSync(
  new URL("./entity-type-blank-template.yaml", import.meta.url),
  "utf8",
);

const ENTITY_TYPE_IGNORED_KEYS: ReadonlyArray<keyof EntityType> = [
  // Reporting on state
  "created_at",
  "updated_at",
];

const PROPERTY_IGNORED_KEYS: ReadonlyArray<keyof Property> = [
  // Reporting on state
  "created_at",
  "updated_at",
];

function entityTypeToYaml(entityType: EntityType): string {
  const obj = { ...entityType } as Partial<EntityType>;
  for (const key of ENTITY_TYPE_IGNORED_KEYS) {
    delete obj[key];
  }
  if (obj.properties) {
    obj.properties = obj.properties.map((prop) => {
      const p = { ...prop };
      for (const key of PROPERTY_IGNORED_KEYS) {
        delete p[key];
      }
      return p;
    });
  }
  return stringifyYaml(obj, { blockQuote: "literal" });
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
  return parseYaml(content);
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

function buildCreatePayload(raw: unknown): CreateEntityTypePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CliError(
      "YAML content must be an object",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return raw as CreateEntityTypePayload;
}

function buildUpdatePayload(
  identifier: string,
  raw: unknown,
): UpdateEntityTypePayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CliError(
      "YAML content must be an object",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return { ...(raw as Record<string, unknown>), identifier };
}

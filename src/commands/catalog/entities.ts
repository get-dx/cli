import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES, HttpError } from "../../errors.js";
import { request } from "../../http.js";
import { renderStructuredResponse } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import { getEntityType } from "./entityTypes.js";
import type { Property } from "./entityTypes.js";
import type {
  ScorecardCheckGroup,
  ScorecardLevel,
  ScorecardTag,
} from "../scorecards.js";

export function entitiesCommand() {
  const entities = new Command()
    .name("entities")
    .description("Manage entities");

  entities
    .command("create")
    .description("Create a new entity in your software catalog")
    .option("--type <type>", "Entity type identifier (required)")
    .option(
      "--identifier <identifier>",
      "Unique identifier for the new entity (required)",
    )
    .option("--name <name>", "Display name of the entity")
    .option("--description <desc>", "Description of the entity")
    .option("--owner-team-ids <ids>", "Comma-separated owner team IDs")
    .option("--owner-user-ids <ids>", "Comma-separated owner user IDs")
    .option(
      "--property <kv>",
      "Set a property value as key=value. Repeat for multiple properties.",
      (val: string, prev: string[]) => [...prev, val],
      [] as string[],
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Create a new service entity",
          command:
            "dx catalog entities create --type service --identifier my-service",
        },
        {
          label: "Create with a name and return as JSON",
          command:
            'dx catalog entities create --type service --identifier my-service --name "My Service" --json',
        },
        {
          label: "Create and assign owner teams",
          command:
            "dx catalog entities create --type service --identifier my-service --owner-team-ids MzI1NTA,MzI1NTk",
        },
        {
          label: "Create with properties",
          command:
            'dx catalog entities create --type service --identifier my-service --property tier=Tier-1 --property "languages=Ruby,TypeScript"',
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        if (!options.identifier) {
          throw new CliError(
            "--identifier is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (!options.type) {
          throw new CliError("--type is required", EXIT_CODES.ARGUMENT_ERROR);
        }
        const runtime = buildRuntime(getContext(command));

        const properties = await resolvePropertiesForEntityType(
          runtime,
          options.type as string,
          options.property as string[],
        );

        const response = await createEntity(
          runtime,
          options.identifier as string,
          {
            type: options.type as string,
            name: options.name,
            description: options.description,
            owner_team_ids: options.ownerTeamIds
              ?.split(",")
              .map((s: string) => s.trim()),
            owner_user_ids: options.ownerUserIds
              ?.split(",")
              .map((s: string) => s.trim()),
            properties,
          },
        );
        renderStructuredResponse(response, runtime.context.json);
      }),
    );

  entities
    .command("update")
    .description("Update an entity in your software catalog")
    .argument("<identifier>", "Entity identifier")
    .option("--name <name>", "Display name of the entity")
    .option("--description <desc>", "Description of the entity")
    .option("--owner-team-ids <ids>", "Comma-separated owner team IDs")
    .option("--owner-user-ids <ids>", "Comma-separated owner user IDs")
    .option(
      "--property <kv>",
      "Set a property value as key=value. Repeat for multiple properties. Use value null to remove a property.",
      (val: string, prev: string[]) => [...prev, val],
      [] as string[],
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Rename an entity",
          command: 'dx catalog entities update my-service --name "My Service"',
        },
        {
          label: "Update owners and return JSON",
          command:
            "dx catalog entities update my-service --owner-team-ids MzI1NTA,MzI1NTk --json",
        },
        {
          label: "Update properties",
          command:
            'dx catalog entities update my-service --property tier=Tier-1 --property "languages=Ruby,TypeScript"',
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const runtime = buildRuntime(getContext(command));

        const properties = await resolvePropertiesForExistingEntity(
          runtime,
          identifier as string,
          options.property as string[],
        );

        const response = await updateEntity(runtime, identifier as string, {
          ...getEntityMutationOptionValues(options),
          properties,
        });

        renderStructuredResponse(response, runtime.context.json);
      }),
    );

  entities
    .command("upsert")
    .description(
      "Create a new entity in your software catalog, or update it if it already exists",
    )
    .option("--type <type>", "Entity type identifier (required)")
    .option(
      "--identifier <identifier>",
      "Unique identifier for the entity (required)",
    )
    .option("--name <name>", "Display name of the entity")
    .option("--description <desc>", "Description of the entity")
    .option("--owner-team-ids <ids>", "Comma-separated owner team IDs")
    .option("--owner-user-ids <ids>", "Comma-separated owner user IDs")
    .option(
      "--property <kv>",
      "Set a property value as key=value. Repeat for multiple properties. Use value null to remove a property.",
      (val: string, prev: string[]) => [...prev, val],
      [] as string[],
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Create a new service entity if it does not exist",
          command:
            "dx catalog entities upsert --type service --identifier my-service --name 'My Service'",
        },
        {
          label: "Update owners and return JSON",
          command:
            "dx catalog entities upsert --type service --identifier my-service --owner-team-ids MzI1NTA,MzI1NTk --json",
        },
        {
          label: "Set properties while preserving omitted fields",
          command:
            'dx catalog entities upsert --type service --identifier my-service --property tier=Tier-1 --property "languages=Ruby,TypeScript"',
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        if (!options.type) {
          throw new CliError("--type is required", EXIT_CODES.ARGUMENT_ERROR);
        }
        if (!options.identifier) {
          throw new CliError(
            "--identifier is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = buildRuntime(getContext(command));
        const properties = await resolvePropertiesForEntityType(
          runtime,
          options.type as string,
          options.property as string[],
        );

        const response = await upsertEntity(
          runtime,
          options.identifier as string,
          {
            type: options.type as string,
            ...getEntityMutationOptionValues(options),
            properties,
          },
        );

        renderStructuredResponse(response, runtime.context.json);
      }),
    );

  entities
    .command("info")
    .argument("<identifier>", "Entity identifier")
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, owners, properties, aliases",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for the `login-frontend` entity",
          command: "dx catalog entities info login-frontend",
        },
        {
          label: "Fetch info and return as JSON",
          command: "dx catalog entities info login-frontend --json",
        },
        {
          label: "Fetch info but only include the `core` and `owners` sections",
          command:
            "dx catalog entities info login-frontend --include core,owners",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await getEntity(runtime, identifier);
        const processedResponse = processIncludes(response, options);

        renderStructuredResponse(processedResponse, runtime.context.json);
      }),
    );

  entities
    .command("list")
    .description("List entities from your software catalog")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option("--limit <n>", "Max entities per page (default is 50)", (value) =>
      parsePositiveIntOption(value, "--limit"),
    )
    .option("--type <type>", "Only include entities of this type")
    .option(
      "--search-term <term>",
      "Filter by name, identifier, squad owner name, and/or user owner name",
    )
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, owners, properties, aliases",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List the first page of entities",
          command: "dx catalog entities list",
        },
        {
          label: "List with a limit and return JSON",
          command: "dx catalog entities list --limit 10 --json",
        },
        {
          label: "Search and fetch the next page",
          command:
            "dx catalog entities list --search-term payment --cursor avsgf30ccan3",
        },
        {
          label: "List and only include core and owners sections",
          command: "dx catalog entities list --include core,owners",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await listEntities(runtime, {
          cursor: options.cursor,
          limit: options.limit,
          type: options.type,
          search_term: options.searchTerm,
        });
        const processedEntities = response.entities.map(
          (entity) =>
            processIncludes({ ok: true, entity: entity as Entity }, options)
              .entity,
        );
        renderStructuredResponse(
          { ...response, entities: processedEntities },
          runtime.context.json,
        );
      }),
    );

  entities
    .command("tasks")
    .description("Get outstanding initiative tasks for an entity")
    .argument("<identifier>", "Entity identifier")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option("--limit <n>", "Max tasks per page (default is 50)", (value) =>
      parsePositiveIntOption(value, "--limit"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Get tasks for the `login-frontend` entity",
          command: "dx catalog entities tasks login-frontend",
        },
        {
          label: "Get tasks and return as JSON",
          command: "dx catalog entities tasks login-frontend --json",
        },
        {
          label: "Fetch the next page of tasks",
          command:
            "dx catalog entities tasks login-frontend --cursor xuvkgfq9t0ty",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await getEntityTasks(runtime, identifier, {
          cursor: options.cursor,
          limit: options.limit,
        });
        renderStructuredResponse(response, runtime.context.json);
      }),
    );

  entities
    .command("scorecards")
    .description("Get the current scorecard report for an entity")
    .argument("<identifier>", "Entity identifier")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option("--limit <n>", "Max scorecards per page (default is 50)", (value) =>
      parsePositiveIntOption(value, "--limit"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Get scorecards for the `login-frontend` entity",
          command: "dx catalog entities scorecards login-frontend",
        },
        {
          label: "Get scorecards and return as JSON",
          command: "dx catalog entities scorecards login-frontend --json",
        },
        {
          label: "Fetch the next page of scorecards",
          command:
            "dx catalog entities scorecards login-frontend --cursor xuvkgfq9t0ty",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await getEntityScorecards(runtime, identifier, {
          cursor: options.cursor,
          limit: options.limit,
        });
        renderStructuredResponse(response, runtime.context.json);
      }),
    );

  return entities;
}

// --- API ---

type ListEntitiesParams = {
  cursor?: string;
  limit?: number;
  type?: string;
  search_term?: string;
};

type ListEntitiesResponse = {
  ok: true;
  entities: Entity[];
  response_metadata?: { next_cursor?: string | null };
};

export type Entity = {
  identifier: string;
  name: string | null;
  type: string;
  created_at: string;
  updated_at: string;
  description: string;
  owner_teams: { id: string; name: string }[];
  owner_users: { id: string; email: string }[];
  properties: Record<string, unknown>;
  aliases: Record<string, unknown[]>;
};

function requestOptions(runtime: Runtime) {
  return {
    token: runtime.token,
    agent: runtime.context.agent,
    agentSessionId: runtime.context.agentSessionId,
    userAgent: `dx-cli/${runtime.version}`,
  };
}

type GetEntityResponse = {
  ok: true;
  entity: Entity;
};

async function getEntity(
  runtime: Runtime,
  identifier: string,
): Promise<GetEntityResponse> {
  const response = await request(runtime.baseUrl, "/catalog.entities.info", {
    ...requestOptions(runtime),
    method: "GET",
    query: { identifier },
  });

  return response as GetEntityResponse;
}

async function listEntities(
  runtime: Runtime,
  params: ListEntitiesParams,
): Promise<ListEntitiesResponse> {
  const query: Record<string, string | number | undefined> = {};
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.type !== undefined) query.type = params.type;
  if (params.search_term !== undefined) query.search_term = params.search_term;

  const response = await request(runtime.baseUrl, "/catalog.entities.list", {
    ...requestOptions(runtime),
    method: "GET",
    query,
  });

  return response as ListEntitiesResponse;
}

type CreateEntityParams = {
  type: string;
  name?: string;
  description?: string;
  owner_team_ids?: string[];
  owner_user_ids?: string[];
  properties?: Record<string, unknown>;
};

type EntityMutationOptionValues = {
  name?: string;
  description?: string;
  owner_team_ids?: string[];
  owner_user_ids?: string[];
  properties?: Record<string, unknown>;
};

async function createEntity(
  runtime: Runtime,
  identifier: string,
  params: CreateEntityParams,
): Promise<{ ok: true; entity: Entity }> {
  const response = await request(runtime.baseUrl, "/catalog.entities.create", {
    ...requestOptions(runtime),
    method: "POST",
    body: buildEntityMutationBody(identifier, params),
  });

  return { ok: true, entity: response.entity as Entity };
}

type UpdateEntityParams = EntityMutationOptionValues;

async function updateEntity(
  runtime: Runtime,
  identifier: string,
  params: UpdateEntityParams,
): Promise<{ ok: true; entity: Entity }> {
  const response = await request(runtime.baseUrl, "/catalog.entities.update", {
    ...requestOptions(runtime),
    method: "POST",
    body: buildEntityMutationBody(identifier, params),
  });

  return { ok: true, entity: response.entity as Entity };
}

type UpsertEntityParams = CreateEntityParams;

type UpsertEntityResponse = {
  ok: true;
  result: string;
  entity: Entity;
};

async function upsertEntity(
  runtime: Runtime,
  identifier: string,
  params: UpsertEntityParams,
): Promise<UpsertEntityResponse> {
  const response = await request(runtime.baseUrl, "/catalog.entities.upsert", {
    ...requestOptions(runtime),
    method: "POST",
    body: buildEntityMutationBody(identifier, params),
  });

  return {
    ok: true,
    result: response.result as string,
    entity: response.entity as Entity,
  };
}

type GetEntityScorecardsParams = {
  cursor?: string;
  limit?: number;
};

export type ScorecardEmptyLevel = {
  label: string;
  color: string;
};

export type ScorecardCheckResult = {
  id: string;
  name: string;
  description: string;
  ordering: number;
  passed: boolean;
  status: "PASS" | "WARN" | "FAIL";
  published?: boolean;
  metadata?: Record<string, unknown>;
  level?: { id: string; name: string };
  output?: { value: unknown; type: string } | null;
  message?: string | null;
  related_properties?: string[] | null;
  executed_at?: string | null;
};

export type ScorecardReport = {
  id: string;
  name: string;
  type: "LEVEL" | "POINTS";
  tags: ScorecardTag[];
  checks: ScorecardCheckResult[];
  // Level-based scorecard fields
  levels?: ScorecardLevel[];
  current_level?: ScorecardLevel | null;
  empty_level?: ScorecardEmptyLevel;
  // Points-based scorecard fields
  points_meta?: Record<string, unknown>;
  check_groups?: ScorecardCheckGroup[];
};

type GetEntityScorecardsResponse = {
  ok: true;
  scorecards: ScorecardReport[];
  response_metadata?: { next_cursor?: string | null };
};

async function getEntityScorecards(
  runtime: Runtime,
  identifier: string,
  params: GetEntityScorecardsParams,
): Promise<GetEntityScorecardsResponse> {
  const query: Record<string, string | number | undefined> = { identifier };
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;

  const response = await request(
    runtime.baseUrl,
    "/catalog.entities.scorecards",
    {
      ...requestOptions(runtime),
      method: "GET",
      query,
    },
  );

  return response as GetEntityScorecardsResponse;
}

type GetEntityTasksParams = {
  cursor?: string;
  limit?: number;
};

export type TaskCheck = {
  id: string;
  name: string;
  description: string;
  external_url: string | null;
};

export type EntityCheckIssue = {
  id: string | null;
  url: string | null;
};

export type TaskInitiative = {
  id: string;
  name: string;
  description: string;
  complete_by: string;
  priority: number | string;
};

export type TaskOwner = {
  id: number;
  name: string;
  email: string;
  avatar: string;
  slack_ext_id: string | null;
};

export type Task = {
  check: TaskCheck;
  entity_check_issue: EntityCheckIssue | null;
  initiative: TaskInitiative;
  owner: TaskOwner;
};

type GetEntityTasksResponse = {
  ok: true;
  tasks: Task[];
  response_metadata?: { next_cursor?: string | null };
};

async function getEntityTasks(
  runtime: Runtime,
  identifier: string,
  params: GetEntityTasksParams,
): Promise<GetEntityTasksResponse> {
  const query: Record<string, string | number | undefined> = { identifier };
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;

  const response = await request(runtime.baseUrl, "/catalog.entities.tasks", {
    ...requestOptions(runtime),
    method: "GET",
    query,
  });

  return response as GetEntityTasksResponse;
}

// --- Property parsing helpers ---

export function parseEntityProperties(
  rawProperties: string[],
  knownProperties: Property[],
): Record<string, unknown> {
  const propMap = new Map(knownProperties.map((p) => [p.identifier, p]));
  const result: Record<string, unknown> = {};

  for (const kv of rawProperties) {
    const eqIndex = kv.indexOf("=");
    if (eqIndex === -1) {
      throw new CliError(
        `Invalid --property "${kv}": expected format key=value`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
    const key = kv.slice(0, eqIndex);
    const rawValue = kv.slice(eqIndex + 1);

    const prop = propMap.get(key);
    if (!prop) {
      throw new CliError(
        `Unknown property "${key}". Available properties: ${[...propMap.keys()].join(", ") || "(none)"}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }

    result[key] = parsePropertyValue(prop, rawValue);
  }

  return result;
}

export function parsePropertyValue(prop: Property, rawValue: string): unknown {
  if (rawValue === "null") return null;

  switch (prop.type) {
    case "text":
    case "url":
    case "date":
    case "email":
    case "slack_channel":
    case "msteams_channel":
    case "select":
    case "user":
      return rawValue;

    case "number": {
      const n = Number(rawValue);
      if (isNaN(n)) {
        throw new CliError(
          `Invalid number value for property "${prop.identifier}": "${rawValue}"`,
          EXIT_CODES.ARGUMENT_ERROR,
        );
      }
      return n;
    }

    case "boolean":
      if (rawValue === "true") return true;
      if (rawValue === "false") return false;
      throw new CliError(
        `Invalid boolean value for property "${prop.identifier}": expected "true" or "false", got "${rawValue}"`,
        EXIT_CODES.ARGUMENT_ERROR,
      );

    case "multi_select":
    case "list":
      return rawValue.split(",").map((s) => s.trim());

    case "json":
    case "openapi":
      try {
        return JSON.parse(rawValue);
      } catch {
        throw new CliError(
          `Invalid JSON value for property "${prop.identifier}": ${rawValue}`,
          EXIT_CODES.ARGUMENT_ERROR,
        );
      }

    case "computed":
    case "file_matching_rule":
      throw new CliError(
        `Property "${prop.identifier}" is read-only (type: ${prop.type}) and cannot be set`,
        EXIT_CODES.ARGUMENT_ERROR,
      );

    default:
      return rawValue;
  }
}

// --- Include helpers ---

const ENTITY_INCLUDE_SECTIONS = [
  "core",
  "owners",
  "properties",
  "aliases",
] as const;

type EntityIncludeSection = (typeof ENTITY_INCLUDE_SECTIONS)[number];

function processIncludes(
  response: { ok: true; entity: Entity },
  options: { include?: string },
): { ok: true; entity: Partial<Entity> } {
  const includeSections = parseIncludeSections(options.include);

  if (includeSections.length === 0) {
    return response;
  }

  const sections = uniqueSectionsInOrder(includeSections);
  const entity = redactEntityByInclude(
    response.entity as Record<string, unknown>,
    sections,
  );
  return { ok: true, entity: entity as Partial<Entity> };
}

function parseIncludeSections(include?: string): EntityIncludeSection[] {
  if (!include) {
    return [];
  }

  const results = include.split(",");
  for (const result of results) {
    if (!ENTITY_INCLUDE_SECTIONS.includes(result as EntityIncludeSection)) {
      throw new CliError(
        `Invalid --include "${result}". Expected one of: ${ENTITY_INCLUDE_SECTIONS.join(", ")}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }
  return results as EntityIncludeSection[];
}

async function resolvePropertiesForEntityType(
  runtime: Runtime,
  entityTypeIdentifier: string,
  rawProperties: string[],
): Promise<Record<string, unknown> | undefined> {
  if (rawProperties.length === 0) {
    return undefined;
  }

  let entityTypeResponse;
  try {
    entityTypeResponse = await getEntityType(runtime, entityTypeIdentifier);
  } catch (err) {
    throw wrapEntityTypeLookupError(entityTypeIdentifier, err);
  }

  return parseEntityProperties(
    rawProperties,
    entityTypeResponse.entity_type.properties,
  );
}

async function resolvePropertiesForExistingEntity(
  runtime: Runtime,
  identifier: string,
  rawProperties: string[],
): Promise<Record<string, unknown> | undefined> {
  if (rawProperties.length === 0) {
    return undefined;
  }

  let entityResponse;
  try {
    entityResponse = await getEntity(runtime, identifier);
  } catch (err) {
    const exitCode =
      err instanceof HttpError && err.status !== undefined && err.status < 500
        ? EXIT_CODES.ARGUMENT_ERROR
        : EXIT_CODES.RETRY_RECOMMENDED;
    throw new CliError(
      `Failed to fetch entity "${identifier}" to resolve property types: ${err instanceof Error ? err.message : String(err)}`,
      exitCode,
    );
  }

  return resolvePropertiesForEntityType(
    runtime,
    entityResponse.entity.type,
    rawProperties,
  );
}

function getEntityMutationOptionValues(options: {
  name?: string;
  description?: string;
  ownerTeamIds?: string;
  ownerUserIds?: string;
}): EntityMutationOptionValues {
  return {
    name: options.name,
    description: options.description,
    owner_team_ids: parseCommaSeparatedIds(options.ownerTeamIds),
    owner_user_ids: parseCommaSeparatedIds(options.ownerUserIds),
  };
}

function parseCommaSeparatedIds(value?: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return parsed.length > 0 ? parsed : undefined;
}

function buildEntityMutationBody(
  identifier: string,
  params: CreateEntityParams | UpdateEntityParams,
): Record<string, unknown> {
  const body: Record<string, unknown> = { identifier };

  if ("type" in params && params.type !== undefined) {
    body.type = params.type;
  }
  if (params.name !== undefined) body.name = params.name;
  if (params.description !== undefined) body.description = params.description;
  if (params.owner_team_ids?.length)
    body.owner_team_ids = params.owner_team_ids;
  if (params.owner_user_ids?.length)
    body.owner_user_ids = params.owner_user_ids;
  if (params.properties !== undefined) body.properties = params.properties;

  return body;
}

function wrapEntityTypeLookupError(
  entityTypeIdentifier: string,
  err: unknown,
): CliError {
  const exitCode =
    err instanceof HttpError && err.status !== undefined && err.status < 500
      ? EXIT_CODES.ARGUMENT_ERROR
      : EXIT_CODES.RETRY_RECOMMENDED;

  return new CliError(
    `Failed to fetch entity type "${entityTypeIdentifier}" to resolve property types: ${err instanceof Error ? err.message : String(err)}`,
    exitCode,
  );
}

function uniqueSectionsInOrder(
  sections: EntityIncludeSection[],
): EntityIncludeSection[] {
  const seen = new Set<EntityIncludeSection>();
  const ordered: EntityIncludeSection[] = [];
  for (const s of ENTITY_INCLUDE_SECTIONS) {
    if (sections.includes(s) && !seen.has(s)) {
      seen.add(s);
      ordered.push(s);
    }
  }
  return ordered;
}

function redactEntityByInclude(
  entity: Record<string, unknown>,
  include: EntityIncludeSection[],
): Record<string, unknown> {
  const SECTION_KEYS: Record<EntityIncludeSection, readonly string[]> = {
    core: [
      "identifier",
      "name",
      "type",
      "created_at",
      "updated_at",
      "description",
      "domain",
    ],
    owners: ["owner_teams", "owner_users"],
    properties: ["properties"],
    aliases: ["aliases"],
  };

  const sections = uniqueSectionsInOrder(include);
  const out: Record<string, unknown> = {};
  for (const section of sections) {
    for (const key of SECTION_KEYS[section]) {
      if (key in entity) {
        out[key] = entity[key];
      }
    }
  }
  return out;
}

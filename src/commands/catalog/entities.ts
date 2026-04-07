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

export function entitiesCommand() {
  const entities = new Command()
    .name("entities")
    .description("Manage entities");

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
  entities: unknown[];
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

async function getEntity(
  runtime: Runtime,
  identifier: string,
): Promise<{ ok: true; entity: Entity }> {
  const response = await request(runtime.baseUrl, "/catalog.entities.info", {
    ...requestOptions(runtime),
    method: "GET",
    query: { identifier },
  });

  return { ok: true, entity: response.entity as Entity };
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

type GetEntityScorecardsParams = {
  cursor?: string;
  limit?: number;
};

export type ScorecardLevel = {
  id: string;
  name: string;
  color: string;
  rank?: number;
};

export type ScorecardEmptyLevel = {
  label: string;
  color: string;
};

export type ScorecardTag = {
  value: string;
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
  check_groups?: unknown[];
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

  for (const section of includeSections) {
    if (!ENTITY_INCLUDE_SECTIONS.includes(section)) {
      throw new CliError(
        `Invalid --include "${section}". Expected one of: ${ENTITY_INCLUDE_SECTIONS.join(", ")}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
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

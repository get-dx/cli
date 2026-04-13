import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../commandHelpers.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { request } from "../http.js";
import { renderJson } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import { renderScorecard, renderScorecardList } from "./scorecardsRendering.js";

export function scorecardsCommand() {
  const scorecards = new Command()
    .name("scorecards")
    .description("Manage scorecards");

  scorecards
    .command("info")
    .description(
      "Retrieve details about a specific scorecard, including its defined levels and checks",
    )
    .argument("<id>", "The unique ID of the scorecard")
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, owners, checks",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for a scorecard",
          command: "dx scorecards info qjfj1a6cmit4",
        },
        {
          label: "Fetch scorecard info and return as JSON",
          command: "dx scorecards info qjfj1a6cmit4 --json",
        },
        {
          label: "Fetch only the core fields and checks",
          command: "dx scorecards info qjfj1a6cmit4 --include core,checks",
        },
      ]),
    )
    .action(
      wrapAction(async (id, options, command) => {
        const includeSections = parseScorecardIncludeSections(options.include);

        const runtime = buildRuntime(getContext(command));
        const response = await getScorecard(runtime, id);

        if (runtime.context.json) {
          const processedScorecard = processScorecardIncludes(
            response.scorecard,
            includeSections,
          );
          renderJson(processedScorecard);
        } else {
          renderScorecard(response.scorecard, includeSections);
        }
      }),
    );

  scorecards
    .command("list")
    .description("List scorecards")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option("--limit <n>", "Max scorecards per page (default is 50)", (value) =>
      parsePositiveIntOption(value, "--limit"),
    )
    .option(
      "--include-unpublished",
      "Include draft scorecards in addition to published ones",
    )
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, owners, checks",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List all published scorecards",
          command: "dx scorecards list",
        },
        {
          label: "List scorecards including drafts",
          command: "dx scorecards list --include-unpublished",
        },
        {
          label: "List with a limit and return JSON",
          command: "dx scorecards list --limit 10 --json",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command: "dx scorecards list --cursor xuvkgfq9t0ty",
        },
        {
          label: "List scorecards showing only core fields",
          command: "dx scorecards list --include core",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const includeSections = parseScorecardIncludeSections(options.include);

        const runtime = buildRuntime(getContext(command));
        const response = await listScorecards(runtime, {
          cursor: options.cursor,
          limit: options.limit,
          include_unpublished: options.includeUnpublished,
        });

        if (runtime.context.json) {
          const processedScorecards = response.scorecards.map((sc) =>
            processScorecardIncludes(sc, includeSections),
          );
          renderJson({ ...response, scorecards: processedScorecards });
        } else {
          renderScorecardList(
            response.scorecards,
            response.response_metadata?.next_cursor ?? null,
            includeSections,
          );
        }
      }),
    );

  return scorecards;
}

// --- Types ---

export type Scorecard = {
  id: string;
  name: string;
  description: string;
  type: "LEVEL" | "POINTS";
  published: boolean;
  entity_filter_type: string;
  entity_filter_sql: string | null;
  entity_filter_type_ids: string[];
  tags: ScorecardTag[];
  editors: ScorecardUser[];
  admins: ScorecardUser[];
  sql_errors: unknown[];
  checks: ScorecardCheckDefinition[];
  // LEVEL-type scorecard fields
  levels?: ScorecardLevel[];
  empty_level_label?: string;
  empty_level_color?: string;
  // POINTS-type scorecard fields
  check_groups?: ScorecardCheckGroup[];
};

export type ScorecardLevel = {
  id: string;
  name: string;
  color: string;
  rank?: number;
};

export type ScorecardTag = {
  value: string;
  color: string;
};

export type ScorecardUser = {
  id: number;
  email: string;
  name: string;
  avatar: string;
  created_at: string;
};

export type ScorecardCheckGroup = {
  id: string;
  name: string;
  ordering: number;
};

export type ScorecardCheckDefinition = {
  id: string;
  ordering: number;
  name: string;
  description: string;
  sql: string;
  filter_sql: string | null;
  filter_message: string | null;
  output_enabled: boolean;
  output_type: string | null;
  output_custom_options: Record<string, unknown> | null;
  output_aggregation: string | null;
  external_url: string | null;
  estimated_dev_days: number | null;
  published: boolean;
  // LEVEL-type scorecards
  level?: { id: string; name: string };
  // POINTS-type scorecards
  points?: number;
  check_group?: { id: string; name: string };
};

// --- API ---

type GetScorecardResponse = {
  ok: true;
  scorecard: Scorecard;
};

function requestOptions(runtime: Runtime) {
  return {
    token: runtime.token,
    agent: runtime.context.agent,
    agentSessionId: runtime.context.agentSessionId,
    userAgent: `dx-cli/${runtime.version}`,
  };
}

export async function getScorecard(
  runtime: Runtime,
  id: string,
): Promise<GetScorecardResponse> {
  const response = await request(runtime.baseUrl, "/scorecards.info", {
    ...requestOptions(runtime),
    method: "GET",
    query: { id },
  });

  return response as GetScorecardResponse;
}

type ListScorecardsParams = {
  cursor?: string;
  limit?: number;
  include_unpublished?: boolean;
};

type ListScorecardsResponse = {
  ok: true;
  scorecards: Scorecard[];
  response_metadata?: { next_cursor?: string | null };
};

export async function listScorecards(
  runtime: Runtime,
  params: ListScorecardsParams,
): Promise<ListScorecardsResponse> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.include_unpublished) query.include_unpublished = true;

  const response = await request(runtime.baseUrl, "/scorecards.list", {
    ...requestOptions(runtime),
    method: "GET",
    query,
  });

  return response as ListScorecardsResponse;
}

// --- Include helpers ---

const SCORECARD_INCLUDE_SECTIONS = ["core", "owners", "checks"] as const;

export type ScorecardIncludeSection =
  (typeof SCORECARD_INCLUDE_SECTIONS)[number];

const SCORECARD_SECTION_KEYS: Record<
  ScorecardIncludeSection,
  readonly (keyof Scorecard)[]
> = {
  core: [
    "id",
    "name",
    "description",
    "type",
    "published",
    "entity_filter_type",
    "entity_filter_sql",
    "entity_filter_type_ids",
    "tags",
    "sql_errors",
    "levels",
    "empty_level_label",
    "empty_level_color",
    "check_groups",
  ],
  owners: ["admins", "editors"],
  checks: ["checks"],
};

function assignScorecardKey<K extends keyof Scorecard>(
  out: Partial<Scorecard>,
  src: Scorecard,
  key: K,
): void {
  out[key] = src[key];
}

function processScorecardIncludes(
  scorecard: Scorecard,
  includeSections: ScorecardIncludeSection[] | null,
): Partial<Scorecard> {
  if (includeSections === null) {
    return scorecard;
  }

  const out: Partial<Scorecard> = {};
  for (const section of includeSections) {
    for (const key of SCORECARD_SECTION_KEYS[section]) {
      if (key in scorecard) {
        assignScorecardKey(out, scorecard, key);
      }
    }
  }
  return out;
}

function parseScorecardIncludeSections(
  include?: string,
): ScorecardIncludeSection[] | null {
  if (!include) {
    return null;
  }

  const results = include.split(",");
  for (const result of results) {
    if (
      !SCORECARD_INCLUDE_SECTIONS.includes(result as ScorecardIncludeSection)
    ) {
      throw new CliError(
        `Invalid --include "${result}". Expected one of: ${SCORECARD_INCLUDE_SECTIONS.join(", ")}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }
  return results as ScorecardIncludeSection[];
}

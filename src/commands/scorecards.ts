import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../commandHelpers.js";
import { request } from "../http.js";
import { renderStructuredResponse } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";

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
      ]),
    )
    .action(
      wrapAction(async (id, _options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await getScorecard(runtime, id);
        renderStructuredResponse(response, runtime.context.json);
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
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await listScorecards(runtime, {
          cursor: options.cursor,
          limit: options.limit,
          include_unpublished: options.includeUnpublished,
        });
        renderStructuredResponse(response, runtime.context.json);
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

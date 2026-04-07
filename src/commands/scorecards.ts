import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import { request } from "../http.js";
import { renderStructuredResponse } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import type { ScorecardLevel, ScorecardTag } from "./catalog/entities.js";

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

  return scorecards;
}

// --- Types ---

export type ScorecardUser = {
  id: number;
  email: string;
  name: string;
  avatar: string;
  created_at: string;
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
  level: { id: string; name: string } | null;
};

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
  sql_errors: unknown;
  levels: ScorecardLevel[];
  empty_level_label: string;
  empty_level_color: string;
  checks: ScorecardCheckDefinition[];
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

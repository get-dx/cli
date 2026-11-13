import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parseCommaSeparatedValues,
  parsePositiveIntOption,
  wrapAction,
} from "../commandHelpers.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { request } from "../http.js";
import { renderJson, renderRichText } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import { formatTeamMember, type TeamMember } from "./teams.js";
import { settingsCommand } from "./snapshots/settings.js";
import type { Runtime } from "../types.js";
import * as ui from "../ui.js";

export function snapshotsCommand(): Command {
  const snapshots = new Command()
    .name("snapshots")
    .description("Work with DX snapshots");

  snapshots.addCommand(snapshotScoresCommand(ALLOCATION_PERCENTAGES_COMMAND));

  const csatComments = new Command()
    .name("csatComments")
    .description("Work with snapshot CSAT comments");

  csatComments
    .command("list")
    .description("List CSAT comments for a snapshot")
    .option("--id <id>", "The unique ID of the snapshot")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option(
      "--limit <n>",
      "Max comments per page (default is 50, max is 100)",
      (value) => parseLimitOption(value, "--limit"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List CSAT comments for a snapshot",
          command: "dx snapshots csatComments list --id MjUyNbaY",
        },
        {
          label: "List CSAT comments as JSON",
          command: "dx --json snapshots csatComments list --id MjUyNbaY",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command:
            "dx snapshots csatComments list --id MjUyNbaY --cursor xuvkgfq9t0ty --limit 100",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const id = parseRequiredTextOption(options.id, "--id");
        const runtime = await buildRuntime(getContext(command));
        const response = await listSnapshotCsatComments(runtime, {
          id,
          cursor: options.cursor,
          limit: options.limit,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderSnapshotCsatComments(
            extractCsatComments(response),
            response.response_metadata?.next_cursor ?? null,
            id,
            runtime,
          );
        }
      }),
    );

  snapshots.addCommand(csatComments);

  snapshots.addCommand(snapshotScoresCommand(CSAT_SCORES_COMMAND));

  const driverComments = new Command()
    .name("driverComments")
    .description("Work with snapshot driver comments");

  driverComments
    .command("list")
    .description("List driver comments for a snapshot")
    .option("--id <id>", "The unique ID of the snapshot")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option(
      "--limit <n>",
      "Max comments per page (default is 50, max is 100)",
      (value) => parseLimitOption(value, "--limit"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List driver comments for a snapshot",
          command: "dx snapshots driverComments list --id MjUyNbaY",
        },
        {
          label: "List driver comments as JSON",
          command: "dx --json snapshots driverComments list --id MjUyNbaY",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command:
            "dx snapshots driverComments list --id MjUyNbaY --cursor xuvkgfq9t0ty --limit 100",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const id = parseRequiredTextOption(options.id, "--id");
        const runtime = await buildRuntime(getContext(command));
        const response = await listSnapshotDriverComments(runtime, {
          id,
          cursor: options.cursor,
          limit: options.limit,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderSnapshotDriverComments(
            extractDriverComments(response),
            response.response_metadata?.next_cursor ?? null,
            id,
            runtime,
          );
        }
      }),
    );

  snapshots.addCommand(driverComments);

  snapshots.addCommand(snapshotScoresCommand(DRIVER_SCORES_COMMAND));

  snapshots.addCommand(snapshotScoresCommand(DXI_SCORES_COMMAND));

  snapshots.addCommand(snapshotScoresCommand(IMPACT_SCORES_COMMAND));

  snapshots
    .command("info")
    .description("Retrieve results for a single snapshot")
    .option("--id <snapshot_id>", "The unique ID of the snapshot")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for a snapshot",
          command: "dx snapshots info --id MjUyNbaY",
        },
        {
          label: "Fetch snapshot info as JSON",
          command: "dx --json snapshots info --id MjUyNbaY",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const snapshotId = parseRequiredTextOption(options.id, "--id");
        const runtime = await buildRuntime(getContext(command));
        const response = await getSnapshotInfo(runtime, snapshotId);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderSnapshotInfo(response.snapshot, snapshotId, runtime);
        }
      }),
    );

  snapshots
    .command("list")
    .description("List DX snapshots")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List snapshots",
          command: "dx snapshots list",
        },
        {
          label: "List snapshots as JSON",
          command: "dx --json snapshots list",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await listSnapshots(runtime);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderSnapshots(response.snapshots, runtime);
        }
      }),
    );

  snapshots.addCommand(settingsCommand());

  const snapshotTeams = new Command()
    .name("snapshotTeams")
    .description("Work with snapshot teams");

  snapshotTeams
    .command("list")
    .description("List teams for a snapshot")
    .option("--id <id>", "The unique ID of the snapshot")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List teams for a snapshot",
          command: "dx snapshots snapshotTeams list --id MjUyNbaY",
        },
        {
          label: "List snapshot teams as JSON",
          command: "dx --json snapshots snapshotTeams list --id MjUyNbaY",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const snapshotId = parseRequiredTextOption(options.id, "--id");
        const runtime = await buildRuntime(getContext(command));
        const response = await listSnapshotTeams(runtime, snapshotId);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderSnapshotTeams(response.snapshot_teams, snapshotId, runtime);
        }
      }),
    );

  snapshots.addCommand(snapshotTeams);

  snapshots.addCommand(snapshotScoresCommand(WORKFLOW_SCORES_COMMAND));

  return snapshots;
}

type SnapshotScoresCommandConfig<TResult extends { hidden: boolean }> = {
  name: string;
  // Plural noun used in help text, e.g. "workflow scores"
  noun: string;
  listDescription: string;
  endpoint: string;
  title: string;
  section: SnapshotWebSection;
  // Section-specific web view params, appended after the filters
  webQuery?: Record<string, string>;
  // Singular and plural nouns for the count line; omit to skip the line
  countNouns?: [string, string];
  heading: (result: TResult) => ui.Block[];
  details: (result: TResult) => (ReturnType<typeof ui.dli> | null)[];
  table: { heading: string; render: (result: TResult) => string };
};

// The snapshot score endpoints share the same filters and response envelope
// and differ only in the shape of each result
function snapshotScoresCommand<TResult extends { hidden: boolean }>(
  config: SnapshotScoresCommandConfig<TResult>,
): Command {
  const group = new Command()
    .name(config.name)
    .description(`Work with snapshot ${config.noun}`);
  const list = `snapshots ${config.name} list --id MjUyNbaY`;

  group
    .command("list")
    .description(config.listDescription)
    .option("--id <id>", "The unique ID of the snapshot")
    .option("--team-ids <ids>", "Comma-separated team IDs")
    .option("--snapshot-team-ids <ids>", "Comma-separated snapshot team IDs")
    .option("--group-ids <ids>", "Comma-separated group IDs")
    .option("--branch-ids <ids>", "Comma-separated branch IDs")
    .option("--attribute-ids <ids>", "Comma-separated attribute IDs")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: `List ${config.noun} for a snapshot`,
          command: `dx ${list}`,
        },
        {
          label: `List snapshot ${config.noun} as JSON`,
          command: `dx --json ${list}`,
        },
        {
          label: `Filter ${config.noun} by team IDs`,
          command: `dx ${list} --team-ids MTExNDg5,MTExNDg4`,
        },
        {
          label: `Filter ${config.noun} by snapshot team IDs`,
          command: `dx ${list} --snapshot-team-ids NTcxMDM`,
        },
        {
          label: `Filter ${config.noun} by group IDs`,
          command: `dx ${list} --group-ids MzYyMjM`,
        },
        {
          label: `Filter ${config.noun} by attribute IDs`,
          command: `dx ${list} --attribute-ids NzI4OA`,
        },
        {
          label: `Filter ${config.noun} by branch IDs`,
          command: `dx ${list} --branch-ids MQ`,
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const snapshotId = parseRequiredTextOption(options.id, "--id");
        const runtime = await buildRuntime(getContext(command));
        const response = await listSnapshotScores<TResult>(
          runtime,
          config.endpoint,
          snapshotId,
          options,
        );

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderSnapshotScores(config, response, snapshotId, options, runtime);
        }
      }),
    );

  return group;
}

type SnapshotDriverComment = Record<string, unknown> & {
  comment?: string | null;
  driver?: string | null;
  driver_id?: string | null;
  driver_name?: string | null;
  email?: string | null;
  item_id?: string | null;
  item_name?: string | null;
  snapshot_id?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  text?: string | null;
  timestamp?: string | null;
};

type SnapshotCsatComment = SnapshotDriverComment;

type ResponseMetadata = {
  next_cursor?: string | null;
};

type ListSnapshotCommentsOptions = {
  cursor?: string;
  id: string;
  limit?: number;
};

type ListSnapshotCsatCommentsResponse = {
  ok: true;
  comments?: SnapshotCsatComment[];
  csatComments?: SnapshotCsatComment[];
  csat_comments?: SnapshotCsatComment[];
  csatcomments?: SnapshotCsatComment[];
  response_metadata?: ResponseMetadata;
};

type ListSnapshotDriverCommentsResponse = {
  ok: true;
  comments?: SnapshotDriverComment[];
  driverComments?: SnapshotDriverComment[];
  driver_comments?: SnapshotDriverComment[];
  drivercomments?: SnapshotDriverComment[];
  response_metadata?: ResponseMetadata;
};

type Snapshot = Record<string, unknown> & {
  account_id?: string | null;
  completed_at?: string | null;
  completed_count?: number | null;
  deleted_at?: string | null;
  id: string;
  last_result_change_at?: string | null;
  scheduled_for?: string | null;
  total_count?: number | null;
};

type ListSnapshotsResponse = {
  ok: true;
  snapshots: Snapshot[];
};

type SnapshotTeam = {
  ancestors?: string[];
  id?: string;
  name?: string;
  parent?: boolean;
  parent_id?: string | null;
  team_id?: string;
};

type SnapshotTeamWithManager = {
  id: string;
  is_parent: boolean;
  manager: TeamMember | null;
  name: string;
  parent_id: string | null;
  team_id: string;
};

type ListSnapshotTeamsResponse = {
  ok: true;
  snapshot_teams: SnapshotTeamWithManager[];
};

type SnapshotWorkflowScoreOption = {
  label: string;
  value: number;
};

// Driver and DXI benchmarks may serialize percentiles as decimal strings
type SnapshotScoreBenchmark = {
  name: string;
  p_50: number | string;
  p_75: number | string;
  p_90: number | string;
  year: number;
};

type SnapshotWorkflowScoreWorkflow = {
  id: string;
  name: string;
  prompt: string;
  options: SnapshotWorkflowScoreOption[];
  unit: string;
  lower_is_better: boolean;
  benchmark: SnapshotScoreBenchmark | null;
};

type SnapshotScoreDistribution = {
  label: string;
  value: number | null;
  count: number;
};

// Response counts keyed by scale option, e.g. `good_count` or `idk_na_count`
type SnapshotScoreCountDistribution = Record<string, number | string | null>;

type SnapshotScoresFilterItem = {
  id: string;
  name: string;
};

type SnapshotScoresAttributeGroup = {
  id: string;
  name: string;
  type: string;
  attributes: SnapshotScoresFilterItem[];
};

type SnapshotWorkflowScoreResult = {
  workflow: SnapshotWorkflowScoreWorkflow;
  // null when the workflow is hidden
  score: number | null;
  distribution: SnapshotScoreDistribution[] | null;
  total_respondents: number;
  total_cohort: number;
  hidden: boolean;
};

type SnapshotScoreItem = {
  id: string;
  name: string;
  prompt: string;
  target_role: string | null;
};

type SnapshotCsatScoreResult = {
  csat: SnapshotScoreItem;
  // Percent of non-N/A answers rated 4 or 5; null when hidden or all N/A
  score: number | null;
  distribution: SnapshotScoreCountDistribution | null;
  hidden: boolean;
};

type SnapshotDriverScoreDriver = SnapshotScoreItem & {
  benchmark: SnapshotScoreBenchmark | null;
};

type SnapshotDriverScoreResult = {
  driver: SnapshotDriverScoreDriver;
  score: number | null;
  distribution: SnapshotScoreCountDistribution | null;
  total_votes: number | null;
  hidden: boolean;
};

type SnapshotImpactScoreImpact = SnapshotDriverScoreDriver & {
  options: SnapshotWorkflowScoreOption[];
  scoring_method: string | null;
  lower_is_better: boolean;
};

type SnapshotImpactScoreResult = {
  impact: SnapshotImpactScoreImpact;
  score: number | null;
  distribution: SnapshotScoreDistribution[] | null;
  hidden: boolean;
};

type SnapshotAllocationQuestion = {
  id: string;
  prompt: string;
  core: boolean;
  custom: boolean;
  target_role: string | null;
};

type SnapshotAllocationItem = {
  id: string;
  name: string;
  description: string | null;
  bucket: string | null;
  percentage: number | null;
};

type SnapshotAllocationPercentagesResult = {
  question: SnapshotAllocationQuestion;
  items: SnapshotAllocationItem[];
  total_respondents: number;
  na_count: number;
  hidden: boolean;
};

type SnapshotDxiScoreDriver = SnapshotScoreItem & {
  score: number | null;
  benchmark: SnapshotScoreBenchmark | null;
};

type SnapshotDxiScoreResult = {
  is_five_point_scale: boolean;
  score: number | null;
  hidden: boolean;
  drivers: SnapshotDxiScoreDriver[];
};

type SnapshotScoresFilters = {
  snapshot: {
    id: string;
    scheduled_for: string;
    completed_at: string;
    completed_count: number;
    total_count: number;
  };
  teams: SnapshotScoresFilterItem[];
  snapshot_teams: SnapshotScoresFilterItem[];
  groups: SnapshotScoresFilterItem[];
  branches: SnapshotScoresFilterItem[];
  attribute_groups: SnapshotScoresAttributeGroup[];
};

type SnapshotScoresResponse<TResult> = {
  ok: true;
  filters: SnapshotScoresFilters;
  results: TResult[];
};

type SnapshotTeamScore = {
  contributor_count?: number | null;
  item_id?: string | null;
  item_name?: string | null;
  item_type?: string | null;
  response_count?: number | null;
  score?: number | null;
  snapshot_team?: SnapshotTeam | null;
  vs_50th?: number | null;
  vs_75th?: number | null;
  vs_90th?: number | null;
  vs_org?: number | null;
  vs_prev?: number | null;
};

type SnapshotInfo = {
  team_scores?: SnapshotTeamScore[];
};

type SnapshotInfoResponse = {
  ok: true;
  snapshot: SnapshotInfo;
};

async function listSnapshotDriverComments(
  runtime: Runtime,
  options: ListSnapshotCommentsOptions,
): Promise<ListSnapshotDriverCommentsResponse> {
  const response = await request<ListSnapshotDriverCommentsResponse>(
    runtime,
    "/snapshots.driverComments.list",
    {
      method: "GET",
      query: {
        id: options.id,
        cursor: options.cursor,
        limit: options.limit,
      },
    },
  );

  return response.body;
}

async function listSnapshotCsatComments(
  runtime: Runtime,
  options: ListSnapshotCommentsOptions,
): Promise<ListSnapshotCsatCommentsResponse> {
  const response = await request<ListSnapshotCsatCommentsResponse>(
    runtime,
    "/snapshots.csatComments.list",
    {
      method: "GET",
      query: {
        id: options.id,
        cursor: options.cursor,
        limit: options.limit,
      },
    },
  );

  return response.body;
}

async function listSnapshotTeams(
  runtime: Runtime,
  snapshotId: string,
): Promise<ListSnapshotTeamsResponse> {
  const response = await request<ListSnapshotTeamsResponse>(
    runtime,
    "/snapshots.snapshotTeams.list",
    {
      method: "GET",
      query: { snapshot_id: snapshotId },
    },
  );

  return response.body;
}

async function listSnapshotScores<TResult>(
  runtime: Runtime,
  endpoint: string,
  snapshotId: string,
  options: SnapshotFilterOptions,
): Promise<SnapshotScoresResponse<TResult>> {
  const response = await request<SnapshotScoresResponse<TResult>>(
    runtime,
    endpoint,
    {
      method: "GET",
      query: {
        snapshot_id: snapshotId,
        ...snapshotFilterQuery(options, "apiKey"),
      },
    },
  );

  return response.body;
}

type SnapshotFilterOptions = {
  teamIds?: string;
  snapshotTeamIds?: string;
  groupIds?: string;
  branchIds?: string;
  attributeIds?: string;
};

// The web app names some filter params differently from the API. Attributes
// have no webKey because the web app only accepts decoded tag IDs. The web
// app needs a branch, so links fall back to every branch when none is given.
const SNAPSHOT_FILTER_KEYS: {
  option: keyof SnapshotFilterOptions;
  apiKey: string;
  webKey?: string;
  webDefault?: string;
}[] = [
  {
    option: "branchIds",
    apiKey: "branch_ids",
    webKey: "branch",
    webDefault: "ALL",
  },
  { option: "teamIds", apiKey: "team_ids", webKey: "team_ids" },
  {
    option: "snapshotTeamIds",
    apiKey: "snapshot_team_ids",
    webKey: "snapshot_team_ids",
  },
  { option: "groupIds", apiKey: "group_ids", webKey: "group_ids" },
  { option: "attributeIds", apiKey: "attribute_ids" },
];

// The web app can't combine groups with snapshot teams (selecting a group
// clears snapshot teams) and only selects one branch at a time, so drop those
// filters from the link and report which ones were left out
function snapshotWebFilters(options: SnapshotFilterOptions): {
  query: Record<string, string | undefined>;
  omittedFlags: string[];
} {
  const webOptions = { ...options };
  const omittedFlags: string[] = [];

  if (
    parseCommaSeparatedValues(options.groupIds) &&
    parseCommaSeparatedValues(options.snapshotTeamIds)
  ) {
    webOptions.snapshotTeamIds = undefined;
    omittedFlags.push("--snapshot-team-ids");
  }

  if ((parseCommaSeparatedValues(options.branchIds)?.length ?? 0) > 1) {
    webOptions.branchIds = undefined;
    omittedFlags.push("--branch-ids");
  }

  if (parseCommaSeparatedValues(options.attributeIds)) {
    omittedFlags.push("--attribute-ids");
  }

  return { query: snapshotFilterQuery(webOptions, "webKey"), omittedFlags };
}

function snapshotFilterQuery(
  options: SnapshotFilterOptions,
  target: "apiKey" | "webKey",
): Record<string, string | undefined> {
  return Object.fromEntries(
    SNAPSHOT_FILTER_KEYS.flatMap((keys) => {
      const key = keys[target];
      if (!key) {
        return [];
      }

      const value = parseCommaSeparatedValues(options[keys.option])?.join(",");
      return [
        [key, value ?? (target === "webKey" ? keys.webDefault : undefined)],
      ];
    }),
  );
}

async function getSnapshotInfo(
  runtime: Runtime,
  snapshotId: string,
): Promise<SnapshotInfoResponse> {
  const response = await request<SnapshotInfoResponse>(
    runtime,
    "/snapshots.info",
    {
      method: "GET",
      query: { snapshot_id: snapshotId },
    },
  );

  return response.body;
}

async function listSnapshots(runtime: Runtime): Promise<ListSnapshotsResponse> {
  const response = await request<ListSnapshotsResponse>(
    runtime,
    "/snapshots.list",
    {
      method: "GET",
      query: {
        ordering: "completed_at",
      },
    },
  );

  return response.body;
}

function renderSnapshotDriverComments(
  comments: SnapshotDriverComment[],
  nextCursor: string | null,
  snapshotId: string,
  runtime: Runtime,
): void {
  const blocks: ui.Block[] = [ui.h1("Snapshot Driver Comments")];
  blocks.push(
    ui.p(`Displaying ${ui.bold(comments.length.toString())} comments.`),
  );
  blocks.push(
    ui.p(ui.link(snapshotWebLink(snapshotId, "drivers/comments", runtime))),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  if (comments.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  for (const comment of comments) {
    blocks.push(ui.h2(formatCommentHeading(comment)));

    const details = [
      optionalDetail("Email", formatText(comment.email), comment.email),
      optionalDetail(
        "Driver",
        formatText(comment.driver_name ?? comment.driver),
        comment.driver_name ?? comment.driver,
      ),
      optionalDetail(
        "Driver ID",
        formatText(comment.driver_id),
        comment.driver_id,
      ),
      optionalDetail("Team", formatText(comment.team_name), comment.team_name),
      optionalDetail("Team ID", formatText(comment.team_id), comment.team_id),
      optionalDetail("Item", formatText(comment.item_name), comment.item_name),
      optionalDetail("Item ID", formatText(comment.item_id), comment.item_id),
      optionalDetail(
        "Snapshot ID",
        formatText(comment.snapshot_id),
        comment.snapshot_id,
      ),
      optionalDetail(
        "Timestamp",
        formatTimestamp(comment.timestamp),
        comment.timestamp,
      ),
    ].filter((detail) => detail !== null);

    if (details.length > 0) {
      blocks.push(ui.dl(details, { termWidth: 11 }));
    }

    blocks.push(ui.p(formatText(comment.text ?? comment.comment)));
  }

  renderRichText(blocks);
}

function renderSnapshotCsatComments(
  comments: SnapshotCsatComment[],
  nextCursor: string | null,
  snapshotId: string,
  runtime: Runtime,
): void {
  const blocks: ui.Block[] = [ui.h1("Snapshot CSAT Comments")];
  blocks.push(
    ui.p(`Displaying ${ui.bold(comments.length.toString())} comments.`),
  );
  blocks.push(
    ui.p(ui.link(snapshotWebLink(snapshotId, "csat/comments", runtime))),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  if (comments.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  for (const comment of comments) {
    blocks.push(ui.h2(formatCommentHeading(comment)));

    const details = [
      optionalDetail("Email", formatText(comment.email), comment.email),
      optionalDetail("Team", formatText(comment.team_name), comment.team_name),
      optionalDetail("Team ID", formatText(comment.team_id), comment.team_id),
      optionalDetail("Item", formatText(comment.item_name), comment.item_name),
      optionalDetail("Item ID", formatText(comment.item_id), comment.item_id),
      optionalDetail(
        "Snapshot ID",
        formatText(comment.snapshot_id),
        comment.snapshot_id,
      ),
      optionalDetail(
        "Timestamp",
        formatTimestamp(comment.timestamp),
        comment.timestamp,
      ),
    ].filter((detail) => detail !== null);

    if (details.length > 0) {
      blocks.push(ui.dl(details, { termWidth: 11 }));
    }

    blocks.push(ui.p(formatText(comment.text ?? comment.comment)));
  }

  renderRichText(blocks);
}

function renderSnapshotTeams(
  teams: SnapshotTeamWithManager[],
  snapshotId: string,
  runtime: Runtime,
): void {
  const blocks: ui.Block[] = [ui.h1("Snapshot Teams")];
  blocks.push(ui.p(`Displaying ${ui.bold(teams.length.toString())} teams.`));
  blocks.push(
    ui.p(
      `Snapshot Team IDs are only valid within this snapshot and feed ${ui.code("snapshot_team_ids")} score filters. Use ${ui.code("team_id")} with ${ui.code("dx teams info --team-id")}.`,
    ),
  );
  blocks.push(ui.p(ui.link(snapshotWebLink(snapshotId, "drivers", runtime))));

  if (teams.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  const rootTeams = buildSnapshotTeamTree(teams);
  rootTeams.forEach((rootTeam) => {
    appendSnapshotTeamBlock(blocks, rootTeam, 0);
  });

  renderRichText(blocks);
}

function renderSnapshotInfo(
  snapshot: SnapshotInfo,
  snapshotId: string,
  runtime: Runtime,
): void {
  const teamScores = snapshot.team_scores ?? [];
  const blocks: ui.Block[] = [ui.h1("Snapshot Information")];
  blocks.push(
    ui.p(`Displaying ${ui.bold(teamScores.length.toString())} team scores.`),
  );
  blocks.push(ui.p(ui.link(snapshotWebLink(snapshotId, "drivers", runtime))));

  if (teamScores.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  for (const teamScore of teamScores) {
    blocks.push(ui.h2("Team Score"));
    blocks.push(
      ui.dl(
        [
          optionalDetail(
            "Team name",
            formatText(teamScore.snapshot_team?.name),
            teamScore.snapshot_team?.name,
          ),
          optionalDetail(
            "Team ID",
            formatText(teamScore.snapshot_team?.team_id),
            teamScore.snapshot_team?.team_id,
          ),
          optionalDetail(
            "item_name",
            formatText(teamScore.item_name),
            teamScore.item_name,
          ),
          optionalDetail(
            "Response count",
            formatNumber(teamScore.response_count),
            teamScore.response_count,
          ),
          optionalDetail(
            "Score",
            formatNumber(teamScore.score),
            teamScore.score,
          ),
        ].filter((detail) => detail !== null),
        { termWidth: 16 },
      ),
    );
    blocks.push(ui.h3("Benchmarks"));
    blocks.push(ui.p(formatBenchmarkTable(teamScore)));
  }

  renderRichText(blocks);
}

const SCORE_DETAILS_TERM_WIDTH = 17;

// Shared layout for the score commands: title, active filters, count, web
// link, then one section per result
function renderSnapshotScores<TResult extends { hidden: boolean }>(
  config: SnapshotScoresCommandConfig<TResult>,
  response: SnapshotScoresResponse<TResult>,
  snapshotId: string,
  filterOptions: SnapshotFilterOptions,
  runtime: Runtime,
): void {
  const { results } = response;
  const filterDetails = scoresFilterDetails(response.filters);
  const webFilters = snapshotWebFilters(filterOptions);
  const blocks: ui.Block[] = [ui.h1(config.title)];

  if (filterDetails.length > 0) {
    blocks.push(ui.dl(filterDetails, { termWidth: SCORE_DETAILS_TERM_WIDTH }));
  }

  if (config.countNouns) {
    const [singular, plural] = config.countNouns;
    blocks.push(
      ui.p(
        `Displaying ${ui.bold(results.length.toString())} ${results.length === 1 ? singular : plural}.`,
      ),
    );
  }

  blocks.push(
    ui.p(
      ui.link(
        snapshotWebLink(snapshotId, config.section, runtime, {
          ...webFilters.query,
          ...config.webQuery,
        }),
      ),
    ),
  );

  if (webFilters.omittedFlags.length > 0) {
    blocks.push(
      ui.p(
        ui.dim(
          `Web link omits ${webFilters.omittedFlags.join(" and ")}; the web app can't apply those filters.`,
        ),
      ),
    );
  }

  if (results.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  for (const result of results) {
    blocks.push(...config.heading(result));

    if (result.hidden) {
      blocks.push(ui.p(ui.dim("(Hidden)")));
      continue;
    }

    blocks.push(
      ui.dl(
        config.details(result).filter((detail) => detail !== null),
        { termWidth: SCORE_DETAILS_TERM_WIDTH },
      ),
    );
    blocks.push(ui.h3(config.table.heading));
    blocks.push(ui.p(config.table.render(result)));
  }

  renderRichText(blocks);
}

const ALLOCATION_PERCENTAGES_COMMAND: SnapshotScoresCommandConfig<SnapshotAllocationPercentagesResult> =
  {
    name: "allocationPercentages",
    noun: "allocation percentages",
    listDescription: "List allocation question percentages for a snapshot",
    endpoint: "/snapshots.allocationPercentages",
    title: "Snapshot Allocation Percentages",
    section: "allocation",
    webQuery: { aggregation: "team" },
    countNouns: ["question", "questions"],
    heading: (result) => [ui.h2(result.question.prompt)],
    details: (result) => [
      ui.dli("Question ID", result.question.id),
      ui.dli("Core", yesNo(result.question.core)),
      ui.dli("Custom", yesNo(result.question.custom)),
      ui.dli("Target role", formatText(result.question.target_role)),
      ui.dli("Respondents", formatNumber(result.total_respondents)),
      ui.dli("N/A count", formatNumber(result.na_count)),
    ],
    table: {
      heading: "Items",
      render: (result) => formatAllocationItemsTable(result.items),
    },
  };

const CSAT_SCORES_COMMAND: SnapshotScoresCommandConfig<SnapshotCsatScoreResult> =
  {
    name: "csatScores",
    noun: "CSAT scores",
    listDescription: "List CSAT scores and details for a snapshot",
    endpoint: "/snapshots.csatScores",
    title: "Snapshot CSAT Scores",
    section: "csat",
    // Sort the web view by score, ascending (sb = sort by, sr = sort reversed)
    webQuery: { sb: "score", sr: "false" },
    countNouns: ["CSAT item", "CSAT items"],
    heading: (result) => [ui.h2(result.csat.name), ui.p(result.csat.prompt)],
    details: (result) => [
      ui.dli("CSAT ID", result.csat.id),
      ui.dli("Score", formatNumber(result.score, "%")),
      ui.dli("Target role", formatText(result.csat.target_role)),
    ],
    table: {
      heading: "Distribution",
      render: (result) => formatCountDistributionTable(result.distribution),
    },
  };

const DRIVER_SCORES_COMMAND: SnapshotScoresCommandConfig<SnapshotDriverScoreResult> =
  {
    name: "driverScores",
    noun: "driver scores",
    listDescription: "List driver scores and details for a snapshot",
    endpoint: "/snapshots.driverScores",
    title: "Snapshot Driver Scores",
    section: "drivers",
    countNouns: ["driver", "drivers"],
    heading: (result) => [
      ui.h2(result.driver.name),
      ui.p(result.driver.prompt),
    ],
    details: (result) => [
      ui.dli("Driver ID", result.driver.id),
      ui.dli("Score", formatNumber(result.score)),
      ui.dli("Votes", formatNumber(result.total_votes)),
      ui.dli("Target role", formatText(result.driver.target_role)),
      ui.dli("Benchmark", formatBenchmark(result.driver.benchmark)),
    ],
    table: {
      heading: "Distribution",
      render: (result) => formatCountDistributionTable(result.distribution),
    },
  };

const DXI_SCORES_COMMAND: SnapshotScoresCommandConfig<SnapshotDxiScoreResult> =
  {
    name: "dxiScores",
    noun: "DXI scores",
    listDescription:
      "List Developer Experience Index (DXI) scores for a snapshot",
    endpoint: "/snapshots.dxiScores",
    title: "Snapshot DXI Scores",
    section: "drivers",
    webQuery: { ddt: "overview", dxi: "true" },
    heading: (result) => [
      ui.h2(
        `DXI (${result.is_five_point_scale ? "5-point" : "3-point"} scale)`,
      ),
    ],
    details: (result) => [ui.dli("Score", formatNumber(result.score))],
    table: {
      heading: "Drivers",
      render: (result) => formatDxiDriversTable(result.drivers),
    },
  };

const IMPACT_SCORES_COMMAND: SnapshotScoresCommandConfig<SnapshotImpactScoreResult> =
  {
    name: "impactScores",
    noun: "impact scores",
    listDescription: "List impact scores and details for a snapshot",
    endpoint: "/snapshots.impactScores",
    title: "Snapshot Impact Scores",
    section: "impact",
    webQuery: {
      metric: "speed",
      data_type: "drivers",
      adt: "risk",
      aggregation: "team",
    },
    countNouns: ["impact", "impacts"],
    heading: (result) => [
      ui.h2(result.impact.name),
      ui.p(result.impact.prompt),
    ],
    details: (result) => [
      ui.dli("Impact ID", result.impact.id),
      ui.dli("Score", formatNumber(result.score)),
      ui.dli("Target role", formatText(result.impact.target_role)),
      ui.dli("Scoring method", formatText(result.impact.scoring_method)),
      ui.dli("Lower is better", yesNo(result.impact.lower_is_better)),
      ui.dli("Benchmark", formatBenchmark(result.impact.benchmark)),
    ],
    table: {
      heading: "Distribution",
      render: (result) => formatDistributionTable(result.distribution),
    },
  };

const WORKFLOW_SCORES_COMMAND: SnapshotScoresCommandConfig<SnapshotWorkflowScoreResult> =
  {
    name: "workflowScores",
    noun: "workflow scores",
    listDescription: "List workflow scores and details for a snapshot",
    endpoint: "/snapshots.workflowScores",
    title: "Snapshot Workflow Scores",
    section: "workflow",
    // Sort the web view by workflow name, ascending (sb = sort by, sr = sort reversed)
    webQuery: { sb: "name", sr: "false" },
    countNouns: ["workflow", "workflows"],
    heading: (result) => [
      ui.h2(result.workflow.name),
      ui.p(result.workflow.prompt),
    ],
    details: (result) => [
      ui.dli("Workflow ID", result.workflow.id),
      ui.dli("Score", formatNumber(result.score)),
      optionalDetail(
        "Respondents",
        formatNumber(result.total_respondents),
        result.total_respondents,
      ),
      optionalDetail(
        "Cohort size",
        formatNumber(result.total_cohort),
        result.total_cohort,
      ),
      ui.dli("Unit", formatText(result.workflow.unit)),
      ui.dli("Lower is better", yesNo(result.workflow.lower_is_better)),
      ui.dli("Benchmark", formatBenchmark(result.workflow.benchmark)),
    ],
    table: {
      heading: "Distribution",
      render: (result) => formatDistributionTable(result.distribution),
    },
  };

function scoresFilterDetails(
  filters: SnapshotScoresFilters,
): ReturnType<typeof ui.dli>[] {
  const names = (items: SnapshotScoresFilterItem[]) =>
    items.map((item) => item.name).join(", ");
  const attributes = filters.attribute_groups.flatMap((group) =>
    group.attributes.map((attribute) => ({
      id: attribute.id,
      name: `${group.name}: ${attribute.name}`,
    })),
  );

  return (
    [
      ["Teams", filters.teams],
      ["Snapshot teams", filters.snapshot_teams],
      ["Groups", filters.groups],
      ["Branches", filters.branches],
      ["Attributes", attributes],
    ] as [string, SnapshotScoresFilterItem[]][]
  )
    .filter(([, items]) => items.length > 0)
    .map(([term, items]) => ui.dli(term, names(items)));
}

function renderSnapshots(snapshots: Snapshot[], runtime: Runtime): void {
  const blocks: ui.Block[] = [ui.h1("Snapshots")];
  blocks.push(
    ui.p(`Displaying ${ui.bold(snapshots.length.toString())} snapshots.`),
  );

  if (snapshots.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  for (const snapshot of snapshots) {
    blocks.push(ui.h2(ui.code(snapshot.id)));
    blocks.push(
      ui.dl(
        [
          optionalDetail(
            "Account ID",
            formatText(snapshot.account_id),
            snapshot.account_id,
          ),
          optionalDetail(
            "Scheduled for",
            formatText(snapshot.scheduled_for),
            snapshot.scheduled_for,
          ),
          optionalDetail(
            "Completed",
            formatTimestamp(snapshot.completed_at),
            snapshot.completed_at,
          ),
          optionalDetail(
            "Completed count",
            formatNumber(snapshot.completed_count),
            snapshot.completed_count,
          ),
          optionalDetail(
            "Total count",
            formatNumber(snapshot.total_count),
            snapshot.total_count,
          ),
          optionalDetail(
            "Last result change",
            formatTimestamp(snapshot.last_result_change_at),
            snapshot.last_result_change_at,
          ),
          optionalDetail(
            "Deleted",
            formatTimestamp(snapshot.deleted_at),
            snapshot.deleted_at,
          ),
          ui.dli(
            "Web link",
            ui.link(snapshotWebLink(snapshot.id, "drivers", runtime)),
          ),
        ].filter((detail) => detail !== null),
        { termWidth: 18 },
      ),
    );
  }

  renderRichText(blocks);
}

function extractDriverComments(
  response: ListSnapshotDriverCommentsResponse,
): SnapshotDriverComment[] {
  return (
    response.driver_comments ??
    response.driverComments ??
    response.drivercomments ??
    response.comments ??
    []
  );
}

function extractCsatComments(
  response: ListSnapshotCsatCommentsResponse,
): SnapshotCsatComment[] {
  return (
    response.csat_comments ??
    response.csatComments ??
    response.csatcomments ??
    response.comments ??
    []
  );
}

class SnapshotTeamTreeNode {
  team: SnapshotTeamWithManager;
  children: SnapshotTeamTreeNode[] = [];

  constructor(team: SnapshotTeamWithManager) {
    this.team = team;
  }
}

function buildSnapshotTeamTree(
  teams: SnapshotTeamWithManager[],
): SnapshotTeamTreeNode[] {
  const nodes = new Map<string, SnapshotTeamTreeNode>();
  teams.forEach((team) => {
    nodes.set(team.id, new SnapshotTeamTreeNode(team));
  });
  const rootTeams: SnapshotTeamTreeNode[] = [];

  teams.forEach((team) => {
    const currentNode = nodes.get(team.id)!;

    if (currentNode.team.parent_id === null) {
      // It's a top-level root node
      rootTeams.push(currentNode);
    } else {
      // Append it to its parent's children array
      nodes.get(currentNode.team.parent_id)!.children.push(currentNode);
    }
  });

  const sortNodes = (items: SnapshotTeamTreeNode[]): void => {
    items.sort((left, right) => compareSnapshotTeams(left.team, right.team));
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(rootTeams);
  return rootTeams;
}

function compareSnapshotTeams(
  left: SnapshotTeamWithManager,
  right: SnapshotTeamWithManager,
): number {
  const leftName = left.name.toLocaleLowerCase();
  const rightName = right.name.toLocaleLowerCase();

  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  // If the names are the same, compare the IDs
  const leftId = left.id.toLocaleLowerCase();
  const rightId = right.id.toLocaleLowerCase();

  return leftId.localeCompare(rightId);
}

function appendSnapshotTeamBlock(
  blocks: ui.Block[],
  node: SnapshotTeamTreeNode,
  depth: number,
): void {
  blocks.push(
    depth === 0
      ? ui.h2(node.team.name)
      : ui.h3(`${"↳".repeat(depth)} ${node.team.name}`),
  );

  const details = [
    optionalDetail("Snapshot Team ID", formatText(node.team.id), node.team.id),
    optionalDetail("Team ID", formatText(node.team.team_id), node.team.team_id),
    // Match `dx teams info`: show "(None)" when the API returns a null manager,
    // omit the row only when the field is absent entirely.
    ui.dli("Manager", formatTeamMember(node.team.manager)),
    optionalDetail(
      "Parent ID",
      formatText(node.team.parent_id),
      node.team.parent_id,
    ),
  ].filter((detail) => detail !== null);

  if (details.length > 0) {
    blocks.push(ui.dl(details, { termWidth: 18 }));
  }

  node.children.forEach((child) => {
    appendSnapshotTeamBlock(blocks, child, depth + 1);
  });
}

function formatCommentHeading(comment: SnapshotDriverComment): string {
  const heading =
    comment.item_name ??
    comment.driver_name ??
    comment.driver ??
    comment.email ??
    comment.item_id ??
    comment.driver_id;

  return typeof heading === "string" && heading.trim().length > 0
    ? heading
    : "Comment";
}

function formatText(value: unknown): string {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : ui.dim("(None)");
}

function formatNumber(value: unknown, suffix = ""): string {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value}${suffix}`
    : ui.dim("(None)");
}

function formatTimestamp(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "";
  }

  const trimmed = value.trim();
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds > 0) {
    return ui.timestampSummary(new Date(seconds * 1000).toISOString());
  }

  return Number.isNaN(Date.parse(trimmed))
    ? trimmed
    : ui.timestampSummary(trimmed);
}

function optionalDetail(
  term: string,
  value: string,
  rawValue: unknown,
): ReturnType<typeof ui.dli> | null {
  if (rawValue === undefined || rawValue === null) {
    return null;
  }

  if (typeof rawValue === "string" && rawValue.trim().length === 0) {
    return null;
  }

  return ui.dli(term, value);
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

function formatBenchmark(benchmark: SnapshotScoreBenchmark | null): string {
  return benchmark
    ? `${benchmark.name} (${benchmark.year}) p50=${benchmark.p_50}, p75=${benchmark.p_75}, p90=${benchmark.p_90}`
    : ui.dim("(None)");
}

function formatBenchmarkTable(teamScore: SnapshotTeamScore): string {
  const rows = [
    ["vs_prev", teamScore.vs_prev],
    ["vs_org", teamScore.vs_org],
    ["vs_50th", teamScore.vs_50th],
    ["vs_75th", teamScore.vs_75th],
    ["vs_90th", teamScore.vs_90th],
  ];
  const columns = ["Benchmark", "Value"];
  return buildTable(columns, rows);
}

// Plain-text table cell: numbers and non-empty strings as-is, otherwise "(None)"
function formatCell(value: unknown, suffix = ""): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}${suffix}`;
  }

  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? `${text}${suffix}` : "(None)";
}

function formatDistributionTable(
  distribution: SnapshotScoreDistribution[] | null,
): string {
  if (!distribution || distribution.length === 0) {
    return ui.dim("(None)");
  }

  const rows = distribution.map((item) => [item.label, item.value, item.count]);
  const columns = ["Label", "Value", "Count"];
  return buildTable(columns, rows);
}

// Labels for the flat count distributions returned by driver and CSAT scores,
// in scale order. 3-point drivers use bad/so_so/good, 5-point drivers use
// never..always, and CSAT uses very_dissatisfied..very_satisfied.
const COUNT_DISTRIBUTION_LABELS: Record<string, string> = {
  bad_count: "Bad",
  so_so_count: "So-so",
  good_count: "Good",
  never_count: "Never",
  rarely_count: "Rarely",
  sometimes_count: "Sometimes",
  very_often_count: "Very often",
  always_count: "Always",
  very_dissatisfied_count: "Very dissatisfied",
  dissatisfied_count: "Dissatisfied",
  neutral_count: "Neutral",
  satisfied_count: "Satisfied",
  very_satisfied_count: "Very satisfied",
  idk_na_count: "I don't know / N/A",
};

function formatCountDistributionTable(
  distribution: SnapshotScoreCountDistribution | null,
): string {
  if (!distribution) {
    return ui.dim("(None)");
  }

  // Known keys first in scale order, then any keys the API added that we
  // don't have a label for, so no counts are silently dropped
  const knownRows = Object.entries(COUNT_DISTRIBUTION_LABELS)
    .filter(([key]) => key in distribution)
    .map(([key, label]) => [label, distribution[key]]);
  const unknownRows = Object.keys(distribution)
    .filter((key) => !(key in COUNT_DISTRIBUTION_LABELS))
    .map((key) => [humanizeCountKey(key), distribution[key]]);
  const rows = [...knownRows, ...unknownRows];

  if (rows.length === 0) {
    return ui.dim("(None)");
  }

  return buildTable(["Response", "Count"], rows);
}

// `neither_count` -> "Neither"
function humanizeCountKey(key: string): string {
  const words = key.replace(/_count$/, "").replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function formatAllocationItemsTable(items: SnapshotAllocationItem[]): string {
  if (items.length === 0) {
    return ui.dim("(None)");
  }

  const rows = items.map((item) => [
    item.name,
    item.bucket,
    formatCell(item.percentage, "%"),
  ]);
  return buildTable(["Item", "Bucket", "Percentage"], rows);
}

function formatDxiDriversTable(drivers: SnapshotDxiScoreDriver[]): string {
  if (drivers.length === 0) {
    return ui.dim("(None)");
  }

  const rows = drivers.map((driver) => [
    driver.name,
    driver.id,
    driver.score,
    driver.benchmark?.p_50,
    driver.benchmark?.p_75,
    driver.benchmark?.p_90,
  ]);
  return buildTable(
    ["Driver", "Driver ID", "Score", "p50", "p75", "p90"],
    rows,
  );
}

function buildTable(columns: string[], cells: unknown[][]): string {
  const rows = cells.map((row) => row.map((cell) => formatCell(cell)));
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...rows.map((row) => row[index].length)),
  );

  const border = `+${widths.map((width) => "-".repeat(width + 2)).join("+")}+`;
  const header = `| ${columns.map((column, index) => column.padEnd(widths[index])).join(" | ")} |`;
  const body = rows.map(
    (row) =>
      `| ${row.map((cell, index) => cell.padEnd(widths[index])).join(" | ")} |`,
  );

  return [border, header, border, ...body, border].join("\n");
}

type SnapshotWebSection =
  | "allocation"
  | "csat"
  | "csat/comments"
  | "drivers"
  | "drivers/comments"
  | "impact"
  | "workflow";

function snapshotWebLink(
  snapshotId: string,
  section: SnapshotWebSection,
  runtime: Runtime,
  queryParams: Record<string, string | undefined> = {},
): string {
  let urlPath = `/snapshots/${snapshotId}/${section}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      params.set(key, value);
    }
  }
  if (params.size > 0) {
    urlPath += `?${params.toString()}`;
  }

  return ui.webLink(urlPath, runtime);
}

function parseRequiredTextOption(value: unknown, flag: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new CliError(`${flag} is required`, EXIT_CODES.ARGUMENT_ERROR);
  }

  return value.trim();
}

function parseLimitOption(value: string, flag: string): number {
  const limit = parsePositiveIntOption(value, flag);
  if (limit > 100) {
    throw new CliError(
      `${flag} must be at most 100`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  return limit;
}

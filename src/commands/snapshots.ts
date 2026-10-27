import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../commandHelpers.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { request } from "../http.js";
import { renderJson, renderRichText } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import { formatTeamMember, type TeamMember } from "./teams.js";
import type { Runtime } from "../types.js";
import * as ui from "../ui.js";

export function snapshotsCommand(): Command {
  const snapshots = new Command()
    .name("snapshots")
    .description("Work with DX snapshots");

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

  const workflowScores = new Command()
    .name("workflowScores")
    .description("Work with snapshot workflow scores");

  workflowScores
    .command("list")
    .description("List workflow scores and details for a snapshot")
    .option("--id <id>", "The unique ID of the snapshot")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List workflow scores for a snapshot",
          command: "dx snapshots workflowScores list --id MjUyNbaY",
        },
        {
          label: "List snapshot workflow scores as JSON",
          command: "dx --json snapshots workflowScores list --id MjUyNbaY",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const snapshotId = parseRequiredTextOption(options.id, "--id");
        const runtime = await buildRuntime(getContext(command));
        const response = await listSnapshotWorkflowScores(runtime, snapshotId);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderSnapshotWorkflowScores(response.results, snapshotId, runtime);
        }
      }),
    );

  snapshots.addCommand(workflowScores);

  return snapshots;
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

type SnapshotWorkflowScoreBenchmark = {
  name: string;
  p_50: number;
  p_75: number;
  p_90: number;
  year: number;
};

type SnapshotWorkflowScoreWorkflow = {
  id: string;
  name: string;
  prompt: string;
  options: SnapshotWorkflowScoreOption[];
  unit: string;
  lower_is_better: boolean;
  benchmark: SnapshotWorkflowScoreBenchmark | null;
};

type SnapshotWorkflowScoreDistribution = {
  label: string;
  value: number;
  count: number;
};

type SnapshotWorkflowScoreResult = {
  workflow: SnapshotWorkflowScoreWorkflow;
  score: number;
  distribution: SnapshotWorkflowScoreDistribution[];
  total_respondents: number;
  total_cohort: number;
  hidden: boolean;
};

type SnapshotWorkflowScoresFilters = {
  snapshot: {
    id: string;
    scheduled_for: string;
    completed_at: string;
    completed_count: number;
    total_count: number;
  };
  teams: string[];
  snapshot_teams: string[];
  groups: string[];
  branches: string[];
  attribute_groups: string[];
};

type ListSnapshotWorkflowScoresResponse = {
  ok: true;
  filters: SnapshotWorkflowScoresFilters;
  results: SnapshotWorkflowScoreResult[];
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

async function listSnapshotWorkflowScores(
  runtime: Runtime,
  snapshotId: string,
): Promise<ListSnapshotWorkflowScoresResponse> {
  const response = await request<ListSnapshotWorkflowScoresResponse>(
    runtime,
    "/snapshots.workflowScores.list",
    {
      method: "GET",
      query: { snapshot_id: snapshotId },
    },
  );

  return response.body;
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

function renderSnapshotWorkflowScores(
  results: SnapshotWorkflowScoreResult[],
  snapshotId: string,
  runtime: Runtime,
): void {
  const blocks: ui.Block[] = [
    ui.h1("Snapshot Workflow Scores"),
    ui.p(`Displaying ${ui.bold(results.length.toString())} workflows.`),
    ui.p(
      ui.link(
        snapshotWebLink(snapshotId, "workflow", runtime, {
          sb: "name",
          sr: "false",
        }),
      ),
    ),
  ];

  if (results.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  for (const result of results) {
    blocks.push(ui.h2(result.workflow.name));
    const benchmark = result.workflow.benchmark;
    const benchmarkValue = benchmark
      ? `${benchmark.name} (${benchmark.year}) p50=${benchmark.p_50}, p75=${benchmark.p_75}, p90=${benchmark.p_90}`
      : ui.dim("(None)");

    blocks.push(
      ui.dl(
        [
          ui.dli("Workflow ID", result.workflow.id),
          optionalDetail("Score", formatNumber(result.score), result.score),
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
          ui.dli(
            "Lower is better",
            result.workflow.lower_is_better ? "Yes" : "No",
          ),
          ui.dli("Hidden", result.hidden ? "Yes" : "No"),
          ui.dli("Benchmark", benchmarkValue),
        ].filter((detail) => detail !== null),
        { termWidth: 16 },
      ),
    );

    blocks.push(ui.h3("Distribution"));
    blocks.push(ui.p(formatWorkflowDistributionTable(result.distribution)));
  }

  renderRichText(blocks);
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

function formatNumber(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
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

function formatBenchmarkTable(teamScore: SnapshotTeamScore): string {
  const rows = [
    ["vs_prev", formatBenchmarkNumber(teamScore.vs_prev)],
    ["vs_org", formatBenchmarkNumber(teamScore.vs_org)],
    ["vs_50th", formatBenchmarkNumber(teamScore.vs_50th)],
    ["vs_75th", formatBenchmarkNumber(teamScore.vs_75th)],
    ["vs_90th", formatBenchmarkNumber(teamScore.vs_90th)],
  ];
  const columns = ["Benchmark", "Value"];
  return buildTable(columns, rows);
}

function formatBenchmarkNumber(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "(None)";
}

function formatWorkflowDistributionTable(
  distribution: SnapshotWorkflowScoreDistribution[],
): string {
  if (distribution.length === 0) {
    return "(None)";
  }

  const rows = distribution.map((item) => [
    item.label,
    item.value.toString(),
    item.count.toString(),
  ]);
  const columns = ["Label", "Value", "Count"];
  return buildTable(columns, rows);
}

function buildTable(columns: string[], rows: string[][]): string {
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

function snapshotWebLink(
  snapshotId: string,
  section: "drivers" | "drivers/comments" | "csat/comments" | "workflow",
  runtime: Runtime,
  queryParams: Record<string, string> = {},
): string {
  let urlPath = `/snapshots/${snapshotId}/${section}`;
  const params = new URLSearchParams(queryParams);
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

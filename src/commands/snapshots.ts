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

  const teams = new Command()
    .name("teams")
    .description("Work with snapshot teams");

  teams
    .command("list")
    .description("List teams for a snapshot")
    .option("--id <id>", "The unique ID of the snapshot")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List teams for a snapshot",
          command: "dx snapshots teams list --id MjUyNbaY",
        },
        {
          label: "List snapshot teams as JSON",
          command: "dx --json snapshots teams list --id MjUyNbaY",
        },
        {
          label: "Use the snapshot team ID with score filters",
          command:
            "dx snapshots teams list --id MjUyNbaY  # use the Snapshot Team ID as snapshot_team_ids",
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
          renderSnapshotTeams(
            extractSnapshotTeams(response),
            snapshotId,
            runtime,
          );
        }
      }),
    );

  snapshots.addCommand(teams);

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
  manager?: string | null;
  name?: string;
  parent?: boolean;
  parent_id?: string | null;
  team_id?: string;
};

type ListSnapshotTeamsResponse = {
  ok: true;
  snapshot_teams?: SnapshotTeam[];
  snapshotTeams?: SnapshotTeam[];
  snapshotteams?: SnapshotTeam[];
  teams?: SnapshotTeam[];
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
    "/snapshots.teams.list",
    {
      method: "GET",
      query: { id: snapshotId },
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
  teams: SnapshotTeam[],
  snapshotId: string,
  runtime: Runtime,
): void {
  const blocks: ui.Block[] = [ui.h1("Snapshot Teams")];
  blocks.push(ui.p(`Displaying ${ui.bold(teams.length.toString())} teams.`));
  blocks.push(
    ui.p(
      "Snapshot Team IDs are only valid within this snapshot and feed ",
      ui.code("snapshot_team_ids"),
      " score filters. Use ",
      ui.code("team_id"),
      " with ",
      ui.code("dx teams info --team-id"),
      ".",
    ),
  );
  blocks.push(ui.p(ui.link(snapshotWebLink(snapshotId, "drivers", runtime))));

  if (teams.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
    renderRichText(blocks);
    return;
  }

  for (const team of buildSnapshotTeamTree(teams)) {
    appendSnapshotTeamBlock(blocks, team, 0);
  }

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

function extractSnapshotTeams(
  response: ListSnapshotTeamsResponse,
): SnapshotTeam[] {
  return (
    response.snapshot_teams ??
    response.snapshotTeams ??
    response.snapshotteams ??
    response.teams ??
    []
  );
}

type SnapshotTeamNode = {
  children: SnapshotTeamNode[];
  team: SnapshotTeam;
};

function buildSnapshotTeamTree(teams: SnapshotTeam[]): SnapshotTeamNode[] {
  const nodes = teams.map((team) => ({ children: [], team }));
  const nodesById = new Map<string, SnapshotTeamNode>();

  for (const node of nodes) {
    if (typeof node.team.id === "string" && node.team.id.trim().length > 0) {
      nodesById.set(node.team.id, node);
    }
  }

  const roots: SnapshotTeamNode[] = [];

  for (const node of nodes) {
    const parentId =
      typeof node.team.parent_id === "string" ? node.team.parent_id : null;
    const parent = parentId ? nodesById.get(parentId) : undefined;

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (items: SnapshotTeamNode[]): void => {
    items.sort((left, right) =>
      compareSnapshotTeams(left.team, right.team),
    );
    for (const item of items) {
      sortNodes(item.children);
    }
  };

  sortNodes(roots);
  return roots;
}

function compareSnapshotTeams(left: SnapshotTeam, right: SnapshotTeam): number {
  const leftName = normalizeSortValue(left.name);
  const rightName = normalizeSortValue(right.name);

  if (leftName !== rightName) {
    return leftName.localeCompare(rightName);
  }

  return normalizeSortValue(left.id).localeCompare(normalizeSortValue(right.id));
}

function normalizeSortValue(value: unknown): string {
  return typeof value === "string" ? value.toLocaleLowerCase() : "";
}

function appendSnapshotTeamBlock(
  blocks: ui.Block[],
  node: SnapshotTeamNode,
  depth: number,
): void {
  const heading = `${depth > 0 ? `${"  ".repeat(depth)}↳ ` : ""}${formatSnapshotTeamSummary(node.team)}`;
  blocks.push(ui.h2(heading));

  const details = [
    optionalDetail(
      "Snapshot Team ID",
      formatText(node.team.id),
      node.team.id,
    ),
    optionalDetail("Team ID", formatText(node.team.team_id), node.team.team_id),
    optionalDetail("Manager", formatText(node.team.manager), node.team.manager),
    optionalDetail(
      "Parent ID",
      formatText(node.team.parent_id),
      node.team.parent_id,
    ),
  ].filter((detail) => detail !== null);

  if (details.length > 0) {
    blocks.push(ui.dl(details, { termWidth: 18 }));
  }

  for (const child of node.children) {
    appendSnapshotTeamBlock(blocks, child, depth + 1);
  }
}

function formatSnapshotTeamSummary(team: SnapshotTeam): string {
  const name =
    typeof team.name === "string" && team.name.trim().length > 0
      ? team.name.trim()
      : "Unnamed team";

  return name;
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

function formatBenchmarkNumber(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toString()
    : "(None)";
}

function snapshotWebLink(
  snapshotId: string,
  section: "drivers" | "drivers/comments" | "csat/comments",
  runtime: Runtime,
): string {
  return ui.webLink(`/snapshots/${snapshotId}/${section}`, runtime);
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

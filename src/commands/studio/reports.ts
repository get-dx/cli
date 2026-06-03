import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { request } from "../../http.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";

export function reportsCommand() {
  const reports = new Command()
    .name("reports")
    .description("Manage Data Studio reports");

  reports
    .command("info")
    .description("Retrieve details for an individual Data Studio report")
    .argument("<id>", "Studio report ID")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for a studio report",
          command: "dx studio reports info s4525phi3dud",
        },
        {
          label: "Fetch studio report info as JSON",
          command: "dx --json studio reports info s4525phi3dud",
        },
      ]),
    )
    .action(
      wrapAction(async (id, _options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getStudioReportInfo(runtime, id);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioReportInfo(response.report);
        }
      }),
    );

  reports
    .command("list")
    .description("List Data Studio reports")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option(
      "--limit <n>",
      "Max reports per page (default is 50, max is 100)",
      (value) => parseLimitOption(value, "--limit"),
    )
    .option("--search-term <term>", "Search reports by name")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List studio reports",
          command: "dx studio reports list",
        },
        {
          label: "List studio reports as JSON",
          command: "dx --json studio reports list",
        },
        {
          label: "Search studio reports by name",
          command: "dx studio reports list --search-term deployment",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command: "dx studio reports list --cursor rpt_123 --limit 100",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await listStudioReports(runtime, {
          cursor: parseOptionalTextOption(options.cursor),
          limit: options.limit,
          search_term: parseOptionalTextOption(options.searchTerm),
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioReports(response);
        }
      }),
    );

  return reports;
}

type StudioReportTile = {
  id: string;
  title: string | null;
  sql: string | null;
  chart_type: string;
  chart_config: Record<string, unknown>;
};

type StudioReport = {
  id: string;
  name: string | null;
  description: string | null;
  markdown_notes: string | null;
  view_access_type: string;
  edit_access_type: string;
  url: string;
  tiles: StudioReportTile[];
  created_at: string;
  updated_at: string;
};

type ResponseMetadata = {
  next_cursor?: string | null;
};

type ListStudioReportsOptions = {
  cursor?: string;
  limit?: number;
  search_term?: string;
};

type ListStudioReportsResponse = {
  ok: true;
  reports: StudioReport[];
  response_metadata?: ResponseMetadata;
};

type GetStudioReportInfoResponse = {
  ok: true;
  report: StudioReport;
};

async function getStudioReportInfo(
  runtime: Runtime,
  id: string,
): Promise<GetStudioReportInfoResponse> {
  const response = await request<GetStudioReportInfoResponse>(
    runtime,
    "/studio.reports.info",
    {
      method: "GET",
      query: { id },
    },
  );

  return response.body;
}

async function listStudioReports(
  runtime: Runtime,
  options: ListStudioReportsOptions,
): Promise<ListStudioReportsResponse> {
  const response = await request<ListStudioReportsResponse>(
    runtime,
    "/studio.reports.list",
    {
      method: "GET",
      query: options,
    },
  );

  return response.body;
}

function renderStudioReportInfo(report: StudioReport): void {
  renderRichText([ui.h1("Studio Report"), renderStudioReport(report)]);
}

function renderStudioReports(response: ListStudioReportsResponse): void {
  const blocks: ui.Block[] = [ui.h1("Studio Reports")];

  blocks.push(
    ui.p(`Displaying ${ui.bold(response.reports.length.toString())} reports.`),
  );

  if (response.reports.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
  }

  for (const report of response.reports) {
    blocks.push(...renderStudioReport(report));
  }

  const nextCursor = response.response_metadata?.next_cursor;
  if (nextCursor) {
    blocks.push(
      ui.p(
        `Next cursor: ${ui.code(nextCursor)} ${ui.dim(`(use --cursor ${nextCursor})`)}`,
      ),
    );
  }

  renderRichText(blocks);
}

function renderStudioReport(report: StudioReport): ui.Block[] {
  const blocks: ui.Block[] = [
    ui.h2(`${formatReportName(report)} (${ui.code(report.id)})`),
    ui.dl(
      [
        ui.dli("URL", ui.link(report.url)),
        ui.dli("Description", formatOptionalText(report.description)),
        ui.dli("View access", report.view_access_type),
        ui.dli("Edit access", report.edit_access_type),
        ui.dli("Tiles", report.tiles.length.toString()),
        ui.dli("Created", ui.timestampSummary(report.created_at)),
        ui.dli("Updated", ui.timestampSummary(report.updated_at)),
      ],
      { termWidth: 13 },
    ),
  ];

  if (report.tiles.length > 0) {
    blocks.push(
      ui.h3("Tiles"),
      ui.ul(
        report.tiles.map((tile) =>
          ui.li(`${formatTileTitle(tile)} ${ui.dim(`(${tile.chart_type})`)}`),
        ),
      ),
    );
  }

  return blocks;
}

function parseOptionalTextOption(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

function formatReportName(report: StudioReport): string {
  return report.name && report.name.trim().length > 0
    ? report.name
    : ui.dim("(Untitled)");
}

function formatTileTitle(tile: StudioReportTile): string {
  return tile.title && tile.title.trim().length > 0
    ? tile.title
    : ui.dim("(Untitled tile)");
}

function formatOptionalText(value: string | null): string {
  return value && value.trim().length > 0 ? value : ui.dim("(None)");
}

import fs from "fs";

import { Command } from "commander";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import {
  createExampleText,
  createNoteText,
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

const VARIABLES_NOTE_TEXT = [
  "Tile SQL can reference report variables using `$variable_name` syntax. Built-in variables — $service_ids, $team_ids, $tag_ids, $user_ids, $repo_ids, $start_date, $end_date — filter by service, team, attribute, user, repo, and date range, respectively. Custom variables are account-defined dropdown filters backed by a SQL query.",
  "Variables cannot be created, updated, enabled, or disabled via this CLI or the API. Built-in variables must be toggled, and custom variables must be added, edited, or removed, from the report's settings in the Data Studio UI. Once a variable is enabled on a report, its `$variable_name` can be used in any tile's SQL via --from-file/--from-stdin.",
];

export function reportsCommand() {
  const reports = new Command()
    .name("reports")
    .description("Manage Data Studio reports");

  reports
    .command("create")
    .description("Create a Data Studio report from a YAML file or stdin")
    .option(
      "--from-file <path>",
      "Read a YAML file and create a report from its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML from stdin and create a report from its contents",
    )
    .addHelpText("afterAll", createNoteText(VARIABLES_NOTE_TEXT))
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Create a studio report from a YAML file",
          command: "dx studio reports create --from-file ./my-report.yaml",
        },
        {
          label: "Create a studio report from stdin",
          command:
            "cat ./my-report.yaml | dx studio reports create --from-stdin",
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

        const runtime = await buildRuntime(getContext(command));
        const raw = options.fromFile
          ? readYamlFile(options.fromFile as string)
          : await readYamlStdin();
        const payload = buildCreateReportPayload(raw);
        const response = await createStudioReport(runtime, payload);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioReportCreated(response.report);
        }
      }),
    );

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
    .command("init")
    .description(
      "Write a Data Studio report YAML file, either from an existing report or as a blank template",
    )
    .argument("<path>", "File path to write the YAML to")
    .option("--id <id>", "Fetch an existing report and use it as the template")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Write a blank studio report template",
          command: "dx studio reports init ./my-report.yaml",
        },
        {
          label: "Initialize from an existing studio report",
          command: "dx studio reports init ./my-report.yaml --id s4525phi3dud",
        },
        {
          label: "Create a studio report from the template",
          command: "dx studio reports create --from-file ./my-report.yaml",
        },
      ]),
    )
    .action(
      wrapAction(async (path, options, command) => {
        const runtime = await buildRuntime(getContext(command));

        if (options.id) {
          const id = options.id as string;
          let reportResponse;
          try {
            reportResponse = await getStudioReportInfo(runtime, id);
          } catch (err) {
            const exitCode =
              err instanceof HttpError &&
              err.status !== undefined &&
              err.status < 500
                ? EXIT_CODES.ARGUMENT_ERROR
                : EXIT_CODES.RETRY_RECOMMENDED;
            throw new CliError(
              `Failed to fetch studio report "${id}": ${err instanceof Error ? err.message : String(err)}`,
              exitCode,
            );
          }

          fs.writeFileSync(
            path,
            studioReportToYaml(reportResponse.report),
            "utf8",
          );
          if (runtime.context.json) {
            renderJson({ ok: true, id, path });
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Studio report template written to ${ui.code(path)}.`,
              ),
              ui.p(
                `Edit the file, then run: ${ui.code(`dx studio reports create --from-file ${path}`)}`,
              ),
            ]);
          }
        } else {
          fs.writeFileSync(path, STUDIO_REPORT_BLANK_TEMPLATE_YAML, "utf8");
          if (runtime.context.json) {
            renderJson({ ok: true, path });
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Blank template written to ${ui.code(path)}.`,
              ),
              ui.p(
                `Edit the file, then run: ${ui.code(`dx studio reports create --from-file ${path}`)}`,
              ),
            ]);
          }
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

  reports
    .command("update")
    .description(
      "Update a Data Studio report from a YAML file or stdin. The `init` command can be used to initialize the report file.",
    )
    .argument("<id>", "Studio report ID")
    .option(
      "--from-file <path>",
      "Read a YAML file and update the report with its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML from stdin and update the report with its contents",
    )
    .addHelpText("afterAll", createNoteText(VARIABLES_NOTE_TEXT))
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Initialize a file first",
          command: "dx studio reports init ./my-report.yaml --id s4525phi3dud",
        },
        {
          label: "Update a studio report from a YAML file",
          command:
            "dx studio reports update s4525phi3dud --from-file ./my-report.yaml",
        },
        {
          label: "Update a studio report from stdin",
          command:
            "cat ./my-report.yaml | dx studio reports update s4525phi3dud --from-stdin",
        },
      ]),
    )
    .action(
      wrapAction(async (id, options, command) => {
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

        const runtime = await buildRuntime(getContext(command));
        const raw = options.fromFile
          ? readYamlFile(options.fromFile as string)
          : await readYamlStdin();
        const payload = buildUpdateReportPayload(id, raw);
        const response = await updateStudioReport(runtime, payload);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioReportUpdated(response.report);
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

type StudioReportOwner = {
  id: string;
  name: string;
  email: string;
};

type StudioReport = {
  id: string;
  name: string | null;
  description: string | null;
  markdown_notes: string | null;
  view_access_type: string;
  viewer_emails: string[];
  edit_access_type: string;
  editor_emails: string[];
  owner: StudioReportOwner | null;
  url: string;
  tiles: StudioReportTile[];
  created_at: string;
  updated_at: string;
};

type StudioReportTilePayload = {
  id?: string;
  title: string | null;
  sql: string | null;
  chart_type: string;
  chart_config: Record<string, unknown>;
};

type ResponseMetadata = {
  next_cursor?: string | null;
};

type CreateStudioReportPayload = {
  name?: string;
  owner_email?: string;
  description?: string | null;
  markdown_notes?: string | null;
  view_access_type?: string;
  edit_access_type?: string;
  viewer_emails?: string[];
  editor_emails?: string[];
  tiles?: StudioReportTilePayload[];
};

type UpdateStudioReportPayload = CreateStudioReportPayload & {
  id: string;
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

type CreateStudioReportResponse = {
  ok: true;
  report: StudioReport;
};

type UpdateStudioReportResponse = {
  ok: true;
  report: StudioReport;
};

async function createStudioReport(
  runtime: Runtime,
  payload: CreateStudioReportPayload,
): Promise<CreateStudioReportResponse> {
  const response = await request<CreateStudioReportResponse>(
    runtime,
    "/studio.reports.create",
    {
      method: "POST",
      body: payload,
    },
  );

  return response.body;
}

async function updateStudioReport(
  runtime: Runtime,
  payload: UpdateStudioReportPayload,
): Promise<UpdateStudioReportResponse> {
  const response = await request<UpdateStudioReportResponse>(
    runtime,
    "/studio.reports.update",
    {
      method: "POST",
      body: payload,
    },
  );

  return response.body;
}

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

function renderStudioReportCreated(report: StudioReport): void {
  renderRichText([
    ui.p(`${ui.success(ui.GLYPHS.CHECK)} Studio report created`),
    renderStudioReport(report),
  ]);
}

function renderStudioReportInfo(report: StudioReport): void {
  renderRichText([ui.h1("Studio Report"), renderStudioReport(report)]);
}

function renderStudioReportUpdated(report: StudioReport): void {
  renderRichText([
    ui.p(`${ui.success(ui.GLYPHS.CHECK)} Studio report updated`),
    renderStudioReport(report),
  ]);
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
        ui.dli("Owner", formatOwner(report.owner)),
        ui.dli("View access", formatViewAccessType(report.view_access_type)),
        ui.dli("Edit access", formatEditAccessType(report.edit_access_type)),
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
            `Could not parse YAML from stdin: ${(err as Error).message}`,
            EXIT_CODES.ARGUMENT_ERROR,
          ),
        );
      }
    });
    process.stdin.on("error", reject);
  });
}

function buildCreateReportPayload(raw: unknown): CreateStudioReportPayload {
  const { id: _id, tiles, ...rest } = parseYamlObject(raw);
  const payload = rest as CreateStudioReportPayload;
  if (Array.isArray(tiles)) {
    // A new report always gets fresh tiles, so drop any tile IDs carried over
    // from an `init --id` scaffold (those IDs belong to the source report).
    payload.tiles = tiles.map((tile) => {
      if (!tile || typeof tile !== "object") {
        return tile as StudioReportTilePayload;
      }
      const { id: _tileId, ...tileRest } = tile as StudioReportTilePayload;
      return tileRest as StudioReportTilePayload;
    });
  }
  return payload;
}

function buildUpdateReportPayload(
  id: string,
  raw: unknown,
): UpdateStudioReportPayload {
  return { ...parseYamlObject(raw), id } as UpdateStudioReportPayload;
}

function parseYamlObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CliError(
      "YAML content must be an object",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  return raw as Record<string, unknown>;
}

const STUDIO_REPORT_BLANK_TEMPLATE_YAML = fs.readFileSync(
  new URL("./report-blank-template.yaml", import.meta.url),
  "utf8",
);

function studioReportToYaml(report: StudioReport): string {
  const payload: CreateStudioReportPayload = {
    name: report.name ?? "",
    owner_email: "",
    description: report.description ?? "",
    markdown_notes: report.markdown_notes ?? "",
    view_access_type: report.view_access_type,
    viewer_emails: report.viewer_emails ?? [],
    edit_access_type: report.edit_access_type,
    editor_emails: report.editor_emails ?? [],
    tiles: report.tiles.map((tile) => ({
      id: tile.id,
      title: tile.title,
      sql: tile.sql,
      chart_type: tile.chart_type,
      chart_config: tile.chart_config,
    })),
  };

  return stringifyYaml(payload, { blockQuote: "literal" });
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

function formatOwner(owner: StudioReportOwner | null): string {
  if (!owner) return ui.dim("(None)");
  return `${owner.name} (${owner.email})`;
}

function formatViewAccessType(value: string): string {
  switch (value) {
    case "owner_and_direct_url_only":
      return "Visible via direct URL";
    case "specific_users":
      return "Visible to specific users";
    case "everyone":
      return "Visible to everyone";
    default:
      return value;
  }
}

function formatEditAccessType(value: string): string {
  switch (value) {
    case "everyone":
      return "Editable by everyone";
    case "specific_users":
      return "Editable by specific users";
    case "owner_only":
      return "Editable by owner only";
    default:
      return value;
  }
}

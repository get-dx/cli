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
  "The report YAML's `variables` list controls which variables are enabled on the report and their default values. Built-in variables (except the date range, which is controlled by `date_range_variables_enabled` and `default_date_range_period`) can be enabled by name; custom variables must already exist in the account — they are created, edited, and deleted in the Data Studio UI.",
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
        await warnOnTileReplacement(runtime, id, payload);
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
  description?: string | null;
  sql: string | null;
  chart_type: string;
  chart_config: Record<string, unknown>;
  section_id?: string | null;
  width_numerator?: number | null;
  width_denominator?: number | null;
  height_numerator?: number | null;
  height_denominator?: number | null;
  drilldown_sql?: string | null;
};

type StudioReportSection = {
  id: string;
  name: string;
  description: string | null;
};

type StudioReportVariable = {
  name: string;
  label?: string;
  type?: string;
  default_values?: string[];
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
  date_range_variables_enabled?: boolean;
  default_date_range_period?: string | null;
  sections?: StudioReportSection[];
  variables?: StudioReportVariable[];
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
} & Record<string, unknown>;

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

/**
 * Updates match tiles by `id`: existing tiles not referenced by id are deleted, and
 * id-less payload tiles are created new — losing any size, section, and drilldown the
 * originals had. When that is about to happen, warn on stderr before sending the update.
 */
async function warnOnTileReplacement(
  runtime: Runtime,
  id: string,
  payload: UpdateStudioReportPayload,
): Promise<void> {
  if (!Array.isArray(payload.tiles)) {
    return;
  }

  const payloadTiles = payload.tiles.filter(
    (tile): tile is StudioReportTilePayload =>
      Boolean(tile) && typeof tile === "object",
  );
  const missingIdCount = payloadTiles.filter((tile) => !tile.id).length;
  if (missingIdCount === 0) {
    return;
  }

  let existingReport: StudioReport;
  try {
    existingReport = (await getStudioReportInfo(runtime, id)).report;
  } catch {
    return; // the update itself will surface any real error
  }

  const payloadTileIds = new Set(
    payloadTiles.map((tile) => tile.id).filter(Boolean),
  );
  const deletedTiles = existingReport.tiles.filter(
    (tile) => !payloadTileIds.has(tile.id),
  );
  if (deletedTiles.length === 0) {
    return;
  }

  const deletedTitles = deletedTiles
    .map((tile) => formatTileTitle(tile))
    .join(", ");
  renderRichText(
    [
      ui.p(
        `${ui.warning(ui.GLYPHS.WARNING)} ${missingIdCount} payload tile(s) have no ${ui.code("id")}. Tiles are matched by id on update, so existing tiles not referenced by id are deleted, and id-less tiles are created new with default size, no section, and no drilldown.`,
      ),
      ui.p(
        `Existing tiles being replaced or deleted: ${deletedTitles}. To update tiles in place, scaffold with ${ui.code(`dx studio reports init <path> --id ${id}`)} and keep each tile's ${ui.code("id")}.`,
      ),
      ui.blankLine(),
    ],
    { useStderr: true },
  );
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
        ui.dli("Sections", formatSections(report.sections)),
        ui.dli("Variables", formatVariables(report.variables)),
        ui.dli("Tiles", report.tiles.length.toString()),
        ui.dli("Created", ui.timestampSummary(report.created_at)),
        ui.dli("Updated", ui.timestampSummary(report.updated_at)),
      ],
      { termWidth: 13 },
    ),
  ];

  if (report.tiles.length > 0) {
    const sectionNamesById = new Map(
      (report.sections ?? []).map((section) => [section.id, section.name]),
    );
    blocks.push(
      ui.h3("Tiles"),
      ui.ul(
        report.tiles.map((tile) =>
          ui.li(
            `${formatTileTitle(tile)} ${ui.dim(`(${formatTileDetails(tile, sectionNamesById)})`)}`,
          ),
        ),
      ),
    );
  }

  return blocks;
}

function formatSections(sections: StudioReportSection[] | undefined): string {
  if (!sections || sections.length === 0) {
    return ui.dim("(None)");
  }

  return sections.map((section) => section.name).join(", ");
}

function formatVariables(variables: StudioReportVariable[] | undefined): string {
  if (!variables || variables.length === 0) {
    return ui.dim("(None)");
  }

  return variables.map((variable) => `$${variable.name}`).join(", ");
}

function formatTileDetails(
  tile: StudioReportTile,
  sectionNamesById: Map<string, string>,
): string {
  const details = [tile.chart_type];

  const width = formatTileSize(tile.width_numerator, tile.width_denominator);
  const height = formatTileSize(tile.height_numerator, tile.height_denominator);
  if (width || height) {
    details.push(`${width ?? "auto"} × ${height ?? "auto"}`);
  }

  const sectionName = tile.section_id
    ? sectionNamesById.get(tile.section_id)
    : undefined;
  if (sectionName) {
    details.push(`section: ${sectionName}`);
  }
  if (tile.drilldown_sql) {
    details.push("drilldown");
  }

  return details.join(", ");
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
  const { id: _id, tiles, sections, ...rest } = parseYamlObject(raw);
  const payload = rest as CreateStudioReportPayload & Record<string, unknown>;
  if (Array.isArray(tiles)) {
    // A new report always gets fresh tiles, so drop any tile IDs carried over
    // from an `init --id` scaffold (those IDs belong to the source report).
    payload.tiles = tiles.map((tile) => {
      const normalized = normalizeTilePayload(tile);
      if (!normalized || typeof normalized !== "object") {
        return normalized as StudioReportTilePayload;
      }
      const { id: _tileId, ...tileRest } = normalized as StudioReportTilePayload;
      return tileRest as StudioReportTilePayload;
    });
  }
  if (Array.isArray(sections)) {
    // Section IDs from an `init --id` scaffold also belong to the source report.
    payload.sections = sections.map((section) => {
      if (!section || typeof section !== "object") {
        return section;
      }
      const { id: _sectionId, ...sectionRest } = section as Record<
        string,
        unknown
      >;
      return sectionRest;
    });
  }
  return payload;
}

function buildUpdateReportPayload(
  id: string,
  raw: unknown,
): UpdateStudioReportPayload {
  const payload = { ...parseYamlObject(raw), id } as UpdateStudioReportPayload &
    Record<string, unknown>;
  if (Array.isArray(payload.tiles)) {
    payload.tiles = payload.tiles.map(
      (tile) => normalizeTilePayload(tile) as StudioReportTilePayload,
    );
  }
  return payload;
}

/**
 * Translate the YAML-friendly tile fields into their API equivalents:
 * `width`/`height` fraction strings (`1/2`, `full`) become numerator/denominator
 * pairs, and `section` (a section name) becomes `section_name`.
 */
function normalizeTilePayload(tile: unknown): unknown {
  if (!tile || typeof tile !== "object") {
    return tile;
  }

  const { width, height, section, ...rest } = tile as Record<string, unknown>;
  const result: Record<string, unknown> = { ...rest };

  if (width !== undefined && width !== null && width !== "") {
    const size = parseTileSize(width, "width");
    result.width_numerator = size.numerator;
    result.width_denominator = size.denominator;
  }
  if (height !== undefined && height !== null && height !== "") {
    const size = parseTileSize(height, "height");
    result.height_numerator = size.numerator;
    result.height_denominator = size.denominator;
  }
  if (section !== undefined) {
    result.section_name = section;
  }

  return result;
}

function parseTileSize(
  value: unknown,
  field: string,
): { numerator: number; denominator: number } {
  const text = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (text === "full") {
    return { numerator: 1, denominator: 1 };
  }

  const match = /^([1-9]\d*)\s*\/\s*([1-9]\d*)$/.exec(text);
  if (!match) {
    throw new CliError(
      `Tile ${field} must be "full" or a fraction like "1/2" (got ${JSON.stringify(value)})`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}

function formatTileSize(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
): string | undefined {
  if (!numerator || !denominator) {
    return undefined;
  }

  return numerator >= denominator ? "full" : `${numerator}/${denominator}`;
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
  const payload: Record<string, unknown> = {
    name: report.name ?? "",
    owner_email: "",
    description: report.description ?? "",
    markdown_notes: report.markdown_notes ?? "",
    view_access_type: report.view_access_type,
    viewer_emails: report.viewer_emails ?? [],
    edit_access_type: report.edit_access_type,
    editor_emails: report.editor_emails ?? [],
  };

  // Only emitted when the API returns them, so scaffolds from older servers
  // don't send fields those servers would reject or misinterpret.
  if (report.date_range_variables_enabled !== undefined) {
    payload.date_range_variables_enabled = report.date_range_variables_enabled;
    payload.default_date_range_period = report.default_date_range_period ?? "";
  }
  if (report.sections) {
    payload.sections = report.sections.map((section) => ({
      id: section.id,
      name: section.name,
      description: section.description ?? "",
    }));
  }
  if (report.variables) {
    payload.variables = report.variables.map((variable) => ({
      name: variable.name,
      default_values: variable.default_values ?? [],
    }));
  }

  const sectionNamesById = new Map(
    (report.sections ?? []).map((section) => [section.id, section.name]),
  );
  payload.tiles = report.tiles.map((tile) => {
    const tileYaml: Record<string, unknown> = {
      id: tile.id,
      title: tile.title,
      sql: tile.sql,
      chart_type: tile.chart_type,
      chart_config: tile.chart_config,
    };

    if (tile.description) {
      tileYaml.description = tile.description;
    }
    const sectionName = tile.section_id
      ? sectionNamesById.get(tile.section_id)
      : undefined;
    if (sectionName !== undefined) {
      tileYaml.section = sectionName;
    }
    const width = formatTileSize(tile.width_numerator, tile.width_denominator);
    if (width !== undefined) {
      tileYaml.width = width;
    }
    const height = formatTileSize(
      tile.height_numerator,
      tile.height_denominator,
    );
    if (height !== undefined) {
      tileYaml.height = height;
    }
    if (tile.drilldown_sql) {
      tileYaml.drilldown_sql = tile.drilldown_sql;
    }

    return tileYaml;
  });

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
    case "read_only":
      return "Editable by owner only";
    default:
      return value;
  }
}

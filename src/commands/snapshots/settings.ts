import fs from "fs";

import { Command } from "commander";
import { parse as parseYaml } from "yaml";

import {
  createExampleText,
  createNoteText,
  getContext,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { request, requestText } from "../../http.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";

const SETTINGS_AUTH_NOTES = [
  "Requires a token with the snapshots:admin scope (not snapshots:read). The account must have the Snapshots product capability.",
  "Write endpoints refuse changes while a snapshot is live (HTTP 409 snapshot_live).",
  "Call `dx snapshots settings branches` first. When branching_enabled is false, omit branch_id on selection (and usually on create). When true, selection requires an encoded branch_id from that response.",
  "Selection endpoints replace membership with the complete desired set — they are not diffs.",
];

/**
 * Thin CLI wrappers around the public snapshots.settings.* Web API endpoints.
 * Prefer --json for agent automation; write payloads via --from-file / --from-stdin.
 */
export function settingsCommand(): Command {
  const settings = new Command()
    .name("settings")
    .description(
      "Discover and mutate account snapshot survey settings via the public Web API",
    )
    .addHelpText("afterAll", createNoteText(SETTINGS_AUTH_NOTES));

  settings.addCommand(branchesCommand());
  settings.addCommand(configurationCommand());
  settings.addCommand(csatItemsCommand());
  settings.addCommand(csatSelectionCommand());
  settings.addCommand(driverSelectionCommand());
  settings.addCommand(driversCommand());
  settings.addCommand(libraryCommand());
  settings.addCommand(manifestCommand());
  settings.addCommand(workflowSelectionCommand());
  settings.addCommand(workflowsCommand());

  return settings;
}

function branchesCommand(): Command {
  const branches = new Command()
    .name("branches")
    .description("List configured snapshot branches and branching_enabled");

  branches
    .command("list")
    .description("GET /snapshots.settings.branches")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List snapshot settings branches",
          command: "dx snapshots settings branches list",
        },
        {
          label: "List branches as JSON",
          command: "dx --json snapshots settings branches list",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getSettingsJson(
          runtime,
          "/snapshots.settings.branches",
        );
        renderSettingsResponse(runtime, response, "Snapshot settings branches");
      }),
    );

  return branches;
}

function configurationCommand(): Command {
  const configuration = new Command()
    .name("configuration")
    .description(
      "Read schedule, lifecycle messages, nudges, and live/next lock state",
    );

  configuration
    .command("get")
    .description("GET /snapshots.settings.configuration")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch snapshot settings configuration",
          command: "dx snapshots settings configuration get",
        },
        {
          label: "Fetch configuration as JSON",
          command: "dx --json snapshots settings configuration get",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getSettingsJson(
          runtime,
          "/snapshots.settings.configuration",
        );
        renderSettingsResponse(
          runtime,
          response,
          "Snapshot settings configuration",
        );
      }),
    );

  return configuration;
}

function libraryCommand(): Command {
  const library = new Command()
    .name("library")
    .description(
      "Read the drivers, workflows, and CSAT catalog with branch selections",
    );

  library
    .command("get")
    .description("GET /snapshots.settings.library")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch the snapshot settings library",
          command: "dx snapshots settings library get",
        },
        {
          label: "Fetch the library as JSON",
          command: "dx --json snapshots settings library get",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getSettingsJson(
          runtime,
          "/snapshots.settings.library",
        );
        renderSettingsResponse(runtime, response, "Snapshot settings library");
      }),
    );

  return library;
}

function manifestCommand(): Command {
  const manifest = new Command()
    .name("manifest")
    .description("Download the snapshot settings CSV manifest");

  manifest
    .command("get")
    .description("GET /snapshots.settings.manifest (text/csv)")
    .option("--locale <locale>", "Survey locale such as en, es, or ja")
    .option(
      "--output <path>",
      "Write CSV to a file instead of printing to stdout",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Write the CSV manifest to the default filename",
          command: "dx snapshots settings manifest get",
        },
        {
          label: "Download a Spanish manifest to a file",
          command:
            "dx snapshots settings manifest get --locale es --output manifest-es.csv",
        },
        {
          label: "Return CSV wrapped in JSON (no file written)",
          command: "dx --json snapshots settings manifest get",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await requestText(
          runtime,
          "/snapshots.settings.manifest",
          {
            method: "GET",
            accept: "text/csv",
            query: {
              locale: parseOptionalTrimmed(options.locale),
            },
          },
        );

        if (runtime.context.json && !parseOptionalTrimmed(options.output)) {
          renderJson({ ok: true, csv: response.text });
          return;
        }

        const outputPath =
          parseOptionalTrimmed(options.output) ??
          "snapshot-settings-manifest.csv";
        fs.writeFileSync(outputPath, response.text, "utf8");

        if (runtime.context.json) {
          renderJson({
            ok: true,
            path: outputPath,
            bytes: response.text.length,
          });
          return;
        }

        renderRichText([
          ui.p(
            `${ui.success(ui.GLYPHS.CHECK)} Wrote CSV manifest to ${ui.code(outputPath)}.`,
          ),
        ]);
      }),
    );

  return manifest;
}

function driversCommand(): Command {
  const drivers = new Command()
    .name("drivers")
    .description("Create or update custom snapshot drivers");

  addJsonBodyCommand(drivers, {
    name: "create",
    description: "POST /snapshots.settings.drivers",
    method: "POST",
    route: "/snapshots.settings.drivers",
    examples: [
      {
        label: "Create a custom driver from a JSON file",
        command: "dx snapshots settings drivers create --from-file driver.json",
      },
      {
        label: "Create a driver from stdin as JSON",
        command:
          'echo \'{"name":"Docs","prompt":"Docs are easy to find.","target_role":"all"}\' | dx --json snapshots settings drivers create --from-stdin',
      },
    ],
  });

  addJsonBodyCommand(drivers, {
    name: "update",
    description: "PUT /snapshots.settings.drivers",
    method: "PUT",
    route: "/snapshots.settings.drivers",
    examples: [
      {
        label: "Update a custom driver",
        command:
          "dx snapshots settings drivers update --from-file driver-update.json",
      },
    ],
  });

  return drivers;
}

function driverSelectionCommand(): Command {
  const driverSelection = new Command()
    .name("driverSelection")
    .description(
      "Replace driver membership and enablement for a branch (complete set)",
    );

  addJsonBodyCommand(driverSelection, {
    name: "update",
    description: "PUT /snapshots.settings.driverSelection",
    method: "PUT",
    route: "/snapshots.settings.driverSelection",
    examples: [
      {
        label: "Set driver selection from a JSON file",
        command:
          "dx snapshots settings driverSelection update --from-file drivers-selection.json",
      },
      {
        label: "Set driver selection from stdin",
        command:
          'echo \'{"drivers":[{"id":"DRV...","enabled":true}]}\' | dx --json snapshots settings driverSelection update --from-stdin',
      },
    ],
  });

  return driverSelection;
}

function workflowsCommand(): Command {
  const workflows = new Command()
    .name("workflows")
    .description("Create or update custom snapshot workflows");

  addJsonBodyCommand(workflows, {
    name: "create",
    description: "POST /snapshots.settings.workflows",
    method: "POST",
    route: "/snapshots.settings.workflows",
    examples: [
      {
        label: "Create a custom workflow from a JSON file",
        command:
          "dx snapshots settings workflows create --from-file workflow.json",
      },
    ],
  });

  addJsonBodyCommand(workflows, {
    name: "update",
    description: "PUT /snapshots.settings.workflows",
    method: "PUT",
    route: "/snapshots.settings.workflows",
    examples: [
      {
        label: "Update a custom workflow",
        command:
          "dx snapshots settings workflows update --from-file workflow-update.json",
      },
    ],
  });

  return workflows;
}

function workflowSelectionCommand(): Command {
  const workflowSelection = new Command()
    .name("workflowSelection")
    .description(
      "Replace workflow membership and enablement for a branch (complete set)",
    );

  addJsonBodyCommand(workflowSelection, {
    name: "update",
    description: "PUT /snapshots.settings.workflowSelection",
    method: "PUT",
    route: "/snapshots.settings.workflowSelection",
    examples: [
      {
        label: "Set workflow selection from a JSON file",
        command:
          "dx snapshots settings workflowSelection update --from-file workflows-selection.json",
      },
    ],
  });

  return workflowSelection;
}

function csatItemsCommand(): Command {
  const csatItems = new Command()
    .name("csatItems")
    .description("Create or update snapshot CSAT items");

  addJsonBodyCommand(csatItems, {
    name: "create",
    description: "POST /snapshots.settings.csatItems",
    method: "POST",
    route: "/snapshots.settings.csatItems",
    examples: [
      {
        label: "Create a CSAT item from a JSON file",
        command: "dx snapshots settings csatItems create --from-file csat.json",
      },
    ],
  });

  addJsonBodyCommand(csatItems, {
    name: "update",
    description: "PUT /snapshots.settings.csatItems",
    method: "PUT",
    route: "/snapshots.settings.csatItems",
    examples: [
      {
        label: "Update a CSAT item",
        command:
          "dx snapshots settings csatItems update --from-file csat-update.json",
      },
    ],
  });

  return csatItems;
}

function csatSelectionCommand(): Command {
  const csatSelection = new Command()
    .name("csatSelection")
    .description(
      "Replace CSAT membership, enablement, and order for a branch (complete set)",
    );

  addJsonBodyCommand(csatSelection, {
    name: "update",
    description: "PUT /snapshots.settings.csatSelection",
    method: "PUT",
    route: "/snapshots.settings.csatSelection",
    examples: [
      {
        label: "Set CSAT selection from a JSON file",
        command:
          "dx snapshots settings csatSelection update --from-file csat-selection.json",
      },
    ],
  });

  return csatSelection;
}

type JsonBodyCommandOptions = {
  name: string;
  description: string;
  method: "POST" | "PUT";
  route: string;
  examples: Array<{ label: string; command: string }>;
};

function addJsonBodyCommand(
  parent: Command,
  options: JsonBodyCommandOptions,
): void {
  parent
    .command(options.name)
    .description(options.description)
    .option(
      "--from-file <path>",
      "Read a YAML or JSON object and send it as the request body",
    )
    .option(
      "--from-stdin",
      "Read a YAML or JSON object from stdin and send it as the request body",
    )
    .addHelpText("afterAll", createExampleText(options.examples))
    .action(
      wrapAction(async (commandOptions, command) => {
        const modeCount = [
          commandOptions.fromFile,
          commandOptions.fromStdin,
        ].filter(Boolean).length;
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
        const raw = commandOptions.fromFile
          ? readYamlFile(commandOptions.fromFile as string)
          : await readYamlStdin();
        const body = parsePayloadObject(raw);
        const response = await sendSettingsJson(
          runtime,
          options.route,
          options.method,
          body,
        );
        renderSettingsResponse(runtime, response, options.description);
      }),
    );
}

async function getSettingsJson(
  runtime: Runtime,
  route: string,
): Promise<Record<string, unknown>> {
  const response = await request<Record<string, unknown>>(runtime, route, {
    method: "GET",
  });
  return response.body;
}

async function sendSettingsJson(
  runtime: Runtime,
  route: string,
  method: "POST" | "PUT",
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await request<Record<string, unknown>>(runtime, route, {
    method,
    body,
  });
  return response.body;
}

function renderSettingsResponse(
  runtime: Runtime,
  response: Record<string, unknown>,
  heading: string,
): void {
  if (runtime.context.json) {
    renderJson(response);
    return;
  }

  // Settings payloads are large and agent-oriented; print JSON even in human
  // mode so callers see the same public API shape without guessing fields.
  renderRichText([ui.h1(heading), ui.p(ui.dim("Showing API JSON response."))]);
  renderJson(response);
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
  return parseYamlContent(content, `file "${filePath}"`);
}

async function readYamlStdin(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => {
      try {
        resolve(
          parseYamlContent(Buffer.concat(chunks).toString("utf8"), "stdin"),
        );
      } catch (err) {
        reject(err);
      }
    });
    process.stdin.on("error", (err) =>
      reject(
        new CliError(
          `Failed to read from stdin: ${err.message}`,
          EXIT_CODES.ARGUMENT_ERROR,
        ),
      ),
    );
  });
}

function parseYamlContent(content: string, source: string): unknown {
  try {
    return parseYaml(content);
  } catch (err) {
    throw new CliError(
      `Failed to parse YAML or JSON from ${source}: ${(err as Error).message}`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
}

function parsePayloadObject(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CliError(
      "Content must be a YAML or JSON object",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return raw as Record<string, unknown>;
}

function parseOptionalTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

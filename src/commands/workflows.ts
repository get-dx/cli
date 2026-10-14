import fs from "fs";

import { Command } from "commander";
import { parse as parseYaml } from "yaml";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { request } from "../http.js";
import { renderJson, renderRichText } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import * as ui from "../ui.js";
import {
  renderWorkflowCreated,
  renderWorkflowList,
} from "./workflowsRendering.js";

const WORKFLOW_BLANK_TEMPLATE_YAML = fs.readFileSync(
  new URL("./workflow-blank-template.yaml", import.meta.url),
  "utf8",
);

const WORKFLOW_SCOPES = ["GLOBAL", "ENTITY"] as const;

export function workflowsCommand(): Command {
  const workflows = new Command()
    .name("workflows")
    .description("Manage Self-service workflow definitions");

  workflows
    .command("create")
    .description(
      "Create a Self-service workflow from a YAML or JSON file or stdin. The `init` command can be used to generate a starting template.",
    )
    .option(
      "--from-file <path>",
      "Read a YAML or JSON file and create a workflow from its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML or JSON from stdin and create a workflow from its contents",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Generate a blank template first",
          command: "dx workflows init ./my-workflow.yaml",
        },
        {
          label: "Create a workflow from a file",
          command: "dx workflows create --from-file workflow.yaml",
        },
        {
          label: "Create a workflow from stdin",
          command: "cat workflow.json | dx workflows create --from-stdin",
        },
        {
          label: "Same request with JSON output",
          command: "dx --json workflows create --from-file workflow.yaml",
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
        const payload = parsePayloadObject(raw);

        const response = await createWorkflow(runtime, payload);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderWorkflowCreated(response.workflow);
        }
      }),
    );

  workflows
    .command("init")
    .description("Write a blank Self-service workflow YAML template to a file")
    .argument("<path>", "File path to write the YAML to")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Write a blank workflow template",
          command: "dx workflows init ./my-workflow.yaml",
        },
      ]),
    )
    .action(
      wrapAction(async (path, _options, command) => {
        const runtime = await buildRuntime(getContext(command));

        fs.writeFileSync(path, WORKFLOW_BLANK_TEMPLATE_YAML, "utf8");

        if (runtime.context.json) {
          renderJson({ ok: true, path });
        } else {
          renderRichText([
            ui.p(
              `${ui.success(ui.GLYPHS.CHECK)} Blank template written to ${ui.code(path)}.`,
            ),
            ui.p(
              `Edit the file, then run: ${ui.code(`dx workflows create --from-file ${path}`)}`,
            ),
          ]);
        }
      }),
    );

  workflows
    .command("list")
    .description("List Self-service workflows for the account")
    .option(
      "--scope <scope>",
      "Filter by workflow scope: GLOBAL or ENTITY (omit for both)",
    )
    .option(
      "--entity-identifier <id>",
      "Catalog entity identifier; must be used with --scope ENTITY",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List workflows the token can trigger",
          command: "dx workflows list",
        },
        {
          label: "Entity-scoped workflows for a catalog entity",
          command:
            "dx workflows list --scope ENTITY --entity-identifier acme-app",
        },
        {
          label: "Same request as JSON",
          command:
            "dx --json workflows list --scope ENTITY --entity-identifier acme-app",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const scope = parseOptionalScope(options.scope);
        const entityIdentifier = parseOptionalTrimmed(options.entityIdentifier);

        if (entityIdentifier && scope !== "ENTITY") {
          throw new CliError(
            "--entity-identifier requires --scope ENTITY",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = await buildRuntime(getContext(command));
        const response = await listWorkflows(runtime, {
          scope,
          entity_identifier: entityIdentifier,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderWorkflowList(response.workflows);
        }
      }),
    );

  return workflows;
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
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function parseOptionalScope(value: unknown): string | undefined {
  const raw = parseOptionalTrimmed(value);
  if (raw === undefined) {
    return undefined;
  }
  if (!WORKFLOW_SCOPES.includes(raw as (typeof WORKFLOW_SCOPES)[number])) {
    throw new CliError(
      `--scope must be one of: ${WORKFLOW_SCOPES.join(", ")}`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return raw;
}

// --- Types ---

type WorkflowParameterType =
  | "STRING"
  | "INTEGER"
  | "FLOAT"
  | "BOOLEAN"
  | "SELECT"
  | "USER"
  | "TEAM"
  | "EMAIL"
  | "COMPUTED";

export type WorkflowParameter = {
  identifier: string;
  name: string;
  description: string | null;
  default_value: unknown;
  is_required: boolean;
  type: WorkflowParameterType;
  definition: null | { options: string[] };
};

export type WorkflowSummary = {
  identifier: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  scope: "ENTITY" | "GLOBAL";
  entity_filter_type: "ENTITY_TYPES" | "SQL";
  entity_filter_sql: string | null;
  entity_filter_type_identifiers: string[] | null;
  execution_type: "SIMPLE" | "EVENT_DRIVEN";
  trigger_type: "ANY" | "APPROVAL" | "RUNNERS" | "ENTITY";
  parameters: WorkflowParameter[];
};

type ListWorkflowsParams = {
  scope?: string;
  entity_identifier?: string;
};

type ListWorkflowsResponse = {
  ok: true;
  workflows: WorkflowSummary[];
};

type CreateWorkflowResponse = {
  ok: true;
  workflow: WorkflowSummary;
};

// --- API ---

export async function createWorkflow(
  runtime: Runtime,
  payload: Record<string, unknown>,
): Promise<CreateWorkflowResponse> {
  const response = await request<CreateWorkflowResponse>(
    runtime,
    "/workflows.create",
    { method: "POST", body: payload },
  );

  return response.body;
}

export async function listWorkflows(
  runtime: Runtime,
  params: ListWorkflowsParams,
): Promise<ListWorkflowsResponse> {
  const query: Record<string, string | undefined> = {};
  if (params.scope !== undefined) query.scope = params.scope;
  if (params.entity_identifier !== undefined) {
    query.entity_identifier = params.entity_identifier;
  }

  const response = await request<ListWorkflowsResponse>(
    runtime,
    "/workflows.list",
    {
      method: "GET",
      query,
    },
  );

  return response.body;
}

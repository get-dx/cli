import { Command } from "commander";

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

const WORKFLOW_SCOPES = ["GLOBAL", "ENTITY"] as const;

export function workflowsCommand(): Command {
  const workflows = new Command()
    .name("workflows")
    .description("Manage Self-service workflow definitions");

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

        const runtime = buildRuntime(getContext(command));
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

function renderWorkflowList(workflows: WorkflowSummary[]): void {
  const blocks: ui.Block[] = [
    ui.h1("Workflows"),
    ui.p(`Displaying ${ui.bold(workflows.length.toString())} workflows.`),
  ];

  for (const workflow of workflows) {
    blocks.push(ui.h2(`${workflow.name} (${ui.code(workflow.identifier)})`));

    blocks.push(ui.h3("Core attributes"));
    blocks.push(...coreContent(workflow));

    blocks.push(ui.h3("Parameters"));
    blocks.push(...parametersContent(workflow));
  }

  renderRichText(blocks);
}

function coreContent(workflow: WorkflowSummary): ui.Block[] {
  const blocks: ui.Block[] = [];

  const description = workflow.description?.trim()
    ? workflow.description
    : ui.dim("(None)");

  blocks.push(
    ui.dl(
      [
        ui.dli("Scope", workflow.scope),
        ui.dli("Execution", workflow.execution_type),
        ui.dli("Trigger", workflow.trigger_type),
        ui.dli("Description", description),
      ],
      { termWidth: 13 },
    ),
  );

  return blocks;
}

function parametersContent(workflow: WorkflowSummary): ui.Block[] {
  if (workflow.parameters.length === 0) {
    return [ui.p(ui.dim("(No parameters)"))];
  }

  return [
    ui.ul(
      workflow.parameters.map((parameter) =>
        ui.li(singleParameterContent(parameter)),
      ),
    ),
  ];
}

function singleParameterContent(parameter: WorkflowParameter): ui.Block[] {
  const requiredPart = parameter.is_required ? `  ${ui.dim("required")}` : "";
  const headline = `${ui.bold(parameter.name)} (${ui.code(parameter.identifier)})  ${ui.code(parameter.type)}${requiredPart}`;

  const blocks: ui.Block[] = [ui.p(headline, false)];

  const desc = parameter.description?.trim();
  if (desc) {
    blocks.push(ui.p(desc, false));
  }

  if (parameter.type === "SELECT") {
    const options = selectParameterOptions(parameter.definition);
    if (options.length > 0) {
      blocks.push(ui.p("Options:", false));
      blocks.push(
        ui.ul(options.map((value) => ui.li([ui.p(ui.code(value), false)]))),
      );
    }
  }

  if (
    parameter.default_value !== null &&
    parameter.default_value !== undefined &&
    parameter.default_value !== ""
  ) {
    blocks.push(
      ui.p(
        `Default: ${ui.code(formatParameterDefault(parameter.default_value))}`,
        false,
      ),
    );
  }

  return blocks;
}

function selectParameterOptions(definition: unknown): string[] {
  if (!definition || typeof definition !== "object") {
    return [];
  }
  const raw = (definition as Record<string, unknown>).options;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}

function formatParameterDefault(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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
  | "EMAIL";

type WorkflowParameter = {
  identifier: string;
  name: string;
  description: string | null;
  default_value: unknown;
  is_required: boolean;
  type: WorkflowParameterType;
  definition: unknown;
};

type WorkflowSummary = {
  identifier: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  scope: string;
  entity_filter_type: string | null;
  entity_filter_sql: string | null;
  entity_filter_type_identifiers: string[] | null;
  execution_type: string;
  trigger_type: string;
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

// --- API ---

async function listWorkflows(
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

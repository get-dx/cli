import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { request } from "../http.js";
import { renderJson } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import { renderWorkflowList } from "./workflowsRendering.js";

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

export type WorkflowParameter = {
  identifier: string;
  name: string;
  description: string | null;
  default_value: unknown;
  is_required: boolean;
  type: WorkflowParameterType;
  definition: unknown;
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

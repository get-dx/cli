import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";
import type { WorkflowSummary, WorkflowParameter } from "./workflows.js";

const WORKFLOW_SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "Global",
  ENTITY: "Catalog entity",
};

const WORKFLOW_EXECUTION_TYPE_LABELS: Record<string, string> = {
  SIMPLE: "Simple",
  EVENT_DRIVEN: "Event-driven",
};

const WORKFLOW_TRIGGER_TYPE_LABELS: Record<string, string> = {
  ANY: "All users",
  APPROVAL: "All users with approval",
  RUNNERS: "Selected teams and users",
  ENTITY: "Entity owners only",
};

const WORKFLOW_TRIGGER_TYPE_DESCRIPTIONS: Record<string, string> = {
  ANY: "All users can trigger this workflow run without approval.",
  APPROVAL:
    "All users can request a workflow run, but a designated approver must accept before it runs.",
  RUNNERS: "Only selected teams or users can trigger a workflow run.",
  ENTITY:
    "Only users who directly own the entity, or belong to an owning team, can trigger a run.",
};

function workflowScopeLabel(scope: string): string {
  return WORKFLOW_SCOPE_LABELS[scope] ?? scope;
}

function workflowExecutionTypeLabel(executionType: string): string {
  return WORKFLOW_EXECUTION_TYPE_LABELS[executionType] ?? executionType;
}

function workflowTriggerTypeLabel(triggerType: string): string {
  return WORKFLOW_TRIGGER_TYPE_LABELS[triggerType] ?? triggerType;
}

function workflowTriggerTypeDescription(triggerType: string): string {
  return WORKFLOW_TRIGGER_TYPE_DESCRIPTIONS[triggerType] ?? "";
}

export function renderWorkflowList(workflows: WorkflowSummary[]): void {
  const blocks: ui.Block[] = [
    ui.h1("Workflows"),
    ui.p(`Displaying ${ui.bold(workflows.length.toString())} workflows.`),
  ];

  for (const workflow of workflows) {
    blocks.push(ui.h2(`${workflow.name} (${ui.code(workflow.identifier)})`));

    blocks.push(ui.h3("Core attributes"));
    blocks.push(...coreContent(workflow));

    if (workflow.scope === "ENTITY") {
      blocks.push(ui.h3("Entity filter"));
      blocks.push(...entityFilterContent(workflow));
    }

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
        ui.dli("Description", description),
        ui.dli("Scope", workflowScopeLabel(workflow.scope)),
        ui.dli(
          "Execution type",
          workflowExecutionTypeLabel(workflow.execution_type),
        ),
        ui.dli(
          "Who can run",
          `${workflowTriggerTypeLabel(workflow.trigger_type)}  ${ui.dim(workflowTriggerTypeDescription(workflow.trigger_type))}`,
        ),
      ],
      { termWidth: 16 },
    ),
  );

  return blocks;
}

function entityFilterContent(workflow: WorkflowSummary): ui.Block[] {
  const blocks: ui.Block[] = [];
  if (workflow.entity_filter_type === "ENTITY_TYPES") {
    blocks.push(ui.p(`Filter type: ${ui.code("Entity types")}`));
    if (
      workflow.entity_filter_type_identifiers &&
      workflow.entity_filter_type_identifiers.length > 0
    ) {
      blocks.push(
        ui.ul(
          workflow.entity_filter_type_identifiers.map((identifier) =>
            ui.li([ui.p(ui.code(identifier), false)]),
          ),
        ),
      );
    }
  } else if (workflow.entity_filter_type === "SQL") {
    blocks.push(ui.p(`Filter type: ${ui.code("SQL")}`));
    if (workflow.entity_filter_sql) {
      blocks.push(ui.truncatedSqlBlock(workflow.entity_filter_sql));
    }
  }
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

  if (parameter.type === "SELECT") {
    const options = selectParameterOptions(parameter.definition);
    if (options.length > 0) {
      blocks.push(ui.p("Options:", false));
      blocks.push(
        ui.ul(options.map((value) => ui.li([ui.p(ui.code(value), false)]))),
      );
    }
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

import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";
import type { WorkflowSummary, WorkflowParameter } from "./workflows.js";

export function renderWorkflowList(workflows: WorkflowSummary[]): void {
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

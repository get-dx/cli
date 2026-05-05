import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../../commandHelpers.js";
import { buildRuntime } from "../../runtime.js";
import { renderJson, renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";
import { request } from "../../http.js";
import { Runtime } from "../../types.js";

export function infoCommand() {
  return new Command()
    .name("info")
    .description("Get info for a workflow run")
    .argument("<workflow-run-id>", "The ID of the workflow run")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Get info for a workflow run",
          command: "dx workflowRuns info hvserjgz5lo7",
        },
      ]),
    )
    .action(
      wrapAction(async (workflowRunId: string, options, command) => {
        const context = getContext(command);
        const runtime = buildRuntime(context);

        const infoResponse = await getWorkflowRun(runtime, workflowRunId);
        const workflowRun = infoResponse.body.workflow_run;

        if (runtime.context.json) {
          renderJson({ ok: true, workflow_run: workflowRun });
        } else {
          renderWorkflowRunSummary(workflowRun, runtime);
        }
      }),
    );
}

export function renderWorkflowRunSummary(
  run: WorkflowRunDetail,
  runtime: Runtime,
) {
  const items = [
    ui.dli("Run ID", ui.code(run.id)),
    ui.dli("Status", run.status),
  ];
  if (run.workflow) {
    items.push(
      ui.dli(
        "Workflow",
        `${run.workflow.name} (${ui.code(run.workflow.identifier)})`,
      ),
    );
    items.push(
      ui.dli(
        "Web link",
        ui.link(ui.webLink(`/self-service/workflow-runs/${run.id}`, runtime)),
      ),
    );
  }
  if (run.entity) {
    items.push(
      ui.dli("Entity", `${run.entity.name} (${run.entity.identifier})`),
    );
  }
  if (run.started_at) {
    items.push(ui.dli("Started", ui.timestampSummary(run.started_at)));
  }
  if (run.completed_at) {
    items.push(ui.dli("Completed", ui.timestampSummary(run.completed_at)));
  }
  if (run.links?.length) {
    const linkLines = run.links.map((l) =>
      l.label ? `${l.label}: ${ui.link(l.url)}` : ui.link(l.url),
    );
    items.push(ui.dli("Links", linkLines.join("\n")));
  }

  renderRichText([
    ui.h2("Workflow run"),
    ui.dl(items, { termWidth: 14 }),
    ui.blankLine(),
  ]);
}

export type WorkflowRunEvent = {
  id: string;
  type: string;
  occurred_at: string;
  message: string | null;
  data?: Record<string, unknown>;
};

export type WorkflowRunDetail = {
  id: string;
  status: string;
  started_at?: string;
  completed_at?: string | null;
  data?: Record<string, unknown>;
  links?: Array<{ url: string; icon?: string; label?: string }>;
  workflow?: {
    identifier: string;
    name: string;
    description?: string | null;
    scope?: string;
  };
  entity?: { identifier: string; name: string };
  events?: WorkflowRunEvent[];
};

export type InfoWorkflowRunResponse = {
  ok: true;
  workflow_run: WorkflowRunDetail;
};

export async function getWorkflowRun(
  runtime: Runtime,
  id: string,
): Promise<{ body: InfoWorkflowRunResponse; retryAfterMs?: number }> {
  return request<InfoWorkflowRunResponse>(runtime, "/workflowRuns.info", {
    method: "GET",
    query: { id },
  });
}

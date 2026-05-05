import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES, HttpError } from "../../errors.js";
import { request } from "../../http.js";
import {
  AsyncProgressReporter,
  renderJson,
  renderRichText,
} from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";
import { listWorkflows } from "../workflows.js";
import { promptForParameterValue } from "./parameters.js";
import {
  getWorkflowRun,
  renderWorkflowRunSummary,
  WorkflowRunDetail,
  WorkflowRunEvent,
} from "./info.js";

const DEFAULT_RETRY_AFTER_MS = 1000;

const PENDING_WORKFLOW_RUN_STATUSES = new Set([
  "PENDING_RUN",
  "IN_PROGRESS",
  "WAITING_FOR_APPROVAL",
  "WAITING_FOR_EVENTS",
]);

const TERMINAL_SUCCESS = new Set(["SUCCEEDED"]);
const TERMINAL_FAILURE = new Set([
  "FAILED",
  "REJECTED",
  "TIMEOUT",
  "CANCELLED",
]);

export function triggerCommand() {
  return new Command()
    .name("trigger")
    .description(
      "Trigger a Self-service workflow run and wait until it succeeds or fails",
    )
    .argument(
      "<workflow-identifier>",
      "Workflow identifier (from dx workflows list)",
    )
    .option(
      "--entity <identifier>",
      "Catalog entity identifier (required for entity-scoped workflows)",
    )
    .option(
      "--param <key=value>",
      "Workflow parameter value (repeatable). Value after the first '=' is kept verbatim",
      (val: string, prev: string[]) => [...prev, val],
      [] as string[],
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Trigger a global workflow and wait for completion",
          command: "dx workflowRuns trigger my-global-workflow",
        },
        {
          label: "Trigger with an entity and parameters",
          command:
            'dx workflowRuns trigger provision-db --entity acme-api --param size=small --param "greeting=hello world"',
        },
        {
          label: "Trigger with machine-readable output",
          command:
            "dx workflowRuns trigger my-workflow --json --entity svc-1 --param count=3",
        },
      ]),
    )
    .action(
      wrapAction(async (workflowIdentifier: string, options, command) => {
        const context = getContext(command);
        const runtime = buildRuntime(context);

        // Fetch list of all workflows, find the one that applies
        const workflowsResponse = await listWorkflows(runtime, {});
        const workflow = workflowsResponse.workflows.find(
          (w) => w.identifier === workflowIdentifier,
        );

        if (!workflow) {
          throw new CliError(
            `Workflow \`${workflowIdentifier}\` not found`,
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const entityIdentifier = parseOptionalTrimmed(options.entity);
        if (entityIdentifier === undefined && workflow.scope === "ENTITY") {
          throw new CliError(
            "--entity is required for entity-scoped workflows",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        // Collect parameter data
        const parameterData = parseParameterData(options.param as string[]);
        if (isInteractive()) {
          for (const param of workflow.parameters) {
            if (parameterData[param.identifier] !== undefined) {
              continue;
            }

            parameterData[param.identifier] = await promptForParameterValue(
              runtime,
              param,
            );
          }
        }

        // Trigger the workflow
        const triggerRequestBody: Record<string, unknown> = {
          workflow_identifier: workflowIdentifier.trim(),
        };
        if (entityIdentifier !== undefined) {
          triggerRequestBody.entity_identifier = entityIdentifier;
        }
        if (Object.keys(parameterData).length > 0) {
          triggerRequestBody.data = parameterData;
        }

        let runId: string;
        try {
          const triggerResponse = await triggerWorkflowRun(
            runtime,
            triggerRequestBody,
          );
          runId = triggerResponse.body.workflow_run.id;
        } catch (error) {
          renderRichText(
            [
              ui.p(
                `${ui.error(ui.GLYPHS.ERROR)} Failed to trigger workflow run.`,
              ),
            ],
            { useStderr: true },
          );
          throw error;
        }

        renderRichText(
          [
            ui.p(`Workflow run ${ui.code(runId)} triggered.`, false),
            ui.p(
              `Web link: ${ui.link(ui.webLink(`/self-service/workflow-runs/${runId}`, runtime))}`,
            ),
            ui.blankLine(),
          ],
          { useStderr: true },
        );

        // Poll for updates
        try {
          await waitForRetryAfter();

          const finalDetail = await pollForWorkflowRunInfo(runtime, runId);

          if (runtime.context.json) {
            renderJson({ ok: true, workflow_run: finalDetail });
          } else {
            renderRichText([
              ui.blankLine(),
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Workflow run ${ui.code(finalDetail.id)} completed with status ${ui.bold(finalDetail.status)}.`,
              ),
              ui.blankLine(),
            ]);
            renderWorkflowRunSummary(finalDetail, runtime);
          }
        } catch (error) {
          renderRichText(
            [
              ui.blankLine(),
              ui.p(`${ui.error(ui.GLYPHS.ERROR)} Workflow run failed.`),
            ],
            { useStderr: true },
          );
          throw error;
        }
      }),
    );
}

// TODO: move somewhere central
function isInteractive(): boolean {
  return process.stdin.isTTY && process.stderr.isTTY;
}

function parseOptionalTrimmed(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const t = value.trim();
  return t.length > 0 ? t : undefined;
}

function parseParameterData(pairs: string[]): Record<string, unknown> {
  if (pairs.length === 0) {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const pair of pairs) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      throw new CliError(
        `Invalid --param format: "${pair}". Expected key=value.`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
    const key = pair.slice(0, eqIdx).trim();
    if (!key) {
      throw new CliError(
        `Invalid --param format: "${pair}". Parameter name cannot be empty.`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
    const raw = pair.slice(eqIdx + 1);
    result[key] = coerceParamValue(raw);
  }
  return result;
}

function coerceParamValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (/^-?\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      throw new CliError(
        `Invalid JSON in --param value: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }
  return raw;
}

type TriggerWorkflowRunResponse = {
  ok: true;
  workflow_run: { id: string };
};

async function triggerWorkflowRun(
  runtime: Runtime,
  body: Record<string, unknown>,
): Promise<{ body: TriggerWorkflowRunResponse; retryAfterMs?: number }> {
  return request<TriggerWorkflowRunResponse>(runtime, "/workflowRuns.trigger", {
    method: "POST",
    body,
  });
}

const POLL_INTERVAL_MS = 1000;

async function pollForWorkflowRunInfo(
  runtime: Runtime,
  workflowRunId: string,
): Promise<WorkflowRunDetail> {
  const seenEventIds = new Set<string>();

  while (true) {
    try {
      const infoResponse = await getWorkflowRun(runtime, workflowRunId);
      const workflowRun = infoResponse.body.workflow_run;

      if (workflowRun.events) {
        for (const event of workflowRun.events) {
          if (!seenEventIds.has(event.id)) {
            emitWorkflowRunEvent(event, runtime);
            seenEventIds.add(event.id);
          }
        }
      }

      if (TERMINAL_SUCCESS.has(workflowRun.status)) {
        return workflowRun;
      }

      if (TERMINAL_FAILURE.has(workflowRun.status)) {
        throw buildTerminalStatusError(workflowRun);
      }

      if (!PENDING_WORKFLOW_RUN_STATUSES.has(workflowRun.status)) {
        throw new CliError(
          `Unexpected workflow run status: ${workflowRun.status}`,
          1,
        );
      }

      // progress.update(
      //   `${ui.bold("Workflow running")} ${ui.dim(`(${workflowRunId})`)} — ${workflowRun.status}`,
      // );

      await waitForRetryAfter(POLL_INTERVAL_MS);
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) {
        // progress.update(
        //   `${ui.warning(ui.GLYPHS.WARNING)} Rate limited while polling ${ui.dim(`(${workflowRunId})`)}; retrying`,
        // );
        await waitForRetryAfter(POLL_INTERVAL_MS * 5);
        continue;
      }
      throw error;
    }
  }
}

function emitWorkflowRunEvent(event: WorkflowRunEvent, runtime: Runtime): void {
  renderRichText(
    [ui.p(`${ui.dim(event.occurred_at)} Received event: ${event.type}`)],
    { useStderr: true },
  );
}

function buildTerminalStatusError(run: WorkflowRunDetail): CliError {
  if (run.status === "FAILED") {
    return new CliError(`Workflow run ${run.id} failed.`, 1);
  }
  return new CliError(
    `Workflow run ${run.id} ended with status ${run.status}.`,
    1,
  );
}

async function waitForRetryAfter(retryAfterMs?: number): Promise<void> {
  const delayMs = retryAfterMs ?? DEFAULT_RETRY_AFTER_MS;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

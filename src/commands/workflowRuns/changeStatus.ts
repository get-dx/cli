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
import { CliError, EXIT_CODES } from "../../errors.js";

export function changeStatusCommand() {
  return new Command()
    .name("changeStatus")
    .description("Change the status of a workflow run")
    .argument("<workflow-run-id>", "The ID of the workflow run")
    .requiredOption("--status <updated-status>", "The status to change to")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Mark a workflow run as succeeded",
          command:
            "dx workflowRuns changeStatus hvserjgz5lo7 --status SUCCEEDED",
        },
        {
          label: "Mark a workflow run as failed",
          command: "dx workflowRuns changeStatus hvserjgz5lo7 --status FAILED",
        },
      ]),
    )
    .action(
      wrapAction(async (workflowRunId: string, options, command) => {
        const context = getContext(command);
        const runtime = buildRuntime(context);

        if (!isValidStatus(options.status)) {
          throw new CliError(
            `Invalid status: ${options.status}. Must be one of: SUCCEEDED, FAILED.`,
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const response = await changeStatus(
          runtime,
          workflowRunId,
          options.status,
        );

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRichText([
            ui.p(
              `${ui.success(ui.GLYPHS.CHECK)} Changed status of workflow run ${ui.code(workflowRunId)} to ${ui.code(options.status)}.`,
            ),
            ui.p(
              `Web link: ${ui.link(ui.webLink(`/self-service/workflow-runs/${workflowRunId}`, runtime))}`,
            ),
          ]);
        }
      }),
    );
}

function isValidStatus(
  updatedStatus: string,
): updatedStatus is WorkflowRunStatus {
  return updatedStatus === "SUCCEEDED" || updatedStatus === "FAILED";
}

type WorkflowRunStatus = "SUCCEEDED" | "FAILED";

type ChangeStatusResponse = {
  ok: true;
};

async function changeStatus(
  runtime: Runtime,
  workflowRunId: string,
  status: WorkflowRunStatus,
): Promise<{ body: ChangeStatusResponse }> {
  return request<ChangeStatusResponse>(runtime, "/workflowRuns.changeStatus", {
    method: "POST",
    body: {
      workflow_run_id: workflowRunId,
      status,
    },
  });
}

import { Command } from "commander";

import { wrapAction } from "../../commandHelpers.js";
import { getContext } from "../../commandHelpers.js";
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
    .argument("<updated-status>", "The status to change to")
    .action(
      wrapAction(
        async (
          workflowRunId: string,
          updatedStatus: string,
          options,
          command,
        ) => {
          const context = getContext(command);
          const runtime = buildRuntime(context);

          if (!isValidStatus(updatedStatus)) {
            throw new CliError(
              `Invalid status: ${updatedStatus}. Must be one of: SUCCEEDED, FAILED.`,
              EXIT_CODES.ARGUMENT_ERROR,
            );
          }

          const response = await changeStatus(
            runtime,
            workflowRunId,
            updatedStatus,
          );

          if (runtime.context.json) {
            renderJson(response);
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Changed status of workflow run ${ui.code(workflowRunId)} to ${ui.code(updatedStatus)}.`,
              ),
              ui.p(
                `Web link: ${ui.link(ui.webLink(`/self-service/workflow-runs/${workflowRunId}`, runtime))}`,
              ),
            ]);
          }
        },
      ),
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

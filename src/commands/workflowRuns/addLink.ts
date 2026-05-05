import { Command } from "commander";

import { wrapAction } from "../../commandHelpers.js";
import { getContext } from "../../commandHelpers.js";
import { buildRuntime } from "../../runtime.js";
import { renderJson, renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";
import { request } from "../../http.js";
import { Runtime } from "../../types.js";

export function addLinkCommand() {
  return new Command()
    .name("addLink")
    .description("Add a link to a workflow run")
    .argument("<workflow-run-id>", "The ID of the workflow run")
    .requiredOption("--url <url>", "The URL of the link")
    .requiredOption("--label <label>", "The label of the link")
    .action(
      wrapAction(async (workflowRunId: string, options, command) => {
        const context = getContext(command);
        const runtime = buildRuntime(context);

        const response = await addLink(
          runtime,
          workflowRunId,
          options.url,
          options.label,
        );

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRichText([
            ui.p(
              `${ui.success(ui.GLYPHS.CHECK)} Added link to workflow run ${ui.code(workflowRunId)}.`,
            ),
            ui.p(
              `Web link: ${ui.link(ui.webLink(`/self-service/workflow-runs/${workflowRunId}`, runtime))}`,
            ),
          ]);
        }
      }),
    );
}

type AddLinkResponse = {
  ok: true;
};

async function addLink(
  runtime: Runtime,
  workflowRunId: string,
  url: string,
  label: string,
): Promise<{ body: AddLinkResponse }> {
  return request<AddLinkResponse>(runtime, "/workflowRuns.addLink", {
    method: "POST",
    body: {
      workflow_run_id: workflowRunId,
      link: {
        url,
        label,
      },
    },
  });
}

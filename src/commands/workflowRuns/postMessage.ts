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

export function postMessageCommand() {
  return new Command()
    .name("postMessage")
    .description("Post a message to a workflow run")
    .argument("<workflow-run-id>", "The ID of the workflow run")
    .requiredOption("--message <message>", "The message to post")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Post a message to a workflow run",
          command:
            'dx workflowRuns postMessage hvserjgz5lo7 --message "Hello from the CLI"',
        },
        {
          label: "Post the contents of a markdown file to a workflow run",
          command:
            'dx workflowRuns postMessage hvserjgz5lo7 --message "$(cat message.md)"',
        },
      ]),
    )
    .action(
      wrapAction(async (workflowRunId: string, options, command) => {
        const context = getContext(command);
        const runtime = buildRuntime(context);

        const response = await postMessage(
          runtime,
          workflowRunId,
          options.message,
        );

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRichText([
            ui.p(
              `${ui.success(ui.GLYPHS.CHECK)} Posted message to workflow run ${ui.code(workflowRunId)}.`,
            ),
            ui.p(
              `Web link: ${ui.link(ui.webLink(`/self-service/workflow-runs/${workflowRunId}`, runtime))}`,
            ),
          ]);
        }
      }),
    );
}

type PostMessageResponse = {
  ok: true;
};

async function postMessage(
  runtime: Runtime,
  workflowRunId: string,
  message: string,
): Promise<{ body: PostMessageResponse }> {
  return request<PostMessageResponse>(runtime, "/workflowRuns.postMessage", {
    method: "POST",
    body: {
      workflow_run_id: workflowRunId,
      message,
    },
  });
}

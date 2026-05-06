import { Command } from "commander";

import { addLinkCommand } from "./workflowRuns/addLink.js";
import { changeStatusCommand } from "./workflowRuns/changeStatus.js";
import { infoCommand } from "./workflowRuns/info.js";
import { postMessageCommand } from "./workflowRuns/postMessage.js";

export function workflowRunsCommand(): Command {
  const workflowRuns = new Command()
    .name("workflowRuns")
    .description("Trigger and monitor Self-service workflow runs");

  workflowRuns.addCommand(addLinkCommand());
  workflowRuns.addCommand(changeStatusCommand());
  workflowRuns.addCommand(infoCommand());
  workflowRuns.addCommand(postMessageCommand());

  return workflowRuns;
}

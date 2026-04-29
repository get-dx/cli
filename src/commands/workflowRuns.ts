import { Command } from "commander";

import { triggerCommand } from "./workflowRuns/trigger.js";

export function workflowRunsCommand(): Command {
  const workflowRuns = new Command()
    .name("workflowRuns")
    .description("Trigger and monitor Self-service workflow runs");

  workflowRuns.addCommand(triggerCommand());

  return workflowRuns;
}

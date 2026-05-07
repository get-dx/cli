import { Command } from "commander";

import { processFileMatchingRuleCommand } from "./repoIntegrations/processFileMatchingRule.js";

export function repoIntegrationsCommand(): Command {
  const repoIntegrations = new Command()
    .name("repoIntegrations")
    .description("Manage repository integrations");

  repoIntegrations.addCommand(processFileMatchingRuleCommand());
  return repoIntegrations;
}

import { Command } from "commander";

import { getContext, wrapAction } from "../../commandHelpers.js";
import { buildRuntime } from "../../runtime.js";

const PYTHON_SOURCE = `
def my_fun_function():
  print "Hello world"
`.trim();

export function processFileMatchingRuleCommand() {
  return new Command()
    .name("processFileMatchingRule")
    .description("Process a file matching rule")
    .action(
      wrapAction(async (options, command) => {
        const context = getContext(command);
        const runtime = buildRuntime(context);

        console.log("Hello world");

        console.log(PYTHON_SOURCE);
      }),
    );
}

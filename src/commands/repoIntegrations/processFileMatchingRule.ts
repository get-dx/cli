import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { Language, Parser } from "web-tree-sitter";

import { getContext, wrapAction } from "../../commandHelpers.js";
import { buildRuntime } from "../../runtime.js";
import { CliError } from "../../errors.js";

const DIST_DIR = fileURLToPath(new URL("../../../dist", import.meta.url));

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

        console.log("Source:");
        console.log(PYTHON_SOURCE);

        console.log("Setting up tree-sitter...");
        await Parser.init();
        const parser = new Parser();
        const LANGUAGE_PYTHON = await Language.load(
          `${DIST_DIR}/tree-sitter-python.wasm`,
        );
        parser.setLanguage(LANGUAGE_PYTHON);

        console.log("Parsing...");
        const tree = parser.parse(PYTHON_SOURCE);

        if (!tree) {
          throw new CliError("Failed to parse source code");
        }

        console.log("Tree:");
        console.log(tree.rootNode.toString());
      }),
    );
}

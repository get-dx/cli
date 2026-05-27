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

const TSX_SOURCE = `
import React from "react";

function MyComponent() {
  return <div>Hello world</div>;
}
`.trim();

export function processFileMatchingRuleCommand() {
  return new Command()
    .name("processFileMatchingRule")
    .description("Process a file matching rule")
    .action(
      wrapAction(async (options, command) => {
        const context = getContext(command);
        const runtime = buildRuntime(context);

        console.log("Python source:");
        console.log(PYTHON_SOURCE);
        await parsePython(PYTHON_SOURCE);

        console.log("TSX Source:");
        console.log(TSX_SOURCE);
        await parseTSX(TSX_SOURCE);
      }),
    );
}

async function parsePython(source: string) {
  await Parser.init();

  const pythonParser = new Parser();
  const LANGUAGE_PYTHON = await Language.load(
    `${DIST_DIR}/tree-sitter-python.wasm`,
  );
  pythonParser.setLanguage(LANGUAGE_PYTHON);

  const tree = pythonParser.parse(source);
  if (!tree) {
    throw new CliError("Failed to parse source code");
  }

  console.log("Python AST:");
  console.log(tree.rootNode.toString());
}

async function parseTSX(source: string) {
  await Parser.init();

  const tsxParser = new Parser();
  const LANGUAGE_TSX = await Language.load(`${DIST_DIR}/tree-sitter-tsx.wasm`);
  tsxParser.setLanguage(LANGUAGE_TSX);

  const tree = tsxParser.parse(source);
  if (!tree) {
    throw new CliError("Failed to parse source code");
  }

  console.log("TSX AST:");
  console.log(tree.rootNode.toString());
}

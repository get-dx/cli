#! /usr/bin/env node

import { Command } from "commander";
import { createProgram } from "./cli.js";

main();

function main() {
  const program = createProgram();

  console.log("Program:", program.name());

  for (const command of program.commands) {
    const commandText = getCommandText(command, 0);

    console.log(commandText);
  }
}

function getCommandText(
  command: Command,
  indentLevel: number,
  headerWidth: number | null = null,
): string {
  const isParentCommand = command.commands.length > 0;

  const output: string[] = [];

  const currentCommandText =
    " ".repeat(indentLevel * 2) +
    padRight(command.name() + ": ", headerWidth) +
    command.description();
  output.push(currentCommandText);

  if (isParentCommand) {
    output.push("");
    const subcommands = [...command.commands].sort((a, b) =>
      a.name().localeCompare(b.name()),
    );
    const longestSubcommandName = subcommands.reduce(
      (max, subcommand) => Math.max(max, subcommand.name().length),
      0,
    );
    for (const subcommand of subcommands) {
      output.push(
        getCommandText(subcommand, indentLevel + 1, longestSubcommandName + 2),
      );
    }
    output.push("");
  }

  return output.join("\n");
}

function padRight(text: string, width: number | null): string {
  if (width === null) {
    return text;
  }

  return text + " ".repeat(width - text.length);
}

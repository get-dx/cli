import { Command, Option } from "commander";

import { authCommand } from "./commands/auth.js";
import { catalogCommand } from "./commands/catalog.js";
import { initCommand } from "./commands/init.js";
import { scorecardsCommand } from "./commands/scorecards.js";
import { snapshotsCommand } from "./commands/snapshots.js";
import { studioCommand } from "./commands/studio.js";
import { teamsCommand } from "./commands/teams.js";
import { workflowRunsCommand } from "./commands/workflowRuns.js";
import { workflowsCommand } from "./commands/workflows.js";
import { handleError } from "./commandHelpers.js";

import cliPackage from "../package.json" with { type: "json" };
import {
  checkForNewVersion,
  performUpdate,
  promptVersionUpdate,
  type VersionCheckResult,
} from "./versionCheck.js";

export async function run(argv = process.argv): Promise<void> {
  try {
    const program = createProgram();
    if (argv.length <= 2) {
      program.outputHelp();
      return;
    }

    let versionCheckResult: VersionCheckResult = { shouldUpdate: false };
    try {
      const versionStatus = await checkForNewVersion(argv);
      if (versionStatus.status === "available") {
        versionCheckResult = await promptVersionUpdate(
          versionStatus.latestVersion,
        );
      }
    } catch {
      // Never let a failure with version check or upgrade prompt block a command
    }

    await program.parseAsync(argv);

    if (versionCheckResult.shouldUpdate && versionCheckResult.latestVersion) {
      await performUpdate(versionCheckResult.latestVersion);
    }
  } catch (error) {
    handleError(error, undefined, argv);
  }
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name("dx")
    .description("DX CLI")
    .version(cliPackage.version, "-v, --version")
    .addOption(new Option("--json", "Print machine-readable JSON"))
    .addOption(
      new Option("--agent <name>", "Agent name to send as an HTTP header"),
    )
    .addOption(
      new Option(
        "--agent-model <model>",
        "Agent model name to send as an HTTP header",
      ),
    )
    .addOption(
      new Option(
        "--agent-session-id <id>",
        "Agent session ID to send as an HTTP header",
      ),
    );

  program.addCommand(authCommand());
  program.addCommand(catalogCommand());
  program.addCommand(initCommand());
  program.addCommand(scorecardsCommand());
  program.addCommand(snapshotsCommand());
  program.addCommand(studioCommand());
  program.addCommand(teamsCommand());
  program.addCommand(workflowRunsCommand());
  program.addCommand(workflowsCommand());

  applyExitOverride(program);

  return program;
}

/**
 * Make Commander throw CommanderError instead of calling process.exit(), and
 * suppress its own stderr writes so we can control all error output ourselves.
 *
 * exitOverride() and configureOutput() are not inherited by subcommands, so
 * apply them to the full command tree after all subcommands are registered.
 */
function applyExitOverride(cmd: Command): void {
  cmd.exitOverride();
  cmd.configureOutput({ outputError: () => {} });
  for (const sub of cmd.commands) {
    applyExitOverride(sub);
  }
}

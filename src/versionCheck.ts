import { select } from "@inquirer/prompts";
import dayjs from "dayjs";
import { execa } from "execa";

import {
  persistCurrentVersionCache,
  persistVersionPromptSelection,
  readConfig,
} from "./config.js";
import { request } from "./http.js";
import { renderRichText } from "./renderers.js";
import { buildRuntimeSafe } from "./runtime.js";
import { isSkillInstalled } from "./skill.js";
import type { Runtime, StoredConfig, VersionPromptSelection } from "./types.js";
import * as ui from "./ui.js";

import cliPackage from "../package.json" with { type: "json" };

const VERSION_CHECK_INTERVAL_HOURS = 24;
const SNOOZE_DAYS = 7;

const SKIP_COMMANDS = new Set(["auth", "init"]);
const SKIP_OPTIONS = new Set(["-h", "--help", "-v", "--version"]);

export interface VersionCheckResult {
  shouldUpdate: boolean;
  latestVersion?: string;
}

export type VersionStatus =
  | { status: "available"; latestVersion: string }
  | { status: "up-to-date" }
  | { status: "disabled" };

interface CurrentVersionResponse extends Record<string, unknown> {
  versions: {
    cli: string;
  };
}

/**
 * Compares two semver strings (e.g. "1.2.3").
 * Returns a negative number if a < b, 0 if equal, positive if a > b.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => v.split(".").map((n) => parseInt(n, 10));
  const [aMajor = 0, aMinor = 0, aPatch = 0] = parse(a);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = parse(b);
  return aMajor - bMajor || aMinor - bMinor || aPatch - bPatch;
}

/**
 * Returns true if a version fetch should be attempted — i.e. no cached result
 * exists or the cached result is older than VERSION_CHECK_INTERVAL_HOURS.
 */
export function shouldPerformVersionCheck(config: StoredConfig): boolean {
  const cache = config.currentVersionCache;
  if (!cache?.updatedAt) {
    return true;
  }
  const age = dayjs().diff(dayjs(cache.updatedAt), "hour");
  return age >= VERSION_CHECK_INTERVAL_HOURS;
}

/**
 * Returns true if the upgrade prompt should be shown to the user, taking into
 * account any previously persisted SKIP or SNOOZE state.
 */
export function shouldShowVersionPrompt(
  latestVersion: string,
  versionPromptSelection?: VersionPromptSelection,
): boolean {
  if (!versionPromptSelection) {
    return true;
  }
  if (
    versionPromptSelection.type === "SKIP" &&
    versionPromptSelection.skipVersion === latestVersion
  ) {
    return false;
  }
  if (
    versionPromptSelection.type === "SNOOZE" &&
    dayjs().isBefore(dayjs(versionPromptSelection.snoozeUntil))
  ) {
    return false;
  }
  return true;
}

async function fetchLatestVersion(runtime: Runtime): Promise<string> {
  const response = await request<CurrentVersionResponse>(
    runtime,
    "/cli.currentVersion",
    { method: "GET" },
  );
  return response.body.versions.cli;
}

/**
 * Checks whether a newer CLI version is available.
 *
 * Returns:
 *   "available"  — a newer version exists and the user should be prompted
 *   "up-to-date" — the installed version is current (or the user has snoozed/skipped)
 *   "disabled"   — the check was skipped or could not run (env var, skip command, no token, network error)
 */
export async function checkForNewVersion(
  argv: string[],
): Promise<VersionStatus> {
  if (process.env.DX_DISABLE_VERSION_CHECK) {
    return { status: "disabled" };
  }

  const args = argv.slice(2);
  if (args.some((arg) => SKIP_OPTIONS.has(arg))) {
    return { status: "disabled" };
  }

  const topLevelCommand = args.find((arg) => !arg.startsWith("-"));
  if (!topLevelCommand) {
    return { status: "disabled" };
  }

  if (topLevelCommand && SKIP_COMMANDS.has(topLevelCommand)) {
    return { status: "disabled" };
  }

  const context = {
    json: argv.includes("--json"),
    agent: undefined,
    agentSessionId: undefined,
  };
  const runtime = await buildRuntimeSafe(context);
  if (!runtime) {
    return { status: "disabled" };
  }

  const config = readConfig();
  let latestVersion: string;
  if (!shouldPerformVersionCheck(config)) {
    latestVersion = config.currentVersionCache!.contents.cli;
  } else {
    try {
      latestVersion = await fetchLatestVersion(runtime);
    } catch {
      return { status: "disabled" };
    }
    persistCurrentVersionCache({
      updatedAt: new Date().toISOString(),
      contents: { cli: latestVersion },
    });
  }

  if (compareVersions(latestVersion, cliPackage.version) <= 0) {
    return { status: "up-to-date" };
  }

  if (
    !shouldShowVersionPrompt(latestVersion, readConfig().versionPromptSelection)
  ) {
    return { status: "up-to-date" };
  }

  return { status: "available", latestVersion };
}

/**
 * Notifies the user that a new version is available and, in interactive
 * sessions, prompts them to update, snooze, or skip.
 *
 * Returns a result indicating whether the user chose to update immediately,
 * so the caller can invoke performUpdate() after the command finishes.
 */
export async function promptVersionUpdate(
  latestVersion: string,
): Promise<VersionCheckResult> {
  const noUpdate: VersionCheckResult = { shouldUpdate: false };
  const currentVersion = cliPackage.version;
  const isInteractive = process.stdin.isTTY && process.stderr.isTTY;

  if (!isInteractive) {
    renderRichText(
      [
        ui.blankLine(),
        ui.p(
          ui.warning(
            `A new version of the DX CLI is available: ${currentVersion} → ${latestVersion}`,
          ),
        ),
        ui.p(`Run: ${ui.code(`npm install -g @get-dx/cli@${latestVersion}`)}`),
        ui.blankLine(),
      ],
      { useStderr: true },
    );
    return noUpdate;
  }

  renderRichText(
    [
      ui.blankLine(),
      ui.p(
        ui.warning(
          `A new version of the DX CLI is available: ${currentVersion} → ${latestVersion}`,
        ),
      ),
      ui.blankLine(),
    ],
    { useStderr: true },
  );
  const choice = await select(
    {
      message: "What would you like to do?",
      choices: [
        { name: "Update now", value: "update" },
        { name: `Remind me later (in ${SNOOZE_DAYS} days)`, value: "snooze" },
        { name: "Skip this version", value: "skip" },
      ],
    },
    {
      output: process.stderr,
    },
  );

  if (choice === "update") {
    persistVersionPromptSelection(undefined);
    return { shouldUpdate: true, latestVersion };
  }

  if (choice === "snooze") {
    persistVersionPromptSelection({
      type: "SNOOZE",
      snoozeUntil: dayjs().add(SNOOZE_DAYS, "day").toISOString(),
    });
  } else {
    persistVersionPromptSelection({ type: "SKIP", skipVersion: latestVersion });
  }

  return noUpdate;
}

/**
 * Performs the actual CLI + skill upgrade after the user's command has finished.
 */
export async function performUpdate(latestVersion: string): Promise<void> {
  if (await isSkillInstalled()) {
    renderRichText(
      [
        ui.blankLine(),
        ui.p(ui.bold("Updating the DX skill.")),
        ui.p("This will run the following command:", false),
        ui.codeBlock("npx --yes -- skills@latest update dx-cli --global"),
        ui.blankLine(),
      ],
      {
        useStderr: true,
      },
    );
    try {
      await execa({
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      })`npx --yes -- skills@latest update dx-cli --global`;
    } catch {
      renderRichText(
        [
          ui.p(
            ui.warning(
              "Warning: failed to update the DX skill. You can update it manually with: " +
                ui.code("npx skills update dx-cli --global"),
            ),
          ),
        ],
        { useStderr: true },
      );
    }
  }

  renderRichText(
    [
      ui.blankLine(),
      ui.p(ui.bold(`Updating the DX CLI to ${latestVersion}.`)),
      ui.p("This will run the following command:", false),
      ui.codeBlock(`npm install -g @get-dx/cli@${latestVersion}`),
      ui.blankLine(),
    ],
    { useStderr: true },
  );

  try {
    await execa({
      stdout: "inherit",
      stderr: "inherit",
    })`npm install -g @get-dx/cli@${latestVersion}`;
  } catch {
    renderRichText(
      [
        ui.p(
          ui.warning(
            `Warning: failed to update the DX CLI. You can update it manually with: ` +
              ui.code(`npm install -g @get-dx/cli@${latestVersion}`),
          ),
        ),
      ],
      { useStderr: true },
    );
  }
}

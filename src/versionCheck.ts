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
import type {
  CurrentVersionCache,
  Runtime,
  StoredConfig,
  VersionPromptSelection,
} from "./types.js";
import * as ui from "./ui.js";

import cliPackage from "../package.json" with { type: "json" };

const VERSION_CHECK_INTERVAL_HOURS = 24;
const SNOOZE_DAYS = 7;

const SKIP_COMMANDS = new Set(["auth", "init"]);

export interface VersionCheckResult {
  shouldUpdate: boolean;
  latestVersion?: string;
}

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
 * Core version-check orchestration. Call this before running any command.
 * Returns a result that indicates whether the user chose to update (and the
 * target version), so the caller can invoke performUpdate() after the command.
 */
export async function checkVersionAndMaybePrompt(
  argv: string[],
): Promise<VersionCheckResult> {
  const noUpdate: VersionCheckResult = { shouldUpdate: false };

  if (process.env.DX_DISABLE_VERSION_CHECK) {
    return noUpdate;
  }

  const topLevelCommand = argv[2];
  if (topLevelCommand && SKIP_COMMANDS.has(topLevelCommand)) {
    return noUpdate;
  }

  const context = {
    json: argv.includes("--json"),
    agent: undefined,
    agentSessionId: undefined,
  };
  const runtime = await buildRuntimeSafe(context);
  if (!runtime) {
    return noUpdate;
  }

  const config = readConfig();
  if (!shouldPerformVersionCheck(config)) {
    const cached = config.currentVersionCache!;
    return maybePrompt(cached.contents.cli, config.versionPromptSelection);
  }

  let latestVersion: string;
  try {
    latestVersion = await fetchLatestVersion(runtime);
  } catch {
    return noUpdate;
  }

  const cache: CurrentVersionCache = {
    updatedAt: new Date().toISOString(),
    contents: { cli: latestVersion },
  };
  persistCurrentVersionCache(cache);

  return maybePrompt(latestVersion, readConfig().versionPromptSelection);
}

async function maybePrompt(
  latestVersion: string,
  versionPromptSelection: VersionPromptSelection | undefined,
): Promise<VersionCheckResult> {
  const noUpdate: VersionCheckResult = { shouldUpdate: false };
  const currentVersion = cliPackage.version;

  if (compareVersions(latestVersion, currentVersion) <= 0) {
    return noUpdate;
  }

  if (!shouldShowVersionPrompt(latestVersion, versionPromptSelection)) {
    return noUpdate;
  }

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
  const choice = await select({
    message: "What would you like to do?",
    choices: [
      { name: "Update now", value: "update" },
      { name: `Remind me later (in ${SNOOZE_DAYS} days)`, value: "snooze" },
      { name: "Skip this version", value: "skip" },
    ],
  });

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

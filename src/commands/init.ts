import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { password, confirm, select } from "@inquirer/prompts";
import { Command } from "commander";
import { execa } from "execa";

import { buildLogger, buildRuntime, buildRuntimeSafe } from "../runtime.js";
import { getAuthInfo, type AuthInfoResponse } from "./auth.js";
import { renderAuthInfo } from "./authRendering.js";
import { loginViaBrowser } from "../loginViaBrowser.js";
import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";
import { CliError } from "../errors.js";
import { CliContext, Runtime } from "../types.js";
import { deriveBaseUrlsFromEnv, persistBaseUrls } from "../config.js";
import { setToken } from "../secrets.js";
import { renderWelcomeAnimation } from "../welcomeAnimation.js";

export function initCommand() {
  const init = new Command()
    .name("init")
    .description("Initialize the DX CLI")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Initialize the CLI",
          command: "dx init",
        },
        {
          label:
            "Initialize the CLI for a managed deployment with custom base URLs",
          command:
            "DX_API_BASE_URL=https://api.dx.example.com DX_WEB_BASE_URL=https://dx.example.com dx init",
        },
      ]),
    )
    .action(
      wrapAction(async (commandOptions, command) => {
        const context = getContext(command);
        let runtime = buildRuntimeSafe(context);

        ensureInteractive();

        await renderWelcomeAnimation();

        runtime = await ensureLoggedIn(context, runtime);

        // Sleep for a bit to help with visual chunking
        await sleep(500);

        await optionallySetupSkill(runtime);

        renderRichText([
          ui.blankLine(),
          ui.p(
            `${ui.success(ui.GLYPHS.CHECK)} Done! You are now ready to use the DX CLI.`,
          ),
        ]);
      }),
    );

  return init;
}

function ensureInteractive() {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    throw new CliError("`dx init` must be run interactively");
  }
}

async function ensureLoggedIn(
  context: CliContext,
  runtime: Runtime | null,
): Promise<Runtime> {
  renderRichText([ui.h1(`Checking if you are logged in...`), ui.blankLine()]);

  if (runtime) {
    let authInfo: AuthInfoResponse | null = null;
    try {
      authInfo = await getAuthInfo(runtime);
    } catch (_error) {
      // Do nothing, we don't mind if this fails
    }

    if (authInfo) {
      renderAuthInfo(authInfo, runtime.token, runtime.apiBaseUrl);

      return runtime;
    }
  }

  renderRichText([ui.p(`You are not logged in yet.`), ui.blankLine()]);

  const { apiBaseUrl, webBaseUrl } = deriveBaseUrlsFromEnv();
  return await attemptLogin(apiBaseUrl, webBaseUrl, context);
}

async function attemptLogin(
  apiBaseUrl: string,
  webBaseUrl: string,
  context: CliContext,
): Promise<Runtime> {
  const logger = buildLogger(context);

  logger.debug("Attempting login", { apiBaseUrl, webBaseUrl });

  const method = await select({
    message: "How would you like to log in?",
    choices: [
      { name: "Open browser", value: "browser" },
      { name: "Paste API token", value: "token" },
    ],
  });

  let token: string;

  if (method === "browser") {
    token = await loginViaBrowser(webBaseUrl);
  } else {
    token = await password({
      message: "Paste your account web API token here:",
      mask: true,
    });
  }

  if (!token) {
    throw new CliError("Account web API token is required");
  }

  const runtime = buildRuntime(context, {
    apiBaseUrl,
    token,
    webBaseUrl,
  });

  renderRichText([ui.blankLine(), ui.p(`Attempting login...`), ui.blankLine()]);

  const response = await getAuthInfo(runtime);
  if (!response.ok) {
    throw new CliError(`Login failed`);
  }

  persistBaseUrls(apiBaseUrl, webBaseUrl);
  setToken(apiBaseUrl, token);

  renderAuthInfo(response, token, apiBaseUrl);

  return runtime;
}

async function optionallySetupSkill(runtime: Runtime) {
  renderRichText([
    ui.blankLine(),
    ui.h1(`Checking for the DX skill...`),
    ui.blankLine(),
  ]);

  const skillPath = join(homedir(), ".agents", "skills", "dx-cli");
  const skillInstalled = await access(skillPath)
    .then(() => true)
    .catch(() => false);
  if (skillInstalled) {
    renderRichText([ui.p(`The DX skill is already installed.`)]);

    runtime.logger.debug("To update: npx skills update dx-cli --global");
    runtime.logger.debug("To uninstall: npx skills remove dx-cli --global");

    return;
  }

  renderRichText([
    ui.p(`The DX skill is not installed. Would you like to install it?`),
    ui.p("This will run the following command:", false),
    ui.codeBlock("npx --yes -- skills@latest add get-dx/cli --global"),
    ui.blankLine(),
  ]);

  const setupSkill = await confirm({
    message: "Continue?",
    default: true,
  });

  if (!setupSkill) {
    renderRichText([
      ui.p(`Skipping the DX skill setup. You can always do this later.`),
    ]);
    return;
  }

  renderRichText([ui.p(`Setting up the DX skill...`)]);

  // NOTE: if the user chooses "no" for the final confirmation prompt, `skills` still exits with a 0 status.
  // We are also not able to pipe the output without also breaking interactivity.
  const result = await execa({
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  })`npx --yes -- skills@latest add get-dx/cli --global`;

  runtime.logger.debug("To update: npx skills update dx-cli --global");
  runtime.logger.debug("To uninstall: npx skills remove dx-cli --global");

  if (result.exitCode !== 0) {
    throw new CliError(`Failed to setup the DX skill: ${result.stderr}`);
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

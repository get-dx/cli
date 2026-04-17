import { input, password, confirm, select } from "@inquirer/prompts";
import { Command } from "commander";
import { execa } from "execa";

import { buildRuntime, buildRuntimeSafe } from "../runtime.js";
import { getAuthInfo, type AuthInfoResponse } from "./auth.js";
import { renderAuthInfo } from "./authRendering.js";
import { getContext } from "../commandHelpers.js";
import { wrapAction } from "../commandHelpers.js";
import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";
import { CliError } from "../errors.js";
import { CliContext, Runtime } from "../types.js";
import { persistBaseUrl } from "../config.js";
import { setToken } from "../secrets.js";

type DeploymentType = "cloud" | "dedicated" | "managed";

// FIXME: make this WAY more glam
// Choose a more interesting ASCII art font from https://patorjk.com/software/taag/
const WELCOME_BANNER = ui.indent(
  `\
▄▄▄▄▄     ▄▄▄  ▄▄▄
██▀▀▀██    ██▄▄██
██    ██    ████
██    ██     ██
██    ██    ████
██▄▄▄██    ██  ██
▀▀▀▀▀     ▀▀▀  ▀▀▀
`,
  2,
);

export function initCommand() {
  const init = new Command()
    .name("init")
    .description("Initialize the DX CLI")
    .action(
      wrapAction(async (_commandOptions, command) => {
        const context = getContext(command);
        let runtime = buildRuntimeSafe(context);

        ensureInteractive();

        showWelcomeBanner();

        runtime = await ensureLoggedIn(runtime);

        await optionallySetupSkill(runtime);

        renderRichText([
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

function showWelcomeBanner() {
  renderRichText([ui.p(ui.success(WELCOME_BANNER))]);
}

async function ensureLoggedIn(runtime: Runtime | null): Promise<Runtime> {
  renderRichText([ui.h1(`Checking if you are logged in...`)]);

  if (runtime) {
    let authInfo: AuthInfoResponse | null = null;
    try {
      authInfo = await getAuthInfo(runtime);
    } catch (error) {
      // Do nothing, we don't mind if this fails
    }

    if (authInfo) {
      renderRichText([ui.p(`You are logged in!`)]);

      renderAuthInfo(authInfo, runtime.token, runtime.baseUrl);

      return runtime;
    }
  }

  renderRichText([ui.p(`You are not logged in yet.`)]);

  const accountType = await select<DeploymentType>({
    message: "What kind of DX account do you use?",
    choices: [
      {
        name: `Cloud (https://app.getdx.com)`,
        value: "cloud",
      },
      {
        name: "Dedicated (e.g. https://your-company.getdx.io)",
        value: "dedicated",
      },
      {
        name: "Managed (custom domain, e.g. https://dx.engineering-tools.example.com)",
        value: "managed",
      },
    ],
  });

  switch (accountType) {
    case "cloud":
      return await attemptLogin(
        "https://api.getdx.com",
        "https://app.getdx.com",
      );
    case "dedicated": {
      const prefix = await input({
        message:
          "What is your company's prefix? (e.g. 'your-company' for https://your-company.getdx.io)",
      });
      if (!prefix) {
        throw new CliError("Company prefix is required");
      }
      const apiBaseUrl = `https://api.${prefix}.getdx.io`;
      const uiBaseUrl = `https://${prefix}.getdx.io`;
      return await attemptLogin(apiBaseUrl, uiBaseUrl);
    }
    case "managed": {
      const uiBaseUrl = await input({
        message: "What is the base URL you use to login to the web UI?",
      });
      const apiBaseUrl = await input({ message: "What is your API base URL?" });
      if (!apiBaseUrl) {
        throw new CliError("API base URL is required");
      }
      if (!uiBaseUrl) {
        throw new CliError("UI base URL is required");
      }
      return await attemptLogin(apiBaseUrl, uiBaseUrl);
    }
    default:
      throw new CliError(`Unknown deployment type: ${accountType}`);
  }
}

async function attemptLogin(
  apiBaseUrl: string,
  uiBaseUrl: string,
): Promise<Runtime> {
  // TODO: implement

  const token = await password({
    message: "Paste your account web API token here:",
    mask: true,
  });

  if (!token) {
    throw new CliError("Account web API token is required");
  }

  const context = createEmptyContext();
  const runtime = buildRuntime(context, {
    baseUrl: apiBaseUrl,
    token,
  });

  renderRichText([ui.p(`Attempting login...`)]);

  const response = await getAuthInfo(runtime);
  if (!response.ok) {
    throw new CliError(`Login failed`);
  }

  renderRichText([ui.p(`Login successful.`)]);

  persistBaseUrl(apiBaseUrl);
  setToken(apiBaseUrl, token);

  renderAuthInfo(response, token, apiBaseUrl);

  return runtime;
}

async function optionallySetupSkill(runtime: Runtime) {
  renderRichText([ui.h1(`Checking for the DX skill...`)]);

  const setupSkill = await confirm({
    message: "Would you like to setup the DX skill for AI agents?",
    default: true,
  });

  if (!setupSkill) {
    renderRichText([
      ui.p(`Skipping the DX skill setup. You can always do this later.`),
    ]);
    return;
  }

  renderRichText([ui.p(`Setting up the DX skill...`)]);

  // TODO: install the DX skill from github
  const result = await execa({
    stdout: ["pipe", "inherit"],
  })`npx --yes -- skills@latest --help`;

  if (result.exitCode !== 0) {
    throw new CliError(`Failed to setup the DX skill: ${result.stderr}`);
  }

  renderRichText([ui.p(`DX skill setup successful.`)]);
}

function createEmptyContext(): CliContext {
  return {
    json: false,
  };
}

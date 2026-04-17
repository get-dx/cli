import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { input, password, confirm } from "@inquirer/prompts";
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

type ParsedHostname =
  | { type: "cloud" }
  | { type: "dedicated"; accountName: string }
  | { type: "managed"; uiBaseUrl: string }
  | { type: "invalid" };

function parseHostname(raw: string): ParsedHostname {
  const normalized = raw.trim().replace(/\/$/, "");

  if (!normalized || normalized === "app.getdx.com") {
    return { type: "cloud" };
  }

  try {
    const url = new URL(
      normalized.startsWith("http") ? normalized : `https://${normalized}`,
    );
    const host = url.hostname;

    const dedicatedMatch = host.match(/^(.+)\.getdx\.io$/);
    if (dedicatedMatch) {
      return { type: "dedicated", accountName: dedicatedMatch[1] };
    }

    if (host) {
      return { type: "managed", uiBaseUrl: url.origin };
    }
  } catch {
    // fall through to invalid
  }

  return { type: "invalid" };
}

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
  renderRichText([ui.h1(`Checking if you are logged in...`), ui.blankLine()]);

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

  let parsed: ParsedHostname = { type: "invalid" };
  while (parsed.type === "invalid") {
    const raw = await input({
      message: "What is your DX hostname? (leave blank for app.getdx.com)",
    });
    parsed = parseHostname(raw);
    if (parsed.type === "invalid") {
      renderRichText([
        ui.p(ui.error(`Could not recognise that hostname. Please try again.`)),
      ]);
    }
  }

  switch (parsed.type) {
    case "cloud":
      return await attemptLogin(
        "https://api.getdx.com",
        "https://app.getdx.com",
      );
    case "dedicated": {
      const { accountName } = parsed;
      return await attemptLogin(
        `https://api.${accountName}.getdx.io`,
        `https://${accountName}.getdx.io`,
      );
    }
    case "managed": {
      const apiBaseUrl = await input({
        message: "What is your API base URL?",
      });
      if (!apiBaseUrl) {
        throw new CliError("API base URL is required");
      }
      return await attemptLogin(apiBaseUrl, parsed.uiBaseUrl);
    }
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
  renderRichText([ui.h1(`Checking for the DX skill...`), ui.blankLine()]);

  const skillPath = join(homedir(), ".agents", "skills", "dx-cli");
  const skillInstalled = await access(skillPath)
    .then(() => true)
    .catch(() => false);
  if (skillInstalled) {
    renderRichText([
      ui.p(`The DX skill is already installed.`),
      ui.blankLine(),
    ]);
    return;
  }

  renderRichText([
    ui.p(`The DX skill is not installed. Would you like to install it?`),
    ui.p("This will run the following command:", false),
    ui.codeBlock("npx --yes -- skills@latest add get-dx/dx-cli --global"),
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

  const result = await execa({
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  })`npx --yes -- skills@latest add get-dx/dx-cli --global`;

  runtime.logger.debug("To update: npx skills update get-dx/dx-cli --global");
  runtime.logger.debug(
    "To uninstall: npx skills remove get-dx/dx-cli --global",
  );

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

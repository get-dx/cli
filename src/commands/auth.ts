import { password, select } from "@inquirer/prompts";
import { Command } from "commander";

import { deleteToken, setToken } from "../secrets.js";
import { renderJson } from "../renderers.js";
import {
  renderAuthInfo,
  renderAuthWhoami,
  renderLoggedOut,
} from "./authRendering.js";
import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import {
  persistBaseUrls,
  resolveApiBaseUrl,
  deriveBaseUrlsFromEnv,
} from "../config.js";
import { CliError } from "../errors.js";
import { request } from "../http.js";
import { loginViaBrowser } from "../loginViaBrowser.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import { maskToken } from "../ui.js";

export function authCommand(): Command {
  const auth = new Command()
    .name("auth")
    .description("Manage DX authentication");

  auth
    .command("login")
    .option(
      "--token <token>",
      "Account web API token or personal access token. Omit this option to login interactively by web browser or pasting.",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Log in interactively via browser or by pasting a token",
          command: "dx auth login",
        },
        {
          label: "Log in non-interactively with a token",
          command: "dx auth login --token <token>",
        },
        {
          label: "Log in to a managed deployment with custom base URLs",
          command:
            "DX_API_BASE_URL=https://api.dx.example.com DX_WEB_BASE_URL=https://dx.example.com dx auth login --token <token>",
        },
      ]),
    )
    .action(
      wrapAction(async (commandOptions: { token?: string }, command) => {
        const context = getContext(command);

        const { apiBaseUrl, webBaseUrl } = deriveBaseUrlsFromEnv();

        let token = commandOptions.token;
        if (!token) {
          if (!process.stdin.isTTY || !process.stderr.isTTY) {
            throw new CliError(
              "`dx auth login` without `--token` requires an interactive terminal; pass `--token` for non-interactive use",
            );
          }

          const method = await select({
            message: "How would you like to log in?",
            choices: [
              { name: "Open browser", value: "browser" },
              { name: "Paste API token", value: "token" },
            ],
          });

          if (method === "browser") {
            token = await loginViaBrowser(webBaseUrl);
          } else {
            token = await password({
              message: "Paste your account web API token here:",
              mask: true,
            });
          }

          if (!token) {
            throw new CliError(
              "Account web API token or personal access token is required",
            );
          }
        }

        const runtime = await buildRuntime(context, {
          apiBaseUrl,
          token,
          webBaseUrl,
        });

        const response = await getAuthInfo(runtime);
        persistBaseUrls(apiBaseUrl, webBaseUrl);
        await setToken(apiBaseUrl, token);
        if (context.json) {
          renderJson({
            ...response,
            api_base_url: apiBaseUrl,
            web_base_url: webBaseUrl,
          });
          return;
        }
        renderAuthInfo(response, token, apiBaseUrl);
      }),
    );

  auth
    .command("logout")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Log out and remove the stored token",
          command: "dx auth logout",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const context = getContext(command);
        const apiBaseUrl = resolveApiBaseUrl();
        deleteToken(apiBaseUrl);

        if (context.json) {
          renderJson({ ok: true, api_base_url: apiBaseUrl, logged_out: true });
        } else {
          renderLoggedOut(apiBaseUrl);
        }
      }),
    );

  auth
    .command("status")
    .alias("info")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Show the currently authenticated user and token details",
          command: "dx auth status",
        },
        {
          label: "Return auth details as JSON",
          command: "dx auth status --json",
        },
        {
          label: "Pipe auth details into `jq` and list scopes",
          command: "dx auth status --json | jq --raw-output '.auth.scopes[]'",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getAuthInfo(runtime);

        if (runtime.context.json) {
          renderJson({
            ...response,
            token: maskToken(runtime.token),
            api_base_url: runtime.apiBaseUrl,
            web_base_url: runtime.webBaseUrl,
          });
        } else {
          renderAuthInfo(response, runtime.token, runtime.apiBaseUrl);
        }
      }),
    );

  auth
    .command("whoami")
    .description("Show user and team details for the authenticated token")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch user and team details",
          command: "dx auth whoami",
        },
        {
          label: "Fetch user and team details as JSON",
          command: "dx auth whoami --json",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getAuthWhoami(runtime);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderAuthWhoami(response);
        }
      }),
    );

  return auth;
}

export type TokenType = "account_web_api_token" | "personal_access_token";

export type AuthInfoResponse = {
  ok: true;
  auth: {
    token_type: TokenType;
    token_name: string;
    scopes: string[];
    expires_at: string;
    created_at: string;
  };
  account: { name: string };
};

// TODO: should we move this somewhere more central, since `init` needs it?
export async function getAuthInfo(runtime: Runtime): Promise<AuthInfoResponse> {
  const response = await request<AuthInfoResponse>(runtime, "/auth.info", {
    method: "GET",
  });

  return response.body;
}

export type WhoamiUser = {
  id: string;
  name: string;
  email: string;
};

export type WhoamiTeam = {
  id: string;
  name: string;
  lead: WhoamiUser;
  contributors: WhoamiUser[];
};

export type AuthWhoamiResponse = {
  ok: true;
  auth_token_type: TokenType;
  account: { name: string };
  user: WhoamiUser | null;
  team: WhoamiTeam | null;
};

export async function getAuthWhoami(
  runtime: Runtime,
): Promise<AuthWhoamiResponse> {
  const response = await request<AuthWhoamiResponse>(runtime, "/auth.whoami", {
    method: "GET",
  });

  return response.body;
}

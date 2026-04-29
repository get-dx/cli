import { password, select } from "@inquirer/prompts";
import { Command } from "commander";

import { deleteToken, setToken } from "../secrets.js";
import { renderJson } from "../renderers.js";
import { renderAuthInfo, renderLoggedOut } from "./authRendering.js";
import { getContext, wrapAction } from "../commandHelpers.js";
import {
  persistBaseUrls,
  resolveBaseUrl,
  resolveUiUrl,
  normalizeBaseUrl,
  isDedicatedOrCloudApiHost,
} from "../config.js";
import { CliError, EXIT_CODES } from "../errors.js";
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
    .action(
      wrapAction(async (commandOptions: { token?: string }, command) => {
        const context = getContext(command);
        const baseUrl = resolveBaseUrl();

        ensureLoginUiOriginResolvable(baseUrl);

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
            token = await loginViaBrowser(
              process.env.DX_UI_BASE_URL
                ? normalizeBaseUrl(process.env.DX_UI_BASE_URL)
                : resolveUiUrl(baseUrl),
            );
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

        const uiBaseUrlForPersist = resolveUiOriginForLoginPersist(baseUrl);

        const runtime = buildRuntime(context, {
          apiBaseUrl: baseUrl,
          token,
          uiBaseUrl: uiBaseUrlForPersist,
        });

        const response = await getAuthInfo(runtime);
        persistBaseUrls(baseUrl, uiBaseUrlForPersist);
        setToken(baseUrl, token);
        if (context.json) {
          renderJson({
            ...response,
            base_url: baseUrl,
            ui_base_url: uiBaseUrlForPersist,
          });
          return;
        }
        renderAuthInfo(response, token, baseUrl);
      }),
    );

  auth.command("logout").action(
    wrapAction(async (_options, command) => {
      const context = getContext(command);
      const baseUrl = resolveBaseUrl();
      deleteToken(baseUrl);

      if (context.json) {
        renderJson({ ok: true, base_url: baseUrl, logged_out: true });
      } else {
        renderLoggedOut(baseUrl);
      }
    }),
  );

  auth.command("status").action(
    wrapAction(async (_options, command) => {
      const runtime = buildRuntime(getContext(command));
      const response = await getAuthInfo(runtime);

      if (runtime.context.json) {
        renderJson({
          ...response,
          token: maskToken(runtime.token),
          base_url: runtime.apiBaseUrl,
          ui_base_url: runtime.uiBaseUrl,
        });
      } else {
        renderAuthInfo(response, runtime.token, runtime.apiBaseUrl);
      }
    }),
  );

  return auth;
}

function ensureLoginUiOriginResolvable(baseUrl: string): void {
  if (process.env.DX_UI_BASE_URL) {
    return;
  }
  if (!isDedicatedOrCloudApiHost(baseUrl)) {
    throw new CliError(
      "This API host does not have a default web app URL. Set the DX_UI_BASE_URL environment variable to your DX web app origin, then retry.",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
}

function resolveUiOriginForLoginPersist(baseUrl: string): string {
  if (process.env.DX_UI_BASE_URL) {
    return normalizeBaseUrl(process.env.DX_UI_BASE_URL);
  }
  return resolveUiUrl(baseUrl);
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

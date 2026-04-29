import { password, select } from "@inquirer/prompts";
import { Command } from "commander";

import { deleteToken, setToken } from "../secrets.js";
import { renderJson } from "../renderers.js";
import { renderAuthInfo, renderLoggedOut } from "./authRendering.js";
import { getContext, wrapAction } from "../commandHelpers.js";
import { persistBaseUrl, resolveBaseUrl, resolveUiUrl } from "../config.js";
import { CliError } from "../errors.js";
import { request } from "../http.js";
import { loginViaBrowser } from "../loginViaBrowser.js";
import { buildLogger, buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import cliPackage from "../../package.json" with { type: "json" };
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
            token = await loginViaBrowser(resolveUiUrl(baseUrl));
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

        const runtime = {
          baseUrl,
          token,
          context,
          version: cliPackage.version,
          logger: buildLogger(context),
        };

        const response = await getAuthInfo(runtime);
        persistBaseUrl(baseUrl);
        setToken(baseUrl, token);
        if (context.json) {
          renderJson({ ...response, base_url: baseUrl });
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
          base_url: runtime.baseUrl,
        });
      } else {
        renderAuthInfo(response, runtime.token, runtime.baseUrl);
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

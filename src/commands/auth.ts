import { Command } from "commander";

import { deleteToken, setToken } from "../secrets.js";
import { renderJson } from "../renderers.js";
import { renderAuthInfo, renderLoggedOut } from "./authRendering.js";
import { wrapAction } from "../commandHelpers.js";
import { getContext } from "../commandHelpers.js";
import { persistBaseUrl, resolveBaseUrl } from "../config.js";
import { request } from "../http.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import cliPackage from "../../package.json" with { type: "json" };

export function authCommand(): Command {
  const auth = new Command()
    .name("auth")
    .description("Manage DX authentication");

  auth
    .command("login")
    .requiredOption("--token <token>", "Account web API token")
    .action(
      wrapAction(async (commandOptions, command) => {
        const context = getContext(command);
        const baseUrl = resolveBaseUrl();
        const runtime = {
          baseUrl,
          token: commandOptions.token,
          context,
          version: cliPackage.version,
        };

        const response = await getAuthInfo(runtime);
        persistBaseUrl(baseUrl);
        setToken(baseUrl, commandOptions.token);
        if (context.json) {
          renderJson(response);
          return;
        }
        renderAuthInfo(response, commandOptions.token, baseUrl);
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
        renderJson(response);
      } else {
        renderAuthInfo(response, runtime.token, runtime.baseUrl);
      }
    }),
  );

  return auth;
}

function requestOptions(runtime: Runtime) {
  return {
    token: runtime.token,
    agent: runtime.context.agent,
    agentSessionId: runtime.context.agentSessionId,
    userAgent: `dx-cli/${runtime.version}`,
  };
}

export type TokenType = "account_web_api_token";

export type AuthInfoResponse = {
  ok: true;
  auth: {
    token_type: TokenType;
    token_name: string;
    scopes: string[];
    created_at: string;
  };
  account: { name: string };
};

async function getAuthInfo(runtime: Runtime): Promise<AuthInfoResponse> {
  const response = await request(runtime.baseUrl, "/auth.info", {
    ...requestOptions(runtime),
    method: "GET",
  });

  return response as AuthInfoResponse;
}

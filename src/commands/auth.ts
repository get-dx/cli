import { Command } from "commander";

import { printJson } from "../output.js";
import { deleteToken, setToken } from "../secrets.js";
import { renderAuthInfo, renderStructuredResponse } from "../renderers.js";
import { wrapAction } from "../commandHelpers.js";
import { getContext } from "../commandHelpers.js";
import { persistBaseUrl, resolveBaseUrl } from "../config.js";
import { buildRuntime } from "../runtime.js";
import { getAuthInfo } from "../api.js";
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
        renderAuthInfo(response, commandOptions.token, baseUrl, context.json);
      }),
    );

  auth.command("logout").action(
    wrapAction(async (_options, command) => {
      const context = getContext(command);
      const baseUrl = resolveBaseUrl();
      deleteToken(baseUrl);
      if (context.json) {
        printJson({ ok: true, base_url: baseUrl, logged_out: true });
        return;
      }

      renderStructuredResponse({ ok: true, baseUrl, loggedOut: true }, false);
    }),
  );

  auth.command("status").action(
    wrapAction(async (_options, command) => {
      const runtime = buildRuntime(getContext(command));
      const response = await getAuthInfo(runtime);
      renderAuthInfo(
        response,
        runtime.token,
        runtime.baseUrl,
        runtime.context.json,
      );
    }),
  );

  return auth;
}

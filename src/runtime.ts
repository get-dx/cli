import { resolveBaseUrl } from "./config.js";
import { CliError } from "./errors.js";
import { getToken } from "./secrets.js";
import type { CliContext } from "./types.js";

import cliPackage from "../package.json" with { type: "json" };

export function buildRuntime(context: CliContext) {
  const baseUrl = resolveBaseUrl();
  const token = getToken(baseUrl);

  if (!token) {
    throw new CliError("No API token configured. Run `dx auth login --token <token>` or set DX_API_TOKEN.");
  }

  return {
    baseUrl,
    token,
    context,
    version: cliPackage.version,
  };
}

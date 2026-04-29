import { resolveBaseUrl, resolveUiBaseUrl } from "./config.js";
import { CliError } from "./errors.js";
import { getToken } from "./secrets.js";
import type { CliContext, Runtime } from "./types.js";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";

import cliPackage from "../package.json" with { type: "json" };

export function buildLogger(context: CliContext): Logger {
  return createLogger({ json: context.json || !process.stderr.isTTY });
}

export function buildRuntime(
  context: CliContext,
  overrides?: Partial<Runtime>,
): Runtime {
  const baseUrl = overrides?.baseUrl ?? resolveBaseUrl();
  const uiBaseUrl = overrides?.uiBaseUrl ?? resolveUiBaseUrl(baseUrl);
  const token = overrides?.token ?? getToken(baseUrl);

  if (!token) {
    throw new CliError(
      "No API token configured. Run `dx auth login --token <token>` or set DX_API_TOKEN.",
    );
  }

  return {
    baseUrl,
    uiBaseUrl,
    token,
    context,
    version: cliPackage.version,
    logger: buildLogger(context),
  };
}

export function buildRuntimeSafe(
  context: CliContext,
  overrides?: Partial<Runtime>,
): Runtime | null {
  const baseUrl = overrides?.baseUrl ?? resolveBaseUrl();
  const uiBaseUrl = overrides?.uiBaseUrl ?? resolveUiBaseUrl(baseUrl);
  const token = overrides?.token ?? getToken(baseUrl);

  if (!token) {
    return null;
  }

  return {
    baseUrl,
    uiBaseUrl,
    token,
    context,
    version: cliPackage.version,
    logger: buildLogger(context),
  };
}

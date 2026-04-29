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
  const apiBaseUrl = overrides?.apiBaseUrl ?? resolveBaseUrl();
  const uiBaseUrl = overrides?.uiBaseUrl ?? resolveUiBaseUrl(apiBaseUrl);
  const token = overrides?.token ?? getToken(apiBaseUrl);

  if (!token) {
    throw new CliError(
      "No API token configured. Run `dx auth login --token <token>` or set DX_API_TOKEN.",
    );
  }

  return {
    apiBaseUrl,
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
  const apiBaseUrl = overrides?.apiBaseUrl ?? resolveBaseUrl();
  const uiBaseUrl = overrides?.uiBaseUrl ?? resolveUiBaseUrl(apiBaseUrl);
  const token = overrides?.token ?? getToken(apiBaseUrl);

  if (!token) {
    return null;
  }

  return {
    apiBaseUrl,
    uiBaseUrl,
    token,
    context,
    version: cliPackage.version,
    logger: buildLogger(context),
  };
}

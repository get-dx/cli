import { resolveApiBaseUrl, resolveWebBaseUrl } from "./config.js";
import { CliError } from "./errors.js";
import { getToken } from "./secrets.js";
import type { CliContext, Runtime } from "./types.js";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";

import cliPackage from "../package.json" with { type: "json" };

export function buildLogger(context: CliContext): Logger {
  return createLogger({ json: context.json || !process.stderr.isTTY });
}

export async function buildRuntime(
  context: CliContext,
  overrides?: Partial<Runtime>,
): Promise<Runtime> {
  const apiBaseUrl = overrides?.apiBaseUrl ?? resolveApiBaseUrl();
  const webBaseUrl = overrides?.webBaseUrl ?? resolveWebBaseUrl();
  const token = overrides?.token ?? (await getToken(apiBaseUrl));

  if (!token) {
    throw new CliError(
      "No API token configured. Run `dx auth login --token <token>` or set DX_API_TOKEN.",
    );
  }

  return {
    apiBaseUrl,
    webBaseUrl,
    token,
    context,
    version: cliPackage.version,
    logger: buildLogger(context),
  };
}

export async function buildRuntimeSafe(
  context: CliContext,
  overrides?: Partial<Runtime>,
): Promise<Runtime | null> {
  const apiBaseUrl = overrides?.apiBaseUrl ?? resolveApiBaseUrl();
  const webBaseUrl = overrides?.webBaseUrl ?? resolveWebBaseUrl();
  const token = overrides?.token ?? (await getToken(apiBaseUrl));

  if (!token) {
    return null;
  }

  return {
    apiBaseUrl,
    webBaseUrl,
    token,
    context,
    version: cliPackage.version,
    logger: buildLogger(context),
  };
}

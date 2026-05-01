import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError, EXIT_CODES } from "./errors.js";
import type { StoredConfig } from "./types.js";

const DEFAULT_API_BASE_URL = "https://api.getdx.com";
const DEFAULT_WEB_BASE_URL = "https://app.getdx.com";

// --- Config file I/O ---------------------------------------------------------

export function getConfigPath(): string {
  return path.join(getConfigDir(), "config.json");
}

export function readConfig(): StoredConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const content = fs.readFileSync(configPath, "utf8");
  const raw = JSON.parse(content) as Record<string, string | undefined>;
  const api = raw.apiBaseUrl;
  const web = raw.webBaseUrl;

  const stored: StoredConfig = {};
  if (web) {
    stored.webBaseUrl = web;
  }
  if (api) {
    stored.apiBaseUrl = api;
  }
  return stored;
}

/**
 * Responsible for handling the migration from `baseUrl` to `apiBaseUrl` and `webBaseUrl`,
 * so the upgrade to 0.3.x will be non-breaking for `cloud` and `dedicated` deployments.
 *
 * `managed` deployments will encounter an error and will have to reauthenticate.
 *
 * TODO: delete after 2026-07-01.
 */
export function handleTemporaryBaseUrlMigration(argv: string[]): void {
  if (!process.env.VITEST) {
    // Running tests - we don't want our permanent tests to exercise this logic
    return;
  }

  const COMMANDS_TO_SKIP_MIGRATION = ["login", "logout", "init"];
  if (COMMANDS_TO_SKIP_MIGRATION.some((command) => argv.includes(command))) {
    // Logging in or logging out: we need to ignore the current config file's contents
    return;
  }

  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    // No config file, no need to migrate
    return;
  }

  const content = fs.readFileSync(configPath, "utf8");
  const raw = JSON.parse(content) as Record<string, string | undefined>;

  const api = raw.apiBaseUrl;
  const web = raw.webBaseUrl;

  if (api !== undefined && web !== undefined) {
    // Already migrated, no need to do anything
    return;
  }

  if (raw.baseUrl) {
    // Legacy baseUrl is present, migrate to apiBaseUrl and webBaseUrl

    const apiBaseUrl = raw.baseUrl;
    let webBaseUrl;
    if (apiBaseUrl.endsWith(".getdx.com")) {
      // Migrate `cloud`
      webBaseUrl = "https://app.getdx.com";
      writeConfig({
        apiBaseUrl: normalizeUrl(apiBaseUrl),
        webBaseUrl: normalizeUrl(webBaseUrl),
      });
      return;
    }

    const dedicatedMatch = apiBaseUrl.match(/^api\.(.+)\.getdx\.io$/);
    if (dedicatedMatch) {
      // Migrate `dedicated`
      webBaseUrl = `https://${dedicatedMatch[1]}.getdx.io`;
      writeConfig({
        apiBaseUrl: normalizeUrl(apiBaseUrl),
        webBaseUrl: normalizeUrl(webBaseUrl),
      });
      return;
    }

    // Unable to automatically migrate `managed`
    throw new CliError(
      "Your on-disk DX CLI config is missing apiBaseUrl and webBaseUrl. Run `dx auth logout`, then login again via `dx init` or `dx auth login`.",
    );
  }
}

export function writeConfig(config: StoredConfig): void {
  fs.mkdirSync(getConfigDir(), { recursive: true });
  fs.writeFileSync(
    getConfigPath(),
    JSON.stringify(config, null, 2) + "\n",
    "utf8",
  );
}

export function persistBaseUrls(apiBaseUrl: string, webBaseUrl: string): void {
  writeConfig({
    ...readConfig(),
    apiBaseUrl: normalizeUrl(apiBaseUrl),
    webBaseUrl: normalizeUrl(webBaseUrl),
  });
}

/** Strips trailing slashes from an HTTP(S) base URL string. */
export function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    return path.join(xdg, "dx");
  }

  return path.join(os.homedir(), ".config", "dx");
}

// --- Resolving URLs at command runtime ------------------------------------------------------

/**
 * Resolved API base URL for HTTP requests.
 * Precedence: `DX_API_BASE_URL`, then persisted `apiBaseUrl`, then DX Cloud default.
 */
export function resolveApiBaseUrl(): string {
  if (process.env.DX_API_BASE_URL) {
    return normalizeUrl(process.env.DX_API_BASE_URL);
  }

  return normalizeUrl(readConfig().apiBaseUrl || DEFAULT_API_BASE_URL);
}

/**
 * Resolved web-app base URL for CLI deep links and browser OAuth.
 * Precedence: `DX_WEB_BASE_URL`, persisted `webBaseUrl`, then DX Cloud default.
 */
export function resolveWebBaseUrl(): string {
  if (process.env.DX_WEB_BASE_URL) {
    return normalizeUrl(process.env.DX_WEB_BASE_URL);
  }

  return normalizeUrl(readConfig().webBaseUrl || DEFAULT_WEB_BASE_URL);
}

// --- Deriving base URLs at login time -------------------------------------

/**
 * Derive the appropriate `apiBaseUrl` and `webBaseUrl` to persist into config,
 * considering the `DX_API_BASE_URL` and `DX_WEB_BASE_URL` env vars if they are present.
 *
 * If the env vars are not set, we assume the user is configuring for a `cloud` deployment.
 *
 * If they are set, we parse them to determine whether the deployment is `cloud`, `dedicated`, or `managed`.
 *
 * If we fail to derive the base URLs, a `CliError` is thrown.
 */
export function deriveBaseUrlsFromEnv(): {
  apiBaseUrl: string;
  webBaseUrl: string;
} {
  const apiBaseUrlFromEnv = process.env.DX_API_BASE_URL;
  const webBaseUrlFromEnv = process.env.DX_WEB_BASE_URL;

  if (apiBaseUrlFromEnv && !webBaseUrlFromEnv) {
    throw new CliError(
      "DX_WEB_BASE_URL must be set when DX_API_BASE_URL is set",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  const parsed: ParsedWebBaseUrl = webBaseUrlFromEnv
    ? parseWebBaseUrl(webBaseUrlFromEnv)
    : { type: "cloud" };

  switch (parsed.type) {
    case "cloud":
      return {
        apiBaseUrl: "https://api.getdx.com",
        webBaseUrl: "https://app.getdx.com",
      };
    case "dedicated": {
      const { accountName } = parsed;
      return {
        apiBaseUrl: `https://api.${accountName}.getdx.io`,
        webBaseUrl: `https://${accountName}.getdx.io`,
      };
    }
    case "managed": {
      const apiBaseUrl = process.env.DX_API_BASE_URL;
      if (!apiBaseUrl) {
        throw new CliError(
          "DX_API_BASE_URL must be specified when authenticating with a managed deployment",
        );
      }
      return {
        apiBaseUrl,
        webBaseUrl: parsed.webAppUrl,
      };
    }
    case "invalid":
      throw new CliError(
        `Could not recognize web base URL "${parsed.input}". Expected https://app.getdx.com, https://<account>.getdx.io, or a custom domain.`,
      );
  }
}

type ParsedWebBaseUrl =
  | { type: "cloud" }
  | { type: "dedicated"; accountName: string }
  | { type: "managed"; webAppUrl: string }
  | { type: "invalid"; input: string };

function parseWebBaseUrl(raw: string): ParsedWebBaseUrl {
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
      return { type: "managed", webAppUrl: url.origin };
    }
  } catch {
    // fall through to invalid
  }

  return { type: "invalid", input: raw };
}

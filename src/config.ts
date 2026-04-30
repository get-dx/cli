import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { CliError } from "./errors.js";
import type { StoredConfig } from "./types.js";

// --- Config file I/O ---------------------------------------------------------

function getConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) {
    return path.join(xdg, "dx");
  }

  return path.join(os.homedir(), ".config", "dx");
}

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
  if (api === undefined && web === undefined && Object.keys(raw).length > 0) {
    // Handling the breaking change from `baseUrl` to `apiBaseUrl` and `webBaseUrl`
    throw new CliError(
      "Your on-disk DX CLI config is missing apiBaseUrl and webBaseUrl. Run `dx auth logout`, then login again via `dx init` or `dx auth login`.",
    );
  }
  const stored: StoredConfig = {};
  if (web) {
    stored.webBaseUrl = web;
  }
  if (api) {
    stored.apiBaseUrl = api;
  }
  return stored;
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

// --- API URL resolution ------------------------------------------------------

const DEFAULT_API_BASE_URL = "https://api.getdx.com";

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

// --- Web-app URL (browser / deep links) -------------------------------------

/**
 * Infers the default web-app base URL from the API base URL only (no env or file).
 * DX Cloud and dedicated hosts map to their app; otherwise uses `new URL(apiBaseUrl).origin`.
 */
export function inferWebAppUrlFromApiBaseUrl(apiBaseUrl: string): string {
  const normalized = normalizeUrl(apiBaseUrl);
  const url = new URL(normalized);
  const host = url.hostname;

  if (host === "api.getdx.com") {
    return "https://app.getdx.com";
  }

  const dedicated = host.match(/^api\.(.+)\.getdx\.io$/);
  if (dedicated) {
    return `https://${dedicated[1]}.getdx.io`;
  }

  return url.origin;
}

export type ParsedWebBaseUrl =
  | { type: "cloud" }
  | { type: "dedicated"; accountName: string }
  | { type: "managed"; webAppUrl: string }
  | { type: "invalid" };

export function parseWebBaseUrl(raw: string): ParsedWebBaseUrl {
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

  return { type: "invalid" };
}

/**
 * True when the API host is DX Cloud (`api.getdx.com`) or a dedicated
 * `api.<account>.getdx.io` deployment. For those hosts the web app URL can be
 * inferred without `DX_WEB_BASE_URL`. Custom / managed API hosts return false.
 */
export function isDedicatedOrCloudApiHost(apiBaseUrl: string): boolean {
  const normalized = normalizeUrl(apiBaseUrl);
  const url = new URL(normalized);
  const host = url.hostname;

  if (host === "api.getdx.com") {
    return true;
  }

  return /^api\.(.+)\.getdx\.io$/.test(host);
}

/**
 * Resolved web-app base URL for CLI deep links and browser OAuth.
 * Precedence: `DX_WEB_BASE_URL`, persisted `webBaseUrl`, then `inferWebAppUrlFromApiBaseUrl(apiBaseUrl)`.
 */
export function resolveWebBaseUrl(apiBaseUrl: string): string {
  if (process.env.DX_WEB_BASE_URL) {
    return normalizeUrl(process.env.DX_WEB_BASE_URL);
  }

  const stored = readConfig().webBaseUrl;
  if (stored) {
    return normalizeUrl(stored);
  }

  return inferWebAppUrlFromApiBaseUrl(apiBaseUrl);
}

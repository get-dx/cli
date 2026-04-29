import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { StoredConfig } from "./types.js";

// --- Config file I/O ---------------------------------------------------------

type ParsedConfigFile = {
  apiBaseUrl?: unknown;
  /** @deprecated */
  baseUrl?: unknown;
  webBaseUrl?: unknown;
};

function pickConfigString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

export function getConfigDir(): string {
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
  const raw = JSON.parse(content) as ParsedConfigFile;
  const stored: StoredConfig = {};
  const web = pickConfigString(raw.webBaseUrl);
  if (web) {
    stored.webBaseUrl = web;
  }
  const api = pickConfigString(raw.apiBaseUrl) ?? pickConfigString(raw.baseUrl);
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
 * Precedence: `DX_BASE_URL`, then persisted `apiBaseUrl` (legacy on-disk `baseUrl` is read in `readConfig`), then DX Cloud default.
 */
export function resolveApiBaseUrl(): string {
  if (process.env.DX_BASE_URL) {
    return normalizeUrl(process.env.DX_BASE_URL);
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

/**
 * True when the API host is DX Cloud (`api.getdx.com`) or a dedicated
 * `api.<account>.getdx.io` deployment. For those hosts the web app URL can be
 * inferred without `DX_UI_BASE_URL`. Custom / managed API hosts return false.
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
 * Precedence: `DX_UI_BASE_URL`, persisted `webBaseUrl`, then `inferWebAppUrlFromApiBaseUrl(apiBaseUrl)`.
 */
export function resolveWebBaseUrl(apiBaseUrl: string): string {
  if (process.env.DX_UI_BASE_URL) {
    return normalizeUrl(process.env.DX_UI_BASE_URL);
  }

  const stored = readConfig().webBaseUrl;
  if (stored) {
    return normalizeUrl(stored);
  }

  return inferWebAppUrlFromApiBaseUrl(apiBaseUrl);
}

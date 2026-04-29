import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { StoredConfig } from "./types.js";

const DEFAULT_BASE_URL = "https://api.getdx.com";

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
  return JSON.parse(content) as StoredConfig;
}

export function writeConfig(config: StoredConfig): void {
  fs.mkdirSync(getConfigDir(), { recursive: true });
  fs.writeFileSync(
    getConfigPath(),
    JSON.stringify(config, null, 2) + "\n",
    "utf8",
  );
}

export function resolveBaseUrl(): string {
  if (process.env.DX_BASE_URL) {
    return normalizeBaseUrl(process.env.DX_BASE_URL);
  }

  return normalizeBaseUrl(readConfig().baseUrl || DEFAULT_BASE_URL);
}

/**
 * Web UI origin for browser OAuth (`/cli/auth`), inferred from the API base URL.
 * Dedicated and cloud hostnames map to their app origins; otherwise the API URL origin is used.
 */
export function resolveUiUrl(apiBaseUrl: string): string {
  const normalized = normalizeBaseUrl(apiBaseUrl);
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
 * `api.<account>.getdx.io` deployment. For those hosts the web app origin can be
 * derived without `DX_UI_BASE_URL`. Custom / managed API hosts return false.
 */
export function isDedicatedOrCloudApiHost(apiBaseUrl: string): boolean {
  const normalized = normalizeBaseUrl(apiBaseUrl);
  const url = new URL(normalized);
  const host = url.hostname;

  if (host === "api.getdx.com") {
    return true;
  }

  return /^api\.(.+)\.getdx\.io$/.test(host);
}

/**
 * Web app origin for CLI deep links and browser OAuth.
 * Precedence: DX_UI_BASE_URL, persisted config, then inference from the API base URL.
 */
export function resolveUiBaseUrl(apiBaseUrl: string): string {
  if (process.env.DX_UI_BASE_URL) {
    return normalizeBaseUrl(process.env.DX_UI_BASE_URL);
  }

  const stored = readConfig().uiBaseUrl;
  if (stored) {
    return normalizeBaseUrl(stored);
  }

  return resolveUiUrl(apiBaseUrl);
}

export function persistBaseUrls(apiBaseUrl: string, uiBaseUrl: string): void {
  writeConfig({
    ...readConfig(),
    baseUrl: normalizeBaseUrl(apiBaseUrl),
    uiBaseUrl: normalizeBaseUrl(uiBaseUrl),
  });
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

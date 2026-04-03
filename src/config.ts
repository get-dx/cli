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

export function persistBaseUrl(baseUrl: string): void {
  writeConfig({ ...readConfig(), baseUrl: normalizeBaseUrl(baseUrl) });
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

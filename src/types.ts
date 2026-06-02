import type { Logger } from "./logger.js";

export interface Runtime {
  apiBaseUrl: string;
  webBaseUrl: string;
  token: string;
  context: CliContext;
  version: string;
  logger: Logger;
}

export interface CliContext {
  json: boolean;
  agent?: string;
  agentSessionId?: string;
}

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface CurrentVersionCache {
  updatedAt: string;
  contents: { cli: string };
}

export type VersionPromptSelection =
  | { type: "SKIP"; skipVersion: string }
  | { type: "SNOOZE"; snoozeUntil: string };

export interface StoredConfig {
  apiBaseUrl?: string;
  webBaseUrl?: string;
  currentVersionCache?: CurrentVersionCache;
  versionPromptSelection?: VersionPromptSelection;
}

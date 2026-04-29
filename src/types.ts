import type { Logger } from "./logger.js";

export interface Runtime {
  baseUrl: string;
  /** Web app origin for deep links (distinct from API `baseUrl`). */
  uiBaseUrl: string;
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

export interface StoredConfig {
  baseUrl?: string;
  uiBaseUrl?: string;
}

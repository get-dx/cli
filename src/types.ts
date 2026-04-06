export interface Runtime {
  baseUrl: string;
  token: string;
  context: CliContext;
  version: string;
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
  token?: string;
  agent?: string;
  agentSessionId?: string;
  userAgent?: string;
}

export interface StoredConfig {
  baseUrl?: string;
}

import { redactUrlCredentials } from "./format.js";

/**
 * Why requests to the API do or don't go through a proxy. Part of the
 * `--json` output's public API.
 */
export type ProxyReason =
  /** Requests go through the proxy. */
  | "active"
  /** A proxy is configured, but Node's proxy support is not turned on. */
  | "not_enabled"
  /** This Node version cannot use proxy environment variables. */
  | "unsupported_node"
  /** No proxy URL applies to the API base URL's scheme. */
  | "no_proxy_variable"
  /** NO_PROXY excludes the API host, so requests go direct. */
  | "no_proxy_match";

export type ProxyStatus = {
  /** Whether requests to the API are routed through a proxy. */
  active: boolean;
  reason: ProxyReason;
  /** The variable whose proxy URL applies to API requests, e.g. `https_proxy`. */
  variable: string | null;
  /** That variable's value, with credentials redacted. */
  proxyUrl: string | null;
  nodeVersion: string;
  /** The API base URL's scheme, which decides which proxy variable applies. */
  protocol: "http:" | "https:";
  /** Whether this Node version supports proxy environment variables. */
  supported: boolean;
  /** How proxy support was turned on, if it was. */
  enabledBy: "NODE_USE_ENV_PROXY" | "--use-env-proxy" | null;
  /** The NO_PROXY variable that excluded the API host, if any. */
  noProxyVariable: string | null;
  /** Whether any proxy-related setting is present, i.e. worth reporting. */
  configured: boolean;
};

/** Every proxy variable doctor reports, in display order. */
export const PROXY_VARIABLES = ["HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY"];

/** Proxy variables Node never reads, even with proxy support turned on. */
export const IGNORED_PROXY_VARIABLES = ["ALL_PROXY"];

/** The minimum Node version mentioned in upgrade advice. */
export const RECOMMENDED_NODE_MAJOR = 24;

const DEFAULT_PORTS: Record<string, number> = { "http:": 80, "https:": 443 };

/**
 * Work out whether Node's `fetch` will send API requests through a proxy.
 *
 * Mirrors Node's built-in proxy support (undici's `EnvHttpProxyAgent`): it is
 * off unless `NODE_USE_ENV_PROXY=1` or `--use-env-proxy` is set, needs Node
 * 22.21+ or 24+, prefers lowercase variable names, and falls back to
 * HTTP_PROXY for HTTPS requests.
 */
export function detectProxy(options: {
  apiBaseUrl: string;
  env?: NodeJS.ProcessEnv;
  nodeVersion?: string;
  execArgv?: readonly string[];
}): ProxyStatus {
  const env = options.env ?? process.env;
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const execArgv = options.execArgv ?? process.execArgv;

  const url = parseUrl(options.apiBaseUrl);
  const protocol = url?.protocol === "http:" ? "http:" : "https:";
  const supported = supportsEnvProxy(nodeVersion);
  const enabledBy = useEnvProxyFlag(env.NODE_OPTIONS, execArgv)
    ? "--use-env-proxy"
    : env.NODE_USE_ENV_PROXY === "1"
      ? "NODE_USE_ENV_PROXY"
      : null;

  const proxy = proxyFor(protocol, env);
  const base = {
    variable: proxy?.name ?? null,
    proxyUrl: proxy ? redactUrlCredentials(proxy.value) : null,
    nodeVersion,
    protocol,
    supported,
    enabledBy,
    noProxyVariable: null,
    configured:
      enabledBy !== null ||
      env.NODE_USE_ENV_PROXY !== undefined ||
      [...PROXY_VARIABLES, ...IGNORED_PROXY_VARIABLES].some(
        (name) =>
          env[name] !== undefined || env[name.toLowerCase()] !== undefined,
      ),
  } satisfies Partial<ProxyStatus>;

  if (!proxy) {
    return { ...base, active: false, reason: "no_proxy_variable" };
  }
  if (!supported) {
    return { ...base, active: false, reason: "unsupported_node" };
  }
  if (!enabledBy) {
    return { ...base, active: false, reason: "not_enabled" };
  }

  const noProxy = firstDefined(env, ["no_proxy", "NO_PROXY"]);
  if (url && noProxy && bypassesProxy(url, noProxy.value)) {
    return {
      ...base,
      active: false,
      reason: "no_proxy_match",
      noProxyVariable: noProxy.name,
    };
  }

  return { ...base, active: true, reason: "active" };
}

/** Node 22.21+ and 24+ support `NODE_USE_ENV_PROXY`. Node 23 never did. */
export function supportsEnvProxy(nodeVersion: string): boolean {
  const [major = 0, minor = 0] = nodeVersion
    .replace(/^v/, "")
    .split(".")
    .map((part) => Number.parseInt(part, 10));
  return major >= 24 || (major === 22 && minor >= 21);
}

/**
 * Whether `--use-env-proxy` is on. It takes precedence over
 * NODE_USE_ENV_PROXY, and flags in NODE_OPTIONS don't appear in execArgv.
 */
function useEnvProxyFlag(
  nodeOptions: string | undefined,
  execArgv: readonly string[],
): boolean {
  let enabled = false;
  for (const arg of [...(nodeOptions ?? "").split(/\s+/), ...execArgv]) {
    if (arg === "--use-env-proxy") {
      enabled = true;
    } else if (arg === "--no-use-env-proxy") {
      enabled = false;
    }
  }
  return enabled;
}

/**
 * The proxy variable used for a request, in undici's order: lowercase before
 * uppercase, and HTTPS requests fall back to the HTTP proxy. An empty value
 * still shadows the other spelling, as in undici.
 */
function proxyFor(
  protocol: "http:" | "https:",
  env: NodeJS.ProcessEnv,
): { name: string; value: string } | null {
  const http = firstDefined(env, ["http_proxy", "HTTP_PROXY"]);
  if (protocol === "https:") {
    const https = firstDefined(env, ["https_proxy", "HTTPS_PROXY"]);
    if (https?.value) {
      return https;
    }
  }
  return http?.value ? http : null;
}

function firstDefined(
  env: NodeJS.ProcessEnv,
  names: string[],
): { name: string; value: string } | null {
  for (const name of names) {
    const value = env[name];
    if (value !== undefined) {
      return { name, value };
    }
  }
  return null;
}

/** NO_PROXY matching, as implemented by undici. */
function bypassesProxy(url: URL, noProxy: string): boolean {
  if (noProxy === "*") {
    return true;
  }
  const hostname = url.hostname.toLowerCase();
  const port =
    Number.parseInt(url.port, 10) || DEFAULT_PORTS[url.protocol] || 0;

  return noProxy
    .split(/[,\s]/)
    .filter(Boolean)
    .some((entry) => {
      const parsed = entry.match(/^(.+):(\d+)$/);
      const entryHost = (parsed ? parsed[1] : entry)
        .replace(/^\*?\./, "")
        .toLowerCase();
      const entryPort = parsed ? Number.parseInt(parsed[2], 10) : 0;
      if (entryPort && entryPort !== port) {
        return false;
      }
      return hostname === entryHost || hostname.endsWith(`.${entryHost}`);
    });
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

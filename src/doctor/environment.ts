import fs from "node:fs";

import { maskToken } from "../ui.js";
import { redactUrlCredentials, tildify } from "./format.js";
import {
  IGNORED_PROXY_VARIABLES,
  PROXY_VARIABLES,
  RECOMMENDED_NODE_MAJOR,
  type ProxyStatus,
} from "./proxy.js";
import { check, type Check, type Section } from "./types.js";

/** Variable names that likely hold credentials, so their values are masked. */
const SENSITIVE_NAME_PATTERN =
  /TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|API_?KEY|PRIVATE_?KEY|AUTH|COOKIE|SESSION_?KEY/i;

export function isSensitiveEnvName(name: string): boolean {
  return SENSITIVE_NAME_PATTERN.test(name);
}

export function checkEnvironment(options: {
  proxy: ProxyStatus;
  env?: NodeJS.ProcessEnv;
}): Section {
  const { proxy, env = process.env } = options;
  const checks: Check[] = [];
  const names = Object.keys(env).sort();

  for (const name of names.filter((name) => name.startsWith("DX_"))) {
    const raw = env[name] ?? "";
    const sensitive = isSensitiveEnvName(name);
    const value = sensitive ? (maskToken(raw) ?? "") : raw;
    checks.push(
      check(name.toLowerCase(), name, "ok", value, {
        data: { masked: sensitive },
      }),
    );
  }

  checks.push(...proxyChecks(env, proxy, names));

  const extraCaCerts = env.NODE_EXTRA_CA_CERTS;
  if (extraCaCerts) {
    const displayPath = tildify(extraCaCerts);
    const exists = fs.existsSync(extraCaCerts);
    checks.push(
      exists
        ? check(
            "node_extra_ca_certs",
            "NODE_EXTRA_CA_CERTS",
            "ok",
            `${displayPath} (file exists)`,
            { data: { path: displayPath, exists } },
          )
        : check(
            "node_extra_ca_certs",
            "NODE_EXTRA_CA_CERTS",
            "warn",
            `${displayPath} (file not found)`,
            {
              hint: "Node ignores this setting when the file does not exist. Point it at your CA bundle in PEM format.",
              data: { path: displayPath, exists },
            },
          ),
    );
  }

  const useSystemCa = env.NODE_USE_SYSTEM_CA;
  if (useSystemCa) {
    checks.push(
      check("node_use_system_ca", "NODE_USE_SYSTEM_CA", "ok", useSystemCa),
    );
  }

  const rejectUnauthorized = env.NODE_TLS_REJECT_UNAUTHORIZED;
  if (rejectUnauthorized !== undefined) {
    checks.push(
      rejectUnauthorized === "0"
        ? check(
            "node_tls_reject_unauthorized",
            "NODE_TLS_REJECT_UNAUTHORIZED",
            "warn",
            "0 (certificate verification disabled)",
            {
              hint: "This disables TLS certificate checks and is insecure. Use NODE_EXTRA_CA_CERTS to trust your corporate CA instead.",
            },
          )
        : check(
            "node_tls_reject_unauthorized",
            "NODE_TLS_REJECT_UNAUTHORIZED",
            "ok",
            rejectUnauthorized,
          ),
    );
  }

  const nodeOptions = env.NODE_OPTIONS;
  if (nodeOptions) {
    checks.push(check("node_options", "NODE_OPTIONS", "ok", nodeOptions));
  }

  if (checks.length === 0) {
    checks.push(check("none", "Variables", "ok", "(none set)"));
  }

  return { id: "environment", title: "Environment", checks };
}

const UPGRADE_NODE_HINT = `Upgrade to Node ${RECOMMENDED_NODE_MAJOR} or later, then set NODE_USE_ENV_PROXY=1.`;

/**
 * A summary of whether a proxy is used, then NODE_USE_ENV_PROXY, then each
 * proxy variable. Nothing is reported when no proxy setting is present.
 */
function proxyChecks(
  env: NodeJS.ProcessEnv,
  proxy: ProxyStatus,
  names: string[],
): Check[] {
  if (!proxy.configured) {
    return [];
  }
  const checks = [proxySummaryCheck(env, proxy), useEnvProxyCheck(env, proxy)];

  const variables = [...PROXY_VARIABLES, ...IGNORED_PROXY_VARIABLES];
  for (const variable of variables) {
    for (const name of names.filter(
      (name) => name.toUpperCase() === variable,
    )) {
      const value = redactUrlCredentials(env[name] ?? "");
      checks.push(
        IGNORED_PROXY_VARIABLES.includes(variable)
          ? check(name.toLowerCase(), name, "warn", value, {
              hint: "Node never reads this variable. Set HTTPS_PROXY instead.",
              data: { value },
            })
          : check(name.toLowerCase(), name, "ok", value, { data: { value } }),
      );
    }
  }
  return checks.filter((check): check is Check => check !== null);
}

function proxySummaryCheck(env: NodeJS.ProcessEnv, proxy: ProxyStatus): Check {
  const data = {
    active: proxy.active,
    reason: proxy.reason,
    variable: proxy.variable,
    proxyUrl: proxy.proxyUrl,
    nodeVersion: proxy.nodeVersion,
  };
  const summary = (status: "ok" | "warn", message: string, hint?: string) =>
    check("proxy", "Proxy", status, message, { hint, data });

  switch (proxy.reason) {
    case "active":
      return summary(
        "ok",
        `in use via ${proxy.variable} (${proxy.proxyUrl}), enabled by ${proxy.enabledBy}`,
      );
    case "no_proxy_match":
      return summary(
        "ok",
        `not used for the DX API: excluded by ${proxy.noProxyVariable}`,
      );
    case "no_proxy_variable":
      // Nothing to route through, so nothing is wrong: e.g. only NO_PROXY set.
      return summary(
        "ok",
        proxy.protocol === "http:"
          ? "not used: no HTTP_PROXY is set (HTTPS_PROXY only applies to https:// URLs)"
          : "not used: no HTTPS_PROXY or HTTP_PROXY is set",
      );
    case "unsupported_node":
      return summary(
        "warn",
        `not used: Node ${proxy.nodeVersion} does not support proxy environment variables`,
        `Requests go directly to the DX API. ${UPGRADE_NODE_HINT}`,
      );
    case "not_enabled":
      return summary(
        "warn",
        env.NODE_USE_ENV_PROXY === undefined
          ? "not used: NODE_USE_ENV_PROXY is not set"
          : `not used: NODE_USE_ENV_PROXY is "${env.NODE_USE_ENV_PROXY}", not 1`,
        "Requests go directly to the DX API. Set NODE_USE_ENV_PROXY=1 to send them through your proxy.",
      );
  }
}

function useEnvProxyCheck(
  env: NodeJS.ProcessEnv,
  proxy: ProxyStatus,
): Check | null {
  const value = env.NODE_USE_ENV_PROXY;
  const id = "node_use_env_proxy";
  const label = "NODE_USE_ENV_PROXY";

  if (value === undefined) {
    if (proxy.enabledBy === "--use-env-proxy") {
      return check(id, label, "ok", "(not set; --use-env-proxy is on)");
    }
    if (!proxy.variable) {
      return null;
    }
    return check(id, label, "warn", "(not set)", {
      hint: proxy.supported
        ? "Node ignores proxy variables unless this is set to 1."
        : UPGRADE_NODE_HINT,
    });
  }
  if (!proxy.supported) {
    return check(id, label, "warn", value, {
      hint: `Node ${proxy.nodeVersion} ignores this setting. ${UPGRADE_NODE_HINT}`,
    });
  }
  if (value !== "1" && proxy.enabledBy !== "--use-env-proxy") {
    return check(id, label, "warn", value, {
      hint: "Node only turns on proxy support when this is exactly 1.",
    });
  }
  return check(id, label, "ok", value);
}

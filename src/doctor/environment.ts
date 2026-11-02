import fs from "node:fs";

import { maskToken } from "../ui.js";
import { redactUrlCredentials, tildify } from "./format.js";
import { check, type Check, type Section } from "./types.js";

const PROXY_VARS = ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY"];

/** Variable names that likely hold credentials, so their values are masked. */
const SENSITIVE_NAME_PATTERN =
  /TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|API_?KEY|PRIVATE_?KEY|AUTH|COOKIE|SESSION_?KEY/i;

export function isSensitiveEnvName(name: string): boolean {
  return SENSITIVE_NAME_PATTERN.test(name);
}

export function checkEnvironment(env = process.env): Section {
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

  for (const name of names.filter((name) =>
    PROXY_VARS.includes(name.toUpperCase()),
  )) {
    const value = redactUrlCredentials(env[name] ?? "");
    checks.push(
      check(name.toLowerCase(), name, "warn", value, {
        hint: "dx-cli does not use proxy environment variables. Requests go directly to the DX API.",
        data: { value },
      }),
    );
  }

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

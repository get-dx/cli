import dayjs from "dayjs";

import {
  inspectConfigFile,
  parseWebBaseUrl,
  resolveApiBaseUrlWithSource,
  resolveWebBaseUrlWithSource,
} from "../config.js";
import { getTokenWithSource } from "../secrets.js";
import { maskToken } from "../ui.js";
import { formatBytes, tildify } from "./format.js";
import { check, type Check, type Section } from "./types.js";

export type ConfigFacts = {
  apiBaseUrl: string;
  webBaseUrl: string;
  token: string | null;
};

export async function checkConfig(): Promise<{
  section: Section;
  facts: ConfigFacts;
}> {
  const checks: Check[] = [];

  checks.push(configFileCheck());

  const api = resolveApiBaseUrlWithSource();
  const web = resolveWebBaseUrlWithSource();
  checks.push(
    check("api_base_url", "API base URL", "ok", api.url, {
      source: api.source,
      data: { url: api.url },
    }),
    check("web_base_url", "Web base URL", "ok", web.url, {
      source: web.source,
      data: { url: web.url },
    }),
  );

  if (process.env.DX_API_BASE_URL && !process.env.DX_WEB_BASE_URL) {
    checks.push(
      check(
        "base_url_env",
        "Base URL env vars",
        "fail",
        "DX_API_BASE_URL is set but DX_WEB_BASE_URL is not",
        {
          hint: "Set DX_WEB_BASE_URL to your DX web app URL (e.g. https://acme.getdx.io) or unset DX_API_BASE_URL.",
        },
      ),
    );
  }

  checks.push(deploymentCheck(web.url));

  const { check: tokenCheck, token } = await tokenCheckFor(api.url);
  checks.push(tokenCheck);

  return {
    section: { id: "config", title: "Config", checks },
    facts: { apiBaseUrl: api.url, webBaseUrl: web.url, token },
  };
}

function configFileCheck(): Check {
  const inspection = inspectConfigFile();
  const displayPath = tildify(inspection.path);

  switch (inspection.status) {
    case "missing":
      if (process.env.DX_API_TOKEN) {
        return check(
          "config_file",
          "Config file",
          "ok",
          `${displayPath} not present (using env/defaults)`,
          { data: { path: displayPath, exists: false } },
        );
      }
      return check(
        "config_file",
        "Config file",
        "warn",
        `${displayPath} not present`,
        {
          hint: "This usually means `dx auth login` has never completed. Run `dx auth login`.",
          data: { path: displayPath, exists: false },
        },
      );
    case "invalid":
      return check(
        "config_file",
        "Config file",
        "fail",
        `${displayPath} could not be read (${inspection.error})`,
        {
          hint: "The file is ignored while it is invalid. Fix or delete it, then run `dx auth login`.",
          data: { path: displayPath, exists: true, error: inspection.error },
        },
      );
    case "ok": {
      const modifiedAt = dayjs(inspection.modifiedAt).format();
      return check(
        "config_file",
        "Config file",
        "ok",
        `${displayPath} (${formatBytes(inspection.sizeBytes)}, modified ${modifiedAt})`,
        {
          data: {
            path: displayPath,
            exists: true,
            size_bytes: inspection.sizeBytes,
            modified_at: modifiedAt,
          },
        },
      );
    }
  }
}

function deploymentCheck(webBaseUrl: string): Check {
  // `parseWebBaseUrl` only recognizes the bare "app.getdx.com" as cloud, not
  // the full URL that `resolveWebBaseUrl` returns.
  const parsed = isCloudWebBaseUrl(webBaseUrl)
    ? ({ type: "cloud" } as const)
    : parseWebBaseUrl(webBaseUrl);
  switch (parsed.type) {
    case "cloud":
      return check("deployment", "Deployment", "ok", "cloud", {
        data: { type: "cloud" },
      });
    case "dedicated":
      return check(
        "deployment",
        "Deployment",
        "ok",
        `dedicated (${parsed.accountName})`,
        { data: { type: "dedicated", account: parsed.accountName } },
      );
    case "managed":
      return check(
        "deployment",
        "Deployment",
        "ok",
        "managed (custom domain)",
        {
          data: { type: "managed" },
        },
      );
    case "invalid":
      return check(
        "deployment",
        "Deployment",
        "fail",
        `could not recognize web base URL "${parsed.input}"`,
        {
          hint: "Expected https://app.getdx.com, https://<account>.getdx.io, or a custom domain.",
          data: { type: "invalid" },
        },
      );
  }
}

function isCloudWebBaseUrl(webBaseUrl: string): boolean {
  try {
    return new URL(webBaseUrl).hostname === "app.getdx.com";
  } catch {
    return false;
  }
}

async function tokenCheckFor(
  apiBaseUrl: string,
): Promise<{ check: Check; token: string | null }> {
  const lookup = await getTokenWithSource(apiBaseUrl);

  switch (lookup.source) {
    case "env":
    case "keychain": {
      const masked = maskToken(lookup.token);
      return {
        token: lookup.token,
        check: check("token", "Token", "ok", masked ?? "", {
          source: lookup.source,
          data: { source: lookup.source, masked_token: masked },
        }),
      };
    }
    case "none":
      return {
        token: null,
        check: check(
          "token",
          "Token",
          "fail",
          `no token found (checked DX_API_TOKEN and ${lookup.storeName})`,
          {
            hint: "Run `dx auth login`, or set DX_API_TOKEN.",
            data: { source: null },
          },
        ),
      };
    case "error":
      return {
        token: null,
        check: check(
          "token",
          "Token",
          "fail",
          `could not read ${lookup.storeName ?? "the OS secret store"}: ${lookup.error}`,
          {
            hint: tokenStoreHint(),
            data: { source: null, error: lookup.error },
          },
        ),
      };
  }
}

function tokenStoreHint(): string {
  if (process.platform === "linux") {
    return "Install `libsecret-tools` and make sure a Secret Service provider (e.g. GNOME Keyring) is running, or set DX_API_TOKEN instead.";
  }
  return "Set DX_API_TOKEN in the environment instead of storing the token in the OS secret store.";
}

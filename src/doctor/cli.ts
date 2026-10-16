import fs from "node:fs";
import path from "node:path";

import dayjs from "dayjs";

import type { Runtime } from "../types.js";
import {
  compareVersions,
  fetchLatestVersion,
  fetchLatestVersionFromNpm,
} from "../versionCheck.js";
import { describeError, tildify } from "./format.js";
import { CHECK_TIMEOUT_MS, DOCTOR_HEADER } from "./probes.js";
import { check, type Check, type Section } from "./types.js";

import cliPackage from "../../package.json" with { type: "json" };

export type InstallMethod = "npx" | "dev" | "pnpm" | "npm" | "unknown";

export type InstallInfo = {
  method: InstallMethod;
  /** Package directory, or the entry script if that can't be determined. */
  path: string;
};

export type LatestVersionLookup = {
  /** Called only when there is a token and the API is reachable. */
  fromApi: (runtime: Runtime) => Promise<string>;
  fromNpm: () => Promise<string>;
};

export const defaultLatestVersionLookup: LatestVersionLookup = {
  fromApi: (runtime) =>
    fetchLatestVersion(runtime, {
      headers: DOCTOR_HEADER,
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    }),
  fromNpm: () =>
    fetchLatestVersionFromNpm({
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
    }),
};

export async function checkCli(options: {
  runtime: Runtime | null;
  apiReachable: boolean;
  install: InstallInfo;
  latestVersion: LatestVersionLookup;
  now: Date;
}): Promise<Section> {
  const { runtime, apiReachable, install, latestVersion, now } = options;
  const checks: Check[] = [
    await versionCheck(
      apiReachable ? runtime : null,
      install.method,
      latestVersion,
    ),
    nodeCheck(),
    check("platform", "Platform", "ok", `${process.platform}/${process.arch}`, {
      data: { platform: process.platform, arch: process.arch },
    }),
    check(
      "install",
      "Install",
      "ok",
      `${installMethodName(install.method)} (${tildify(install.path)})`,
      { data: { method: install.method, path: tildify(install.path) } },
    ),
    check("time", "Time", "ok", dayjs(now).format(), {
      data: { time: dayjs(now).format() },
    }),
  ];

  return { id: "cli", title: "CLI", checks };
}

async function versionCheck(
  runtime: Runtime | null,
  method: InstallMethod,
  lookup: LatestVersionLookup,
): Promise<Check> {
  const current = cliPackage.version;
  const failures: string[] = [];

  let latest: string | null = null;
  let latestSource: "api" | "npm" | null = null;

  if (runtime) {
    try {
      latest = await lookup.fromApi(runtime);
      latestSource = "api";
    } catch (error) {
      failures.push(`DX API: ${describeError(error, "request")}`);
    }
  } else {
    failures.push("DX API: skipped (no token or API unreachable)");
  }

  if (!latest) {
    try {
      latest = await lookup.fromNpm();
      latestSource = "npm";
    } catch (error) {
      failures.push(`npm: ${describeError(error, "request")}`);
    }
  }

  if (!latest) {
    return check(
      "version",
      "Version",
      "fail",
      `${current} (could not determine the latest version)`,
      {
        hint: `Tried the DX API and the npm registry:\n${failures.join("\n")}`,
        data: { current, latest: null, latest_source: null },
      },
    );
  }

  const data = { current, latest, latest_source: latestSource };
  const comparison = compareVersions(current, latest);
  if (comparison < 0) {
    return check(
      "version",
      "Version",
      "warn",
      `${current} (latest is ${latest})`,
      {
        hint: `Upgrade with: ${upgradeCommand(method)}`,
        data,
      },
    );
  }

  const message =
    comparison === 0
      ? `${current} (up to date)`
      : `${current} (newer than the latest release, ${latest})`;
  return check("version", "Version", "ok", message, { data });
}

function nodeCheck(): Check {
  const version = process.version;
  const supportedMajors = [
    ...cliPackage.engines.node.matchAll(/\^(\d+)\./g),
  ].map((match) => Number(match[1]));
  const major = Number(process.versions.node.split(".")[0]);
  const data = { version, supported: cliPackage.engines.node };

  if (supportedMajors.length > 0 && !supportedMajors.includes(major)) {
    return check("node", "Node.js", "warn", `${version} (unsupported)`, {
      hint: `dx-cli supports Node.js ${cliPackage.engines.node}. Other versions may not work correctly.`,
      data,
    });
  }

  return check("node", "Node.js", "ok", version, { data });
}

export function upgradeCommand(method: InstallMethod): string {
  switch (method) {
    case "npx":
      return "npx @get-dx/cli@latest";
    case "dev":
      return "pull the latest changes and run `make`";
    case "pnpm":
      return "pnpm add -g @get-dx/cli@latest";
    case "npm":
    case "unknown":
      return "npm install -g @get-dx/cli@latest";
  }
}

function installMethodName(method: InstallMethod): string {
  switch (method) {
    case "npx":
      return "npx";
    case "dev":
      return "pnpm link (dev)";
    case "pnpm":
      return "pnpm global";
    case "npm":
      return "npm global";
    case "unknown":
      return "unknown";
  }
}

/**
 * Work out how the CLI was installed from where its entry script lives.
 */
export function detectInstall(
  entryScript = process.argv[1],
  execPath = process.execPath,
): InstallInfo {
  let resolved = entryScript;
  try {
    resolved = fs.realpathSync(entryScript);
  } catch {
    // Fall back to the unresolved path.
  }

  // `dist/index.js` lives one level below the package root.
  const packageRoot = path.dirname(path.dirname(resolved));
  const normalized = resolved.split(path.sep).join("/");

  if (normalized.includes("/_npx/")) {
    return { method: "npx", path: packageRoot };
  }

  if (!normalized.includes("/node_modules/")) {
    if (fs.existsSync(path.join(packageRoot, ".git"))) {
      return { method: "dev", path: packageRoot };
    }
    return { method: "unknown", path: resolved };
  }

  if (normalized.includes("/pnpm/global/") || normalized.includes("/.pnpm/")) {
    return { method: "pnpm", path: packageRoot };
  }

  const npmGlobalRoot =
    process.platform === "win32"
      ? path.join(path.dirname(execPath), "node_modules")
      : path.join(path.dirname(path.dirname(execPath)), "lib", "node_modules");
  if (
    resolved.startsWith(npmGlobalRoot + path.sep) ||
    normalized.includes("/lib/node_modules/@get-dx/cli/")
  ) {
    return { method: "npm", path: packageRoot };
  }

  return { method: "unknown", path: packageRoot };
}

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { writeConfig, getConfigPath } from "../config.js";
import type { TokenLookup } from "../secrets.js";
import { detectInstall, type LatestVersionLookup } from "./cli.js";
import { runDoctor, type DoctorDependencies } from "./index.js";
import type { Check, DoctorReport } from "./types.js";

import cliPackage from "../../package.json" with { type: "json" };

const { getTokenWithSource } = vi.hoisted(() => ({
  getTokenWithSource: vi.fn<(baseUrl: string) => Promise<TokenLookup>>(),
}));

vi.mock("../secrets.js", () => ({ getTokenWithSource }));

vi.mock("../skill.js", () => ({
  isSkillInstalled: vi.fn().mockResolvedValue(false),
}));

const TOKEN = "dxp_abcdefghijklmnop1234";
const originalEnv = { ...process.env };
let configHome: string;

beforeEach(() => {
  process.env = { ...originalEnv };
  for (const name of Object.keys(process.env)) {
    if (
      (name.startsWith("DX_") && name !== "DX_DISABLE_VERSION_CHECK") ||
      name.toUpperCase().endsWith("_PROXY") ||
      name.startsWith("NODE_")
    ) {
      delete process.env[name];
    }
  }
  configHome = fs.mkdtempSync(path.join(os.tmpdir(), "dx-doctor-test-"));
  process.env.XDG_CONFIG_HOME = configHome;
  writeConfig({
    apiBaseUrl: "https://api.getdx.com",
    webBaseUrl: "https://app.getdx.com",
  });

  getTokenWithSource.mockReset();
  getTokenWithSource.mockResolvedValue({
    source: "keychain",
    token: TOKEN,
    storeName: "macOS Keychain",
  });
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  fs.rmSync(configHome, { recursive: true, force: true });
});

describe("runDoctor", () => {
  it("reports every section in reading order when everything is healthy", async () => {
    delete process.env.DX_DISABLE_VERSION_CHECK;

    const report = await doctor();

    expect(report.ok).toBe(true);
    expect(report.summary).toMatchObject({ fail: 0, warn: 0, skip: 0 });
    expect(report.sections.map((section) => section.id)).toEqual([
      "cli",
      "environment",
      "config",
      "skill",
    ]);
    expect(find(report, "environment", "none").message).toBe("(none set)");
  });

  it("never includes the raw token in the report", async () => {
    process.env.DX_API_TOKEN = TOKEN;
    getTokenWithSource.mockResolvedValue({ source: "env", token: TOKEN });

    const report = await doctor();

    expect(JSON.stringify(report)).not.toContain(TOKEN);
    expect(find(report, "config", "token")).toMatchObject({
      status: "ok",
      source: "env",
    });
  });

  describe("config", () => {
    it("fails when no token is found", async () => {
      getTokenWithSource.mockResolvedValue({
        source: "none",
        storeName: "macOS Keychain",
      });

      const report = await doctor();

      expect(find(report, "config", "token")).toMatchObject({
        status: "fail",
        message: "no token found (checked DX_API_TOKEN and macOS Keychain)",
      });
    });

    it("reports keychain errors separately from a missing token", async () => {
      getTokenWithSource.mockResolvedValue({
        source: "error",
        storeName: "Linux Secret Service (secret-tool)",
        error: "`secret-tool` is not installed",
      });

      const report = await doctor();

      expect(find(report, "config", "token").message).toBe(
        "could not read Linux Secret Service (secret-tool): `secret-tool` is not installed",
      );
    });

    it("warns when the config file is missing and no env token is set", async () => {
      fs.rmSync(getConfigPath());

      const report = await doctor();

      const configFile = find(report, "config", "config_file");
      expect(configFile.status).toBe("warn");
      expect(configFile.hint).toContain("dx auth login");
      expect(find(report, "config", "api_base_url").source).toBe("default");
    });

    it("is fine with a missing config file when DX_API_TOKEN is set", async () => {
      fs.rmSync(getConfigPath());
      process.env.DX_API_TOKEN = TOKEN;

      const report = await doctor();

      expect(find(report, "config", "config_file").status).toBe("ok");
    });

    it("fails on an invalid config file", async () => {
      fs.writeFileSync(getConfigPath(), "{ truncated");

      const report = await doctor();

      expect(find(report, "config", "config_file").status).toBe("fail");
    });

    it("fails when DX_API_BASE_URL is set without DX_WEB_BASE_URL", async () => {
      process.env.DX_API_BASE_URL = "https://api.acme.getdx.io";

      const report = await doctor();

      expect(find(report, "config", "base_url_env").status).toBe("fail");
      expect(find(report, "config", "api_base_url").source).toBe("env");
    });

    it("recognizes cloud and dedicated deployments", async () => {
      expect(find(await doctor(), "config", "deployment").message).toBe(
        "cloud",
      );

      process.env.DX_WEB_BASE_URL = "https://acme.getdx.io";
      expect(find(await doctor(), "config", "deployment").message).toBe(
        "dedicated (acme)",
      );
    });
  });

  describe("environment", () => {
    it("warns about proxy variables and redacts their credentials", async () => {
      process.env.HTTPS_PROXY = "http://alice:hunter2@proxy.corp:8080";

      const report = await doctor();

      const proxy = find(report, "environment", "https_proxy");
      expect(proxy).toMatchObject({
        status: "warn",
        message: "http://***@proxy.corp:8080",
      });
      expect(JSON.stringify(report)).not.toContain("hunter2");
    });

    it("masks DX_* variables whose names look like credentials", async () => {
      process.env.DX_WEB_API_TOKEN = "web-api-token-1234567890";
      process.env.DX_CLIENT_SECRET = "client-secret-abcdefghij";
      process.env.DX_LOG_LEVEL = "debug";

      const report = await doctor();

      expect(JSON.stringify(report)).not.toContain("web-api-token-1234567890");
      expect(JSON.stringify(report)).not.toContain("client-secret-abcdefghij");
      expect(find(report, "environment", "dx_web_api_token")).toMatchObject({
        message: "web-****************7890",
        data: { masked: true },
      });
      expect(find(report, "environment", "dx_log_level")).toMatchObject({
        message: "debug",
        data: { masked: false },
      });
    });

    it("warns when TLS verification is disabled", async () => {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

      const report = await doctor();

      expect(
        find(report, "environment", "node_tls_reject_unauthorized").status,
      ).toBe("warn");
    });

    it("warns when NODE_EXTRA_CA_CERTS points at a missing file", async () => {
      process.env.NODE_EXTRA_CA_CERTS = path.join(configHome, "missing.pem");

      const report = await doctor();

      expect(find(report, "environment", "node_extra_ca_certs").status).toBe(
        "warn",
      );
    });
  });

  describe("version", () => {
    it("warns with an upgrade command when behind", async () => {
      const report = await doctor({
        latestVersion: lookupReturning("99.0.0"),
      });

      const version = find(report, "cli", "version");
      expect(version.status).toBe("warn");
      expect(version.hint).toBe(
        "Upgrade with: npm install -g @get-dx/cli@latest",
      );
    });

    it("falls back to npm when there is no token", async () => {
      getTokenWithSource.mockResolvedValue({
        source: "none",
        storeName: "macOS Keychain",
      });
      const latestVersion = lookupReturning(cliPackage.version);

      const report = await doctor({ latestVersion });

      expect(latestVersion.fromApi).not.toHaveBeenCalled();
      expect(find(report, "cli", "version").data).toMatchObject({
        latest_source: "npm",
      });
    });

    it("falls back to npm when the API lookup fails", async () => {
      const latestVersion: LatestVersionLookup = {
        fromApi: vi.fn().mockRejectedValue(new Error("boom")),
        fromNpm: vi.fn().mockResolvedValue(cliPackage.version),
      };

      const report = await doctor({ latestVersion });

      expect(find(report, "cli", "version")).toMatchObject({
        status: "ok",
        data: { latest_source: "npm" },
      });
    });

    it("fails when neither the API nor npm returns a version", async () => {
      const latestVersion: LatestVersionLookup = {
        fromApi: vi.fn().mockRejectedValue(new Error("api down")),
        fromNpm: vi.fn().mockRejectedValue(new Error("npm blocked")),
      };

      const report = await doctor({ latestVersion });

      const version = find(report, "cli", "version");
      expect(version.status).toBe("fail");
      expect(version.hint).toContain("DX API: api down");
      expect(version.hint).toContain("npm: npm blocked");
      expect(report.ok).toBe(false);
    });
  });
});

describe("detectInstall", () => {
  it("detects npx", () => {
    expect(
      detectInstall(
        "/Users/me/.npm/_npx/abc123/node_modules/@get-dx/cli/dist/index.js",
        "/usr/local/bin/node",
      ).method,
    ).toBe("npx");
  });

  it("detects an npm global install", () => {
    expect(
      detectInstall(
        "/usr/local/lib/node_modules/@get-dx/cli/dist/index.js",
        "/usr/local/bin/node",
      ),
    ).toEqual({
      method: "npm",
      path: "/usr/local/lib/node_modules/@get-dx/cli",
    });
  });

  it("detects a pnpm global install", () => {
    expect(
      detectInstall(
        "/Users/me/Library/pnpm/global/5/.pnpm/@get-dx+cli@0.7.0/node_modules/@get-dx/cli/dist/index.js",
        "/usr/local/bin/node",
      ).method,
    ).toBe("pnpm");
  });

  it("detects a linked git checkout", () => {
    const checkout = fs.mkdtempSync(path.join(os.tmpdir(), "dx-checkout-"));
    fs.mkdirSync(path.join(checkout, ".git"));
    fs.mkdirSync(path.join(checkout, "dist"));
    fs.writeFileSync(path.join(checkout, "dist", "index.js"), "");

    const install = detectInstall(
      path.join(checkout, "dist", "index.js"),
      "/usr/local/bin/node",
    );

    expect(install.method).toBe("dev");
    fs.rmSync(checkout, { recursive: true, force: true });
  });

  it("falls back to unknown", () => {
    expect(
      detectInstall(
        "/opt/tools/node_modules/@get-dx/cli/dist/index.js",
        "/usr/local/bin/node",
      ).method,
    ).toBe("unknown");
  });
});

// --- Helpers ---------------------------------------------------------------

function doctor(
  dependencies: Partial<DoctorDependencies> = {},
): Promise<DoctorReport> {
  return runDoctor(
    { json: true },
    {
      dependencies: {
        latestVersion: lookupReturning(cliPackage.version),
        install: () => ({
          method: "npm",
          path: "/usr/local/lib/node_modules/@get-dx/cli",
        }),
        now: () => new Date("2026-10-14T12:00:00Z"),
        ...dependencies,
      },
    },
  );
}

function find(report: DoctorReport, sectionId: string, checkId: string): Check {
  const section = report.sections.find((section) => section.id === sectionId);
  const found = section?.checks.find((check) => check.id === checkId);
  if (!found) {
    throw new Error(`No check ${sectionId}.${checkId}`);
  }
  return found;
}

function lookupReturning(version: string): LatestVersionLookup {
  return {
    fromApi: vi.fn().mockResolvedValue(version),
    fromNpm: vi.fn().mockResolvedValue(version),
  };
}

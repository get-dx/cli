import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  deriveBaseUrlsFromEnv,
  getConfigPath,
  inspectConfigFile,
  readConfig,
  resolveApiBaseUrlWithSource,
  resolveWebBaseUrl,
  resolveWebBaseUrlWithSource,
  writeConfig,
} from "./config.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-resolve-web-base-url";
  writeConfig({});
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("deriveBaseUrlsFromEnv", () => {
  const cloudBaseUrls = {
    apiBaseUrl: "https://api.getdx.com",
    webBaseUrl: "https://app.getdx.com",
  };

  it("defaults to cloud when DX_WEB_BASE_URL is unset", () => {
    delete process.env.DX_WEB_BASE_URL;
    delete process.env.DX_API_BASE_URL;

    expect(deriveBaseUrlsFromEnv()).toEqual(cloudBaseUrls);
  });

  it.each([
    "app.getdx.com",
    "app.getdx.com/",
    "https://app.getdx.com",
    "https://app.getdx.com/",
    "http://app.getdx.com",
  ])("treats DX_WEB_BASE_URL=%s as cloud", (webBaseUrl) => {
    process.env.DX_WEB_BASE_URL = webBaseUrl;
    delete process.env.DX_API_BASE_URL;

    expect(deriveBaseUrlsFromEnv()).toEqual(cloudBaseUrls);
  });

  it("derives dedicated base URLs from a getdx.io host", () => {
    process.env.DX_WEB_BASE_URL = "https://acme.getdx.io/";
    delete process.env.DX_API_BASE_URL;

    expect(deriveBaseUrlsFromEnv()).toEqual({
      apiBaseUrl: "https://api.acme.getdx.io",
      webBaseUrl: "https://acme.getdx.io",
    });
  });

  it("requires DX_API_BASE_URL for a managed deployment", () => {
    process.env.DX_WEB_BASE_URL = "https://dx.example.com";
    delete process.env.DX_API_BASE_URL;

    expect(() => deriveBaseUrlsFromEnv()).toThrow(
      "DX_API_BASE_URL must be specified when authenticating with a managed deployment",
    );
  });
});

describe("resolveWebBaseUrl", () => {
  it("prefers DX_WEB_BASE_URL over persisted config and inference", () => {
    process.env.DX_WEB_BASE_URL = "https://custom.example.com/";
    writeConfig({ webBaseUrl: "https://wrong.example.com" });

    expect(resolveWebBaseUrl()).toBe("https://custom.example.com");
  });

  it("uses persisted webBaseUrl when DX_WEB_BASE_URL is unset", () => {
    writeConfig({ webBaseUrl: "https://stored.example.com" });

    expect(resolveWebBaseUrl()).toBe("https://stored.example.com");
  });
});

describe("writeConfig", () => {
  it("writes valid JSON and leaves no temp files behind", () => {
    writeConfig({ apiBaseUrl: "https://example.com" });

    const configDir = path.dirname(getConfigPath());
    const entries = fs.readdirSync(configDir);

    expect(entries).toEqual(["config.json"]);
    expect(readConfig().apiBaseUrl).toBe("https://example.com");
  });
});

describe("readConfig", () => {
  it("returns {} for an empty config object on disk", () => {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({}));

    expect(readConfig()).toEqual({});
  });

  it("returns {} instead of throwing when the config file is empty or truncated", () => {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, "");

    expect(readConfig()).toEqual({});
  });

  it("returns {} instead of throwing when the config file contains invalid JSON", () => {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, '{"apiBaseUrl": "https://exampl');

    expect(readConfig()).toEqual({});
  });

  it("prefers apiBaseUrl when both apiBaseUrl and legacy baseUrl are present", () => {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        apiBaseUrl: "https://new.example.com",
        webBaseUrl: "https://app.example.com",
        baseUrl: "https://old.example.com",
      }),
    );

    const stored = readConfig();
    expect(stored.apiBaseUrl).toBe("https://new.example.com");
    expect(stored.webBaseUrl).toBe("https://app.example.com");
  });
});

describe("resolve*BaseUrlWithSource", () => {
  it("reports env as the source when the env var is set", () => {
    process.env.DX_API_BASE_URL = "https://api.acme.getdx.io/";
    writeConfig({ apiBaseUrl: "https://stored.example.com" });

    expect(resolveApiBaseUrlWithSource()).toEqual({
      url: "https://api.acme.getdx.io",
      source: "env",
    });
  });

  it("reports config as the source when stored in the config file", () => {
    delete process.env.DX_WEB_BASE_URL;
    writeConfig({ webBaseUrl: "https://acme.getdx.io" });

    expect(resolveWebBaseUrlWithSource()).toEqual({
      url: "https://acme.getdx.io",
      source: "config",
    });
  });

  it("reports default when nothing is configured", () => {
    delete process.env.DX_API_BASE_URL;

    expect(resolveApiBaseUrlWithSource()).toEqual({
      url: "https://api.getdx.com",
      source: "default",
    });
  });
});

describe("inspectConfigFile", () => {
  it("reports a missing config file", () => {
    fs.rmSync(getConfigPath());

    expect(inspectConfigFile()).toEqual({
      status: "missing",
      path: getConfigPath(),
    });
  });

  it("reports invalid JSON instead of hiding it", () => {
    fs.writeFileSync(getConfigPath(), "{ not json");

    const inspection = inspectConfigFile();

    expect(inspection.status).toBe("invalid");
    expect(readConfig()).toEqual({});
  });

  it("reports non-object JSON as invalid", () => {
    fs.writeFileSync(getConfigPath(), "[]");

    expect(inspectConfigFile()).toMatchObject({
      status: "invalid",
      error: "expected a JSON object",
    });
  });

  it("reports the parsed config, size, and modification time", () => {
    writeConfig({ apiBaseUrl: "https://example.com" });

    const inspection = inspectConfigFile();

    expect(inspection).toMatchObject({
      status: "ok",
      config: { apiBaseUrl: "https://example.com" },
    });
    if (inspection.status === "ok") {
      expect(inspection.sizeBytes).toBeGreaterThan(0);
      expect(inspection.modifiedAt).toBeInstanceOf(Date);
    }
  });
});

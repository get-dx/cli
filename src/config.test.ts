import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CliError } from "./errors.js";
import {
  getConfigPath,
  readConfig,
  resolveApiBaseUrl,
  inferWebAppUrlFromApiBaseUrl,
  resolveWebBaseUrl,
  writeConfig,
  isDedicatedOrCloudApiHost,
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

describe("inferWebAppUrlFromApiBaseUrl", () => {
  it("maps DX cloud API host to app.getdx.com", () => {
    expect(inferWebAppUrlFromApiBaseUrl("https://api.getdx.com")).toBe(
      "https://app.getdx.com",
    );
    expect(inferWebAppUrlFromApiBaseUrl("https://api.getdx.com/")).toBe(
      "https://app.getdx.com",
    );
  });

  it("maps dedicated API host to the matching app URL", () => {
    expect(inferWebAppUrlFromApiBaseUrl("https://api.acme.getdx.io")).toBe(
      "https://acme.getdx.io",
    );
  });

  it("falls back to the API URL's origin for other hosts", () => {
    expect(inferWebAppUrlFromApiBaseUrl("https://api.example.com/v1/")).toBe(
      "https://api.example.com",
    );
  });
});

describe("resolveWebBaseUrl", () => {
  it("prefers DX_WEB_BASE_URL over persisted config and inference", () => {
    process.env.DX_WEB_BASE_URL = "https://custom.example.com/";
    writeConfig({ webBaseUrl: "https://wrong.example.com" });

    expect(resolveWebBaseUrl("https://api.getdx.com")).toBe(
      "https://custom.example.com",
    );
  });

  it("uses persisted webBaseUrl when DX_WEB_BASE_URL is unset", () => {
    writeConfig({ webBaseUrl: "https://stored.example.com" });

    expect(resolveWebBaseUrl("https://api.getdx.com")).toBe(
      "https://stored.example.com",
    );
  });

  it("falls back to inferWebAppUrlFromApiBaseUrl when nothing else is set", () => {
    expect(resolveWebBaseUrl("https://api.getdx.com")).toBe(
      "https://app.getdx.com",
    );
  });
});

describe("readConfig", () => {
  it("returns {} for an empty config object on disk", () => {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({}));

    expect(readConfig()).toEqual({});
  });

  it("throws when only legacy baseUrl is on disk", () => {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ baseUrl: "https://legacy.example.com" }),
    );

    expect(() => readConfig()).toThrow(CliError);
    expect(() => readConfig()).toThrow(/dx auth logout/);
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

  it("throws from resolveApiBaseUrl when only legacy baseUrl is on disk and env is unset", () => {
    delete process.env.DX_API_BASE_URL;
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(
      configPath,
      JSON.stringify({ baseUrl: "https://from-legacy-file.example.com" }),
    );

    expect(() => resolveApiBaseUrl()).toThrow(CliError);
  });
});

describe("isDedicatedOrCloudApiHost", () => {
  it("is true for DX Cloud API host", () => {
    expect(isDedicatedOrCloudApiHost("https://api.getdx.com")).toBe(true);
  });

  it("is true for dedicated api.<account>.getdx.io hosts", () => {
    expect(isDedicatedOrCloudApiHost("https://api.acme.getdx.io")).toBe(true);
  });

  it("is false for custom / managed API hosts", () => {
    expect(isDedicatedOrCloudApiHost("https://api.corp.example.com")).toBe(
      false,
    );
  });
});

import fs from "node:fs";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getConfigPath,
  readConfig,
  resolveWebBaseUrl,
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

describe("readConfig", () => {
  it("returns {} for an empty config object on disk", () => {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify({}));

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

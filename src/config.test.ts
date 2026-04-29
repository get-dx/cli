import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  resolveUiUrl,
  resolveUiBaseUrl,
  writeConfig,
  isDedicatedOrCloudApiHost,
} from "./config.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-resolve-ui-base-url";
  writeConfig({});
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("resolveUiUrl", () => {
  it("maps DX cloud API host to app.getdx.com", () => {
    expect(resolveUiUrl("https://api.getdx.com")).toBe("https://app.getdx.com");
    expect(resolveUiUrl("https://api.getdx.com/")).toBe(
      "https://app.getdx.com",
    );
  });

  it("maps dedicated API host to the matching app origin", () => {
    expect(resolveUiUrl("https://api.acme.getdx.io")).toBe(
      "https://acme.getdx.io",
    );
  });

  it("falls back to the API URL origin for other hosts", () => {
    expect(resolveUiUrl("https://api.example.com/v1/")).toBe(
      "https://api.example.com",
    );
  });
});

describe("resolveUiBaseUrl", () => {
  it("prefers DX_UI_BASE_URL over persisted config and inference", () => {
    process.env.DX_UI_BASE_URL = "https://custom.example.com/";
    writeConfig({ uiBaseUrl: "https://wrong.example.com" });

    expect(resolveUiBaseUrl("https://api.getdx.com")).toBe(
      "https://custom.example.com",
    );
  });

  it("uses persisted uiBaseUrl when DX_UI_BASE_URL is unset", () => {
    writeConfig({ uiBaseUrl: "https://stored.example.com" });

    expect(resolveUiBaseUrl("https://api.getdx.com")).toBe(
      "https://stored.example.com",
    );
  });

  it("falls back to resolveUiUrl when nothing else is set", () => {
    expect(resolveUiBaseUrl("https://api.getdx.com")).toBe(
      "https://app.getdx.com",
    );
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

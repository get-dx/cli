import { afterEach, describe, expect, it, vi } from "vitest";

import { writeConfig } from "./config.js";
import { buildRuntime } from "./runtime.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("runtime", () => {
  it("uses environment overrides for base URL and token", () => {
    process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-runtime-default";
    writeConfig({});
    process.env.DX_BASE_URL = "https://api.example.com/";
    process.env.DX_API_TOKEN = "abcd1234wxyz";

    const runtime = buildRuntime({
      json: true,
    });

    expect(runtime.apiBaseUrl).toBe("https://api.example.com");
    expect(runtime.uiBaseUrl).toBe("https://api.example.com");
    expect(runtime.token).toBe("abcd1234wxyz");
  });

  it("uses DX_UI_BASE_URL for uiBaseUrl when set", () => {
    process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-runtime-ui";
    writeConfig({});
    process.env.DX_BASE_URL = "https://api.example.com/";
    process.env.DX_API_TOKEN = "abcd1234wxyz";
    process.env.DX_UI_BASE_URL = "https://app.custom.example/";

    const runtime = buildRuntime({
      json: true,
    });

    expect(runtime.uiBaseUrl).toBe("https://app.custom.example");
  });

  it("uses persisted uiBaseUrl when DX_UI_BASE_URL is unset", () => {
    process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-runtime-ui";
    writeConfig({ uiBaseUrl: "https://ui.persisted.example.com" });
    process.env.DX_BASE_URL = "https://api.example.com/";
    process.env.DX_API_TOKEN = "abcd1234wxyz";

    const runtime = buildRuntime({
      json: true,
    });

    expect(runtime.uiBaseUrl).toBe("https://ui.persisted.example.com");
  });

  it("reads persisted base URL when env is absent", () => {
    const tmp = vi.fn();
    process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";
    writeConfig({ apiBaseUrl: "https://api.persisted.example.com" });
    process.env.DX_API_TOKEN = "persisted-token";

    const runtime = buildRuntime({
      json: false,
    });

    expect(runtime.apiBaseUrl).toBe("https://api.persisted.example.com");
    expect(runtime.uiBaseUrl).toBe("https://api.persisted.example.com");
    expect(runtime.token).toBe("persisted-token");
    expect(tmp).not.toHaveBeenCalled();
  });
});

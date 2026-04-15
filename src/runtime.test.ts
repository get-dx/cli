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
    process.env.DX_BASE_URL = "https://api.example.com/";
    process.env.DX_API_TOKEN = "abcd1234wxyz";

    const runtime = buildRuntime({
      json: true,
    });

    expect(runtime.baseUrl).toBe("https://api.example.com");
    expect(runtime.token).toBe("abcd1234wxyz");
  });

  it("reads persisted base URL when env is absent", () => {
    const tmp = vi.fn();
    process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";
    writeConfig({ baseUrl: "https://api.persisted.example.com" });
    process.env.DX_API_TOKEN = "persisted-token";

    const runtime = buildRuntime({
      json: false,
    });

    expect(runtime.baseUrl).toBe("https://api.persisted.example.com");
    expect(runtime.token).toBe("persisted-token");
    expect(tmp).not.toHaveBeenCalled();
  });
});

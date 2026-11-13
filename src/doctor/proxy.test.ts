import { describe, expect, it } from "vitest";

import { detectProxy, supportsEnvProxy } from "./proxy.js";

const API = "https://api.getdx.com";

function detect(env: NodeJS.ProcessEnv, apiBaseUrl = API) {
  return detectProxy({
    apiBaseUrl,
    env: { NODE_USE_ENV_PROXY: "1", ...env },
    nodeVersion: "24.22.1",
    execArgv: [],
  });
}

describe("supportsEnvProxy", () => {
  it.each([
    ["20.19.5", false],
    ["22.20.0", false],
    ["22.21.0", true],
    ["v22.22.0", true],
    ["23.11.0", false],
    ["24.0.0", true],
    ["26.1.0", true],
  ])("%s → %s", (version, expected) => {
    expect(supportsEnvProxy(version)).toBe(expected);
  });
});

describe("detectProxy", () => {
  it("prefers lowercase variable names", () => {
    expect(
      detect({ HTTPS_PROXY: "http://upper:1", https_proxy: "http://lower:1" }),
    ).toMatchObject({ variable: "https_proxy", proxyUrl: "http://lower:1" });
  });

  it("falls back to HTTP_PROXY for HTTPS requests", () => {
    expect(detect({ HTTP_PROXY: "http://proxy:1" })).toMatchObject({
      active: true,
      variable: "HTTP_PROXY",
    });
  });

  it("ignores HTTPS_PROXY for a plain HTTP API base URL", () => {
    expect(
      detect({ HTTPS_PROXY: "http://proxy:1" }, "http://localhost:3000"),
    ).toMatchObject({
      active: false,
      reason: "no_proxy_variable",
      protocol: "http:",
    });
  });

  it("does not count --use-env-proxy that was turned back off", () => {
    expect(
      detectProxy({
        apiBaseUrl: API,
        env: { HTTPS_PROXY: "http://proxy:1" },
        nodeVersion: "24.22.1",
        execArgv: ["--use-env-proxy", "--no-use-env-proxy"],
      }),
    ).toMatchObject({ reason: "not_enabled", enabledBy: null });
  });

  it.each([
    ["*", true],
    ["getdx.com", true],
    ["*.getdx.com", true],
    ["API.GETDX.COM", true],
    ["api.getdx.com:443", true],
    ["api.getdx.com:8443", false],
    ["other.com getdx.com", true],
    ["x.getdx.com", false],
    ["localhost,*", false],
  ])("NO_PROXY=%s bypasses the proxy: %s", (noProxy, bypassed) => {
    const status = detect({ HTTPS_PROXY: "http://proxy:1", NO_PROXY: noProxy });
    expect(status.reason).toBe(bypassed ? "no_proxy_match" : "active");
  });

  it("lets no_proxy shadow NO_PROXY", () => {
    expect(
      detect({
        HTTPS_PROXY: "http://proxy:1",
        NO_PROXY: "getdx.com",
        no_proxy: "localhost",
      }).active,
    ).toBe(true);
  });
});

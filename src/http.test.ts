import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseRetryAfterMs, request } from "./http.js";
import { createLogger } from "./logger.js";
import type { Runtime } from "./types.js";

const originalEnv = { ...process.env };

const runtime: Runtime = {
  baseUrl: "https://api.example.com",
  token: "token-123",
  context: { json: false },
  version: "0.1.0",
  logger: createLogger({ json: false }),
};

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("parseRetryAfterMs", () => {
  it("parses integer seconds", () => {
    expect(parseRetryAfterMs(new Headers({ "Retry-After": "2" }))).toBe(2000);
  });

  it("returns undefined when the header is missing or invalid", () => {
    expect(parseRetryAfterMs(new Headers())).toBeUndefined();
    expect(
      parseRetryAfterMs(new Headers({ "Retry-After": "nope" })),
    ).toBeUndefined();
  });

  it("parses HTTP dates relative to Date.now()", () => {
    vi.spyOn(Date, "now").mockReturnValue(
      Date.parse("Tue, 14 Apr 2026 12:00:00 GMT"),
    );

    expect(
      parseRetryAfterMs(
        new Headers({ "Retry-After": "Tue, 14 Apr 2026 12:00:03 GMT" }),
      ),
    ).toBe(3000);
  });
});

describe("request", () => {
  it("returns the parsed body and retryAfterMs when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, value: 1 }), {
          status: 202,
          headers: { "Retry-After": "2" },
        }),
      ),
    );

    await expect(
      request<{ ok: true; value: number }>(runtime, "/test", { method: "GET" }),
    ).resolves.toEqual({
      body: { ok: true, value: 1 },
      retryAfterMs: 2000,
    });
  });

  it("omits retryAfterMs when the header is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, value: 1 }), {
          status: 200,
        }),
      ),
    );

    await expect(
      request<{ ok: true; value: number }>(runtime, "/test", { method: "GET" }),
    ).resolves.toEqual({
      body: { ok: true, value: 1 },
    });
  });
});

describe("http logging", () => {
  it("logs request and response details with redacted authorization", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    process.env.DX_LOG_LEVEL = "debug";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, item: { id: "123" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const loggingRuntime: Runtime = {
      baseUrl: "https://api.example.com",
      token: "secret-token",
      context: { json: false },
      version: "test",
      logger: createLogger({ json: false }),
    };

    await request(loggingRuntime, "/widgets.info", {
      method: "POST",
      body: { id: "123" },
    });

    const output = writes.join("");
    expect(output).toContain("Sending HTTP request");
    expect(output).toContain("Received HTTP response");
    expect(output).toContain("https://api.example.com/widgets.info");
    expect(output).toContain("Bearer [REDACTED]");
    expect(output).not.toContain("secret-token");
    expect(output).toContain('"id":"123"');
    expect(output).toContain('"status":200');
  });

  it("emits structured JSON logs when the logger is in json mode", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    process.env.DX_LOG_LEVEL = "debug";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, item: { id: "123" } }), {
          status: 200,
          headers: { "x-request-id": "req-1" },
        }),
      ),
    );

    const loggingRuntime: Runtime = {
      baseUrl: "https://api.example.com",
      token: "secret-token",
      context: { json: false },
      version: "test",
      logger: createLogger({ json: true }),
    };

    await request(loggingRuntime, "/widgets.info", {
      method: "GET",
    });

    const [requestLog, responseLog] = writes.map((line) => JSON.parse(line));
    expect(requestLog.level).toBe("debug");
    expect(requestLog.message).toBe("Sending HTTP request");
    expect(requestLog.headers.authorization).toBe("Bearer [REDACTED]");
    expect(responseLog.message).toBe("Received HTTP response");
    expect(responseLog.status).toBe(200);
    expect(responseLog.headers["x-request-id"]).toBe("req-1");
  });
});

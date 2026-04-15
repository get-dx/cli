import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { request } from "./http.js";
import { initializeLogger, resetLoggerForTests } from "./logger.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  resetLoggerForTests();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
  resetLoggerForTests();
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
    initializeLogger({ json: false });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, item: { id: "123" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await request("https://api.example.com", "/widgets.info", {
      method: "POST",
      token: "secret-token",
      body: { id: "123" },
      userAgent: "dx-cli/test",
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
    initializeLogger({ json: true });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true, item: { id: "123" } }), {
          status: 200,
          headers: { "x-request-id": "req-1" },
        }),
      ),
    );

    await request("https://api.example.com", "/widgets.info", {
      method: "GET",
      token: "secret-token",
      userAgent: "dx-cli/test",
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

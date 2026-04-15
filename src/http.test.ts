import { describe, expect, it, vi } from "vitest";

import { parseRetryAfterMs, request } from "./http.js";

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
      request<{ ok: true; value: number }>("https://api.example.com", "/test", {
        method: "GET",
      }),
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
      request<{ ok: true; value: number }>("https://api.example.com", "/test", {
        method: "GET",
      }),
    ).resolves.toEqual({
      body: { ok: true, value: 1 },
    });
  });
});

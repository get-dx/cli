import { describe, expect, it, vi } from "vitest";

import { parseRetryAfterMs } from "./http.js";

describe("parseRetryAfterMs", () => {
  it("parses integer seconds", () => {
    expect(parseRetryAfterMs(new Headers({ "Retry-After": "2" }))).toBe(2000);
  });

  it("returns null when the header is missing or invalid", () => {
    expect(parseRetryAfterMs(new Headers())).toBeNull();
    expect(
      parseRetryAfterMs(new Headers({ "Retry-After": "nope" })),
    ).toBeNull();
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

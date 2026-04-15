import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "./logger.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("logger", () => {
  it("does not log when DX_LOG_LEVEL is unset", () => {
    const writes: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    const logger = createLogger({ json: false });
    logger.debug("hidden");
    logger.error("also hidden");

    expect(writes).toEqual([]);
  });

  it("filters logs below the configured level", () => {
    const writes: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    process.env.DX_LOG_LEVEL = "INFO";

    const logger = createLogger({ json: false });
    logger.debug("debug hidden");
    logger.info("info shown", { request_id: "abc123" });
    logger.error("error shown");

    const output = writes.join("");
    expect(output).not.toContain("debug hidden");
    expect(output).toContain("INFO info shown");
    expect(output).toContain('"request_id":"abc123"');
    expect(output).toContain("ERROR error shown");
  });

  it("accepts mixed-case log levels and fails closed for invalid values", () => {
    const writes: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    process.env.DX_LOG_LEVEL = "WaRn";
    createLogger({ json: false }).warn("warn shown");

    process.env.DX_LOG_LEVEL = "verbose";
    createLogger({ json: false }).error("hidden");

    const output = writes.join("");
    expect(output).toContain("WARN warn shown");
    expect(output).not.toContain("hidden");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

describe("cli", () => {
  it("shows default help when invoked without arguments", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      stdout.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      stderr.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: string | number | null,
    ) => {
      throw new Error(`process.exit unexpectedly called with ${code}`);
    }) as typeof process.exit);

    const { run } = await import("./cli.js");
    await run(["node", "dx"]);

    const output = stdout.join("");
    expect(output).toContain("Usage: dx [options] [command]");
    expect(stderr.join("")).toBe("");
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import cliPackage from "../package.json" with { type: "json" };

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
    expect(output).toContain("-v, --version");
    expect(output).not.toContain("-V, --version");
    expect(stderr.join("")).toBe("");
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it("shows the current version with the lowercase version flag", async () => {
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

    await expect(run(["node", "dx", "-v"])).rejects.toThrow(
      "process.exit unexpectedly called with 0",
    );

    expect(stdout.join("")).toBe(`${cliPackage.version}\n`);
    expect(stderr.join("")).toBe("");
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it("shows command usage when a command group is invoked without a subcommand", async () => {
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

    await expect(run(["node", "dx", "catalog"])).rejects.toThrow(
      "process.exit unexpectedly called with 2",
    );

    expect(stdout.join("")).toBe("");
    expect(stderr.join("")).toContain("Usage: dx catalog [options] [command]");
    expect(stderr.join("")).not.toContain("(outputHelp)");
    expect(exitSpy).toHaveBeenCalledWith(2);
  });
});

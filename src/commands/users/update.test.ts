import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../../errors.js";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../../secrets.js", () => ({
  setToken,
  deleteToken,
  getToken,
}));

const originalEnv = { ...process.env };
const stdoutWrites: string[] = [];
const stderrWrites: string[] = [];

beforeEach(() => {
  process.env = { ...originalEnv };
  getToken.mockReset();
  setToken.mockReset();
  deleteToken.mockReset();
  vi.restoreAllMocks();
  stdoutWrites.length = 0;
  stderrWrites.length = 0;
  vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    stdoutWrites.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  vi.spyOn(process.stderr, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    stderrWrites.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

function stubFetch(body: Record<string, unknown>, status = 200) {
  process.env.DX_API_BASE_URL = "https://api.example.com";
  getToken.mockReturnValue("token-123");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

describe("users update", () => {
  it("sets the developer flag in human-readable output", async () => {
    stubFetch({
      ok: true,
      user: { email: "ada@example.com", developer: true },
    });

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "update",
      "ada@example.com",
      "--developer",
      "true",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/users.update",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "ada@example.com", developer: true }),
      }),
    );
    const out = stdoutWrites.join("");
    expect(out).toContain("Updated user");
    expect(out).toContain("ada@example.com");
    expect(out).toContain("true");
  });

  it("sends false for --developer false", async () => {
    stubFetch({
      ok: true,
      user: { email: "ada@example.com", developer: false },
    });

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "update",
      "ada@example.com",
      "--developer",
      "false",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/users.update",
      expect.objectContaining({
        body: JSON.stringify({ email: "ada@example.com", developer: false }),
      }),
    );
    expect(stdoutWrites.join("")).toContain("false");
  });

  it("sends null to clear the flag and shows it as unset", async () => {
    stubFetch({ ok: true, user: { email: "ada@example.com" } });

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "update",
      "ada@example.com",
      "--developer",
      "null",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/users.update",
      expect.objectContaining({
        body: JSON.stringify({ email: "ada@example.com", developer: null }),
      }),
    );
    expect(stdoutWrites.join("")).toContain("unset");
  });

  it("prints the API response with --json", async () => {
    const response = {
      ok: true,
      user: { email: "ada@example.com", developer: true },
    };
    stubFetch(response);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "users",
      "update",
      "ada@example.com",
      "--developer",
      "true",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(response);
  });

  it("rejects a --developer value that is not true, false, or null", async () => {
    stubFetch({ ok: true });
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "update",
      "ada@example.com",
      "--developer",
      "yes",
    ]);

    expect(stderrWrites.join("")).toContain(
      "--developer must be true, false, or null",
    );
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("errors when there is nothing to update", async () => {
    stubFetch({ ok: true });
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "users", "update", "ada@example.com"]);

    expect(stderrWrites.join("")).toContain("Nothing to update");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    expect(fetch).not.toHaveBeenCalled();
  });

  describe("error messages", () => {
    const args = [
      "node",
      "dx",
      "users",
      "update",
      "ada@example.com",
      "--developer",
      "null",
    ];

    it("explains an unknown user", async () => {
      stubFetch({ ok: false, error: "User not found" }, 404);
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(args);

      expect(stderrWrites.join("")).toContain(
        "No active DX user has that email address",
      );
    });

    it("explains that only manually managed accounts can clear the flag", async () => {
      stubFetch({ ok: false, error: "Developer must be true or false" }, 422);
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(args);

      expect(stderrWrites.join("")).toContain(
        "Only accounts that manage developer classification manually",
      );
    });

    it("keeps the API error unchanged with --json", async () => {
      stubFetch({ ok: false, error: "User not found" }, 404);
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([args[0], args[1], "--json", ...args.slice(2)]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: false,
        error: "User not found",
        http_status: 404,
        body: { ok: false, error: "User not found" },
      });
    });
  });
});

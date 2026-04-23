import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../errors.js";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../secrets.js", () => ({
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

describe("teams command", () => {
  const mockResponse = {
    ok: true as const,
    teams: [
      {
        ancestors: ["LTE", "MTUxODcx", "NTA2MTg", "NTA2MTk", "NTA4Nzc"],
        contributors: 0,
        id: "NTA4Nzc",
        last_changed_at: "2024-03-19T22:36:47.448Z",
        manager_id: "NTEyMDUw",
        name: "Core Data",
        parent: true,
        parent_id: "NTA2MTk",
        reference_id: "06BEC4E0-5A61-354E-08A6-C39D756058AB",
      },
    ],
  };

  it("lists teams in human-readable output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "teams", "list"]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/teams.list",
      expect.objectContaining({ method: "GET" }),
    );
    expect(stdoutWrites.join("")).toContain("Teams");
    expect(stdoutWrites.join("")).toContain("Core Data");
    expect(stdoutWrites.join("")).toContain(
      "06BEC4E0-5A61-354E-08A6-C39D756058AB",
    );
  });

  it("prints the API response with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify(mockResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "--json", "teams", "list"]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(mockResponse);
  });

  it("exits with code 4 when no API token is configured", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "teams", "list"]);

    expect(stderrWrites.join("")).toContain("No API token configured");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
  });
});

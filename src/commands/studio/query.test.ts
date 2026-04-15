import fs from "node:fs";
import os from "node:os";
import path from "node:path";

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
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("studio query command", () => {
  const queryRunId = "r3jv7p0x4gk2";
  const queuedQueryRun = {
    id: queryRunId,
    status: "queued",
    submitted_at: "2026-04-13T20:10:05Z",
    finished_at: null,
    expires_at: "2026-05-13T20:10:05Z",
    info_url: `/studio.queryRuns.info?id=${queryRunId}`,
    results_url: `/studio.queryRuns.results?id=${queryRunId}`,
  };
  const succeededQueryRun = {
    ...queuedQueryRun,
    status: "succeeded",
    finished_at: "2026-04-13T20:10:06Z",
  };
  const resultsResponse = {
    ok: true,
    results: {
      columns: ["id", "name"],
      rows: [
        ["1", "api"],
        ["2", "web app"],
      ],
    },
  };

  it("runs a query and prints the results as an ASCII table", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, query_run: queuedQueryRun }), {
          status: 202,
          headers: { "Retry-After": "0" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ ok: true, query_run: succeededQueryRun }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(resultsResponse), {
          status: 200,
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "studio",
      "query",
      "SELECT id, name FROM github_repos LIMIT 2",
    ]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.example.com/studio.queryRuns.execute",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sql: "SELECT id, name FROM github_repos LIMIT 2",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `https://api.example.com/studio.queryRuns.info?id=${queryRunId}`,
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `https://api.example.com/studio.queryRuns.results?id=${queryRunId}`,
      expect.objectContaining({ method: "GET" }),
    );

    expect(stdoutWrites.join("")).toContain("+----+---------+");
    expect(stdoutWrites.join("")).toContain("| id | name    |");
    expect(stdoutWrites.join("")).toContain("| 1  | api     |");
    expect(stdoutWrites.join("")).toContain("| 2  | web app |");
  });

  it("prints the JSON results payload with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, query_run: succeededQueryRun }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(resultsResponse), { status: 200 }),
        ),
    );

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "--json", "studio", "query", "SELECT 1"]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(resultsResponse);
  });

  it("uses Retry-After to pace polling", async () => {
    vi.useFakeTimers();

    try {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, query_run: queuedQueryRun }),
            {
              status: 202,
              headers: { "Retry-After": "2" },
            },
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, query_run: succeededQueryRun }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(resultsResponse), { status: 200 }),
        );

      vi.stubGlobal("fetch", fetchMock);
      const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

      const { run } = await import("../../cli.js");
      const runPromise = run([
        "node",
        "dx",
        "--json",
        "studio",
        "query",
        "SELECT 1",
      ]);

      await vi.advanceTimersByTimeAsync(1999);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1);
      await runPromise;

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    } finally {
      vi.useRealTimers();
    }
  });

  it("downloads CSV results to disk with --output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-cli-query-"));
    const outputPath = path.join(tempDir, "results.csv");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, query_run: succeededQueryRun }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(null, {
            status: 303,
            headers: {
              location: "https://downloads.example.com/results.csv",
            },
          }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 200 })),
    );

    try {
      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "query",
        "SELECT * FROM github_repos",
        "--output",
        outputPath,
      ]);

      expect(fs.readFileSync(outputPath, "utf8")).toBe("");
      expect(stdoutWrites.join("")).toContain(path.resolve(outputPath));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("exits with code 2 when --output is combined with --json", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "studio",
      "query",
      "SELECT 1",
      "--output",
      "results.csv",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual({
      ok: false,
      error: "--output cannot be used with --json",
    });
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("exits with code 4 when no API token is configured", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "studio", "query", "SELECT 1"]);

    expect(stderrWrites.join("")).toContain("No API token configured");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
  });

  it("exits when the query run fails", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            query_run: {
              ...succeededQueryRun,
              status: "failed",
              finished_at: "2026-04-13T20:10:06Z",
              error: {
                code: "sql_error",
                message: "Query timeout.",
              },
            },
          }),
          { status: 200 },
        ),
      ),
    );

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "studio", "query", "SELECT 1"]);

    expect(stderrWrites.join("")).toContain(
      "Query failed (sql_error): Query timeout.",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

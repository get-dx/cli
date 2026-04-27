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

describe("snapshots command", () => {
  const snapshotsResponse = {
    ok: true as const,
    snapshots: [
      {
        id: "MjUyNbaY",
        account_id: "ABCD",
        last_result_change_at: "2024-07-18T15:47:12.080Z",
        scheduled_for: "2024-06-16",
        completed_at: "2024-07-01T14:01:51.027Z",
        completed_count: 3077,
        deleted_at: null,
        total_count: 3686,
      },
      {
        id: "MTY5NwTaY",
        account_id: "ABCD",
        last_result_change_at: "2023-11-01T08:19:50.105Z",
        scheduled_for: "2023-10-01",
        completed_at: "2023-10-16T11:43:18.382Z",
        completed_count: 0,
        deleted_at: null,
        total_count: 3580,
      },
    ],
  };

  const driverCommentsResponse = {
    ok: true as const,
    driver_comments: [
      {
        email: "jane@company.com",
        text: "Deploys feel slower than they should.",
        timestamp: "1747162878.402226",
        item_id: "MTQ2",
        item_name: "Ease of release",
        snapshot_id: "MjUyNbaY",
        team_id: "NTA4Nzc",
        team_name: "Core Data",
      },
    ],
    response_metadata: {
      next_cursor: "next-driver-cursor",
    },
  };

  const csatCommentsResponse = {
    ok: true as const,
    csat_comments: [
      {
        email: "jane@company.com",
        text: "The platform is easy to use.",
        timestamp: "1747162878.402226",
        item_id: "MTQ3",
        item_name: "CSAT",
        snapshot_id: "MjUyNbaY",
        team_id: "NTA4Nzc",
        team_name: "Core Data",
      },
    ],
    response_metadata: {
      next_cursor: "next-csat-cursor",
    },
  };

  const snapshotInfoResponse = {
    ok: true as const,
    snapshot: {
      team_scores: [
        {
          snapshot_team: {
            id: "NTI0MjY",
            name: "Machine Learning",
            team_id: "NTA1OTM",
            parent: true,
            parent_id: "NTI0MjQ",
            ancestors: ["LTE", "NTI0MjY", "NTI0MjQ"],
          },
          item_id: "MTQ2",
          item_type: "factor",
          item_name: "Ease of release",
          response_count: 210,
          score: 60,
          contributor_count: 363,
          vs_prev: null,
          vs_org: null,
          vs_50th: 6,
          vs_75th: -8,
          vs_90th: -23,
        },
      ],
    },
  };

  it("lists snapshot CSAT comments in human-readable output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(csatCommentsResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "snapshots",
      "csatComments",
      "list",
      "--id",
      "MjUyNbaY",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.csatComments.list?id=MjUyNbaY",
      expect.objectContaining({ method: "GET" }),
    );
    expect(stdoutWrites.join("")).toContain("Snapshot CSAT Comments");
    expect(stdoutWrites.join("")).toContain("Next cursor");
    expect(stdoutWrites.join("")).toContain("next-csat-cursor");
    expect(stdoutWrites.join("")).toContain("CSAT");
    expect(stdoutWrites.join("")).toContain("Core Data");
    expect(stdoutWrites.join("")).toContain("The platform is easy to use.");
  });

  it("prints the snapshots csatComments API response with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(csatCommentsResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "snapshots",
      "csatComments",
      "list",
      "--id",
      "MjUyNbaY",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(csatCommentsResponse);
  });

  it("passes CSAT comments --cursor and --limit to the API", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            csat_comments: [],
            response_metadata: { next_cursor: null },
          }),
          { status: 200 },
        ),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "snapshots",
      "csatComments",
      "list",
      "--id",
      "MjUyNbaY",
      "--cursor",
      "xuvkgfq9t0ty",
      "--limit",
      "100",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.csatComments.list?id=MjUyNbaY&cursor=xuvkgfq9t0ty&limit=100",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects CSAT comments --limit values above 100", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "snapshots",
      "csatComments",
      "list",
      "--id",
      "MjUyNbaY",
      "--limit",
      "101",
    ]);

    expect(stderrWrites.join("")).toContain("--limit must be at most 100");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("errors when snapshot CSAT comments are missing --id", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "snapshots", "csatComments", "list"]);

    expect(stderrWrites.join("")).toContain("--id is required");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("gets snapshot info in human-readable output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(snapshotInfoResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "snapshots", "info", "--id", "MjUyNbaY"]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.info?snapshot_id=MjUyNbaY",
      expect.objectContaining({ method: "GET" }),
    );
    expect(stdoutWrites.join("")).toContain("Snapshot Information");
    expect(stdoutWrites.join("")).toContain("Machine Learning");
    expect(stdoutWrites.join("")).toContain("Team ID");
    expect(stdoutWrites.join("")).toContain("item_name");
    expect(stdoutWrites.join("")).toContain("Response count");
    expect(stdoutWrites.join("")).toContain("Ease of release");
    expect(stdoutWrites.join("")).toContain("60");
    expect(stdoutWrites.join("")).toContain("Benchmarks");
    expect(stdoutWrites.join("")).toContain("vs_prev");
    expect(stdoutWrites.join("")).toContain("vs_90th");
    expect(stdoutWrites.join("")).toContain("-23");
    expect(stdoutWrites.join("")).toContain("Response count: 210");
    expect(stdoutWrites.join("")).toContain("| vs_prev   | (None) |");
    expect(stdoutWrites.join("")).toContain("| vs_org    | (None) |");
    expect(stdoutWrites.join("")).not.toContain("Snapshot team ID");
    expect(stdoutWrites.join("")).not.toContain("Parent ID");
    expect(stdoutWrites.join("")).not.toContain("Contributors");
  });

  it("prints the snapshot info API response with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(snapshotInfoResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "snapshots",
      "info",
      "--id",
      "MjUyNbaY",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(snapshotInfoResponse);
  });

  it("errors when snapshot info is missing --id", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "snapshots", "info"]);

    expect(stderrWrites.join("")).toContain("--id is required");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("lists snapshots in human-readable output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(snapshotsResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "snapshots", "list"]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.list?ordering=completed_at",
      expect.objectContaining({ method: "GET" }),
    );
    expect(stdoutWrites.join("")).toContain("Snapshots");
    expect(stdoutWrites.join("")).toContain("MjUyNbaY");
    expect(stdoutWrites.join("")).toContain("2024-06-16");
    expect(stdoutWrites.join("")).toContain("3077");
    expect(stdoutWrites.join("")).toContain("0");
  });

  it("prints the snapshots list API response with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(snapshotsResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "--json", "snapshots", "list"]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(snapshotsResponse);
  });

  it("lists snapshot driver comments in human-readable output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(driverCommentsResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "snapshots",
      "driverComments",
      "list",
      "--id",
      "MjUyNbaY",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.driverComments.list?id=MjUyNbaY",
      expect.objectContaining({ method: "GET" }),
    );
    expect(stdoutWrites.join("")).toContain("Snapshot Driver Comments");
    expect(stdoutWrites.join("")).toContain("Next cursor");
    expect(stdoutWrites.join("")).toContain("next-driver-cursor");
    expect(stdoutWrites.join("")).toContain("Ease of release");
    expect(stdoutWrites.join("")).toContain("Core Data");
    expect(stdoutWrites.join("")).toContain(
      "Deploys feel slower than they should.",
    );
  });

  it("prints the snapshots driverComments API response with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(driverCommentsResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "snapshots",
      "driverComments",
      "list",
      "--id",
      "MjUyNbaY",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(driverCommentsResponse);
  });

  it("passes driver comments --cursor and --limit to the API", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            driver_comments: [],
            response_metadata: { next_cursor: null },
          }),
          { status: 200 },
        ),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "snapshots",
      "driverComments",
      "list",
      "--id",
      "MjUyNbaY",
      "--cursor",
      "xuvkgfq9t0ty",
      "--limit",
      "25",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/snapshots.driverComments.list?id=MjUyNbaY&cursor=xuvkgfq9t0ty&limit=25",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("renders comments when the response uses the comments key", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            comments: [
              {
                email: "jane@company.com",
                comment: "Tests could be faster.",
                item_name: "Build speed",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "snapshots",
      "driverComments",
      "list",
      "--id",
      "MjUyNbaY",
    ]);

    expect(stdoutWrites.join("")).toContain("Build speed");
    expect(stdoutWrites.join("")).toContain("Tests could be faster.");
  });

  it("errors when snapshot driver comments are missing --id", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "snapshots", "driverComments", "list"]);

    expect(stderrWrites.join("")).toContain("--id is required");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });
});

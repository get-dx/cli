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
  const findByMembersResponse = {
    ok: true as const,
    team: {
      id: "MTYyMDQz",
      name: "Core Data",
      members: [
        {
          id: "NjA",
          name: "Chester Tester",
          email: "chester@company.com",
        },
        {
          id: "Mzc0OTQw",
          name: "Jane Doe",
          email: "jane@company.com",
        },
      ],
      manager: {
        id: "NTEyMDUw",
        name: "John Doe",
        email: "john@company.com",
      },
    },
  };

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

  const teamInfoResponse = {
    ok: true as const,
    team: {
      id: "NTA4Nzc",
      name: "Core Data",
      reference_id: "06BEC4E0-5A61-354E-08A6-C39D756058AB",
      lead: {
        id: "NTEyMDUw",
        name: "John Doe",
        email: "john@company.com",
        avatar: "",
        github_username: "johndoe",
        developer: true,
        tz: "America/New_York",
      },
      contributors: [
        {
          id: "NjA",
          name: "Chester Tester",
          email: "chester@company.com",
        },
        {
          id: "Mzc0OTQw",
          name: "Jane Doe",
          email: "jane@company.com",
        },
      ],
    },
  };

  it("finds a team by member email addresses in human-readable output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(findByMembersResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "teams",
      "findByMembers",
      "--team-emails",
      "chester@company.com, jane@company.com",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/teams.findByMembers?team_emails=chester%40company.com%2Cjane%40company.com",
      expect.objectContaining({ method: "GET" }),
    );
    expect(stdoutWrites.join("")).toContain("Team");
    expect(stdoutWrites.join("")).toContain("Core Data");
    expect(stdoutWrites.join("")).toContain("john@company.com");
    expect(stdoutWrites.join("")).toContain("jane@company.com");
  });

  it("prints the findByMembers API response with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(findByMembersResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "teams",
      "findByMembers",
      "--team-emails",
      "chester@company.com,jane@company.com",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(findByMembersResponse);
  });

  it("errors when findByMembers is missing --team-emails", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "teams", "findByMembers"]);

    expect(stderrWrites.join("")).toContain("--team-emails is required");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("prints an actionable findByMembers error when no users are found", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: "no_users_found" }), {
          status: 400,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "teams",
      "findByMembers",
      "--team-emails",
      "missing@example.com",
    ]);

    const stderr = stderrWrites.join("");
    expect(stderr).toContain("No active DX users were found");
    expect(stderr).toContain("missing@example.com");
    expect(stderr).toContain("exist and are active");
    expect(stderr).not.toContain('"error": "no_users_found"');
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("preserves structured findByMembers API errors with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, error: "no_users_found" }), {
          status: 400,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "teams",
      "findByMembers",
      "--team-emails",
      "missing@example.com",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual({
      ok: false,
      error: "no_users_found",
      http_status: 400,
      body: {
        ok: false,
        error: "no_users_found",
      },
    });
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("gets team info by team ID in human-readable output", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(teamInfoResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run(["node", "dx", "teams", "info", "--team-id", "NTA4Nzc"]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/teams.info?team_id=NTA4Nzc",
      expect.objectContaining({ method: "GET" }),
    );
    expect(stdoutWrites.join("")).toContain("Team Information");
    expect(stdoutWrites.join("")).toContain("Core Data");
    expect(stdoutWrites.join("")).toContain(
      "06BEC4E0-5A61-354E-08A6-C39D756058AB",
    );
    expect(stdoutWrites.join("")).toContain("john@company.com");
    expect(stdoutWrites.join("")).toContain("jane@company.com");
  });

  it("gets team info by reference ID with --json", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(teamInfoResponse), {
          status: 200,
        }),
      ),
    );

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "teams",
      "info",
      "--reference-id",
      "06BEC4E0-5A61-354E-08A6-C39D756058AB",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/teams.info?reference_id=06BEC4E0-5A61-354E-08A6-C39D756058AB",
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(stdoutWrites.join(""))).toEqual(teamInfoResponse);
  });

  it("errors when team info is missing a lookup option", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run(["node", "dx", "teams", "info"]);

    expect(stderrWrites.join("")).toContain(
      "One of --team-id or --reference-id is required",
    );
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("errors when team info receives both lookup options", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../cli.js");
    await run([
      "node",
      "dx",
      "teams",
      "info",
      "--team-id",
      "NTA4Nzc",
      "--reference-id",
      "06BEC4E0-5A61-354E-08A6-C39D756058AB",
    ]);

    expect(stderrWrites.join("")).toContain(
      "--team-id and --reference-id are mutually exclusive",
    );
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

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

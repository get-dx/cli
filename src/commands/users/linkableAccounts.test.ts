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

describe("users linkableAccounts list", () => {
  const listResponse = {
    ok: true as const,
    accounts: [
      {
        id: "4812",
        source: "github",
        external_id: "58291034",
        instance_id: "3",
        name: null,
        email: null,
        username: "jane-smith",
        linked_user_id: null,
        label: "jane-smith",
      },
    ],
    next_page: null,
    total: 1,
    total_pages: 1,
  };

  function stubFetch(
    body: Record<string, unknown> = listResponse,
    status = 200,
  ) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
    );
  }

  const listGithub = [
    "users",
    "linkableAccounts",
    "list",
    "--source",
    "github",
  ];

  it("searches accounts in human-readable output", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    stubFetch();

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "linkableAccounts",
      "list",
      "--source",
      "github",
      "--query",
      "jane",
      "--unlinked",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/users.linkableAccounts.list?source=github&query=jane&linked=false",
      expect.objectContaining({ method: "GET" }),
    );
    const out = stdoutWrites.join("");
    expect(out).toContain("Linkable Accounts");
    expect(out).toContain("jane-smith");
    expect(out).toContain("4812");
    expect(out).toContain("58291034");
    expect(out).toContain("(Not linked)");
    expect(out).toContain("Linked user: ");
  });

  it("prints the API response with --json and omits unset filters", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    stubFetch();

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "users",
      "linkableAccounts",
      "list",
      "--source",
      "github",
      "--page",
      "2",
      "--page-size",
      "10",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/users.linkableAccounts.list?source=github&page=2&page_size=10",
      expect.objectContaining({ method: "GET" }),
    );
    expect(JSON.parse(stdoutWrites.join(""))).toEqual(listResponse);
  });

  it("sends linked=true with --linked", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    stubFetch();

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "users",
      "linkableAccounts",
      "list",
      "--source",
      "github",
      "--linked",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/users.linkableAccounts.list?source=github&linked=true",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("explains a query timeout and recommends a retry", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    stubFetch({ ok: false, error: "query_timeout" }, 503);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", ...listGithub]);

    const stderr = stderrWrites.join("");
    expect(stderr).toContain("The search timed out");
    expect(stderr).not.toContain('"error": "query_timeout"');
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
  });

  it("keeps the API error in --json output for a query timeout", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    stubFetch({ ok: false, error: "query_timeout" }, 503);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "--json", ...listGithub]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual({
      ok: false,
      error: "query_timeout",
      http_status: 503,
      body: { ok: false, error: "query_timeout" },
    });
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
  });

  it("passes through API errors without a hint", async () => {
    process.env.DX_API_BASE_URL = "https://api.example.com";
    getToken.mockReturnValue("token-123");
    stubFetch({ ok: false, error: "Invalid parameter: page_size" }, 400);
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", ...listGithub]);

    expect(stderrWrites.join("")).toContain("Invalid parameter: page_size");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("errors when both --linked and --unlinked are passed", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "linkableAccounts",
      "list",
      "--source",
      "github",
      "--linked",
      "--unlinked",
    ]);

    expect(stderrWrites.join("")).toContain(
      "--linked and --unlinked are mutually exclusive",
    );
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("errors when --source is missing", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run(["node", "dx", "users", "linkableAccounts", "list"]);

    expect(stderrWrites.join("")).toContain(
      "required option '--source <source>' not specified",
    );
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("rejects a non-positive --page-size", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "linkableAccounts",
      "list",
      "--source",
      "github",
      "--page-size",
      "0",
    ]);

    expect(stderrWrites.join("")).toContain(
      "--page-size must be a positive integer",
    );
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
  });

  it("exits with code 4 when no API token is configured", async () => {
    const exitSpy = vi
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "users",
      "linkableAccounts",
      "list",
      "--source",
      "github",
    ]);

    expect(stderrWrites.join("")).toContain("No API token configured");
    expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
  });
});

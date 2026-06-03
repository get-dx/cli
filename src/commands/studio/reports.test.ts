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

describe("studio reports command", () => {
  const report = {
    id: "rpt_new",
    name: "Deployment Health",
    description: "Deployment trends by week",
    markdown_notes: null,
    view_access_type: "everyone",
    edit_access_type: "specific_users",
    url: "https://app.example.com/datacloud/studio/reports/abc123",
    tiles: [
      {
        id: "tile_line",
        title: "Weekly deploys",
        sql: "SELECT week_start, deploys FROM deployments",
        chart_type: "line",
        chart_config: {
          xAxis: "week_start",
          yAxes: ["deploys"],
        },
      },
      {
        id: "tile_table",
        title: "Recent deploys",
        sql: "SELECT * FROM deployments LIMIT 10",
        chart_type: "table",
        chart_config: {},
      },
    ],
    created_at: "2026-04-13T20:10:05Z",
    updated_at: "2026-04-14T20:10:05Z",
  };
  const reportsResponse = {
    ok: true,
    reports: [report],
    response_metadata: {
      next_cursor: "rpt_new",
    },
  };
  const infoResponse = {
    ok: true,
    report,
  };

  describe("info", () => {
    it("fetches a studio report and prints a human-readable summary", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(infoResponse), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "info", "rpt_new"]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.info?id=rpt_new",
        expect.objectContaining({ method: "GET" }),
      );

      const output = stdoutWrites.join("");
      expect(output).toContain("Studio Report");
      expect(output).toContain("Deployment Health");
      expect(output).toContain("rpt_new");
      expect(output).toContain(
        "https://app.example.com/datacloud/studio/reports/abc123",
      );
      expect(output).toContain("### Tiles");
      expect(output).toContain("Weekly deploys (line)");
      expect(output).not.toContain("Weekly deploys (line, tile_line)");
      expect(output).toContain("Visible to everyone");
      expect(output).toContain("Editable by specific users");
      expect(output).not.toContain("View access: everyone");
      expect(output).not.toContain("Edit access: specific_users");
    });

    it("prints the JSON info payload with --json", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(infoResponse), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "reports",
        "info",
        "rpt_new",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual(infoResponse);
    });

    it("exits with code 2 when report id is missing", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "studio", "reports", "info"]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: false,
        error: "missing required argument 'id'",
      });
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("list", () => {
    it("lists studio reports and prints a human-readable summary", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(reportsResponse), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "list"]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.list",
        expect.objectContaining({ method: "GET" }),
      );

      const output = stdoutWrites.join("");
      expect(output).toContain("Studio Reports");
      expect(output).toContain("Displaying 1 reports.");
      expect(output).toContain("Deployment Health");
      expect(output).toContain("rpt_new");
      expect(output).toContain(
        "https://app.example.com/datacloud/studio/reports/abc123",
      );
      expect(output).toContain("Weekly deploys");
      expect(output).toContain("Recent deploys");
      expect(output).toContain("### Tiles");
      expect(output).toContain("Weekly deploys (line)");
      expect(output).not.toContain("Weekly deploys (line, tile_line)");
      expect(output).toContain("Visible to everyone");
      expect(output).toContain("Editable by specific users");
      expect(output).not.toContain("View access: everyone");
      expect(output).not.toContain("Edit access: specific_users");
      expect(output).toContain("Next cursor:");
    });

    it("renders access labels for direct URL and owner-only reports", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              reports: [
                {
                  ...report,
                  view_access_type: "owner_and_direct_url_only",
                  edit_access_type: "owner_only",
                },
              ],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "list"]);

      const output = stdoutWrites.join("");
      expect(output).toContain("Visible via direct URL");
      expect(output).toContain("Editable by owner only");
    });

    it("renders access labels for specific-user reports", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              reports: [
                {
                  ...report,
                  view_access_type: "specific_users",
                  edit_access_type: "specific_users",
                },
              ],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "list"]);

      const output = stdoutWrites.join("");
      expect(output).toContain("Visible to specific users");
      expect(output).toContain("Editable by specific users");
    });

    it("passes pagination and search options to the API", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            reports: [],
            response_metadata: { next_cursor: null },
          }),
          { status: 200 },
        ),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "list",
        "--limit",
        "25",
        "--cursor",
        "rpt_old",
        "--search-term",
        "deploy health",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.list?cursor=rpt_old&limit=25&search_term=deploy+health",
        expect.objectContaining({ method: "GET" }),
      );
      expect(stdoutWrites.join("")).toContain("Displaying 0 reports.");
    });

    it("prints the JSON results payload with --json", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(reportsResponse), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "studio", "reports", "list"]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual(reportsResponse);
    });

    it("exits with code 2 when --limit is not positive", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "reports",
        "list",
        "--limit",
        "0",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: false,
        error: "--limit must be a positive integer",
      });
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when --limit exceeds the API max", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "reports",
        "list",
        "--limit",
        "101",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: false,
        error: "--limit must be at most 100",
      });
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 4 when no API token is configured", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "list"]);

      expect(stderrWrites.join("")).toContain("No API token configured");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
    });
  });
});

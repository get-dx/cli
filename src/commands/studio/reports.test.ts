import { EventEmitter } from "events";
import fs from "fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";

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

/** Only stub fixture paths; config and Node internals still need real file reads. */
function stubReadFileSyncForFixturePath(
  fixturePathSubstring: string,
  content: string,
) {
  const realReadFileSync = fs.readFileSync.bind(fs);
  return vi.spyOn(fs, "readFileSync").mockImplementation((path, options) => {
    const resolved =
      path instanceof URL
        ? path.toString()
        : path instanceof Buffer
          ? path.toString("utf8")
          : String(path);
    if (resolved.includes(fixturePathSubstring)) {
      return content;
    }
    return realReadFileSync(path, options as never);
  });
}

describe("studio reports command", () => {
  const report = {
    id: "rpt_new",
    name: "Deployment Health",
    description: "Deployment trends by week",
    markdown_notes: null,
    view_access_type: "everyone",
    viewer_emails: [],
    edit_access_type: "specific_users",
    editor_emails: ["editor@example.com"],
    owner: {
      id: "usr_abc",
      name: "Alice Example",
      email: "alice@example.com",
    },
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

  describe("create", () => {
    it("--from-file posts YAML content to the API and renders the created report", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const createdReport = {
        ...report,
        id: "rpt_created",
        name: "Web Metrics",
        view_access_type: "specific_users",
        edit_access_type: "owner_only",
      };

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, report: createdReport }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-report.yaml",
        [
          "name: Web Metrics",
          "owner_email: owner@example.com",
          "description: Main application web visit metrics",
          "view_access_type: specific_users",
          "edit_access_type: owner_only",
          "viewer_emails:",
          "  - viewer@example.com",
          "tiles:",
          "  - title: Median visit duration",
          "    sql: SELECT avg(duration) AS avg_duration, week_start FROM custom_web_visits",
          "    chart_type: stacked_bar",
          "    chart_config:",
          "      xAxis: week_start",
          "      yAxes:",
          "        - avg_duration",
          "      groupingMode: clustered",
          "",
        ].join("\n"),
      );

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "create",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Web Metrics"'),
        }),
      );
      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body).toEqual({
        name: "Web Metrics",
        owner_email: "owner@example.com",
        description: "Main application web visit metrics",
        view_access_type: "specific_users",
        edit_access_type: "owner_only",
        viewer_emails: ["viewer@example.com"],
        tiles: [
          {
            title: "Median visit duration",
            sql: "SELECT avg(duration) AS avg_duration, week_start FROM custom_web_visits",
            chart_type: "stacked_bar",
            chart_config: {
              xAxis: "week_start",
              yAxes: ["avg_duration"],
              groupingMode: "clustered",
            },
          },
        ],
      });

      const output = stdoutWrites.join("");
      expect(output).toContain("Studio report created");
      expect(output).toContain("Web Metrics");
      expect(output).toContain("Visible to specific users");
      expect(output).toContain("Editable by owner only");
    });

    it("--from-file strips the id field before posting", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, report }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-report.yaml",
        "id: rpt_old\nname: Web Metrics\nowner_email: owner@example.com\n",
      );

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "create",
        "--from-file",
        "./my-report.yaml",
      ]);

      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body).not.toHaveProperty("id");
      expect(body.name).toBe("Web Metrics");
    });

    it("--from-file strips tile ids before posting", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, report }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-report.yaml",
        [
          "name: Web Metrics",
          "owner_email: owner@example.com",
          "tiles:",
          "  - id: tile_from_source",
          "    title: Median visit duration",
          "    sql: SELECT 1",
          "    chart_type: table",
          "    chart_config: {}",
          "",
        ].join("\n"),
      );

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "create",
        "--from-file",
        "./my-report.yaml",
      ]);

      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body.tiles).toEqual([
        {
          title: "Median visit duration",
          sql: "SELECT 1",
          chart_type: "table",
          chart_config: {},
        },
      ]);
    });

    it("--from-file returns JSON with --json flag", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const createdReport = { ...report, name: "JSON Report" };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, report: createdReport }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-report.yaml",
        "name: JSON Report\nowner_email: owner@example.com\n",
      );

      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "reports",
        "create",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        report: createdReport,
      });
    });

    it("--from-stdin posts YAML from stdin to the API", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const createdReport = { ...report, name: "Stdin Report" };
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, report: createdReport }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit(
          "data",
          Buffer.from("name: Stdin Report\nowner_email: owner@example.com\n"),
        );
        mockStdin.emit("end");
      });

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "create", "--from-stdin"]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Stdin Report"'),
        }),
      );
      expect(stdoutWrites.join("")).toContain("Studio report created");
    });

    it("requires at least one of --from-file or --from-stdin", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "create"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("--from-file");
    });

    it("rejects when multiple mode flags are provided", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "create",
        "--from-stdin",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("mutually exclusive");
    });

    it("rejects non-object YAML from --from-file", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath("my-report.yaml", "- item1\n- item2\n");

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "create",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("YAML content must be an object");
    });
  });

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
      expect(output).toContain("Alice Example (alice@example.com)");
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

  describe("init", () => {
    it("--id fetches the report and writes create YAML to the given path", async () => {
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
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "init",
        "./my-report.yaml",
        "--id",
        "rpt_new",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.info?id=rpt_new",
        expect.objectContaining({ method: "GET" }),
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-report.yaml",
        expect.stringContaining("name: Deployment Health"),
        "utf8",
      );
      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(yaml).toContain('owner_email: ""');
      expect(yaml).toContain("view_access_type: everyone");
      expect(yaml).toContain("edit_access_type: specific_users");
      expect(yaml).toContain("editor_emails:\n  - editor@example.com");
      expect(yaml).toContain("title: Weekly deploys");
      expect(yaml).toContain("chart_type: line");

      const output = stdoutWrites.join("");
      expect(output).toContain("Studio report template written");
      expect(output).toContain("./my-report.yaml");
      expect(output).toContain(
        "dx studio reports create --from-file ./my-report.yaml",
      );
    });

    it("--id carries over the report's specific-people viewer list", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              ok: true,
              report: {
                ...report,
                view_access_type: "specific_users",
                viewer_emails: ["viewer@example.com"],
              },
            }),
            { status: 200 },
          ),
        ),
      );
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "init",
        "./my-report.yaml",
        "--id",
        "rpt_new",
      ]);

      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(yaml).toContain("view_access_type: specific_users");
      expect(yaml).toContain("viewer_emails:\n  - viewer@example.com");
    });

    it("--id omits read-only fields from the written YAML", async () => {
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
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "init",
        "./my-report.yaml",
        "--id",
        "rpt_new",
      ]);

      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      // The report-level id is read-only and must not be written.
      expect(yaml).not.toContain("id: rpt_new");
      expect(yaml).not.toContain("url:");
      expect(yaml).not.toContain("created_at:");
      expect(yaml).not.toContain("updated_at:");
    });

    it("--id scaffolds each tile with its id so updates preserve tiles", async () => {
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
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "init",
        "./my-report.yaml",
        "--id",
        "rpt_new",
      ]);

      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(yaml).toContain("id: tile_line");
      expect(yaml).toContain("id: tile_table");

      // The scaffolded YAML round-trips into an update payload that keeps IDs.
      const parsed = parseYaml(yaml) as {
        tiles: { id: string }[];
      };
      expect(parsed.tiles.map((tile) => tile.id)).toEqual([
        "tile_line",
        "tile_table",
      ]);
    });

    it("--id returns JSON with --json flag", async () => {
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
      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "reports",
        "init",
        "./my-report.yaml",
        "--id",
        "rpt_new",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        id: "rpt_new",
        path: "./my-report.yaml",
      });
    });

    it("writes a blank report template to the given path", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "init",
        "./my-report.yaml",
      ]);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-report.yaml",
        expect.stringContaining("dx studio reports create --from-file <path>"),
        "utf8",
      );
      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(yaml).toContain("owner_email:");
      expect(yaml).toContain("view_access_type:");
      expect(yaml).toContain("edit_access_type:");
      expect(yaml).toContain("tiles:");
      expect(yaml).toContain("chart_type: table");

      const output = stdoutWrites.join("");
      expect(output).toContain("Blank template written");
      expect(output).toContain("./my-report.yaml");
      expect(output).toContain(
        "dx studio reports create --from-file ./my-report.yaml",
      );
    });

    it("returns JSON with --json flag", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "reports",
        "init",
        "./my-report.yaml",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        path: "./my-report.yaml",
      });
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

  describe("update", () => {
    it("--from-file posts YAML content to the API and renders the updated report", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedReport = {
        ...report,
        name: "Updated Metrics",
        view_access_type: "specific_users",
        edit_access_type: "owner_only",
      };
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, report: updatedReport }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-report.yaml",
        [
          "name: Updated Metrics",
          "description: Updated report description",
          "view_access_type: specific_users",
          "edit_access_type: owner_only",
          "viewer_emails:",
          "  - viewer@example.com",
          "tiles:",
          "  - title: New bar chart",
          "    sql: SELECT 1 AS value, CURRENT_DATE AS week_start",
          "    chart_type: stacked_bar",
          "    chart_config:",
          "      xAxis: week_start",
          "      yAxes:",
          "        - value",
          "      groupingMode: clustered",
          "",
        ].join("\n"),
      );

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "update",
        "rpt_new",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Updated Metrics"'),
        }),
      );
      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body).toEqual({
        id: "rpt_new",
        name: "Updated Metrics",
        description: "Updated report description",
        view_access_type: "specific_users",
        edit_access_type: "owner_only",
        viewer_emails: ["viewer@example.com"],
        tiles: [
          {
            title: "New bar chart",
            sql: "SELECT 1 AS value, CURRENT_DATE AS week_start",
            chart_type: "stacked_bar",
            chart_config: {
              xAxis: "week_start",
              yAxes: ["value"],
              groupingMode: "clustered",
            },
          },
        ],
      });

      const output = stdoutWrites.join("");
      expect(output).toContain("Studio report updated");
      expect(output).toContain("Updated Metrics");
      expect(output).toContain("Visible to specific users");
      expect(output).toContain("Editable by owner only");
    });

    it("--from-file always sends the id from the CLI argument", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, report }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-report.yaml",
        "id: rpt_from_file\nname: Updated Metrics\n",
      );

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "update",
        "rpt_from_cli",
        "--from-file",
        "./my-report.yaml",
      ]);

      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body.id).toBe("rpt_from_cli");
      expect(body.name).toBe("Updated Metrics");
    });

    it("--from-file returns JSON with --json flag", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedReport = { ...report, name: "JSON Updated Report" };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, report: updatedReport }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-report.yaml",
        "name: JSON Updated Report\n",
      );

      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "reports",
        "update",
        "rpt_new",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        report: updatedReport,
      });
    });

    it("--from-file surfaces an API error", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: false, error: "invalid_payload" }),
            {
              status: 422,
            },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath("my-report.yaml", "name: Bad Report\n");

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "update",
        "rpt_new",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("422");
    });

    it("--from-stdin posts YAML from stdin to the API", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedReport = { ...report, name: "Stdin Updated Report" };
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, report: updatedReport }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit("data", Buffer.from("name: Stdin Updated Report\n"));
        mockStdin.emit("end");
      });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "update",
        "rpt_new",
        "--from-stdin",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.reports.update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Stdin Updated Report"'),
        }),
      );
      expect(stdoutWrites.join("")).toContain("Studio report updated");
    });

    it("requires at least one of --from-file or --from-stdin", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "reports", "update", "rpt_new"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("--from-file");
    });

    it("rejects when multiple mode flags are provided", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "update",
        "rpt_new",
        "--from-stdin",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("mutually exclusive");
    });

    it("rejects non-object YAML from --from-file", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath("my-report.yaml", "- item1\n- item2\n");

      await run([
        "node",
        "dx",
        "studio",
        "reports",
        "update",
        "rpt_new",
        "--from-file",
        "./my-report.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("YAML content must be an object");
    });
  });
});

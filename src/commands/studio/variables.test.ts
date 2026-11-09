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

describe("studio variables command", () => {
  const selectVariable = {
    id: "var_select",
    name: "team_filter",
    label: "Team Filter",
    custom: true,
    variable_type: "select",
    single_select: false,
    source_sql: "SELECT name AS label, id AS value FROM teams",
    quote_values: true,
    public: true,
    creator_id: "usr_abc",
    creator_name: "Alice Example",
    creator_email: "alice@example.com",
    can_be_modified: true,
    can_be_deleted: false,
    can_be_made_private: false,
  };
  const textVariable = {
    id: "var_text",
    name: "search_text",
    label: "Search Text",
    custom: true,
    variable_type: "text",
    single_select: null,
    source_sql: null,
    quote_values: false,
    public: false,
    creator_id: "usr_abc",
    creator_name: "Alice Example",
    creator_email: "alice@example.com",
    can_be_modified: true,
    can_be_deleted: true,
    can_be_made_private: true,
  };
  const builtInListItem = {
    name: "start_date",
    label: "Start Date",
  };
  const customListItem = {
    id: "var_custom",
    name: selectVariable.name,
    label: selectVariable.label,
    creator_name: selectVariable.creator_name,
    creator_email: selectVariable.creator_email,
  };
  const listResponse = {
    ok: true,
    variables: {
      built_in: [builtInListItem],
      custom: [customListItem],
    },
  };
  const infoResponse = {
    ok: true,
    variable: selectVariable,
  };

  describe("create", () => {
    it("--from-file posts YAML content to the API and renders the created variable", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, variable: selectVariable }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-variable.yaml",
        [
          "name: team_filter",
          "label: Team Filter",
          "variable_type: select",
          "single_select: false",
          "source_sql: SELECT name AS label, id AS value FROM teams",
          "quote_values: true",
          "public: true",
          "",
        ].join("\n"),
      );

      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "create",
        "--from-file",
        "./my-variable.yaml",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"team_filter"'),
        }),
      );
      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body).toEqual({
        name: "team_filter",
        label: "Team Filter",
        variable_type: "select",
        single_select: false,
        source_sql: "SELECT name AS label, id AS value FROM teams",
        quote_values: true,
        public: true,
      });

      const output = stdoutWrites.join("");
      expect(output).toContain("Studio variable created");
      expect(output).toContain("Team Filter");
      expect(output).toContain("$team_filter");
      expect(output).toContain("var_select");
      expect(output).toContain("Alice Example (alice@example.com)");
      expect(output).toContain("Dropdown menu");
      expect(output).toContain("Multi-select");
    });

    it("--from-file returns JSON with --json flag", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, variable: textVariable }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-variable.yaml",
        "name: search_text\nlabel: Search Text\nvariable_type: text\n",
      );

      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "variables",
        "create",
        "--from-file",
        "./my-variable.yaml",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        variable: textVariable,
      });
    });

    it("--from-stdin posts YAML from stdin to the API", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, variable: textVariable }), {
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
          Buffer.from(
            "name: search_text\nlabel: Search Text\nvariable_type: text\n",
          ),
        );
        mockStdin.emit("end");
      });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "create",
        "--from-stdin",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"search_text"'),
        }),
      );
      const output = stdoutWrites.join("");
      expect(output).toContain("Studio variable created");
      expect(output).toContain("Text field");
    });

    it("requires at least one of --from-file or --from-stdin", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "create"]);

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
        "variables",
        "create",
        "--from-stdin",
        "--from-file",
        "./my-variable.yaml",
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
      stubReadFileSyncForFixturePath("my-variable.yaml", "- item1\n- item2\n");

      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "create",
        "--from-file",
        "./my-variable.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("YAML content must be an object");
    });
  });

  describe("delete", () => {
    it("posts the identifier to the API and prints a confirmation", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true }), { status: 200 }),
        );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "delete", "team_filter"]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.delete",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ identifier: "team_filter" }),
        }),
      );
      expect(stdoutWrites.join("")).toContain(
        'Studio variable "team_filter" deleted',
      );
    });

    it("surfaces an API error", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: false, error: "in_use" }), {
            status: 422,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "delete", "team_filter"]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("422");
    });

    it("exits with code 2 when identifier is missing", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "studio", "variables", "delete"]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: false,
        error: "missing required argument 'identifier'",
      });
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("info", () => {
    it("fetches a studio variable and prints a human-readable summary", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(infoResponse), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "info", "team_filter"]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.info?identifier=team_filter",
        expect.objectContaining({ method: "GET" }),
      );

      const output = stdoutWrites.join("").replaceAll(/ \s+/g, " ");
      expect(output).toContain("Team Filter ($team_filter)");
      expect(output).toContain("ID: var_select");
      expect(output).toContain("Creator: Alice Example (alice@example.com)");
      expect(output).toContain("Type: Dropdown menu");
      expect(output).toContain("Selection: Multi-select");
      expect(output).toContain("SQL: \"SELECT name AS label");
      expect(output).toContain("Values in SQL: Adds quotes around values");
      expect(output).toContain("Can modify?: Yes");
      expect(output).toContain("Can delete?: No");
    });

    it("renders text variables without selection details", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, variable: textVariable }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "info", "search_text"]);

      const output = stdoutWrites.join("");
      expect(output).toContain("Text field");
      expect(output).toContain("Inserts values directly");
      expect(output).not.toContain("Multi-select");
      expect(output).not.toContain("Single-select");
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
        "variables",
        "info",
        "team_filter",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual(infoResponse);
    });

    it("exits with code 2 when identifier is missing", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "studio", "variables", "info"]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: false,
        error: "missing required argument 'identifier'",
      });
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("init", () => {
    it("--from fetches the variable and writes create YAML to the given path", async () => {
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
        "variables",
        "init",
        "./my-variable.yaml",
        "--from",
        "team_filter",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.info?identifier=team_filter",
        expect.objectContaining({ method: "GET" }),
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-variable.yaml",
        expect.stringContaining("name: team_filter"),
        "utf8",
      );
      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(parseYaml(yaml)).toEqual({
        name: "team_filter",
        label: "Team Filter",
        variable_type: "select",
        single_select: false,
        source_sql: "SELECT name AS label, id AS value FROM teams",
        quote_values: true,
        public: true,
      });

      const output = stdoutWrites.join("");
      expect(output).toContain("Template from existing variable");
      expect(output).toContain("team_filter");
      expect(output).toContain("./my-variable.yaml");
      expect(output).toContain(
        "dx studio variables create --from-file ./my-variable.yaml",
      );
    });

    it("--from omits select-only and read-only fields for text variables", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, variable: textVariable }), {
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
        "variables",
        "init",
        "./my-variable.yaml",
        "--from",
        "search_text",
      ]);

      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(parseYaml(yaml)).toEqual({
        name: "search_text",
        label: "Search Text",
        variable_type: "text",
        quote_values: false,
        public: false,
      });
      expect(yaml).not.toContain("var_text");
      expect(yaml).not.toContain("creator");
      expect(yaml).not.toContain("can_be_");
    });

    it("--from returns JSON with --json flag", async () => {
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
        "variables",
        "init",
        "./my-variable.yaml",
        "--from",
        "team_filter",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        identifier: "team_filter",
        path: "./my-variable.yaml",
      });
    });

    it("--from exits with an argument error when the variable is not found", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: false, error: "not_found" }), {
            status: 404,
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
        "variables",
        "init",
        "./my-variable.yaml",
        "--from",
        "missing_variable",
      ]);

      expect(writeFileSyncSpy).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        'Failed to fetch studio variable "missing_variable"',
      );
    });

    it("writes a blank variable template to the given path", async () => {
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
        "variables",
        "init",
        "./my-variable.yaml",
      ]);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-variable.yaml",
        expect.stringContaining(
          "dx studio variables create --from-file <path>",
        ),
        "utf8",
      );
      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(yaml).toContain("name:");
      expect(yaml).toContain("label:");
      expect(yaml).toContain("variable_type:");
      expect(yaml).toContain("source_sql:");

      const output = stdoutWrites.join("");
      expect(output).toContain("Blank template written");
      expect(output).toContain("./my-variable.yaml");
      expect(output).toContain(
        "dx studio variables create --from-file ./my-variable.yaml",
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
        "variables",
        "init",
        "./my-variable.yaml",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        path: "./my-variable.yaml",
      });
    });
  });

  describe("list", () => {
    it("lists built-in and custom studio variables and prints a human-readable summary", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(listResponse), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "list"]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.list",
        expect.objectContaining({ method: "GET" }),
      );

      const output = stdoutWrites.join("").replaceAll(/ \s+/g, " ");
      expect(output).toContain("Studio Variables");
      expect(output).toContain("Displaying 2 variables.");
      expect(output).toContain("Team Filter ($team_filter)");
      expect(output).toContain("Creator: Alice Example (alice@example.com)");
      expect(output).toContain("Start Date: $start_date");
    });

    it("renders an empty list", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ ok: true, variables: { built_in: [], custom: [] } }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "list"]);

      const output = stdoutWrites.join("");
      expect(output).toContain("Displaying 0 variables.");
      expect(output).toContain("(None)");
    });

    it("prints the JSON results payload with --json", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify(listResponse), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "studio", "variables", "list"]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual(listResponse);
    });

    it("exits with code 4 when no API token is configured", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "list"]);

      expect(stderrWrites.join("")).toContain("No API token configured");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
    });
  });

  describe("update", () => {
    it("--from-file posts YAML content to the API and renders the updated variable", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedVariable = { ...selectVariable, label: "Updated Label" };
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, variable: updatedVariable }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-variable.yaml",
        [
          "name: team_filter",
          "label: Updated Label",
          "variable_type: select",
          "single_select: true",
          "source_sql: SELECT 1 AS label, 1 AS value",
          "",
        ].join("\n"),
      );

      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "update",
        "team_filter",
        "--from-file",
        "./my-variable.yaml",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"label":"Updated Label"'),
        }),
      );
      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body).toEqual({
        identifier: "team_filter",
        name: "team_filter",
        label: "Updated Label",
        variable_type: "select",
        single_select: true,
        source_sql: "SELECT 1 AS label, 1 AS value",
      });

      const output = stdoutWrites.join("");
      expect(output).toContain("Studio variable updated");
      expect(output).toContain("Updated Label");
    });

    it("--from-file always sends the identifier from the CLI argument", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(infoResponse), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-variable.yaml",
        "identifier: from_file\nname: team_filter\n",
      );

      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "update",
        "from_cli",
        "--from-file",
        "./my-variable.yaml",
      ]);

      const body = JSON.parse(
        (fetchMock.mock.calls[0][1] as { body: string }).body,
      );
      expect(body.identifier).toBe("from_cli");
      expect(body.name).toBe("team_filter");
    });

    it("--from-file returns JSON with --json flag", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedVariable = { ...selectVariable, label: "JSON Updated" };
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValueOnce(
          new Response(
            JSON.stringify({ ok: true, variable: updatedVariable }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath(
        "my-variable.yaml",
        "label: JSON Updated\n",
      );

      await run([
        "node",
        "dx",
        "--json",
        "studio",
        "variables",
        "update",
        "team_filter",
        "--from-file",
        "./my-variable.yaml",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        variable: updatedVariable,
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
      stubReadFileSyncForFixturePath("my-variable.yaml", "label: Bad\n");

      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "update",
        "team_filter",
        "--from-file",
        "./my-variable.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("422");
    });

    it("--from-stdin posts YAML from stdin to the API", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedVariable = { ...selectVariable, label: "Stdin Updated" };
      const fetchMock = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true, variable: updatedVariable }), {
          status: 200,
        }),
      );
      vi.stubGlobal("fetch", fetchMock);

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit("data", Buffer.from("label: Stdin Updated\n"));
        mockStdin.emit("end");
      });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "update",
        "team_filter",
        "--from-stdin",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/studio.variables.update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"label":"Stdin Updated"'),
        }),
      );
      expect(stdoutWrites.join("")).toContain("Studio variable updated");
    });

    it("requires at least one of --from-file or --from-stdin", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "studio", "variables", "update", "team_filter"]);

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
        "variables",
        "update",
        "team_filter",
        "--from-stdin",
        "--from-file",
        "./my-variable.yaml",
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
      stubReadFileSyncForFixturePath("my-variable.yaml", "- item1\n- item2\n");

      await run([
        "node",
        "dx",
        "studio",
        "variables",
        "update",
        "team_filter",
        "--from-file",
        "./my-variable.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("YAML content must be an object");
    });
  });
});

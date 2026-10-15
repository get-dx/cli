import { EventEmitter } from "events";
import fs from "fs";
import os from "os";
import path from "path";

import { parse as parseYaml } from "yaml";

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

describe("workflows commands", () => {
  describe("create", () => {
    const createResponse = {
      ok: true as const,
      workflow: {
        identifier: "provision-single-tenant-instance",
        name: "Provision Single-tenant Instance",
        description: null,
        icon: null,
        color: "#38bdf8",
        scope: "GLOBAL",
        entity_filter_type: "ENTITY_TYPES",
        entity_filter_sql: null,
        entity_filter_type_identifiers: [],
        execution_type: "SIMPLE",
        trigger_type: "ANY",
        parameters: [],
      },
    };

    const workflowYaml = [
      "identifier: provision-single-tenant-instance",
      "name: Provision Single-tenant Instance",
      "scope: GLOBAL",
      "execution_type: SIMPLE",
      "entity_filter_type: ENTITY_TYPES",
      "http_request:",
      "  method: POST",
      "  url: https://example.com/provision",
      "  headers: {}",
      "  body: null",
      "",
    ].join("\n");

    function stubCreateFetch() {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify(createResponse), { status: 200 }),
          ),
      );
    }

    function postedBody(): Record<string, unknown> {
      const init = vi.mocked(fetch).mock.calls[0][1] as { body: string };
      return JSON.parse(init.body) as Record<string, unknown>;
    }

    it("--from-file posts the file contents to the API", async () => {
      stubCreateFetch();
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-workflows-"));
      const file = path.join(dir, "workflow.yaml");
      fs.writeFileSync(file, workflowYaml);

      try {
        const { run } = await import("../cli.js");
        await run(["node", "dx", "workflows", "create", "--from-file", file]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/workflows.create",
        expect.objectContaining({ method: "POST" }),
      );
      expect(postedBody()).toMatchObject({
        identifier: "provision-single-tenant-instance",
        scope: "GLOBAL",
        http_request: { method: "POST", url: "https://example.com/provision" },
      });
      expect(stdoutWrites.join("")).toContain("Workflow created");
      expect(stdoutWrites.join("")).toContain(
        "provision-single-tenant-instance",
      );
    });

    it("--from-stdin posts JSON from stdin to the API", async () => {
      stubCreateFetch();
      const { run } = await import("../cli.js");

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit(
          "data",
          Buffer.from(
            '{"identifier":"provision-single-tenant-instance","name":"Provision Single-tenant Instance"}',
          ),
        );
        mockStdin.emit("end");
      });

      await run(["node", "dx", "workflows", "create", "--from-stdin"]);

      expect(postedBody()).toEqual({
        identifier: "provision-single-tenant-instance",
        name: "Provision Single-tenant Instance",
      });
    });

    it("prints the API response with --json", async () => {
      stubCreateFetch();
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dx-workflows-"));
      const file = path.join(dir, "workflow.yaml");
      fs.writeFileSync(file, workflowYaml);

      try {
        const { run } = await import("../cli.js");
        await run([
          "node",
          "dx",
          "--json",
          "workflows",
          "create",
          "--from-file",
          file,
        ]);
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }

      expect(JSON.parse(stdoutWrites.join(""))).toEqual(createResponse);
    });

    it("requires one of --from-file or --from-stdin", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../cli.js");
      await run(["node", "dx", "workflows", "create"]);

      expect(stderrWrites.join("")).toContain(
        "One of --from-file or --from-stdin is required",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("rejects --from-file together with --from-stdin", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "workflows",
        "create",
        "--from-file",
        "workflow.yaml",
        "--from-stdin",
      ]);

      expect(stderrWrites.join("")).toContain("mutually exclusive");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("errors when the content is not an object", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      const { run } = await import("../cli.js");

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit("data", Buffer.from("- a\n- b\n"));
        mockStdin.emit("end");
      });

      await run(["node", "dx", "workflows", "create", "--from-stdin"]);

      expect(stderrWrites.join("")).toContain(
        "Content must be a YAML or JSON object",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("errors when not authenticated", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue(undefined);
      vi.stubGlobal("fetch", vi.fn());
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "workflows",
        "create",
        "--from-file",
        "workflow.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
      expect(stderrWrites.join("")).toMatch(/not authenticated|token/i);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("surfaces API validation errors", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: false,
              error: "workflow_parameter_validation_failed",
            }),
            { status: 422 },
          ),
        ),
      );
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      const { run } = await import("../cli.js");

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit("data", Buffer.from("identifier: x\nname: X\n"));
        mockStdin.emit("end");
      });

      await run(["node", "dx", "workflows", "create", "--from-stdin"]);

      expect(stderrWrites.join("")).toContain(
        "workflow_parameter_validation_failed",
      );
      expect(exitSpy).toHaveBeenCalled();
    });
  });

  describe("init", () => {
    it("writes a blank template that parses as a workflow payload", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");
      const { run } = await import("../cli.js");
      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      await run(["node", "dx", "workflows", "init", "./my-workflow.yaml"]);

      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-workflow.yaml",
        expect.stringContaining("http_request:"),
        "utf8",
      );
      const written = writeFileSyncSpy.mock.calls[0][1] as string;
      expect(parseYaml(written)).toMatchObject({
        scope: "GLOBAL",
        execution_type: "SIMPLE",
        entity_filter_type: "ENTITY_TYPES",
        http_request: { method: "POST", body: expect.any(String) },
      });
      const out = stdoutWrites.join("");
      expect(out).toContain("./my-workflow.yaml");
      expect(out).toContain("dx workflows create --from-file");
    });

    it("prints the path with --json", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");
      const { run } = await import("../cli.js");
      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      await run([
        "node",
        "dx",
        "--json",
        "workflows",
        "init",
        "./my-workflow.yaml",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: true,
        path: "./my-workflow.yaml",
      });
    });
  });

  describe("list", () => {
    const listResponse = {
      ok: true as const,
      workflows: [
        {
          identifier: "provision-single-tenant-instance",
          name: "Provision Single-tenant Instance",
          description: "Create a new single-tenant instance",
          icon: "globe",
          color: "#38bdf8",
          scope: "ENTITY",
          entity_filter_type: "ENTITY_TYPES",
          entity_filter_sql: null,
          entity_filter_type_identifiers: ["service"],
          execution_type: "EVENT_DRIVEN",
          trigger_type: "ANY",
          parameters: [
            {
              identifier: "app_name",
              name: "App name",
              description: "The name of the app",
              default_value: null,
              is_required: true,
              type: "STRING",
              definition: null,
            },
          ],
        },
      ],
    };

    it("lists workflows in human-readable output", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify(listResponse), { status: 200 }),
          ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "workflows", "list"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/workflows.list",
        expect.objectContaining({ method: "GET" }),
      );
      const out = stdoutWrites.join("");
      expect(out).toContain("Workflows");
      expect(out).toContain("Provision Single-tenant Instance");
      expect(out).toContain("provision-single-tenant-instance");
      expect(out).toContain("Catalog entity");
      expect(out).toContain("Event-driven");
      expect(out).toContain("All users");
    });

    it("prints the API response with --json", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify(listResponse), { status: 200 }),
          ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "workflows", "list"]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual(listResponse);
    });

    it("sends scope and entity_identifier query params when set", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: true, workflows: [] }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "workflows",
        "list",
        "--scope",
        "ENTITY",
        "--entity-identifier",
        "acme-app",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/workflows.list?scope=ENTITY&entity_identifier=acme-app",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("errors when --entity-identifier is used without --scope ENTITY", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "workflows",
        "list",
        "--entity-identifier",
        "acme-app",
      ]);

      expect(stderrWrites.join("")).toContain(
        "--entity-identifier requires --scope ENTITY",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("errors on invalid --scope", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../cli.js");
      await run(["node", "dx", "workflows", "list", "--scope", "TEAM"]);

      expect(stderrWrites.join("")).toContain(
        "--scope must be one of: GLOBAL, ENTITY",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });
});

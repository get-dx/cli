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
      process.env.DX_BASE_URL = "https://api.example.com";
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
      expect(out).toContain("ENTITY");
    });

    it("prints the API response with --json", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
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
      process.env.DX_BASE_URL = "https://api.example.com";
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

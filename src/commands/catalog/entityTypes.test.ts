import fs from "fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../../errors.js";
import type { EntityType } from "./entityTypes.js";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../../secrets.js", () => ({
  setToken,
  deleteToken,
  getToken,
}));

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  getToken.mockReset();
  setToken.mockReset();
  deleteToken.mockReset();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.unstubAllGlobals();
});

const MOCK_ENTITY_TYPE: EntityType = {
  identifier: "service",
  name: "Service",
  description: "A microservice",
  icon: null,
  ordering: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
  properties: [
    {
      identifier: "language",
      name: "Language",
      description: "Primary programming language",
      type: "select",
      ordering: 0,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      definition: { options: [{ value: "TypeScript", color: "#3178c6" }] },
      is_required: false,
      visibility: "visible",
    },
  ],
  aliases: { github_repo: [] },
};

describe("catalog entityTypes commands", () => {
  describe("create", () => {
    it("--from-file posts YAML content to the API and renders the created entity type", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const createdEntityType = { ...MOCK_ENTITY_TYPE, name: "New Service" };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, entity_type: createdEntityType }),
              { status: 200 },
            ),
          ),
      );

      // Import before mocking readFileSync — the initial module load reads the
      // blank template from disk via fs.readFileSync; mocking it beforehand would
      // intercept Node's own CJS loader and cause a SyntaxError.
      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "identifier: service\nname: New Service\n",
      );

      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "create",
        "--from-file",
        "./my-entity-type.yaml",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"New Service"'),
        }),
      );
      const out = writes.join("");
      expect(out).toContain("New Service");
      expect(out).toContain("Entity type created");
    });

    it("--from-file returns JSON with --json flag", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity_type: { ...MOCK_ENTITY_TYPE, name: "New Service" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "identifier: service\nname: New Service\n",
      );

      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "create",
        "--from-file",
        "./my-entity-type.yaml",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.entity_type.name).toBe("New Service");
    });

    it("errors when neither --from-file nor --from-stdin is provided", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "entityTypes", "create"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        "One of --from-file or --from-stdin is required",
      );
    });

    it("errors when both --from-file and --from-stdin are provided", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "create",
        "--from-file",
        "./my-entity-type.yaml",
        "--from-stdin",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("mutually exclusive");
    });

    it("--from-file surfaces an API error", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: false, error: "invalid_payload" }),
              { status: 422 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "identifier: service\nname: Bad Entity\n",
      );

      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "create",
        "--from-file",
        "./my-entity-type.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("422");
    });
  });

  describe("delete", () => {
    it("deletes an entity type", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity_type: {
                identifier: "service",
                name: "Service",
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "delete",
        "service",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.delete?identifier=service",
        expect.objectContaining({ method: "POST" }),
      );
      const out = writes.join("");
      expect(out).toContain('"identifier": "service"');
      expect(out).toContain('"name": "Service"');
    });
  });

  describe("info", () => {
    it("fetches entity type info", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity_type: {
                identifier: "service",
                name: "Service",
                description: "A microservice",
                ordering: 0,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-02T00:00:00Z",
                properties: [{ name: "Language" }],
                aliases: { github_repo: true },
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "info",
        "service",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.info?identifier=service",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain('"identifier": "service"');
      expect(out).toContain('"name": "Service"');
    });

    it("supports filtering sections with --include", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity_type: {
                identifier: "service",
                name: "Service",
                description: "A microservice",
                ordering: 0,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-02T00:00:00Z",
                properties: [{ name: "Language" }],
                aliases: { github_repo: true },
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "info",
        "service",
        "--include",
        "core",
      ]);

      const out = writes.join("");
      expect(out).toContain('"identifier": "service"');
      expect(out).not.toContain("properties");
      expect(out).not.toContain("aliases");
    });

    it("rejects an invalid --include section", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity_type: { identifier: "service", name: "Service" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "info",
        "service",
        "--include",
        "owners",
      ]);

      expect(stderrWrites.join("")).toContain('Invalid --include "owners"');
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("init", () => {
    it("--identifier fetches the entity type and writes YAML to the given path", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, entity_type: MOCK_ENTITY_TYPE }),
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
        "catalog",
        "entityTypes",
        "init",
        "./my-entity-type.yaml",
        "--identifier",
        "service",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.info?identifier=service",
        expect.objectContaining({ method: "GET" }),
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-entity-type.yaml",
        expect.stringContaining("Service"),
        "utf8",
      );
      const out = writes.join("");
      expect(out).toContain("./my-entity-type.yaml");
    });

    it("--identifier omits read-only keys from the written YAML", async () => {
      vi.spyOn(process.stdout, "write").mockImplementation(
        (() => true) as typeof process.stdout.write,
      );

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, entity_type: MOCK_ENTITY_TYPE }),
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
        "catalog",
        "entityTypes",
        "init",
        "./my-entity-type.yaml",
        "--identifier",
        "service",
      ]);

      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(yaml).not.toContain("created_at");
      expect(yaml).not.toContain("updated_at");
      expect(yaml).not.toContain("icon");
      expect(yaml).not.toContain("ordering");
    });

    it("--identifier returns JSON with --json flag", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, entity_type: MOCK_ENTITY_TYPE }),
              { status: 200 },
            ),
          ),
      );

      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "init",
        "./my-entity-type.yaml",
        "--identifier",
        "service",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.identifier).toBe("service");
      expect(parsed.path).toBe("./my-entity-type.yaml");
    });

    it("without --identifier writes a blank template without fetching", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
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
        "catalog",
        "entityTypes",
        "init",
        "./my-entity-type.yaml",
      ]);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-entity-type.yaml",
        expect.stringContaining("identifier"),
        "utf8",
      );
      const out = writes.join("");
      expect(out).toContain("./my-entity-type.yaml");
    });

    it("without --identifier returns JSON with --json flag", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "init",
        "./my-entity-type.yaml",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.path).toBe("./my-entity-type.yaml");
      expect(parsed).not.toHaveProperty("identifier");
    });

    it("--identifier surfaces a fetch error with ARGUMENT_ERROR exit for 4xx", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: false, error: "not_found" }), {
            status: 404,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "init",
        "./my-entity-type.yaml",
        "--identifier",
        "nonexistent",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        'Failed to fetch entity type "nonexistent"',
      );
    });
  });

  describe("list", () => {
    it("lists entity types in the catalog", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity_types: [
                { identifier: "service", name: "Service" },
                { identifier: "library", name: "Library" },
              ],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "catalog", "entityTypes", "list"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.list",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain('"identifier": "service"');
      expect(out).toContain('"identifier": "library"');
    });

    it("supports filtering sections with --include", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity_types: [
                {
                  identifier: "service",
                  name: "Service",
                  description: "A service type",
                  icon: "database",
                  ordering: 1,
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-02T00:00:00Z",
                  properties: [{ name: "Language" }],
                  aliases: { github_repo: [] },
                },
              ],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "list",
        "--include",
        "core",
      ]);

      const out = writes.join("");
      expect(out).toContain('"identifier": "service"');
      expect(out).not.toContain("properties");
      expect(out).not.toContain("aliases");
    });
  });

  describe("update", () => {
    it("--from-file posts YAML content to the API and renders the updated entity type", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedEntityType = {
        ...MOCK_ENTITY_TYPE,
        name: "Updated Service",
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, entity_type: updatedEntityType }),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "identifier: service\nname: Updated Service\n",
      );

      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "update",
        "service",
        "--from-file",
        "./my-entity-type.yaml",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Updated Service"'),
        }),
      );
      const out = writes.join("");
      expect(out).toContain("Updated Service");
      expect(out).toContain("Entity type updated");
    });

    it("--from-file always sends the identifier from the CLI argument", async () => {
      vi.spyOn(process.stdout, "write").mockImplementation(
        (() => true) as typeof process.stdout.write,
      );

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, entity_type: MOCK_ENTITY_TYPE }),
              { status: 200 },
            ),
          ),
      );

      // YAML omits the identifier — it should be sent from the CLI argument
      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "name: Updated Service\n",
      );

      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "update",
        "service",
        "--from-file",
        "./my-entity-type.yaml",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.update",
        expect.objectContaining({
          body: expect.stringContaining('"identifier":"service"'),
        }),
      );
    });

    it("--from-file returns JSON with --json flag", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedEntityType = {
        ...MOCK_ENTITY_TYPE,
        name: "Updated Service",
      };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, entity_type: updatedEntityType }),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "identifier: service\nname: Updated Service\n",
      );

      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entityTypes",
        "update",
        "service",
        "--from-file",
        "./my-entity-type.yaml",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.entity_type.name).toBe("Updated Service");
    });

    it("--from-file surfaces an API error", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: false, error: "conflict" }), {
            status: 409,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "identifier: service\nname: Updated Service\n",
      );

      await run([
        "node",
        "dx",
        "catalog",
        "entityTypes",
        "update",
        "service",
        "--from-file",
        "./my-entity-type.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("409");
    });

    it("errors when neither --from-file nor --from-stdin is provided", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "entityTypes", "update", "service"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        "One of --from-file or --from-stdin is required",
      );
    });
  });
});

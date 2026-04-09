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

describe("catalog entityTypes commands", () => {
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
});

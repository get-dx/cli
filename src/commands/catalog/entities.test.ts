import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

describe("catalog entities commands", () => {
  describe("info", () => {
    it("uses the configured token and endpoint", async () => {
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
              entity: { identifier: "svc-a", name: "Service A" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "info",
        "svc-a",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.info?identifier=svc-a",
        expect.objectContaining({
          method: "GET",
          headers: expect.any(Headers),
        }),
      );
      expect(writes.join("")).toContain('"identifier": "svc-a"');
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
              entity: {
                identifier: "svc-a",
                name: "Service A",
                type: "service",
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-02T00:00:00Z",
                description: "A service",
                owner_teams: [{ id: "t1", name: "Team" }],
                owner_users: [],
                properties: { Language: ["Ruby"] },
                aliases: { github_repo: [] },
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "info",
        "svc-a",
        "--include",
        "core",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.info?identifier=svc-a",
        expect.any(Object),
      );
      const out = writes.join("");
      expect(out).toContain('"identifier": "svc-a"');
      expect(out).not.toContain("owner_teams");
      expect(out).not.toContain("properties");
      expect(out).not.toContain("aliases");
    });

    it("sends agent provenance from environment variables", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      process.env.DX_AGENT_NAME = "codex";
      process.env.DX_AGENT_SESSION_ID = "session-123";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              entity: { identifier: "svc-a", name: "Service A" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "info",
        "svc-a",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.info?identifier=svc-a",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            get: expect.any(Function),
          }),
        }),
      );

      const headers = (vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit)
        .headers as Headers;
      expect(headers.get("X-DX-Agent-Name")).toBe("codex");
      expect(headers.get("X-DX-Agent-Session-Id")).toBe("session-123");
    });
  });

  describe("list", () => {
    it("lists entities in the catalog", async () => {
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
              entities: [
                { identifier: "svc-a", name: "Service A" },
                { identifier: "svc-b", name: "Service B" },
              ],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "list",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.list",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain('"identifier": "svc-a"');
      expect(out).toContain('"identifier": "svc-b"');
    });

    it("supports cursor-based pagination", async () => {
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
              entities: [{ identifier: "svc-c", name: "Service C" }],
              response_metadata: { next_cursor: "next-page-cursor" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "list",
        "--cursor",
        "some-cursor",
        "--limit",
        "5",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.list?cursor=some-cursor&limit=5",
        expect.objectContaining({ method: "GET" }),
      );
      expect(writes.join("")).toContain('"next_cursor": "next-page-cursor"');
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
              entities: [
                {
                  identifier: "svc-a",
                  name: "Service A",
                  type: "service",
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-02T00:00:00Z",
                  description: "A service",
                  owner_teams: [{ id: "t1", name: "Team" }],
                  owner_users: [],
                  properties: { Language: ["Ruby"] },
                  aliases: { github_repo: [] },
                },
              ],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "list",
        "--include",
        "core",
      ]);

      const out = writes.join("");
      expect(out).toContain('"identifier": "svc-a"');
      expect(out).not.toContain("owner_teams");
      expect(out).not.toContain("properties");
      expect(out).not.toContain("aliases");
    });

    it("rejects limit parameter less than 1", async () => {
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

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "entities", "list", "--limit", "0"]);

      expect(stderrWrites.join("")).toContain(
        "--limit must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });
  });
});

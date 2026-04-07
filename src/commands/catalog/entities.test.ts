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

  describe("create", () => {
    const mockEntity = {
      identifier: "my-service",
      name: "My Service",
      type: "service",
      created_at: "2025-01-02T20:48:45.779Z",
      updated_at: "2025-01-02T20:48:45.779Z",
      description: "",
      owner_teams: [],
      owner_users: [],
      properties: {},
      aliases: {},
    };

    it("creates an entity and outputs the result", async () => {
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
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "my-service",
        "--type",
        "service",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ identifier: "my-service", type: "service" }),
        }),
      );
      const out = writes.join("");
      expect(out).toContain('"my-service"');
      expect(out).toContain('"My Service"');
    });

    it("includes optional fields in the request body when provided", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "my-service",
        "--type",
        "service",
        "--name",
        "My Service",
        "--description",
        "A test service",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            name: "My Service",
            description: "A test service",
          }),
        }),
      );
    });

    it("splits --owner-team-ids into an array in the request body", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { createProgram } = await import("../../cli.js");
      await createProgram().parseAsync([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "my-service",
        "--type",
        "service",
        "--owner-team-ids",
        "MzI1NTk,abc123",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            owner_team_ids: ["MzI1NTk", "abc123"],
          }),
        }),
      );
    });

    it("exits non-zero when --type is missing", async () => {
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
      await run(["node", "dx", "catalog", "entities", "create", "my-service"]);

      expect(stderrWrites.join("")).toContain("--type is required");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("scorecards", () => {
    it("fetches scorecards for the given entity identifier", async () => {
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
              scorecards: [
                {
                  id: "7o75a314lejw",
                  name: "Production Readiness",
                  type: "LEVEL",
                  checks: [{ id: "NDQ", name: "Wiki doc link", passed: true }],
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
        "scorecards",
        "login-frontend",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.scorecards?identifier=login-frontend",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain('"Production Readiness"');
      expect(out).toContain('"Wiki doc link"');
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
              scorecards: [],
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
        "scorecards",
        "login-frontend",
        "--cursor",
        "xuvkgfq9t0ty",
        "--limit",
        "10",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.scorecards?identifier=login-frontend&cursor=xuvkgfq9t0ty&limit=10",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("rejects a non-positive --limit", async () => {
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
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "scorecards",
        "login-frontend",
        "--limit",
        "0",
      ]);

      expect(stderrWrites.join("")).toContain(
        "--limit must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });
  });

  describe("tasks", () => {
    const mockTask = {
      check: {
        id: "ykepbp77y24r",
        name: "Everyone is failing this check",
        description: "This is a tough one to pass.",
        external_url: null,
      },
      entity_check_issue: { id: null, url: null },
      initiative: {
        id: "n9uu9oeeuzg5",
        name: "Migrate to OpenTelemetry",
        description: "## The basics",
        complete_by: "2025-04-09T00:00:00.000Z",
        priority: 0,
      },
      owner: {
        id: 5555173,
        name: "Ziggy Stardust",
        email: "ziggy.stardust@getdx.com",
        avatar: "https://avatars.slack-edge.com/photo.jpg",
        slack_ext_id: "U55555QMB19",
      },
    };

    it("fetches tasks for the given entity identifier", async () => {
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
              tasks: [mockTask],
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
        "tasks",
        "login-frontend",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.tasks?identifier=login-frontend",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain('"Migrate to OpenTelemetry"');
      expect(out).toContain('"Everyone is failing this check"');
    });

    it("supports cursor-based pagination", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              tasks: [],
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
        "tasks",
        "login-frontend",
        "--cursor",
        "xuvkgfq9t0ty",
        "--limit",
        "10",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.tasks?identifier=login-frontend&cursor=xuvkgfq9t0ty&limit=10",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("rejects a non-positive --limit", async () => {
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
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "tasks",
        "login-frontend",
        "--limit",
        "0",
      ]);

      expect(stderrWrites.join("")).toContain(
        "--limit must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });
  });
});

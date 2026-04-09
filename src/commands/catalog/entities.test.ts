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
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "--identifier",
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
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "--identifier",
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
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "--identifier",
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

    it("exits with code 2 when --identifier is missing", async () => {
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
        "create",
        "--type",
        "service",
      ]);

      expect(stderrWrites.join("")).toContain("--identifier is required");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when --type is missing", async () => {
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
        "create",
        "--identifier",
        "my-service",
      ]);

      expect(stderrWrites.join("")).toContain("--type is required");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("create with properties", () => {
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

    const makeProperty = (
      identifier: string,
      type: string,
    ): Record<string, unknown> => ({
      identifier,
      name: identifier,
      description: "",
      type,
      ordering: 0,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
      definition: {},
    });

    const mockEntityType = (properties: Record<string, unknown>[]) => ({
      ok: true,
      entity_type: {
        identifier: "service",
        name: "Service",
        description: "",
        icon: null,
        ordering: 0,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        properties,
        aliases: {},
      },
    });

    it("fetches entity type and sends properties in the request body", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "tier=Tier-1",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entityTypes.info?identifier=service",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            properties: { tier: "Tier-1" },
          }),
        }),
      );
    });

    it("sends multiple properties of different types", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(
                mockEntityType([
                  makeProperty("tier", "select"),
                  makeProperty("languages", "multi_select"),
                  makeProperty("reviewed", "boolean"),
                  makeProperty("incident-count", "number"),
                ]),
              ),
              { status: 200 },
            ),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "tier=Tier-1",
        "--property",
        "languages=Ruby,TypeScript",
        "--property",
        "reviewed=true",
        "--property",
        "incident-count=5",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.create",
        expect.objectContaining({
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            properties: {
              tier: "Tier-1",
              languages: ["Ruby", "TypeScript"],
              reviewed: true,
              "incident-count": 5,
            },
          }),
        }),
      );
    });

    it("sends null to remove a property when value is 'null'", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "tier=null",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.create",
        expect.objectContaining({
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            properties: { tier: null },
          }),
        }),
      );
    });

    it("parses json property values with JSON.parse", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(
                mockEntityType([makeProperty("deployment-facts", "json")]),
              ),
              { status: 200 },
            ),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        'deployment-facts={"region":"us-east-1","replicas":5}',
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.create",
        expect.objectContaining({
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            properties: {
              "deployment-facts": { region: "us-east-1", replicas: 5 },
            },
          }),
        }),
      );
    });

    it("exits with code 2 when --property key is missing =", async () => {
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
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "tierTier-1",
      ]);

      expect(stderrWrites.join("")).toContain(
        'Invalid --property "tierTier-1": expected format key=value',
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when the property identifier is unknown", async () => {
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
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "unknown-prop=value",
      ]);

      expect(stderrWrites.join("")).toContain(
        "Unknown property `unknown-prop`",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when boolean value is invalid", async () => {
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
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(
                mockEntityType([makeProperty("reviewed", "boolean")]),
              ),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "reviewed=yes",
      ]);

      expect(stderrWrites.join("")).toContain(
        'Invalid boolean value for property "reviewed"',
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when number value is invalid", async () => {
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
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(
                mockEntityType([makeProperty("incident-count", "number")]),
              ),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "incident-count=notanumber",
      ]);

      expect(stderrWrites.join("")).toContain(
        'Invalid number value for property "incident-count"',
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when setting a read-only computed property", async () => {
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
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(
                mockEntityType([makeProperty("open-prs", "computed")]),
              ),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "create",
        "--identifier",
        "my-service",
        "--type",
        "service",
        "--property",
        "open-prs=5",
      ]);

      expect(stderrWrites.join("")).toContain(
        'Property "open-prs" is read-only',
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

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

      const { run } = await import("../../cli.js");
      await run([
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

      const { run } = await import("../../cli.js");
      await run([
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

      const { run } = await import("../../cli.js");
      await run([
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

    it("exits with code 2 when the identifier is missing", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "catalog", "entities", "info"]);

      expect(JSON.parse(writes.join(""))).toMatchObject({
        ok: false,
        error: "missing required argument 'identifier'",
      });
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
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

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "catalog", "entities", "list"]);

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

      const { run } = await import("../../cli.js");
      await run([
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

      const { run } = await import("../../cli.js");
      await run([
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

      const { run } = await import("../../cli.js");
      await run([
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

      const { run } = await import("../../cli.js");
      await run([
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

      const { run } = await import("../../cli.js");
      await run([
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

      const { run } = await import("../../cli.js");
      await run([
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

  describe("delete", () => {
    const mockEntity = {
      identifier: "login-frontend",
      name: "Login Frontend",
      type: "service",
      created_at: "2025-01-02T20:48:45.779Z",
      updated_at: "2025-01-02T20:48:45.779Z",
      description: "Frontend for authentication flows",
      owner_teams: [],
      owner_users: [],
      properties: {},
      aliases: {},
    };

    it("deletes an entity and outputs the result", async () => {
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
          new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "delete",
        "login-frontend",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.delete?identifier=login-frontend",
        expect.objectContaining({
          method: "POST",
        }),
      );
      const out = writes.join("");
      expect(out).toContain("login-frontend");
      expect(out).toContain("Login Frontend");
    });

    it("returns machine-readable JSON with --json", async () => {
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
          new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "delete",
        "login-frontend",
      ]);

      expect(JSON.parse(writes.join(""))).toEqual({
        ok: true,
        entity: mockEntity,
      });
    });
  });

  describe("update", () => {
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

    const makeProperty = (
      identifier: string,
      type: string,
    ): Record<string, unknown> => ({
      identifier,
      name: identifier,
      description: "",
      type,
      ordering: 0,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
      definition: {},
    });

    const mockEntityType = (properties: Record<string, unknown>[]) => ({
      ok: true,
      entity_type: {
        identifier: "service",
        name: "Service",
        description: "",
        icon: null,
        ordering: 0,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        properties,
        aliases: {},
      },
    });

    it("updates an entity and outputs the result", async () => {
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
          new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "update",
        "my-service",
        "--name",
        "My Service",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.update",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            name: "My Service",
          }),
        }),
      );
      expect(writes.join("")).toContain('"my-service"');
    });

    it("includes optional fields in the request body when provided", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
            status: 200,
          }),
        ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "update",
        "my-service",
        "--description",
        "A test service",
        "--owner-team-ids",
        "MzI1NTk,abc123",
        "--owner-user-ids",
        "user-1,user-2",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.update",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            description: "A test service",
            owner_team_ids: ["MzI1NTk", "abc123"],
            owner_user_ids: ["user-1", "user-2"],
          }),
        }),
      );
    });

    it("fetches the entity and entity type before updating properties", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "update",
        "my-service",
        "--property",
        "tier=Tier-1",
      ]);

      expect(fetch).toHaveBeenNthCalledWith(
        1,
        "https://api.example.com/catalog.entities.info?identifier=my-service",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        "https://api.example.com/catalog.entityTypes.info?identifier=service",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        3,
        "https://api.example.com/catalog.entities.update",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            properties: { tier: "Tier-1" },
          }),
        }),
      );
    });

    it("sends null to remove a property when value is 'null'", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          )
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "entities",
        "update",
        "my-service",
        "--property",
        "tier=null",
      ]);

      expect(fetch).toHaveBeenLastCalledWith(
        "https://api.example.com/catalog.entities.update",
        expect.objectContaining({
          body: JSON.stringify({
            identifier: "my-service",
            properties: { tier: null },
          }),
        }),
      );
    });

    it("exits with code 2 when the identifier argument is missing", async () => {
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
      await run(["node", "dx", "catalog", "entities", "update", "--name", "x"]);

      expect(stderrWrites.join("")).toContain(
        "missing required argument 'identifier'",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when the property identifier is unknown", async () => {
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
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ ok: true, entity: mockEntity }), {
              status: 200,
            }),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "update",
        "my-service",
        "--property",
        "unknown-prop=value",
      ]);

      expect(stderrWrites.join("")).toContain(
        "Unknown property `unknown-prop`",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("upsert", () => {
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

    const makeProperty = (
      identifier: string,
      type: string,
    ): Record<string, unknown> => ({
      identifier,
      name: identifier,
      description: "",
      type,
      ordering: 0,
      created_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-01-01T00:00:00.000Z",
      definition: {},
    });

    const mockEntityType = (properties: Record<string, unknown>[]) => ({
      ok: true,
      entity_type: {
        identifier: "service",
        name: "Service",
        description: "",
        icon: null,
        ordering: 0,
        created_at: "2025-01-01T00:00:00.000Z",
        updated_at: "2025-01-01T00:00:00.000Z",
        properties,
        aliases: {},
      },
    });

    it("upserts an entity and outputs the result", async () => {
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
              result: "updated_existing_entity",
              entity: mockEntity,
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
        "entities",
        "upsert",
        "--type",
        "service",
        "--identifier",
        "my-service",
        "--name",
        "My Service",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/catalog.entities.upsert",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            name: "My Service",
          }),
        }),
      );
      const out = writes.join("");
      expect(out).toContain('"updated_existing_entity"');
      expect(out).toContain('"my-service"');
    });

    it("fetches entity type and sends properties in the request body", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          )
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify({
                ok: true,
                result: "created_new_entity",
                entity: mockEntity,
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
        "entities",
        "upsert",
        "--type",
        "service",
        "--identifier",
        "my-service",
        "--property",
        "tier=Tier-1",
        "--owner-team-ids",
        "MzI1NTk,abc123",
      ]);

      expect(fetch).toHaveBeenNthCalledWith(
        1,
        "https://api.example.com/catalog.entityTypes.info?identifier=service",
        expect.objectContaining({ method: "GET" }),
      );
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        "https://api.example.com/catalog.entities.upsert",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            identifier: "my-service",
            type: "service",
            owner_team_ids: ["MzI1NTk", "abc123"],
            properties: { tier: "Tier-1" },
          }),
        }),
      );
    });

    it("exits with code 2 when --type is missing", async () => {
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
      await run(["node", "dx", "catalog", "entities", "upsert"]);

      expect(stderrWrites.join("")).toContain("--type is required");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when --identifier is missing", async () => {
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
        "upsert",
        "--type",
        "service",
      ]);

      expect(stderrWrites.join("")).toContain("--identifier is required");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 2 when the property identifier is unknown", async () => {
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
          .mockResolvedValueOnce(
            new Response(
              JSON.stringify(mockEntityType([makeProperty("tier", "select")])),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "entities",
        "upsert",
        "--type",
        "service",
        "--identifier",
        "my-service",
        "--property",
        "unknown-prop=value",
      ]);

      expect(stderrWrites.join("")).toContain(
        "Unknown property `unknown-prop`",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../../errors.js";
import type { Relation } from "./relations.js";

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

const MOCK_RELATION: Relation = {
  identifier: "service-depends-on-service",
  type: "depends on",
  inverse_type: "dependency of",
  cardinality: "many_to_many",
  description: "Service depends on service",
  source_entity_type_identifier: "service",
  target_entity_type_identifier: "service",
  created_at: "2025-01-02T20:48:45.77969Z",
  updated_at: "2025-01-02T20:48:45.77969Z",
};

function captureStdout(): string[] {
  const writes: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(((
    chunk: string | Uint8Array,
  ) => {
    writes.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  return writes;
}

function captureStderrAndExit() {
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
  return { stderrWrites, exitSpy };
}

function mockApi(body: unknown, status = 200) {
  process.env.DX_API_BASE_URL = "https://api.example.com";
  getToken.mockReturnValue("token-123");
  const fetchMock = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>) {
  const init = fetchMock.mock.calls[0]?.[1] as { body: string };
  return JSON.parse(init.body);
}

const CREATE_ARGS = [
  "--identifier",
  "service-depends-on-service",
  "--source-type",
  "service",
  "--target-type",
  "service",
  "--type",
  "depends on",
  "--cardinality",
  "many_to_many",
];

describe("catalog relations commands", () => {
  describe("create", () => {
    it("posts the mapped body and renders the created relation", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "create",
        ...CREATE_ARGS,
        "--description",
        "Service depends on service",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relations.create",
        expect.objectContaining({ method: "POST" }),
      );
      expect(requestBody(fetchMock)).toEqual({
        identifier: "service-depends-on-service",
        source_entity_type_identifier: "service",
        target_entity_type_identifier: "service",
        type: "depends on",
        cardinality: "many_to_many",
        description: "Service depends on service",
      });
      const out = writes.join("");
      expect(out).toContain("Relation created");
      expect(out).toContain("dependency of");
    });

    it("omits description when not provided", async () => {
      captureStdout();
      const fetchMock = mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "create",
        ...CREATE_ARGS,
      ]);

      expect(requestBody(fetchMock)).not.toHaveProperty("description");
    });

    it("returns JSON with --json flag", async () => {
      const writes = captureStdout();
      mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "relations",
        "create",
        ...CREATE_ARGS,
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.relation.identifier).toBe("service-depends-on-service");
    });

    it.each([
      ["--identifier"],
      ["--source-type"],
      ["--target-type"],
      ["--type"],
      ["--cardinality"],
    ])("errors when %s is missing", async (flag) => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      const fetchMock = mockApi({ ok: true, relation: MOCK_RELATION });

      const flagIndex = CREATE_ARGS.indexOf(flag);
      const args = CREATE_ARGS.filter(
        (_, i) => i !== flagIndex && i !== flagIndex + 1,
      );

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "relations", "create", ...args]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(`${flag} is required`);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("surfaces an API error", async () => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      mockApi({ ok: false, error: "invalid_arguments" }, 422);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "create",
        ...CREATE_ARGS,
      ]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("invalid_arguments");
    });
  });

  describe("delete", () => {
    it("posts the identifier as a query param and renders confirmation", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "delete",
        "service-depends-on-service",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relations.delete?identifier=service-depends-on-service",
        expect.objectContaining({ method: "POST" }),
      );
      expect(writes.join("")).toContain("Relation deleted");
    });

    it("returns JSON with --json flag", async () => {
      const writes = captureStdout();
      mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "relations",
        "delete",
        "service-depends-on-service",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.relation.identifier).toBe("service-depends-on-service");
    });
  });

  describe("info", () => {
    it("fetches the relation and renders it", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "info",
        "service-depends-on-service",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relations.info?identifier=service-depends-on-service",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain("Relation Information");
      expect(out).toContain("many_to_many");
      expect(out).toContain("Service depends on service");
    });

    it("returns JSON with --json flag", async () => {
      const writes = captureStdout();
      mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "relations",
        "info",
        "service-depends-on-service",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed).toEqual({ ok: true, relation: MOCK_RELATION });
    });
  });

  describe("list", () => {
    const LIST_RESPONSE = {
      ok: true,
      relations: [
        MOCK_RELATION,
        {
          ...MOCK_RELATION,
          identifier: "service-provides-package",
          type: "provides",
          inverse_type: "provided by",
          target_entity_type_identifier: "package",
        },
      ],
      response_metadata: { next_cursor: "avsgf30ccan3" },
    };

    it("lists relations and shows the next cursor", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "relations", "list"]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relations.list",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain("service-depends-on-service");
      expect(out).toContain("service-provides-package");
      expect(out).toContain("avsgf30ccan3");
    });

    it("passes --cursor and --limit as query params", async () => {
      captureStdout();
      const fetchMock = mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "list",
        "--cursor",
        "abc123",
        "--limit",
        "10",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relations.list?cursor=abc123&limit=10",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("returns JSON with --json flag", async () => {
      const writes = captureStdout();
      mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "--json", "catalog", "relations", "list"]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.relations).toHaveLength(2);
      expect(parsed.response_metadata.next_cursor).toBe("avsgf30ccan3");
    });

    it("errors on an invalid --limit", async () => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "list",
        "--limit",
        "abc",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        "--limit must be a positive integer",
      );
    });
  });

  describe("update", () => {
    it("posts only the provided fields and renders the updated relation", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi({
        ok: true,
        relation: { ...MOCK_RELATION, description: "Runtime deps" },
      });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "update",
        "service-depends-on-service",
        "--description",
        "Runtime deps",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relations.update",
        expect.objectContaining({ method: "POST" }),
      );
      expect(requestBody(fetchMock)).toEqual({
        identifier: "service-depends-on-service",
        description: "Runtime deps",
      });
      const out = writes.join("");
      expect(out).toContain("Relation updated");
      expect(out).toContain("Runtime deps");
    });

    it("sends the request even when no fields are provided", async () => {
      captureStdout();
      const fetchMock = mockApi({ ok: true, relation: MOCK_RELATION });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relations",
        "update",
        "service-depends-on-service",
      ]);

      expect(requestBody(fetchMock)).toEqual({
        identifier: "service-depends-on-service",
      });
    });

    it("returns JSON with --json flag", async () => {
      const writes = captureStdout();
      mockApi({ ok: true, relation: { ...MOCK_RELATION, type: "provides" } });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "relations",
        "update",
        "service-depends-on-service",
        "--type",
        "provides",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.relation.type).toBe("provides");
    });
  });
});

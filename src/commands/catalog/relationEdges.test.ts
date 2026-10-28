import fs from "fs";

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

/** Only stub fixture paths; `readConfig()` and others still need real file reads. */
function stubReadFileSyncForFixturePath(
  fixturePathSubstring: string,
  content: string,
) {
  const realReadFileSync = fs.readFileSync.bind(fs);
  return vi.spyOn(fs, "readFileSync").mockImplementation((path, options) => {
    if (String(path).includes(fixturePathSubstring)) {
      return content;
    }
    return realReadFileSync(path, options as never);
  });
}

function stubStdin(content: string) {
  const handlers: Record<string, (arg?: unknown) => void> = {};
  vi.spyOn(process.stdin, "on").mockImplementation(((
    event: string,
    handler: (arg?: unknown) => void,
  ) => {
    handlers[event] = handler;
    if (event === "end") {
      setImmediate(() => {
        handlers.data?.(Buffer.from(content));
        handlers.end?.();
      });
    }
    return process.stdin;
  }) as typeof process.stdin.on);
}

const EDGE_ARGS = [
  "--relation",
  "service-depends-on-service",
  "--source",
  "login-frontend",
  "--target",
  "authn-backend",
];

const EXPECTED_EDGE_BODY = {
  relation_identifier: "service-depends-on-service",
  source_entity_identifier: "login-frontend",
  target_entity_identifier: "authn-backend",
};

describe("catalog relationEdges commands", () => {
  describe.each([
    ["add", "Added edge"],
    ["remove", "Removed edge"],
  ])("%s", (verb, successText) => {
    it("posts the mapped body and renders a confirmation", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi({ ok: true });

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "relationEdges", verb, ...EDGE_ARGS]);

      expect(fetchMock).toHaveBeenCalledWith(
        `https://api.example.com/catalog.relationEdges.${verb}`,
        expect.objectContaining({ method: "POST" }),
      );
      expect(requestBody(fetchMock)).toEqual(EXPECTED_EDGE_BODY);
      const out = writes.join("");
      expect(out).toContain(successText);
      expect(out).toContain("login-frontend");
      expect(out).toContain("authn-backend");
    });

    it("returns JSON with --json flag", async () => {
      const writes = captureStdout();
      mockApi({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "relationEdges",
        verb,
        ...EDGE_ARGS,
      ]);

      expect(JSON.parse(writes.join(""))).toEqual({ ok: true });
    });

    it.each([["--relation"], ["--source"], ["--target"]])(
      "errors when %s is missing",
      async (flag) => {
        const { stderrWrites, exitSpy } = captureStderrAndExit();
        const fetchMock = mockApi({ ok: true });

        const flagIndex = EDGE_ARGS.indexOf(flag);
        const args = EDGE_ARGS.filter(
          (_, i) => i !== flagIndex && i !== flagIndex + 1,
        );

        const { run } = await import("../../cli.js");
        await run(["node", "dx", "catalog", "relationEdges", verb, ...args]);

        expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
        expect(stderrWrites.join("")).toContain(`${flag} is required`);
        expect(fetchMock).not.toHaveBeenCalled();
      },
    );

    it("surfaces an API error", async () => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      mockApi({ ok: false, error: "invalid_cardinality" }, 422);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "relationEdges", verb, ...EDGE_ARGS]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("invalid_cardinality");
    });
  });

  describe("bulkUpsert", () => {
    const EDGES_YAML =
      "login-frontend:\n  - authn-backend\n  - feature-flag-backend\ncore-frontend:\n  - payments-backend\n";
    const EXPECTED_EDGES = {
      "login-frontend": ["authn-backend", "feature-flag-backend"],
      "core-frontend": ["payments-backend"],
    };

    it("--from-file posts the edges map and reports the edge count", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi({ ok: true });

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath("edges.yaml", EDGES_YAML);

      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "bulkUpsert",
        "--relation",
        "service-depends-on-service",
        "--from-file",
        "./edges.yaml",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relationEdges.bulkUpsert",
        expect.objectContaining({ method: "POST" }),
      );
      expect(requestBody(fetchMock)).toEqual({
        relation_identifier: "service-depends-on-service",
        edges: EXPECTED_EDGES,
      });
      const out = writes.join("");
      expect(out).toContain("Upserted");
      expect(out).toContain("3");
      expect(out).toContain("service-depends-on-service");
    });

    it("--from-stdin accepts JSON and returns JSON with --json flag", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi({ ok: true });
      stubStdin(JSON.stringify(EXPECTED_EDGES));

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "relationEdges",
        "bulkUpsert",
        "--relation",
        "service-depends-on-service",
        "--from-stdin",
      ]);

      expect(requestBody(fetchMock).edges).toEqual(EXPECTED_EDGES);
      expect(JSON.parse(writes.join(""))).toEqual({ ok: true });
    });

    it("errors when --relation is missing", async () => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      mockApi({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "bulkUpsert",
        "--from-file",
        "./edges.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("--relation is required");
    });

    it("errors when neither --from-file nor --from-stdin is provided", async () => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      mockApi({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "bulkUpsert",
        "--relation",
        "service-depends-on-service",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        "One of --from-file or --from-stdin is required",
      );
    });

    it("errors when both --from-file and --from-stdin are provided", async () => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      mockApi({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "bulkUpsert",
        "--relation",
        "service-depends-on-service",
        "--from-file",
        "./edges.yaml",
        "--from-stdin",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("mutually exclusive");
    });

    it.each([
      ["a list", "- login-frontend\n- core-frontend\n", "must be an object"],
      [
        "a non-list target value",
        "login-frontend: authn-backend\n",
        'Targets for source "login-frontend"',
      ],
      [
        "non-string targets",
        "login-frontend:\n  - 123\n",
        'Targets for source "login-frontend"',
      ],
    ])("errors when the edges file is %s", async (_label, content, message) => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      const fetchMock = mockApi({ ok: true });

      const { run } = await import("../../cli.js");
      stubReadFileSyncForFixturePath("edges.yaml", content);

      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "bulkUpsert",
        "--relation",
        "service-depends-on-service",
        "--from-file",
        "./edges.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(message);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("list", () => {
    const LIST_RESPONSE = {
      ok: true,
      entity_relations: [
        {
          identifier: "payment-processing-api",
          name: "Payment Processing API",
        },
        { identifier: "core-api", name: "Core API" },
      ],
      response_metadata: { next_cursor: "d0d93f40" },
    };

    it("lists related entities and shows the next cursor", async () => {
      const writes = captureStdout();
      const fetchMock = mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "list",
        "--entity",
        "payments-service",
        "--relation",
        "service-consumes-api",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relationEdges.list?entity_identifier=payments-service&relation_identifier=service-consumes-api",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain("Payment Processing API");
      expect(out).toContain("core-api");
      expect(out).toContain("outgoing");
      expect(out).toContain("d0d93f40");
    });

    it("passes --direction, --cursor, and --limit as query params", async () => {
      captureStdout();
      const fetchMock = mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "list",
        "--entity",
        "core-api",
        "--relation",
        "service-consumes-api",
        "--direction",
        "incoming",
        "--cursor",
        "abc123",
        "--limit",
        "10",
      ]);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/catalog.relationEdges.list?entity_identifier=core-api&relation_identifier=service-consumes-api&direction=incoming&cursor=abc123&limit=10",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("returns JSON with --json flag", async () => {
      const writes = captureStdout();
      mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "catalog",
        "relationEdges",
        "list",
        "--entity",
        "payments-service",
        "--relation",
        "service-consumes-api",
      ]);

      expect(JSON.parse(writes.join(""))).toEqual(LIST_RESPONSE);
    });

    it.each([
      [["--relation", "service-consumes-api"], "--entity is required"],
      [["--entity", "payments-service"], "--relation is required"],
    ])("errors when a required flag is missing", async (args, message) => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      const fetchMock = mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "catalog", "relationEdges", "list", ...args]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(message);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("errors on an invalid --limit", async () => {
      const { stderrWrites, exitSpy } = captureStderrAndExit();
      mockApi(LIST_RESPONSE);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "catalog",
        "relationEdges",
        "list",
        "--entity",
        "payments-service",
        "--relation",
        "service-consumes-api",
        "--limit",
        "0",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        "--limit must be a positive integer",
      );
    });
  });
});

import { EventEmitter } from "events";
import fs from "fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../errors.js";
import { Scorecard, UpdateScorecardPayload } from "./scorecards.js";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../secrets.js", () => ({
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

const MOCK_SCORECARD: Scorecard = {
  id: "qjfj1a6cmit4",
  name: "My custom scorecard",
  description: "",
  type: "LEVEL",
  published: true,
  entity_filter_type: "entity_types",
  entity_filter_sql: null,
  entity_filter_type_ids: ["4aav7arl6mo6"],
  tags: [{ value: "production", color: "#38bdf8" }],
  editors: [
    {
      id: 2468,
      email: "liszt@example.com",
      name: "Franz Liszt",
      avatar: "https://avatars.slack-edge.com/2024-07-05/1234567890.jpg",
      created_at: "2024-06-28T04:03:53.245Z",
    },
  ],
  admins: [],
  sql_errors: [],
  levels: [
    { id: "vic57y3o55r4", name: "Bronze", rank: 1, color: "#fdba74" },
    { id: "nqbw5y1fogur", name: "Silver", rank: 2, color: "#9ca3af" },
    { id: "mfq00xe2z3vm", name: "Gold", rank: 3, color: "#fbbf24" },
  ],
  empty_level_label: "None",
  empty_level_color: "#e5e7eb",
  checks: [
    {
      id: "y3ynphtim81c",
      ordering: 0,
      estimated_dev_days: null,
      name: "Has Owner",
      description: "Important for entities to have an owner",
      sql: "SELECT 'PASS' AS status",
      filter_sql: null,
      filter_message: null,
      output_enabled: false,
      output_type: null,
      output_custom_options: null,
      output_aggregation: null,
      external_url: null,
      published: true,
      level: { id: "vic57y3o55r4", name: "Bronze" },
    },
  ],
};

// Matches the shape of UpdateScorecardPayload: levels have a `key`, checks use
// `scorecard_level_key` instead of `level`, and read-only response fields are absent.
const MOCK_SCORECARD_PAYLOAD: UpdateScorecardPayload = {
  id: "qjfj1a6cmit4",
  name: "My custom scorecard",
  description: "",
  type: "LEVEL",
  published: true,
  entity_filter_type: "entity_types",
  entity_filter_sql: null,
  tags: [{ value: "production", color: "#38bdf8" }],
  editors: [
    {
      id: 2468,
      email: "liszt@example.com",
      name: "Franz Liszt",
      avatar: "https://avatars.slack-edge.com/2024-07-05/1234567890.jpg",
      created_at: "2024-06-28T04:03:53.245Z",
    },
  ],
  admins: [],
  levels: [
    {
      id: "vic57y3o55r4",
      name: "Bronze",
      rank: 1,
      color: "#fdba74",
      key: "bronze",
    },
    {
      id: "nqbw5y1fogur",
      name: "Silver",
      rank: 2,
      color: "#9ca3af",
      key: "silver",
    },
    {
      id: "mfq00xe2z3vm",
      name: "Gold",
      rank: 3,
      color: "#fbbf24",
      key: "gold",
    },
  ],
  empty_level_label: "None",
  empty_level_color: "#e5e7eb",
  checks: [
    {
      id: "y3ynphtim81c",
      ordering: 0,
      estimated_dev_days: null,
      name: "Has Owner",
      description: "Important for entities to have an owner",
      sql: "SELECT 'PASS' AS status",
      filter_sql: null,
      filter_message: null,
      output_enabled: false,
      output_type: null,
      output_custom_options: null,
      output_aggregation: null,
      external_url: null,
      published: true,
      scorecard_level_key: "bronze",
    },
  ],
};

describe("scorecards commands", () => {
  describe("create", () => {
    it("--from-file posts YAML content to the API and renders the created scorecard", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const createdScorecard = { ...MOCK_SCORECARD, name: "New Scorecard" };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, scorecard: createdScorecard }),
              { status: 200 },
            ),
          ),
      );

      vi.spyOn(fs, "readFileSync").mockImplementation(() =>
        JSON.stringify({
          ...MOCK_SCORECARD_PAYLOAD,
          name: "New Scorecard",
        }),
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "create",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"New Scorecard"'),
        }),
      );
      const out = writes.join("");
      expect(out).toContain("New Scorecard");
      expect(out).toContain("Scorecard created");
    });

    it("--from-file strips the id field before posting", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      // File includes an id — it should be stripped before sending to scorecards.create
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "id: qjfj1a6cmit4\nname: New Scorecard\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "create",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      const body = JSON.parse(
        (vi.mocked(fetch).mock.calls[0][1] as { body: string }).body,
      );
      expect(body).not.toHaveProperty("id");
      expect(body.name).toBe("New Scorecard");
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

      const createdScorecard = { ...MOCK_SCORECARD, name: "New Scorecard" };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, scorecard: createdScorecard }),
              { status: 200 },
            ),
          ),
      );

      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "name: New Scorecard\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "scorecards",
        "create",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.scorecard.name).toBe("New Scorecard");
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

      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "name: Bad Scorecard\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "create",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("422");
    });

    it("--from-stdin posts YAML from stdin to the API", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const createdScorecard = { ...MOCK_SCORECARD, name: "Stdin Scorecard" };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, scorecard: createdScorecard }),
              { status: 200 },
            ),
          ),
      );

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit("data", Buffer.from("name: Stdin Scorecard\n"));
        mockStdin.emit("end");
      });

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "create", "--from-stdin"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.create",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Stdin Scorecard"'),
        }),
      );
      const out = writes.join("");
      expect(out).toContain("Stdin Scorecard");
      expect(out).toContain("Scorecard created");
    });

    it("requires at least one of --from-file or --from-stdin", async () => {
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

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "create"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("--from-file");
    });

    it("rejects when multiple mode flags are provided", async () => {
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

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "create",
        "--from-stdin",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("mutually exclusive");
    });

    it("rejects non-object YAML from --from-file", async () => {
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

      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "- item1\n- item2\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "create",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("YAML content must be an object");
    });
  });

  describe("info", () => {
    it("fetches scorecard info by id", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "info", "qjfj1a6cmit4"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.info?id=qjfj1a6cmit4",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      expect(out).toContain("My custom scorecard");
      expect(out).toContain("Has Owner");
    });

    it("returns JSON with --json flag", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "scorecards", "info", "qjfj1a6cmit4"]);

      const out = writes.join("");
      const parsed = JSON.parse(out);
      expect(parsed.ok).toBe(true);
      expect(parsed.scorecard.id).toBe("qjfj1a6cmit4");
      expect(parsed.scorecard.name).toBe("My custom scorecard");
      expect(parsed.scorecard.checks).toHaveLength(1);
      expect(parsed.scorecard.levels).toHaveLength(3);
    });

    it("filters fields with --include", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "scorecards",
        "info",
        "qjfj1a6cmit4",
        "--include",
        "core",
      ]);

      const out = writes.join("");
      const parsed = JSON.parse(out);
      expect(parsed.scorecard).toHaveProperty("id");
      expect(parsed.scorecard).toHaveProperty("name");
      expect(parsed.scorecard).not.toHaveProperty("checks");
      expect(parsed.scorecard).not.toHaveProperty("admins");
      expect(parsed.scorecard).not.toHaveProperty("editors");
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
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "info",
        "qjfj1a6cmit4",
        "--include",
        "levels",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain('Invalid --include "levels"');
    });

    it("fails when no auth token is available", async () => {
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
      getToken.mockReturnValue(undefined);

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "info", "qjfj1a6cmit4"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
      expect(stderrWrites.join("")).toMatch(/not authenticated|token/i);
    });
  });

  describe("list", () => {
    it("lists published scorecards", async () => {
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
                { ...MOCK_SCORECARD, id: "qjfj1a6cmit4", name: "Reliability" },
                {
                  ...MOCK_SCORECARD,
                  id: "glgixbdsuiyx",
                  name: "Security",
                  type: "POINTS",
                },
              ],
              response_metadata: { next_cursor: "xuvkgfq9t0ty" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "scorecards", "list"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.list",
        expect.objectContaining({ method: "GET" }),
      );
      const out = writes.join("");
      const parsed = JSON.parse(out);
      expect(parsed.ok).toBe(true);
      expect(parsed.scorecards).toHaveLength(2);
      expect(parsed.scorecards[0].name).toBe("Reliability");
      expect(parsed.scorecards[1].name).toBe("Security");
      expect(parsed.response_metadata.next_cursor).toBe("xuvkgfq9t0ty");
    });

    it("passes --cursor and --limit to the API", async () => {
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

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "list",
        "--cursor",
        "xuvkgfq9t0ty",
        "--limit",
        "10",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.list?cursor=xuvkgfq9t0ty&limit=10",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("passes include_unpublished when --include-unpublished is set", async () => {
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

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "list", "--include-unpublished"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.list?include_unpublished=true",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("filters fields with --include across all scorecards", async () => {
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
              scorecards: [MOCK_SCORECARD],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "scorecards",
        "list",
        "--include",
        "checks",
      ]);

      const out = writes.join("");
      const parsed = JSON.parse(out);
      expect(parsed.scorecards[0]).toHaveProperty("checks");
      expect(parsed.scorecards[0]).not.toHaveProperty("name");
      expect(parsed.scorecards[0]).not.toHaveProperty("admins");
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
              scorecards: [MOCK_SCORECARD],
              response_metadata: { next_cursor: null },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "list", "--include", "levels"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain('Invalid --include "levels"');
    });

    it("rejects an invalid --limit value", async () => {
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

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "list", "--limit", "bad"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("--limit");
    });
  });

  describe("init", () => {
    it("--id fetches the scorecard and writes YAML to the given path", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "init",
        "./my-scorecard.yaml",
        "--id",
        "qjfj1a6cmit4",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.info?id=qjfj1a6cmit4",
        expect.objectContaining({ method: "GET" }),
      );
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-scorecard.yaml",
        expect.stringContaining("My custom scorecard"),
        "utf8",
      );
      const out = writes.join("");
      expect(out).toContain("./my-scorecard.yaml");
    });

    it("--id omits ignored keys from the written YAML", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      const writeFileSyncSpy = vi
        .spyOn(fs, "writeFileSync")
        .mockImplementation(() => undefined);

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "init",
        "./my-scorecard.yaml",
        "--id",
        "qjfj1a6cmit4",
      ]);

      const yaml = writeFileSyncSpy.mock.calls[0]?.[1] as string;
      expect(yaml).not.toContain("sql_errors");
      expect(yaml).not.toContain("entity_filter_type_ids");
    });

    it("--id returns JSON with --json flag", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      vi.spyOn(fs, "writeFileSync").mockImplementation(() => undefined);

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "scorecards",
        "init",
        "./my-scorecard.yaml",
        "--id",
        "qjfj1a6cmit4",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.id).toBe("qjfj1a6cmit4");
      expect(parsed.path).toBe("./my-scorecard.yaml");
    });

    it("without --id writes a placeholder file without fetching", async () => {
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

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "init", "./my-scorecard.yaml"]);

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(writeFileSyncSpy).toHaveBeenCalledWith(
        "./my-scorecard.yaml",
        expect.stringContaining("scorecard_level_key"),
        "utf8",
      );
      const out = writes.join("");
      expect(out).toContain("./my-scorecard.yaml");
    });

    it("without --id returns JSON with --json flag", async () => {
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

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "scorecards",
        "init",
        "./my-scorecard.yaml",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.path).toBe("./my-scorecard.yaml");
      expect(parsed).not.toHaveProperty("id");
    });
  });

  describe("update", () => {
    it("--from-file posts YAML content to the API and renders the updated scorecard", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedScorecard = { ...MOCK_SCORECARD, name: "Updated Scorecard" };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, scorecard: updatedScorecard }),
              { status: 200 },
            ),
          ),
      );

      // JSON is valid YAML — use the payload mock so the full shape is exercised
      vi.spyOn(fs, "readFileSync").mockImplementation(() =>
        JSON.stringify({
          ...MOCK_SCORECARD_PAYLOAD,
          name: "Updated Scorecard",
        }),
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "update",
        "qjfj1a6cmit4",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Updated Scorecard"'),
        }),
      );
      const out = writes.join("");
      expect(out).toContain("Updated Scorecard");
      expect(out).toContain("Scorecard updated");
    });

    it("--from-file always sends the id from the CLI argument", async () => {
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
              JSON.stringify({ ok: true, scorecard: MOCK_SCORECARD }),
              { status: 200 },
            ),
          ),
      );

      // YAML omits the id — it should still be sent from the CLI argument
      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "name: Updated Scorecard\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "update",
        "qjfj1a6cmit4",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.update",
        expect.objectContaining({
          body: expect.stringContaining('"id":"qjfj1a6cmit4"'),
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

      const updatedScorecard = { ...MOCK_SCORECARD, name: "Updated Scorecard" };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, scorecard: updatedScorecard }),
              { status: 200 },
            ),
          ),
      );

      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "id: qjfj1a6cmit4\nname: Updated Scorecard\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "scorecards",
        "update",
        "qjfj1a6cmit4",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      const parsed = JSON.parse(writes.join(""));
      expect(parsed.ok).toBe(true);
      expect(parsed.scorecard.name).toBe("Updated Scorecard");
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

      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "id: qjfj1a6cmit4\nname: Bad Scorecard\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "update",
        "qjfj1a6cmit4",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalled();
      expect(stderrWrites.join("")).toContain("422");
    });

    it("--from-stdin posts YAML from stdin to the API", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-123");

      const updatedScorecard = { ...MOCK_SCORECARD, name: "Stdin Scorecard" };

      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ ok: true, scorecard: updatedScorecard }),
              { status: 200 },
            ),
          ),
      );

      const mockStdin = new EventEmitter();
      vi.spyOn(process, "stdin", "get").mockReturnValue(
        mockStdin as unknown as typeof process.stdin,
      );
      setImmediate(() => {
        mockStdin.emit(
          "data",
          Buffer.from("id: qjfj1a6cmit4\nname: Stdin Scorecard\n"),
        );
        mockStdin.emit("end");
      });

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "update",
        "qjfj1a6cmit4",
        "--from-stdin",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/scorecards.update",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"name":"Stdin Scorecard"'),
        }),
      );
      const out = writes.join("");
      expect(out).toContain("Stdin Scorecard");
      expect(out).toContain("Scorecard updated");
    });

    it("requires at least one of --from-file or --from-stdin", async () => {
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

      const { run } = await import("../cli.js");
      await run(["node", "dx", "scorecards", "update", "qjfj1a6cmit4"]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("--from-file");
    });

    it("rejects when multiple mode flags are provided", async () => {
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

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "update",
        "qjfj1a6cmit4",
        "--from-stdin",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("mutually exclusive");
    });

    it("rejects non-object YAML from --from-file", async () => {
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

      vi.spyOn(fs, "readFileSync").mockImplementation(
        () => "- item1\n- item2\n",
      );

      const { run } = await import("../cli.js");
      await run([
        "node",
        "dx",
        "scorecards",
        "update",
        "qjfj1a6cmit4",
        "--from-file",
        "./my-scorecard.yaml",
      ]);

      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain("YAML content must be an object");
    });
  });
});

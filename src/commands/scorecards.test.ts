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

const MOCK_SCORECARD = {
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

describe("scorecards commands", () => {
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
});

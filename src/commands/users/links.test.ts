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

function stubFetch(body: Record<string, unknown>) {
  process.env.DX_API_BASE_URL = "https://api.example.com";
  getToken.mockReturnValue("token-123");
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
  );
}

describe("users links", () => {
  describe("create", () => {
    it("links an account in human-readable output", async () => {
      stubFetch({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "create",
        "NTEyMDUw",
        "--source",
        "github",
        "--account-id",
        "4812",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/users.links.create",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            user_id: "NTEyMDUw",
            source: "github",
            account_id: "4812",
          }),
        }),
      );
      const out = stdoutWrites.join("");
      expect(out).toContain("Linked github account");
      expect(out).toContain("4812");
      expect(out).toContain("NTEyMDUw");
    });

    it("prints the API response with --json", async () => {
      stubFetch({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "users",
        "links",
        "create",
        "NTEyMDUw",
        "--source",
        "github",
        "--account-id",
        "4812",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({ ok: true });
    });

    it("errors when --account-id is missing", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "create",
        "NTEyMDUw",
        "--source",
        "github",
      ]);

      expect(stderrWrites.join("")).toContain(
        "required option '--account-id <id>' not specified",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("delete", () => {
    it("unlinks an account in human-readable output", async () => {
      stubFetch({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "delete",
        "NTEyMDUw",
        "--source",
        "github",
        "--account-id",
        "4812",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/users.links.delete",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            user_id: "NTEyMDUw",
            source: "github",
            account_id: "4812",
          }),
        }),
      );
      expect(stdoutWrites.join("")).toContain("Unlinked github account");
    });

    it("errors when the user ID is missing", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "delete",
        "--source",
        "github",
        "--account-id",
        "4812",
      ]);

      expect(stderrWrites.join("")).toContain(
        "missing required argument 'user-id'",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });

  describe("list", () => {
    const listResponse = {
      ok: true as const,
      links: [
        { user_id: "NTEyMDUw", source: "github", account_id: "4812" },
        { user_id: "NTEyMDUw", source: "github", account_id: "4813" },
      ],
      next_page: 2,
      total: 3,
      total_pages: 2,
    };

    it("lists linked accounts in human-readable output", async () => {
      stubFetch(listResponse);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "list",
        "NTEyMDUw",
        "--source",
        "github",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/users.links.list?user_id=NTEyMDUw&source=github",
        expect.objectContaining({ method: "GET" }),
      );
      const out = stdoutWrites.join("");
      expect(out).toContain("Linked Accounts");
      expect(out).toContain("4812");
      expect(out).toContain("4813");
      expect(out).toContain("Next page");
    });

    it("prints the API response with --json", async () => {
      stubFetch(listResponse);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "users",
        "links",
        "list",
        "NTEyMDUw",
        "--page",
        "2",
        "--page-size",
        "50",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/users.links.list?user_id=NTEyMDUw&page=2&page_size=50",
        expect.objectContaining({ method: "GET" }),
      );
      expect(JSON.parse(stdoutWrites.join(""))).toEqual(listResponse);
    });

    it("rejects a non-positive --page", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "list",
        "NTEyMDUw",
        "--page",
        "0",
      ]);

      expect(stderrWrites.join("")).toContain(
        "--page must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });

    it("exits with code 4 when no API token is configured", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run(["node", "dx", "users", "links", "list", "NTEyMDUw"]);

      expect(stderrWrites.join("")).toContain("No API token configured");
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.RETRY_RECOMMENDED);
    });
  });

  describe("set", () => {
    it("replaces linked accounts with --json", async () => {
      stubFetch({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "users",
        "links",
        "set",
        "NTEyMDUw",
        "--source",
        "github",
        "--account-ids",
        "4812, 4813",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/users.links.set",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            user_id: "NTEyMDUw",
            source: "github",
            account_ids: ["4812", "4813"],
          }),
        }),
      );
      expect(JSON.parse(stdoutWrites.join(""))).toEqual({ ok: true });
    });

    it("unlinks every account for the source when --account-ids is empty", async () => {
      stubFetch({ ok: true });

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "set",
        "NTEyMDUw",
        "--source",
        "github",
        "--account-ids",
        "",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/users.links.set",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            user_id: "NTEyMDUw",
            source: "github",
            account_ids: [],
          }),
        }),
      );
      expect(stdoutWrites.join("")).toContain("Unlinked every github account");
    });

    it("errors when --account-ids is missing", async () => {
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "users",
        "links",
        "set",
        "NTEyMDUw",
        "--source",
        "github",
      ]);

      expect(stderrWrites.join("")).toContain(
        "required option '--account-ids <ids>' not specified",
      );
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
    });
  });
});

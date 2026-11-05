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

function stubFetch(body: Record<string, unknown>, status = 200) {
  process.env.DX_API_BASE_URL = "https://api.example.com";
  getToken.mockReturnValue("token-123");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}

async function runUpdate(...args: string[]) {
  const { run } = await import("../../cli.js");
  await run(["node", "dx", "users", "update", "ada@example.com", ...args]);
}

function expectRequestBody(body: Record<string, unknown>) {
  expect(fetch).toHaveBeenCalledWith(
    "https://api.example.com/users.update",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "ada@example.com", ...body }),
    }),
  );
}

describe("users update", () => {
  it("sets the developer flag in human-readable output", async () => {
    stubFetch({
      ok: true,
      user: { email: "ada@example.com", developer: true },
    });

    await runUpdate("--developer", "true");

    expectRequestBody({ developer: true });
    const out = stdoutWrites.join("");
    expect(out).toContain("Updated user");
    expect(out).toContain("ada@example.com");
    expect(out).toContain("true");
  });

  it("sends false for --developer false", async () => {
    stubFetch({
      ok: true,
      user: { email: "ada@example.com", developer: false },
    });

    await runUpdate("--developer", "false");

    expectRequestBody({ developer: false });
    expect(stdoutWrites.join("")).toContain("false");
  });

  it("sends null to clear the flag and shows it as unset", async () => {
    stubFetch({ ok: true, user: { email: "ada@example.com" } });

    await runUpdate("--developer", "null");

    expectRequestBody({ developer: null });
    expect(stdoutWrites.join("")).toContain("unset");
  });

  it("sends every property the API accepts in one request", async () => {
    stubFetch({ ok: true, user: { email: "ada@example.com" } });

    await runUpdate(
      "--start-date",
      "2024-10-07",
      "--github-username",
      "ada-lovelace",
      "--additional-github-username",
      "ada-work",
      "--gitlab-username",
      "ada.lovelace",
      "--ai-light-adoption-date",
      "2025-01-15",
      "--ai-moderate-adoption-date",
      "2025-03-01",
      "--ai-heavy-adoption-date",
      "2025-06-30",
      "--sso-email",
      "ada@sso.example.com",
      "--additional-emails",
      "ada@old.example.com, ada@alias.example.com",
      "--protected",
      "true",
      "--exclude-from-snapshots",
      "false",
      "--developer",
      "true",
    );

    expectRequestBody({
      start_date: "2024-10-07",
      github_username: "ada-lovelace",
      additional_github_username: "ada-work",
      gitlab_username: "ada.lovelace",
      ai_light_adoption_date: "2025-01-15",
      ai_moderate_adoption_date: "2025-03-01",
      ai_heavy_adoption_date: "2025-06-30",
      sso_email: "ada@sso.example.com",
      additional_emails: ["ada@old.example.com", "ada@alias.example.com"],
      protected: true,
      exclude_from_snapshots: false,
      developer: true,
    });
  });

  it("sends null to clear text, date, and list properties", async () => {
    stubFetch({ ok: true, user: { email: "ada@example.com" } });

    await runUpdate(
      "--start-date",
      "null",
      "--github-username",
      "null",
      "--sso-email",
      "null",
      "--additional-emails",
      "null",
    );

    expectRequestBody({
      start_date: null,
      github_username: null,
      sso_email: null,
      additional_emails: null,
    });
  });

  it("leaves out properties that were not passed", async () => {
    stubFetch({ ok: true, user: { email: "ada@example.com" } });

    await runUpdate("--gitlab-username", "ada.lovelace");

    expectRequestBody({ gitlab_username: "ada.lovelace" });
  });

  it("lists every property in the output and marks missing ones unset", async () => {
    stubFetch({
      ok: true,
      user: {
        email: "ada@example.com",
        start_date: "2024-10-07",
        exclude_from_snapshots: false,
        github_username: "ada-lovelace",
        additional_emails: ["ada@old.example.com", "ada@alias.example.com"],
      },
    });

    await runUpdate("--start-date", "2024-10-07");

    const out = stdoutWrites.join("");
    expect(out).toContain("Start date");
    expect(out).toContain("2024-10-07");
    expect(out).toContain("Additional GitHub username");
    expect(out).toContain("AI moderate adoption date");
    expect(out).toContain("ada@old.example.com, ada@alias.example.com");
    expect(out).toContain("unset");
    expect(out).not.toContain("Protected");
  });

  it("shows the protected property when the API returns it", async () => {
    stubFetch({
      ok: true,
      user: { email: "ada@example.com", protected: true },
    });

    await runUpdate("--protected", "true");

    expectRequestBody({ protected: true });
    expect(stdoutWrites.join("")).toContain("Protected");
  });

  it("prints the API response with --json", async () => {
    const response = {
      ok: true,
      user: { email: "ada@example.com", developer: true },
    };
    stubFetch(response);

    const { run } = await import("../../cli.js");
    await run([
      "node",
      "dx",
      "--json",
      "users",
      "update",
      "ada@example.com",
      "--developer",
      "true",
    ]);

    expect(JSON.parse(stdoutWrites.join(""))).toEqual(response);
  });

  describe("argument validation", () => {
    async function expectArgumentError(args: string[], message: string) {
      stubFetch({ ok: true });
      const exitSpy = vi
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);

      await runUpdate(...args);

      expect(stderrWrites.join("")).toContain(message);
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(fetch).not.toHaveBeenCalled();
    }

    it("rejects a --developer value that is not true, false, or null", async () => {
      await expectArgumentError(
        ["--developer", "yes"],
        "--developer must be true, false, or null",
      );
    });

    it.each(["--protected", "--exclude-from-snapshots"])(
      "rejects null for %s",
      async (flag) => {
        await expectArgumentError(
          [flag, "null"],
          `${flag} must be true or false`,
        );
      },
    );

    it.each(["next week", "2024-2-3", "2024-02-30", "2024-13-45"])(
      "rejects the date %s",
      async (date) => {
        await expectArgumentError(
          ["--ai-heavy-adoption-date", date],
          "--ai-heavy-adoption-date must be a date formatted as YYYY-MM-DD",
        );
      },
    );

    it("rejects an empty --additional-emails list", async () => {
      await expectArgumentError(
        ["--additional-emails", " , "],
        "--additional-emails needs at least one email address",
      );
    });

    it("errors when there is nothing to update", async () => {
      await expectArgumentError([], "Nothing to update");
    });
  });

  describe("error messages", () => {
    it("explains an unknown user", async () => {
      stubFetch({ ok: false, error: "User not found" }, 404);
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      await runUpdate("--developer", "null");

      expect(stderrWrites.join("")).toContain(
        "No active DX user has that email address",
      );
    });

    it("explains that only manually managed accounts can clear the flag", async () => {
      stubFetch({ ok: false, error: "Developer must be true or false" }, 422);
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      await runUpdate("--developer", "null");

      expect(stderrWrites.join("")).toContain(
        "Only accounts that manage developer classification manually",
      );
    });

    it("shows the API message for a GitHub username that is taken", async () => {
      stubFetch(
        { ok: false, error: "GitHub username 'ada' is already taken" },
        409,
      );
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      await runUpdate("--github-username", "ada");

      expect(stderrWrites.join("")).toContain(
        "GitHub username 'ada' is already taken",
      );
    });

    it("keeps the API error unchanged with --json", async () => {
      stubFetch({ ok: false, error: "User not found" }, 404);
      vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      const { run } = await import("../../cli.js");
      await run([
        "node",
        "dx",
        "--json",
        "users",
        "update",
        "ada@example.com",
        "--developer",
        "null",
      ]);

      expect(JSON.parse(stdoutWrites.join(""))).toEqual({
        ok: false,
        error: "User not found",
        http_status: 404,
        body: { ok: false, error: "User not found" },
      });
    });
  });
});

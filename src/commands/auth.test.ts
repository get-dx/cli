import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../secrets.js", () => ({
  setToken,
  deleteToken,
  getToken,
}));

vi.mock("picocolors", () => ({
  default: {
    bold: (s: string) => (process.stdout.isTTY ? `\u001b[1m${s}\u001b[22m` : s),
    dim: (s: string) => (process.stdout.isTTY ? `\u001b[2m${s}\u001b[22m` : s),
    cyan: (s: string) =>
      process.stdout.isTTY ? `\u001b[36m${s}\u001b[39m` : s,
    green: (s: string) =>
      process.stdout.isTTY ? `\u001b[32m${s}\u001b[39m` : s,
    red: (s: string) => (process.stdout.isTTY ? `\u001b[31m${s}\u001b[39m` : s),
    blue: (s: string) =>
      process.stdout.isTTY ? `\u001b[34m${s}\u001b[39m` : s,
    magenta: (s: string) =>
      process.stdout.isTTY ? `\u001b[35m${s}\u001b[39m` : s,
  },
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

describe("auth commands", () => {
  describe("login", () => {
    it("validates the token and stores it", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";
      process.env.DX_BASE_URL = "https://api.example.com";

      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "account_web_api_token",
                token_name: "cli",
                scopes: ["entities:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
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
        "auth",
        "login",
        "--token",
        "secret-token",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/auth.info",
        expect.objectContaining({ method: "GET" }),
      );
      expect(setToken).toHaveBeenCalledWith(
        "https://api.example.com",
        "secret-token",
      );
      expect(writes.join("")).toContain(
        '"base_url": "https://api.example.com"',
      );
      expect(writes.join("")).toContain('"token_name": "cli"');
    });

    it("accepts personal access tokens", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";
      process.env.DX_BASE_URL = "https://api.example.com";

      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "personal_access_token",
                token_name: "pat",
                scopes: ["entities:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
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
        "auth",
        "login",
        "--token",
        "secret-token",
      ]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/auth.info",
        expect.objectContaining({ method: "GET" }),
      );
      expect(setToken).toHaveBeenCalledWith(
        "https://api.example.com",
        "secret-token",
      );
      expect(writes.join("")).toContain(
        '"token_type": "personal_access_token"',
      );
      expect(writes.join("")).toContain('"token_name": "pat"');
    });
  });

  describe("status", () => {
    it("shows the current auth details", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "account_web_api_token",
                token_name: "cli",
                scopes: ["entities:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "auth", "status"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/auth.info",
        expect.objectContaining({ method: "GET" }),
      );
      expect(writes.join("")).toContain('"token_name": "cli"');
      expect(writes.join("")).toContain('"token": "toke**1234"');
    });

    it("is human-readable by default", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "account_web_api_token",
                token_name: "cli",
                scopes: ["entities:read", "auth:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "status"]);

      const output = writes.join("");
      expect(output).toContain(
        "✓ Logged in to https://api.example.com account DX",
      );
      expect(output).toContain("Token:            toke**1234");
      expect(output).toContain("Token type:       Account-level web API token");
      expect(output).toContain("Token name:       cli");
      expect(output).toContain("- entities:read");
      expect(output).toContain("- auth:read");
      expect(output).toContain("(2026-03-31T12:00:00Z)");
      expect(output).not.toContain("\u001b[");
    });

    it("renders personal access tokens in human-readable output", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "personal_access_token",
                token_name: "pat",
                scopes: ["entities:read"],
                expires_at: "2027-06-30T00:00:00Z",
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "status"]);

      const output = writes.join("");
      expect(output).toContain(
        "✓ Logged in to https://api.example.com account DX",
      );
      expect(output).toContain("Token:            toke**1234");
      expect(output).toContain("Token type:       Personal access token");
      expect(output).toContain("Token name:       pat");
      expect(output).toContain("Token expires at");
      expect(output).toContain("(2027-06-30T00:00:00Z)");
    });

    it("shows no expiration for personal access tokens without expires_at", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "personal_access_token",
                token_name: "pat",
                scopes: ["entities:read"],
                expires_at: null,
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "status"]);

      const output = writes.join("");
      expect(output).toContain("Token expires at");
      expect(output).toContain("(no expiration)");
    });

    it("uses colors when stdout is a tty", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      const originalDescriptor = Object.getOwnPropertyDescriptor(
        process.stdout,
        "isTTY",
      );
      Object.defineProperty(process.stdout, "isTTY", {
        configurable: true,
        value: true,
      });

      process.env.DX_BASE_URL = "https://api.example.com";
      delete process.env.NO_COLOR;
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "account_web_api_token",
                token_name: "cli",
                scopes: ["entities:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "status"]);

      if (originalDescriptor) {
        Object.defineProperty(process.stdout, "isTTY", originalDescriptor);
      } else {
        delete (process.stdout as { isTTY?: boolean }).isTTY;
      }

      const output = writes.join("");
      expect(output).toContain("\u001b[");
      expect(output).toContain("✓");
      expect(output).toContain("Logged in to");
    });

    it("emits JSON logs to stderr when --json is present", async () => {
      const stdoutWrites: string[] = [];
      const stderrWrites: string[] = [];
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

      const originalDescriptor = Object.getOwnPropertyDescriptor(
        process.stderr,
        "isTTY",
      );
      Object.defineProperty(process.stderr, "isTTY", {
        configurable: true,
        value: true,
      });

      process.env.DX_BASE_URL = "https://api.example.com";
      process.env.DX_LOG_LEVEL = "debug";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "account_web_api_token",
                token_name: "cli",
                scopes: ["entities:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "auth", "status"]);

      if (originalDescriptor) {
        Object.defineProperty(process.stderr, "isTTY", originalDescriptor);
      } else {
        delete (process.stderr as { isTTY?: boolean }).isTTY;
      }

      expect(JSON.parse(stdoutWrites.join("")).ok).toBe(true);
      expect(stderrWrites).toHaveLength(2);
      expect(JSON.parse(stderrWrites[0]).message).toBe("Sending HTTP request");
      expect(JSON.parse(stderrWrites[1]).message).toBe(
        "Received HTTP response",
      );
    });

    it("emits JSON logs to stderr when stderr is not a tty", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);

      const originalDescriptor = Object.getOwnPropertyDescriptor(
        process.stderr,
        "isTTY",
      );
      Object.defineProperty(process.stderr, "isTTY", {
        configurable: true,
        value: false,
      });

      process.env.DX_BASE_URL = "https://api.example.com";
      process.env.DX_LOG_LEVEL = "debug";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "account_web_api_token",
                token_name: "cli",
                scopes: ["entities:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "status"]);

      if (originalDescriptor) {
        Object.defineProperty(process.stderr, "isTTY", originalDescriptor);
      } else {
        delete (process.stderr as { isTTY?: boolean }).isTTY;
      }

      expect(stderrWrites).toHaveLength(2);
      expect(JSON.parse(stderrWrites[0]).message).toBe("Sending HTTP request");
    });

    it("does not emit logs when DX_LOG_LEVEL is unset", async () => {
      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);

      process.env.DX_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth: {
                token_type: "account_web_api_token",
                token_name: "cli",
                scopes: ["entities:read"],
                created_at: "2026-03-31T12:00:00Z",
              },
              account: { name: "DX" },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "status"]);

      expect(stderrWrites).toEqual([]);
    });
  });

  describe("logout", () => {
    it("removes the stored token for the active base URL", async () => {
      process.env.DX_BASE_URL = "https://api.example.com";

      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "auth", "logout"]);

      expect(deleteToken).toHaveBeenCalledWith("https://api.example.com");
      expect(writes.join("")).toContain('"logged_out": true');
    });
  });
});

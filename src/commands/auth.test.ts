import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EXIT_CODES } from "../errors.js";
import { writeConfig } from "../config.js";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../secrets.js", () => ({
  setToken,
  deleteToken,
  getToken,
}));

const mockSelect = vi.fn();
const mockPassword = vi.fn();

vi.mock("@inquirer/prompts", () => ({
  select: (...args: unknown[]) => mockSelect(...args),
  password: (...args: unknown[]) => mockPassword(...args),
}));

vi.mock("../loginViaBrowser.js", async () => {
  const actual = await vi.importActual<typeof import("../loginViaBrowser.js")>(
    "../loginViaBrowser.js",
  );
  return {
    ...actual,
    loginViaBrowser: vi.fn(),
  };
});

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

beforeEach(async () => {
  process.env = { ...originalEnv };
  getToken.mockReset();
  setToken.mockReset();
  deleteToken.mockReset();
  mockSelect.mockReset();
  mockPassword.mockReset();
  const { loginViaBrowser } = await import("../loginViaBrowser.js");
  vi.mocked(loginViaBrowser).mockReset();
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
        "https://api.getdx.com/auth.info",
        expect.objectContaining({ method: "GET" }),
      );
      expect(setToken).toHaveBeenCalledWith(
        "https://api.getdx.com",
        "secret-token",
      );
      expect(writes.join("")).toContain(
        '"api_base_url": "https://api.getdx.com"',
      );
      expect(writes.join("")).toContain(
        '"web_base_url": "https://app.getdx.com"',
      );
      expect(writes.join("")).toContain('"token_name": "cli"');
    });

    it("accepts personal access tokens", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";

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
        "https://api.getdx.com/auth.info",
        expect.objectContaining({ method: "GET" }),
      );
      expect(setToken).toHaveBeenCalledWith(
        "https://api.getdx.com",
        "secret-token",
      );
      expect(writes.join("")).toContain(
        '"token_type": "personal_access_token"',
      );
      expect(writes.join("")).toContain('"token_name": "pat"');
    });

    it("fails without --token when stdin is not a tty", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";

      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);

      const stdinDesc = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
      Object.defineProperty(process.stdin, "isTTY", {
        configurable: true,
        value: false,
      });

      vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("blocked process.exit");
      }) as typeof process.exit);

      const { run } = await import("../cli.js");
      await expect(run(["node", "dx", "auth", "login"])).rejects.toThrow(
        "blocked process.exit",
      );

      if (stdinDesc) {
        Object.defineProperty(process.stdin, "isTTY", stdinDesc);
      } else {
        delete (process.stdin as { isTTY?: boolean }).isTTY;
      }

      expect(stderrWrites.join("")).toContain("--token");
    });

    it("logs in via browser when chosen interactively", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";

      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      const stdinDesc = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
      const stderrDesc = Object.getOwnPropertyDescriptor(
        process.stderr,
        "isTTY",
      );
      Object.defineProperty(process.stdin, "isTTY", {
        configurable: true,
        value: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        configurable: true,
        value: true,
      });

      mockSelect.mockResolvedValue("browser");
      const { loginViaBrowser } = await import("../loginViaBrowser.js");
      vi.mocked(loginViaBrowser).mockResolvedValue("oauth-token");

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
      await run(["node", "dx", "--json", "auth", "login"]);

      if (stdinDesc) {
        Object.defineProperty(process.stdin, "isTTY", stdinDesc);
      } else {
        delete (process.stdin as { isTTY?: boolean }).isTTY;
      }
      if (stderrDesc) {
        Object.defineProperty(process.stderr, "isTTY", stderrDesc);
      } else {
        delete (process.stderr as { isTTY?: boolean }).isTTY;
      }

      expect(loginViaBrowser).toHaveBeenCalledWith("https://app.getdx.com");
      expect(setToken).toHaveBeenCalledWith(
        "https://api.getdx.com",
        "oauth-token",
      );
      expect(writes.join("")).toContain('"token_name": "cli"');
    });

    it("logs in with a pasted token when chosen interactively", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";

      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      const stdinDesc = Object.getOwnPropertyDescriptor(process.stdin, "isTTY");
      const stderrDesc = Object.getOwnPropertyDescriptor(
        process.stderr,
        "isTTY",
      );
      Object.defineProperty(process.stdin, "isTTY", {
        configurable: true,
        value: true,
      });
      Object.defineProperty(process.stderr, "isTTY", {
        configurable: true,
        value: true,
      });

      mockSelect.mockResolvedValue("token");
      mockPassword.mockResolvedValue("pasted-secret");

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
      await run(["node", "dx", "--json", "auth", "login"]);

      if (stdinDesc) {
        Object.defineProperty(process.stdin, "isTTY", stdinDesc);
      } else {
        delete (process.stdin as { isTTY?: boolean }).isTTY;
      }
      if (stderrDesc) {
        Object.defineProperty(process.stderr, "isTTY", stderrDesc);
      } else {
        delete (process.stderr as { isTTY?: boolean }).isTTY;
      }

      expect(mockPassword).toHaveBeenCalled();
      expect(setToken).toHaveBeenCalledWith(
        "https://api.getdx.com",
        "pasted-secret",
      );
      expect(writes.join("")).toContain('"token_name": "cli"');
    });

    it("requires DX_WEB_BASE_URL when DX_API_BASE_URL is set", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";
      process.env.DX_API_BASE_URL = "https://api.corp.example.com";
      delete process.env.DX_WEB_BASE_URL;

      const stderrWrites: string[] = [];
      vi.spyOn(process.stderr, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        stderrWrites.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);

      const exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("blocked process.exit");
      }) as typeof process.exit);

      vi.stubGlobal("fetch", vi.fn());

      const { run } = await import("../cli.js");
      await expect(
        run(["node", "dx", "auth", "login", "--token", "secret-token"]),
      ).rejects.toThrow("blocked process.exit");

      expect(fetch).not.toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(EXIT_CODES.ARGUMENT_ERROR);
      expect(stderrWrites.join("")).toContain(
        "DX_WEB_BASE_URL must be set when DX_API_BASE_URL is set",
      );
    });

    it("allows custom API hosts when DX_WEB_BASE_URL is set", async () => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-config";
      process.env.DX_API_BASE_URL = "https://api.corp.example.com";
      process.env.DX_WEB_BASE_URL = "https://app.corp.example.com";

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
        "https://api.corp.example.com/auth.info",
        expect.objectContaining({ method: "GET" }),
      );
      expect(writes.join("")).toContain(
        '"web_base_url": "https://app.corp.example.com"',
      );
    });
  });

  describe("status", () => {
    beforeEach(() => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-auth-status";
      writeConfig({});
    });

    it("shows the current auth details", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_API_BASE_URL = "https://api.example.com";
      process.env.DX_WEB_BASE_URL = "https://app.example.com";
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
      expect(writes.join("")).toContain(
        '"api_base_url": "https://api.example.com"',
      );
      expect(writes.join("")).toContain(
        '"web_base_url": "https://app.example.com"',
      );
    });

    it("is human-readable by default", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_API_BASE_URL = "https://api.example.com";
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
      expect(output).toContain("Token type:       Organization token");
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

      process.env.DX_API_BASE_URL = "https://api.example.com";
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

      process.env.DX_API_BASE_URL = "https://api.example.com";
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

      process.env.DX_API_BASE_URL = "https://api.example.com";
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

      process.env.DX_API_BASE_URL = "https://api.example.com";
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

      process.env.DX_API_BASE_URL = "https://api.example.com";
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

      process.env.DX_API_BASE_URL = "https://api.example.com";
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

  describe("whoami", () => {
    beforeEach(() => {
      process.env.XDG_CONFIG_HOME = "/tmp/dx-cli-test-auth-whoami";
      writeConfig({});
    });

    it("returns JSON for an org token with --json", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth_token_type: "account_web_api_token",
              account: { name: "Example Corp" },
              user: null,
              team: null,
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "auth", "whoami"]);

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/auth.whoami",
        expect.objectContaining({ method: "GET" }),
      );
      const output = JSON.parse(writes.join(""));
      expect(output.ok).toBe(true);
      expect(output.auth_token_type).toBe("account_web_api_token");
      expect(output.account.name).toBe("Example Corp");
      expect(output.user).toBeNull();
      expect(output.team).toBeNull();
    });

    it("renders human-readable output for an org token", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth_token_type: "account_web_api_token",
              account: { name: "Example Corp" },
              user: null,
              team: null,
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "whoami"]);

      const output = writes.join("");
      expect(output).toContain("Auth");
      expect(output).toContain("Example Corp");
      expect(output).toContain("Organization token");
      expect(output).toContain("User");
      expect(output).toContain("Team");
      expect(output).toContain("Not applicable for organization tokens");
    });

    it("renders user and team details for a PAT with --json", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth_token_type: "personal_access_token",
              account: { name: "Example Corp" },
              user: { id: "MTJ2", name: "John Doe", email: "john@example.com" },
              team: {
                id: "NTk3",
                name: "Cool Team",
                lead: { id: "MTJ2", name: "Jane Smith", email: "jane@example.com" },
                contributors: [
                  { id: "MTJ2", name: "John Doe", email: "john@example.com" },
                  { id: "ABC1", name: "Alice", email: "alice@example.com" },
                ],
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "--json", "auth", "whoami"]);

      const output = JSON.parse(writes.join(""));
      expect(output.auth_token_type).toBe("personal_access_token");
      expect(output.user.name).toBe("John Doe");
      expect(output.team.name).toBe("Cool Team");
      expect(output.team.lead.name).toBe("Jane Smith");
      expect(output.team.contributors).toHaveLength(2);
    });

    it("renders human-readable output for a PAT with user and team", async () => {
      const writes: string[] = [];
      vi.spyOn(process.stdout, "write").mockImplementation(((
        chunk: string | Uint8Array,
      ) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stdout.write);

      process.env.DX_API_BASE_URL = "https://api.example.com";
      getToken.mockReturnValue("token-1234");

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              ok: true,
              auth_token_type: "personal_access_token",
              account: { name: "Example Corp" },
              user: { id: "MTJ2", name: "John Doe", email: "john@example.com" },
              team: {
                id: "NTk3",
                name: "Cool Team",
                lead: { id: "ABC1", name: "Jane Smith", email: "jane@example.com" },
                contributors: [
                  { id: "MTJ2", name: "John Doe", email: "john@example.com" },
                  { id: "XYZ9", name: "Alice", email: "alice@example.com" },
                ],
              },
            }),
            { status: 200 },
          ),
        ),
      );

      const { run } = await import("../cli.js");
      await run(["node", "dx", "auth", "whoami"]);

      const output = writes.join("");
      expect(output).toContain("Auth");
      expect(output).toContain("Personal access token");
      expect(output).toContain("User");
      expect(output).toContain("John Doe");
      expect(output).toContain("john@example.com");
      expect(output).toContain("Team");
      expect(output).toContain("Jane Smith");
      expect(output).toContain("jane@example.com");
      expect(output).toContain("Contributors:");
      expect(output).toContain("Alice");
      expect(output).toContain("alice@example.com");
    });
  });

  describe("logout", () => {
    it("removes the stored token for the active base URL", async () => {
      process.env.DX_API_BASE_URL = "https://api.example.com";

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

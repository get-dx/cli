import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const setToken = vi.fn();
const deleteToken = vi.fn();
const getToken = vi.fn();

vi.mock("../src/secrets.js", () => ({
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

describe("cli commands", () => {
  it("auth login validates the token and stores it", async () => {
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
              token_type: "account_web_api",
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

    const { createProgram } = await import("../src/cli.js");
    await createProgram().parseAsync([
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
    expect(writes.join("")).toContain('"base_url": "https://api.example.com"');
    expect(writes.join("")).toContain('"token_name": "cli"');
  });

  it("entities get uses the configured token and endpoint", async () => {
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

    const { createProgram } = await import("../src/cli.js");
    await createProgram().parseAsync([
      "node",
      "dx",
      "--json",
      "entities",
      "get",
      "svc-a",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/entities.info?identifier=svc-a",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Headers),
      }),
    );
    expect(writes.join("")).toContain('"identifier": "svc-a"');
  });

  it("auth status shows the current auth details", async () => {
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
              token_type: "account_web_api",
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

    const { createProgram } = await import("../src/cli.js");
    await createProgram().parseAsync([
      "node",
      "dx",
      "--json",
      "auth",
      "status",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/auth.info",
      expect.objectContaining({ method: "GET" }),
    );
    expect(writes.join("")).toContain('"token_name": "cli"');
    expect(writes.join("")).toContain('"token": "toke**1234"');
  });

  it("auth status is human-readable by default", async () => {
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
              token_type: "account_web_api",
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

    const { createProgram } = await import("../src/cli.js");
    await createProgram().parseAsync(["node", "dx", "auth", "status"]);

    const output = writes.join("");
    expect(output).toContain(
      "* Logged in to https://api.example.com account DX",
    );
    expect(output).toContain("  - Token: toke**1234");
    expect(output).toContain("  - Token type: account_web_api");
    expect(output).toContain("  - Token name: cli");
    expect(output).toContain("  - Token scopes: entities:read, auth:read");
    expect(output).toContain("  - Token created at: 2026-03-31T12:00:00Z");
    expect(output).not.toContain("\u001b[");
  });

  it("auth status uses colors when stdout is a tty", async () => {
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
              token_type: "account_web_api",
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

    const { createProgram } = await import("../src/cli.js");
    await createProgram().parseAsync(["node", "dx", "auth", "status"]);

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

  it("entities get sends agent provenance from environment variables", async () => {
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

    const { createProgram } = await import("../src/cli.js");
    await createProgram().parseAsync([
      "node",
      "dx",
      "--json",
      "entities",
      "get",
      "svc-a",
    ]);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/entities.info?identifier=svc-a",
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

  it("auth logout removes the stored token for the active base URL", async () => {
    process.env.DX_BASE_URL = "https://api.example.com";

    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    const { createProgram } = await import("../src/cli.js");
    await createProgram().parseAsync([
      "node",
      "dx",
      "--json",
      "auth",
      "logout",
    ]);

    expect(deleteToken).toHaveBeenCalledWith("https://api.example.com");
    expect(writes.join("")).toContain('"logged_out": true');
  });
});

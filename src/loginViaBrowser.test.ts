import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthCodeCallbackServer } from "./authCodeCallbackServer.js";

const mockStart = vi.fn();
const mockGetAddress = vi.fn();
const mockListenForCodeResponse = vi.fn();
const mockStop = vi.fn();
const mockOpen = vi.fn();

vi.mock("./authCodeCallbackServer.js", () => ({
  AuthCodeCallbackServer: vi.fn(),
}));

vi.mock("open", () => ({ default: mockOpen }));

vi.mock("picocolors", () => ({
  default: {
    bold: (s: string) => s,
    dim: (s: string) => s,
    cyan: (s: string) => s,
    green: (s: string) => s,
    red: (s: string) => s,
    blue: (s: string) => s,
    magenta: (s: string) => s,
  },
}));

beforeEach(() => {
  vi.mocked(AuthCodeCallbackServer).mockImplementation(
    () =>
      ({
        start: mockStart,
        getAddress: mockGetAddress,
        listenForCodeResponse: mockListenForCodeResponse,
        stop: mockStop,
      }) as unknown as AuthCodeCallbackServer,
  );

  mockStart.mockResolvedValue(undefined);
  mockGetAddress.mockReturnValue("http://127.0.0.1:12345");
  mockOpen.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("loginViaBrowser", () => {
  it("starts the callback server and returns the access token on success", async () => {
    mockListenForCodeResponse.mockResolvedValue({
      type: "SUCCESS",
      token: "access-token-abc",
      redirectUri: null,
    });

    const { loginViaBrowser } = await import("./loginViaBrowser.js");
    const token = await loginViaBrowser("https://app.example.com");

    expect(token).toBe("access-token-abc");
    expect(mockStart).toHaveBeenCalledOnce();
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining("https://app.example.com/cli/auth?"),
    );
  });

  it("builds the auth URL with callback_uri, state, and S256 PKCE params", async () => {
    mockListenForCodeResponse.mockResolvedValue({
      type: "SUCCESS",
      token: "token",
      redirectUri: null,
    });

    let capturedUrl = "";
    mockOpen.mockImplementation(async (url: string) => {
      capturedUrl = url;
    });

    const { loginViaBrowser } = await import("./loginViaBrowser.js");
    await loginViaBrowser("https://app.example.com");

    const params = new URL(capturedUrl).searchParams;
    expect(params.get("callback_uri")).toBe("http://127.0.0.1:12345");
    expect(params.get("state")).toMatch(/^[\w-]+$/);
    expect(params.get("code_challenge")).toMatch(/^[A-Za-z0-9+/]+$/);
    expect(params.get("code_challenge_method")).toBe("S256");
  });

  it("throws CliError when the callback state does not match", async () => {
    mockListenForCodeResponse.mockImplementation(
      async (callback: (state: string, code: string) => Promise<unknown>) => {
        return callback("tampered-state", "some-code");
      },
    );

    const { loginViaBrowser } = await import("./loginViaBrowser.js");
    await expect(loginViaBrowser("https://app.example.com")).rejects.toThrow(
      "Authentication failed: state mismatch",
    );
  });

  it("exchanges the auth code for a token when state matches", async () => {
    let capturedState = "";
    mockOpen.mockImplementation(async (url: string) => {
      capturedState = new URL(url).searchParams.get("state") ?? "";
    });

    mockListenForCodeResponse.mockImplementation(
      async (callback: (state: string, code: string) => Promise<unknown>) => {
        return callback(capturedState, "auth-code-xyz");
      },
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "bearer-token-123",
            redirect_uri: "https://app.example.com/done",
          }),
          { status: 200 },
        ),
      ),
    );

    const { loginViaBrowser } = await import("./loginViaBrowser.js");
    const token = await loginViaBrowser("https://app.example.com");

    expect(token).toBe("bearer-token-123");
    expect(fetch).toHaveBeenCalledWith(
      "https://app.example.com/cli/token",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }),
    );

    const fetchBody = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1]
      .body as URLSearchParams;
    expect(fetchBody.get("code")).toBe("auth-code-xyz");
    expect(fetchBody.get("code_verifier")).toMatch(/^[\w-]+$/);
  });

  it("throws CliError when token exchange returns a non-ok status", async () => {
    let capturedState = "";
    mockOpen.mockImplementation(async (url: string) => {
      capturedState = new URL(url).searchParams.get("state") ?? "";
    });

    mockListenForCodeResponse.mockImplementation(
      async (callback: (state: string, code: string) => Promise<unknown>) => {
        return callback(capturedState, "auth-code-xyz");
      },
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );

    const { loginViaBrowser } = await import("./loginViaBrowser.js");
    await expect(loginViaBrowser("https://app.example.com")).rejects.toThrow(
      "Authentication failed: token exchange failed with status 401",
    );
  });

  it("prints a fallback URL when the browser cannot be opened", async () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      writes.push(String(chunk));
      return true;
    }) as typeof process.stdout.write);

    mockOpen.mockRejectedValue(new Error("Cannot open browser"));
    mockListenForCodeResponse.mockResolvedValue({
      type: "SUCCESS",
      token: "token",
      redirectUri: null,
    });

    const { loginViaBrowser } = await import("./loginViaBrowser.js");
    await loginViaBrowser("https://app.example.com");

    const output = writes.join("");
    expect(output).toContain("Failed to open browser automatically");
    expect(output).toContain("https://app.example.com/cli/auth?");
  });
});

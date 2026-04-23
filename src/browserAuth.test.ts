import { get as httpGet } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { openMock } = vi.hoisted(() => ({ openMock: vi.fn() }));

vi.mock("open", () => ({ default: openMock }));

import { openUrl, startBrowserLogin } from "./browserAuth.js";

/**
 * Use Node's http module rather than the global fetch so that requests to the
 * local callback server are not intercepted by any `vi.stubGlobal("fetch", …)`
 * mocks set up for the token-exchange call.
 */
function httpRequest(url: string): Promise<{
  status: number;
  body: string;
  location: string | undefined;
}> {
  return new Promise((resolve, reject) => {
    httpGet(url, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          body,
          location: res.headers.location,
        });
      });
    }).on("error", reject);
  });
}

beforeEach(() => {
  openMock.mockReset();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openUrl", () => {
  it("calls open with the provided URL", async () => {
    openMock.mockResolvedValue(undefined);
    await openUrl("https://example.com/login");
    expect(openMock).toHaveBeenCalledWith("https://example.com/login");
  });

  it("writes an error to stderr when open throws", async () => {
    const stderrWrites: string[] = [];
    vi.spyOn(process.stderr, "write").mockImplementation(((
      chunk: string | Uint8Array,
    ) => {
      stderrWrites.push(String(chunk));
      return true;
    }) as typeof process.stderr.write);

    openMock.mockRejectedValue(new Error("spawn failed"));
    await openUrl("https://example.com/login");

    const output = stderrWrites.join("");
    expect(output).toContain("Failed to open browser automatically");
    expect(output).toContain("https://example.com/login");
  });
});

describe("startBrowserLogin", () => {
  it("returns an authUrl with the correct structure and query parameters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "tok-abc", redirect_uri: null }),
          { status: 200 },
        ),
      ),
    );

    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    expect(`${url.origin}${url.pathname}`).toBe(
      "https://app.example.com/cli/auth",
    );
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBeTruthy();
    expect(url.searchParams.get("state")).toBeTruthy();

    const callbackUri = url.searchParams.get("callback_uri")!;
    expect(callbackUri).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);

    const port = new URL(callbackUri).port;
    const state = url.searchParams.get("state")!;

    // Trigger callback to close the server and satisfy waitForToken
    const callbackPromise = httpRequest(
      `http://127.0.0.1:${port}?code=any-code&state=${state}`,
    );

    await waitForToken();
    await callbackPromise;
  });

  it("waitForToken resolves with the access token on a successful exchange", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ access_token: "tok-abc", redirect_uri: null }),
          { status: 200 },
        ),
      ),
    );

    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    const state = url.searchParams.get("state")!;
    const port = new URL(url.searchParams.get("callback_uri")!).port;

    const callbackPromise = httpRequest(
      `http://127.0.0.1:${port}?code=auth-code&state=${state}`,
    );

    const token = await waitForToken();
    expect(token).toBe("tok-abc");

    const callbackResponse = await callbackPromise;
    expect(callbackResponse.status).toBe(200);

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.com/cli/token",
      expect.objectContaining({
        method: "POST",
        body: expect.any(URLSearchParams),
      }),
    );
  });

  it("waitForToken sends the code and code_verifier to the token endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "tok-xyz", redirect_uri: null }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    const state = url.searchParams.get("state")!;
    const port = new URL(url.searchParams.get("callback_uri")!).port;

    httpRequest(`http://127.0.0.1:${port}?code=my-code&state=${state}`).catch(
      () => {},
    );

    await waitForToken();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = init.body as URLSearchParams;
    expect(body.get("code")).toBe("my-code");
    expect(body.get("code_verifier")).toBeTruthy();
  });

  it("redirects to redirectUri when the token exchange returns one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "tok-abc",
            redirect_uri: "https://app.example.com/cli/success",
          }),
          { status: 200 },
        ),
      ),
    );

    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    const state = url.searchParams.get("state")!;
    const port = new URL(url.searchParams.get("callback_uri")!).port;

    const callbackPromise = httpRequest(
      `http://127.0.0.1:${port}?code=auth-code&state=${state}`,
    );

    await waitForToken();

    const callbackResponse = await callbackPromise;
    expect(callbackResponse.status).toBe(302);
    expect(callbackResponse.location).toBe(
      "https://app.example.com/cli/success",
    );
  });

  it("rejects on state mismatch and returns 400 to the browser", async () => {
    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    const port = new URL(url.searchParams.get("callback_uri")!).port;

    const callbackPromise = httpRequest(
      `http://127.0.0.1:${port}?code=auth-code&state=wrong-state`,
    );

    await expect(waitForToken()).rejects.toThrow(
      "Authentication failed: state mismatch",
    );

    const callbackResponse = await callbackPromise;
    expect(callbackResponse.status).toBe(400);
    expect(callbackResponse.body).toContain("state mismatch");
  });

  it("rejects when no code is present in the callback and returns 400", async () => {
    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    const state = url.searchParams.get("state")!;
    const port = new URL(url.searchParams.get("callback_uri")!).port;

    const callbackPromise = httpRequest(
      `http://127.0.0.1:${port}?state=${state}`,
    );

    await expect(waitForToken()).rejects.toThrow(
      "Authentication failed: no code received",
    );

    const callbackResponse = await callbackPromise;
    expect(callbackResponse.status).toBe(400);
    expect(callbackResponse.body).toContain("no code received");
  });

  it("rejects when token exchange returns a non-2xx status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 })),
    );

    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    const state = url.searchParams.get("state")!;
    const port = new URL(url.searchParams.get("callback_uri")!).port;

    const callbackPromise = httpRequest(
      `http://127.0.0.1:${port}?code=bad-code&state=${state}`,
    );

    await expect(waitForToken()).rejects.toThrow(
      "Authentication failed: token exchange failed with status 401",
    );

    const callbackResponse = await callbackPromise;
    expect(callbackResponse.status).toBe(400);
  });

  it("rejects when the token exchange response contains no access_token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ redirect_uri: null }), { status: 200 }),
      ),
    );

    const { authUrl, waitForToken } = await startBrowserLogin(
      "https://api.example.com",
      "https://app.example.com",
    );

    const url = new URL(authUrl);
    const state = url.searchParams.get("state")!;
    const port = new URL(url.searchParams.get("callback_uri")!).port;

    const callbackPromise = httpRequest(
      `http://127.0.0.1:${port}?code=bad-code&state=${state}`,
    );

    await expect(waitForToken()).rejects.toThrow(
      "Authentication failed: no access token returned",
    );

    const callbackResponse = await callbackPromise;
    expect(callbackResponse.status).toBe(400);
    expect(callbackResponse.body).toContain("no access token returned");
  });
});

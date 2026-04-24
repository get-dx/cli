import { createHash, randomBytes } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

import { CliError } from "./errors.js";

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;

export async function startBrowserLogin(
  apiBaseUrl: string,
  uiBaseUrl: string,
): Promise<{
  authUrl: string;
  waitForToken: () => Promise<string>;
}> {
  const codeVerifier = generateCodeVerifier();
  const state = randomBytes(16).toString("base64url");

  const { port, waitForCode } = await startCallbackServer(state);

  const callbackUri = `http://127.0.0.1:${port}`;
  const params = new URLSearchParams({
    callback_uri: callbackUri,
    state,
    code_challenge: generateCodeChallenge(codeVerifier),
    code_challenge_method: "S256",
  });

  return {
    authUrl: `${uiBaseUrl}/cli/auth?${params.toString()}`,
    waitForToken: async () => {
      const { code, sendResponse, sendError } = await waitForCode();
      try {
        const { accessToken, redirectUri } = await exchangeCodeForToken(
          apiBaseUrl,
          code,
          codeVerifier,
        );
        sendResponse(redirectUri);
        return accessToken;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Authentication failed: unknown error";
        sendError(message);
        throw err;
      }
    },
  };
}

// RFC 7636 §4.1 — 32 random bytes base64url-encoded = 43 unreserved chars
function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

// RFC 7636 §4.2 — SHA256 hex digest, base64-encoded without padding
function generateCodeChallenge(codeVerifier: string): string {
  const hexDigest = createHash("sha256").update(codeVerifier).digest("hex");
  return Buffer.from(hexDigest).toString("base64").replace(/=/g, "");
}

async function exchangeCodeForToken(
  apiBaseUrl: string,
  code: string,
  codeVerifier: string,
): Promise<{ accessToken: string; redirectUri: string | null }> {
  const response = await fetch(`${apiBaseUrl}/cli/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, code_verifier: codeVerifier }),
  });

  if (!response.ok) {
    throw new CliError(
      `Authentication failed: token exchange failed with status ${response.status}`,
    );
  }

  const body = (await response.json()) as {
    access_token?: string;
    redirect_uri?: string;
  };

  if (!body.access_token) {
    throw new CliError("Authentication failed: no access token returned");
  }

  return {
    accessToken: body.access_token,
    redirectUri: body.redirect_uri ?? null,
  };
}

function sendErrorResponse(
  res: import("node:http").ServerResponse,
  message: string,
): void {
  res.writeHead(400, { "Content-Type": "text/plain" }).end(message);
}

async function startCallbackServer(expectedState: string): Promise<{
  port: number;
  waitForCode: () => Promise<{
    code: string;
    sendResponse: (redirectUri: string | null) => void;
    sendError: (message: string) => void;
  }>;
}> {
  return new Promise((resolve, reject) => {
    let resolveCode!: (result: {
      code: string;
      sendResponse: (redirectUri: string | null) => void;
      sendError: (message: string) => void;
    }) => void;
    let rejectCode!: (err: Error) => void;

    const codePromise = new Promise<{
      code: string;
      sendResponse: (redirectUri: string | null) => void;
      sendError: (message: string) => void;
    }>((res, rej) => {
      resolveCode = res;
      rejectCode = rej;
    });

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      server.close();

      if (state !== expectedState) {
        const message = "Authentication failed: state mismatch";
        sendErrorResponse(res, message);
        rejectCode(new CliError(message));
      } else if (code) {
        resolveCode({
          code,
          sendResponse: (redirectUri) => {
            if (redirectUri) {
              res.writeHead(302, { Location: redirectUri }).end();
            } else {
              res.writeHead(200).end();
            }
          },
          sendError: (message) => sendErrorResponse(res, message),
        });
      } else {
        const message = "Authentication failed: no code received";
        sendErrorResponse(res, message);
        rejectCode(new CliError(message));
      }
    });

    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        port,
        waitForCode: () =>
          Promise.race([
            codePromise,
            new Promise<{
              code: string;
              sendResponse: (redirectUri: string | null) => void;
              sendError: (message: string) => void;
            }>((_, rej) =>
              setTimeout(() => {
                server.close();
                rej(new CliError("Authentication failed: timed out"));
              }, CALLBACK_TIMEOUT_MS),
            ),
          ]),
      });
    });
  });
}

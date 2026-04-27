import { createHash, randomBytes } from "node:crypto";

import open from "open";

import {
  AuthCodeCallbackServer,
  OnCodeReceiptFn,
  OnCodeReceiptReponse,
} from "./authCodeCallbackServer.js";
import { CliError } from "./errors.js";
import { renderRichText } from "./renderers.js";
import * as ui from "./ui.js";

export async function loginViaBrowser(uiBaseUrl: string): Promise<string> {
  const server = new AuthCodeCallbackServer();
  await server.start();

  const callbackUri = server.getAddress();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  const params = new URLSearchParams({
    callback_uri: callbackUri,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${uiBaseUrl}/cli/auth?${params.toString()}`;

  renderRichText([
    ui.p(`Opening your browser to complete authentication...`),
    ui.blankLine(),
  ]);

  try {
    await open(authUrl);
  } catch {
    renderRichText([
      ui.p(`Failed to open browser automatically. Visit this URL to continue:`),
      ui.blankLine(),
      ui.codeBlock(authUrl),
      ui.blankLine(),
    ]);
  }

  renderRichText([ui.p(`Waiting for authentication in your browser...`)]);

  const handleCodeReceipt: OnCodeReceiptFn = async (
    stateFromResponse: string,
    code: string,
  ): Promise<OnCodeReceiptReponse> => {
    const valid = validateState(stateFromResponse, state);
    if (!valid) {
      return {
        type: "ERROR" as const,
        error: new CliError("Authentication failed: state mismatch"),
      };
    }

    const tokenExchangeResponse = await exchangeCodeForToken(
      uiBaseUrl,
      code,
      codeVerifier,
    );

    if (!tokenExchangeResponse.ok) {
      return {
        type: "ERROR" as const,
        error: new CliError(
          `Authentication failed: token exchange failed with status ${tokenExchangeResponse.status}`,
        ),
      };
    }

    const body = (await tokenExchangeResponse.json()) as {
      access_token: string;
      redirect_uri: string;
    };

    return {
      type: "SUCCESS" as const,
      token: body.access_token,
      redirectUri: body.redirect_uri,
    };
  };

  const serverResult = await server.listenForCode(handleCodeReceipt);

  if (serverResult.type === "ERROR") throw serverResult.error;
  return serverResult.token;
}

function validateState(
  stateFromResponse: string,
  originalState: string,
): boolean {
  return stateFromResponse === originalState;
}

async function exchangeCodeForToken(
  baseUrl: string,
  code: string,
  codeVerifier: string,
): Promise<Response> {
  return fetch(`${baseUrl}/cli/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, code_verifier: codeVerifier }),
  });
}

// RFC 8252 §8.9: random string used to prevent CSRF-style attacks
function generateState(): string {
  return randomBytes(16).toString("base64url");
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

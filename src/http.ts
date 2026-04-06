import { HttpError } from "./errors.js";
import type { RequestOptions } from "./types.js";

type HttpSuccessResponse = Record<string, unknown> & { ok: true };

export async function request(
  baseUrl: string,
  route: string,
  options: RequestOptions = {},
): Promise<HttpSuccessResponse> {
  const method = options.method || "GET";
  const headers = new Headers({
    Accept: "application/json",
    "User-Agent": options.userAgent || "dx-cli/dev",
  });

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (options.agent) {
    headers.set("X-DX-Agent-Name", options.agent);
  }

  if (options.agentSessionId) {
    headers.set("X-DX-Agent-Session-Id", options.agentSessionId);
  }

  const query = new URLSearchParams();
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const url = `${baseUrl}${route}${query.size > 0 ? `?${query.toString()}` : ""}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new HttpError(`Request failed: ${(error as Error).message}`);
  }

  const responseBodyText = await response.text();

  if (!response.ok) {
    let responseBodyJson: unknown;
    try {
      responseBodyJson = JSON.parse(responseBodyText);
    } catch {
      responseBodyJson = responseBodyText;
    }

    const message =
      extractErrorMessage(responseBodyJson) ||
      `Request failed with status ${response.status}`;
    throw new HttpError(message, response.status, responseBodyJson);
  }

  try {
    return JSON.parse(responseBodyText) as HttpSuccessResponse;
  } catch (error) {
    throw new HttpError(`Invalid JSON response: ${(error as Error).message}`);
  }
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (typeof record.error === "string") {
    return record.error;
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  return null;
}

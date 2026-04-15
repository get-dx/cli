import { HttpError } from "./errors.js";
import type { RequestOptions } from "./types.js";

export type RequestResponse<T extends Record<string, unknown>> = {
  body: T;
  retryAfterMs?: number;
};

export async function request<T extends Record<string, unknown>>(
  baseUrl: string,
  route: string,
  options: RequestOptions = {},
): Promise<RequestResponse<T>> {
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
    const body = JSON.parse(responseBodyText) as T;
    const retryAfterMs = parseRetryAfterMs(response.headers);

    return retryAfterMs === undefined ? { body } : { body, retryAfterMs };
  } catch (error) {
    throw new HttpError(`Invalid JSON response: ${(error as Error).message}`);
  }
}

export function parseRetryAfterMs(headers: Headers): number | undefined {
  const retryAfter = headers.get("retry-after");
  if (!retryAfter) {
    return undefined;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const retryAt = Date.parse(retryAfter);
  if (Number.isNaN(retryAt)) {
    return undefined;
  }

  return Math.max(0, retryAt - Date.now());
}

function extractErrorMessage(body: unknown): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const record = body as Record<string, unknown>;
  if (
    record.error_details &&
    typeof record.error_details === "object" &&
    typeof (record.error_details as Record<string, unknown>).message ===
      "string"
  ) {
    return (record.error_details as Record<string, string>).message;
  }

  if (typeof record.error === "string") {
    return record.error;
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  return null;
}

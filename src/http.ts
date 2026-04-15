import { HttpError } from "./errors.js";
import { getLogger } from "./logger.js";
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
  const requestBody =
    options.body !== undefined ? JSON.stringify(options.body) : undefined;

  getLogger().debug("Sending HTTP request", {
    body: options.body ?? null,
    headers: redactHeaders(headers),
    method,
    url,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });
  } catch (error) {
    throw new HttpError(`Request failed: ${(error as Error).message}`);
  }

  const responseBodyText = await response.text();
  const parsedResponseBody = parseResponseBody(responseBodyText);

  getLogger().debug("Received HTTP response", {
    body: parsedResponseBody,
    headers: headersToObject(response.headers),
    method,
    status: response.status,
    url,
  });

  if (!response.ok) {
    const message =
      extractErrorMessage(parsedResponseBody) ||
      `Request failed with status ${response.status}`;
    throw new HttpError(message, response.status, parsedResponseBody);
  }

  if (
    typeof parsedResponseBody === "string" &&
    parsedResponseBody === responseBodyText
  ) {
    throw new HttpError("Invalid JSON response: Unexpected token");
  }

  return parsedResponseBody as HttpSuccessResponse;
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

function parseResponseBody(bodyText: string): unknown {
  try {
    return JSON.parse(bodyText);
  } catch {
    return bodyText;
  }
}

function redactHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] =
      key.toLowerCase() === "authorization"
        ? redactAuthorization(value)
        : value;
  });
  return result;
}

function redactAuthorization(value: string): string {
  return value.replace(/^Bearer\s+.+$/i, "Bearer [REDACTED]");
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

import { HttpError } from "./errors.js";
import type { RequestOptions, Runtime } from "./types.js";

export type RequestResponse<T extends Record<string, unknown>> = {
  body: T;
  retryAfterMs?: number;
};

export async function request<T extends Record<string, unknown>>(
  runtime: Runtime,
  route: string,
  options: RequestOptions = {},
): Promise<RequestResponse<T>> {
  const method = options.method || "GET";
  const headers = new Headers({
    Accept: "application/json",
    "X-Client-Type": "dx-cli",
    "X-Client-Version": runtime.version,
    "User-Agent": `dx-cli/${runtime.version}`,
  });

  headers.set("Authorization", `Bearer ${runtime.token}`);

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (runtime.context.agent) {
    headers.set("X-DX-Agent-Name", runtime.context.agent);
  }

  if (runtime.context.agentSessionId) {
    headers.set("X-DX-Agent-Session-Id", runtime.context.agentSessionId);
  }

  const query = new URLSearchParams();
  Object.entries(options.query || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      query.set(key, String(value));
    }
  });

  const url = `${runtime.baseUrl}${route}${query.size > 0 ? `?${query.toString()}` : ""}`;
  const requestBody =
    options.body !== undefined ? JSON.stringify(options.body) : undefined;

  runtime.logger.debug("Sending HTTP request", {
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

  runtime.logger.debug("Received HTTP response", {
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

  const retryAfterMs = parseRetryAfterMs(response.headers);
  const body = parsedResponseBody as T;
  return retryAfterMs === undefined ? { body } : { body, retryAfterMs };
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

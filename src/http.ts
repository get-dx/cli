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

  if (runtime.context.agentModel) {
    headers.set("X-DX-Agent-Model", runtime.context.agentModel);
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

  const url = `${runtime.apiBaseUrl}${route}${query.size > 0 ? `?${query.toString()}` : ""}`;
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
    throw new HttpError(
      `Could not reach ${url}: ${describeFetchFailure(error)}`,
    );
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
    // A 2xx that isn't JSON usually means something other than the API answered
    // e.g. a proxy block page, a captive portal, etc. Pass the status
    // and the raw text along so the user can see what actually came back.
    throw new HttpError(
      responseBodyText
        ? `Invalid JSON response from ${url}`
        : `Empty response body from ${url}`,
      response.status,
      responseBodyText,
    );
  }

  const retryAfterMs = parseRetryAfterMs(response.headers);
  const body = parsedResponseBody as T;
  return retryAfterMs === undefined ? { body } : { body, retryAfterMs };
}

/**
 * Flatten an error thrown by `fetch` into a single readable message.
 *
 * Node reports every DNS, proxy, and TLS failure as `TypeError: fetch failed`
 * and hangs the real reason off `cause`, so the top-level message alone can't
 * distinguish an untrusted corporate root certificate from an unreachable host.
 */
export function describeFetchFailure(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const parts: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    const { code } = current as NodeJS.ErrnoException;
    const part = code ? `${current.message} (${code})` : current.message;
    if (!parts.includes(part)) {
      parts.push(part);
    }
    current = current.cause;
  }

  // "fetch failed" carries no information once a cause is available.
  const informative = parts.filter(
    (part) => parts.length === 1 || part !== "fetch failed",
  );

  return informative.join(": ");
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

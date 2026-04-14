import { once } from "node:events";
import fs from "node:fs";
import path from "node:path";

import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES, HttpError } from "../../errors.js";
import { parseRetryAfterMs, request } from "../../http.js";
import { renderJson } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import { renderCsvSaved, renderQueryResultsTable } from "./queryRendering.js";

const DEFAULT_RETRY_AFTER_MS = 1000;
const PENDING_QUERY_RUN_STATUSES = new Set<StudioQueryRunStatus>([
  "queued",
  "running",
]);
const QUERY_STATUS_MESSAGES: Record<
  Extract<StudioQueryRunStatus, "queued" | "running">,
  string
> = {
  queued: "Query queued",
  running: "Query running",
};

export function queryCommand() {
  return new Command()
    .name("query")
    .description("Execute a Data Studio SQL query and wait for the results")
    .argument("<sql>", "SQL query to execute")
    .option("--output <filename>", "Save the full result set as CSV to a file")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Run a query and print the results as a table",
          command: "dx studio query 'SELECT * FROM github_pulls LIMIT 10'",
        },
        {
          label: "Run a query and print the JSON results payload",
          command:
            "dx studio query 'SELECT id, name FROM github_repos LIMIT 5' --json",
        },
        {
          label: "Run a query and save the full result set as CSV",
          command:
            "dx studio query 'SELECT * FROM github_pulls' --output pulls.csv",
        },
      ]),
    )
    .action(
      wrapAction(async (sql, options, command) => {
        const context = getContext(command);
        if (context.json && options.output) {
          throw new CliError(
            "--output cannot be used with --json",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = buildRuntime(context);
        const queryRun = await executeAndWaitForQuery(runtime, sql);

        if (options.output) {
          await downloadStudioQueryResultsCsv(
            runtime,
            queryRun.id,
            options.output as string,
          );
          renderCsvSaved(path.resolve(options.output as string));
          return;
        }

        const response = await getStudioQueryResults(runtime, queryRun.id);
        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderQueryResultsTable(response.results);
        }
      }),
    );
}

type StudioQueryRunStatus =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "expired";

type StudioQueryRunError = {
  code: string;
  message: string;
};

type StudioQueryRun = {
  id: string;
  status: StudioQueryRunStatus;
  submitted_at: string;
  finished_at: string | null;
  expires_at: string;
  info_url: string;
  results_url: string;
  error?: StudioQueryRunError;
};

type ExecuteStudioQueryResponse = {
  ok: true;
  query_run: StudioQueryRun;
};

type GetStudioQueryResultsResponse = {
  ok: true;
  results: {
    columns: string[];
    rows: unknown[][];
  };
};

async function executeAndWaitForQuery(
  runtime: Runtime,
  sql: string,
): Promise<StudioQueryRun> {
  const progress = new QueryProgressReporter();
  progress.start("Submitting query");

  try {
    const executeResponse = await executeStudioQuery(runtime, sql);
    let queryRun = executeResponse.query_run;
    let retryAfterMs = executeResponse.retryAfterMs;

    while (true) {
      if (queryRun.status === "succeeded") {
        progress.stop("Query completed.");
        return queryRun;
      }

      if (queryRun.status === "failed") {
        progress.stop("Query failed.");
        throw buildFailedQueryError(queryRun.error);
      }

      if (queryRun.status === "expired") {
        progress.stop("Query expired.");
        throw new CliError(
          `Query results expired on ${queryRun.expires_at}.`,
          EXIT_CODES.RETRY_RECOMMENDED,
        );
      }

      if (!PENDING_QUERY_RUN_STATUSES.has(queryRun.status)) {
        progress.stop("Query failed.");
        throw new CliError(`Unexpected query status: ${queryRun.status}`, 1);
      }

      progress.update(
        `${QUERY_STATUS_MESSAGES[queryRun.status]} (${queryRun.id})`,
      );
      await waitForRetryAfter(retryAfterMs);

      try {
        const infoResponse = await getStudioQueryRun(runtime, queryRun.id);
        queryRun = infoResponse.query_run;
        retryAfterMs = infoResponse.retryAfterMs;
      } catch (error) {
        if (error instanceof HttpError && error.status === 429) {
          progress.update(`Polling too quickly; retrying (${queryRun.id})`);
          await waitForRetryAfter(null);
          continue;
        }
        progress.stop("Query failed.");
        throw error;
      }
    }
  } catch (error) {
    progress.stop();
    throw error;
  }
}

async function executeStudioQuery(
  runtime: Runtime,
  sql: string,
): Promise<ExecuteStudioQueryResponse & { retryAfterMs: number | null }> {
  return requestJsonWithHeaders<ExecuteStudioQueryResponse>(runtime, {
    route: "/studio.queryRuns.execute",
    method: "POST",
    body: { sql },
  });
}

async function getStudioQueryRun(
  runtime: Runtime,
  id: string,
): Promise<ExecuteStudioQueryResponse & { retryAfterMs: number | null }> {
  return requestJsonWithHeaders<ExecuteStudioQueryResponse>(runtime, {
    route: "/studio.queryRuns.info",
    method: "GET",
    query: { id },
  });
}

async function getStudioQueryResults(
  runtime: Runtime,
  id: string,
): Promise<GetStudioQueryResultsResponse> {
  const response = await request(runtime.baseUrl, "/studio.queryRuns.results", {
    ...requestOptions(runtime),
    method: "GET",
    query: { id },
  });

  return response as GetStudioQueryResultsResponse;
}

async function downloadStudioQueryResultsCsv(
  runtime: Runtime,
  id: string,
  filename: string,
): Promise<void> {
  const response = await fetchWithApiHeaders(
    runtime,
    `${runtime.baseUrl}/studio.queryRuns.results?id=${encodeURIComponent(id)}&format=csv`,
    { redirect: "manual" },
  );

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new HttpError(
        "CSV download redirect did not include a Location header.",
        response.status,
      );
    }

    const downloadResponse = await fetchResponse(
      new URL(location, runtime.baseUrl).toString(),
      {
        method: "GET",
        headers: buildDownloadHeaders(runtime, "text/csv"),
      },
    );
    await ensureOkResponse(downloadResponse);
    await writeResponseBodyToFile(downloadResponse, filename);
    return;
  }

  await ensureOkResponse(response);
  await writeResponseBodyToFile(response, filename);
}

function requestOptions(runtime: Runtime) {
  return {
    token: runtime.token,
    agent: runtime.context.agent,
    agentSessionId: runtime.context.agentSessionId,
    userAgent: `dx-cli/${runtime.version}`,
  };
}

function buildHeaders(runtime: Runtime, accept: string): Headers {
  const headers = new Headers({
    Accept: accept,
    "User-Agent": `dx-cli/${runtime.version}`,
  });

  headers.set("Authorization", `Bearer ${runtime.token}`);

  if (runtime.context.agent) {
    headers.set("X-DX-Agent-Name", runtime.context.agent);
  }

  if (runtime.context.agentSessionId) {
    headers.set("X-DX-Agent-Session-Id", runtime.context.agentSessionId);
  }

  return headers;
}

function buildDownloadHeaders(runtime: Runtime, accept: string): Headers {
  return new Headers({
    Accept: accept,
    "User-Agent": `dx-cli/${runtime.version}`,
  });
}

async function requestJsonWithHeaders<T extends Record<string, unknown>>(
  runtime: Runtime,
  options: {
    route: string;
    method: "GET" | "POST";
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
  },
): Promise<T & { retryAfterMs: number | null }> {
  const headers = buildHeaders(runtime, "application/json");
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetchResponse(
    buildApiUrl(runtime, options.route, options.query),
    {
      method: options.method,
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
    },
  );
  const responseBodyText = await response.text();

  if (!response.ok) {
    const body = parseResponseText(responseBodyText);
    const message =
      extractErrorMessage(body) ||
      `Request failed with status ${response.status}`;

    throw new HttpError(message, response.status, body);
  }

  const body = parseJsonResponse<T>(responseBodyText);
  return {
    ...body,
    retryAfterMs: parseRetryAfterMs(response.headers),
  };
}

async function fetchWithApiHeaders(
  runtime: Runtime,
  url: string,
  options: Pick<RequestInit, "redirect"> = {},
): Promise<Response> {
  return fetchResponse(url, {
    method: "GET",
    headers: buildHeaders(runtime, "text/csv"),
    ...options,
  });
}

async function fetchResponse(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    throw new HttpError(`Request failed: ${(error as Error).message}`);
  }

  return response;
}

async function ensureOkResponse(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  const body = await parseResponseBody(response);
  const message =
    extractErrorMessage(body) ||
    `Request failed with status ${response.status}`;

  throw new HttpError(message, response.status, body);
}

async function parseResponseBody(response: Response): Promise<unknown> {
  return parseResponseText(await response.text());
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

function buildApiUrl(
  runtime: Runtime,
  route: string,
  query?: Record<string, string | number | boolean | undefined>,
): string {
  const queryString = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      queryString.set(key, String(value));
    }
  });

  return `${runtime.baseUrl}${route}${queryString.size > 0 ? `?${queryString.toString()}` : ""}`;
}

function parseResponseText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function parseJsonResponse<T>(text: string): T {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new HttpError(`Invalid JSON response: ${(error as Error).message}`);
  }
}

async function waitForRetryAfter(retryAfterMs: number | null): Promise<void> {
  const delayMs = retryAfterMs ?? DEFAULT_RETRY_AFTER_MS;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

class QueryProgressReporter {
  private readonly enabled = Boolean(process.stderr.isTTY);
  private readonly frames = ["-", "\\", "|", "/"];
  private timer?: ReturnType<typeof setInterval>;
  private frameIndex = 0;
  private currentMessage = "";
  private lastLineLength = 0;

  start(message: string): void {
    if (!this.enabled) {
      return;
    }

    this.currentMessage = message;
    this.render();
    this.timer = setInterval(() => this.render(), 80);
    this.timer.unref?.();
  }

  update(message: string): void {
    if (!this.enabled) {
      return;
    }

    this.currentMessage = message;
    this.render();
  }

  stop(finalMessage?: string): void {
    if (!this.enabled) {
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    if (finalMessage) {
      process.stderr.write(`\r${this.padLine(finalMessage)}\n`);
      this.lastLineLength = 0;
      return;
    }

    if (this.lastLineLength > 0) {
      process.stderr.write(`\r${" ".repeat(this.lastLineLength)}\r`);
      this.lastLineLength = 0;
    }
  }

  private render(): void {
    const frame = this.frames[this.frameIndex % this.frames.length];
    this.frameIndex += 1;
    process.stderr.write(
      `\r${this.padLine(`${frame} ${this.currentMessage}`)}`,
    );
  }

  private padLine(text: string): string {
    const padded = text.padEnd(this.lastLineLength);
    this.lastLineLength = Math.max(this.lastLineLength, text.length);
    return padded;
  }
}

async function writeResponseBodyToFile(
  response: Response,
  filename: string,
): Promise<void> {
  if (!response.body) {
    fs.writeFileSync(filename, "");
    return;
  }

  const output = fs.createWriteStream(filename);
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      if (value && !output.write(Buffer.from(value))) {
        await once(output, "drain");
      }
    }

    output.end();
    await once(output, "close");
  } catch (error) {
    output.destroy();
    throw error;
  } finally {
    reader.releaseLock();
  }
}

function buildFailedQueryError(error?: StudioQueryRunError): CliError {
  if (!error) {
    return new CliError("Query failed.", 1);
  }

  return new CliError(`Query failed (${error.code}): ${error.message}`, 1);
}

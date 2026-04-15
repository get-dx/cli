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
import { request } from "../../http.js";
import { renderJson } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";
import {
  QueryProgressReporter,
  renderCsvSaved,
  renderQueryResultsTable,
} from "./queryRendering.js";

const DEFAULT_RETRY_AFTER_MS = 1000;
const PENDING_QUERY_RUN_STATUSES = new Set<StudioQueryRunStatus>([
  "queued",
  "started",
  "running",
]);

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
        const progress = new QueryProgressReporter();

        const queryRun = await executeQuery(runtime, progress, sql);
        await waitForQuery(runtime, progress, queryRun.id);

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
  | "started"
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

async function executeQuery(
  runtime: Runtime,
  progress: QueryProgressReporter,
  sql: string,
): Promise<StudioQueryRun> {
  try {
    renderRunningQuery(sql);
    progress.start(ui.bold("Submitting query"));
    const executeResponse = await executeStudioQuery(runtime, sql);
    const queryRun = executeResponse.body.query_run;
    await waitForRetryAfter(executeResponse.retryAfterMs);
    return queryRun;
  } catch (error) {
    progress.stop();
    throw error;
  }
}

async function waitForQuery(
  runtime: Runtime,
  progress: QueryProgressReporter,
  queryRunId: string,
): Promise<StudioQueryRun> {
  while (true) {
    let retryAfterMs: number | undefined;
    try {
      const infoResponse = await getStudioQueryRun(runtime, queryRunId);
      const queryRun = infoResponse.body.query_run;

      retryAfterMs = infoResponse.retryAfterMs;
      if (queryRun.status === "succeeded") {
        progress.stop(`${ui.success(ui.GLYPHS.CHECK)} Query completed.`);
        return queryRun;
      }

      if (queryRun.status === "failed") {
        progress.stop(`${ui.error(ui.GLYPHS.ERROR)} Query failed.`);
        throw buildFailedQueryError(queryRun.error);
      }

      if (queryRun.status === "expired") {
        progress.stop(`${ui.warning(ui.GLYPHS.WARNING)} Query expired.`);
        throw new CliError(
          `Query results expired on ${queryRun.expires_at}.`,
          EXIT_CODES.RETRY_RECOMMENDED,
        );
      }

      if (!PENDING_QUERY_RUN_STATUSES.has(queryRun.status)) {
        progress.stop(`${ui.error(ui.GLYPHS.ERROR)} Query failed.`);
        throw new CliError(`Unexpected query status: ${queryRun.status}`, 1);
      }

      progress.update(renderPendingQueryStatus(queryRun.id));

      await waitForRetryAfter(retryAfterMs);
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) {
        progress.update(
          `${ui.warning(ui.GLYPHS.WARNING)} Polling too quickly; retrying ${ui.dim(`(${queryRunId})`)}`,
        );
        await waitForRetryAfter(retryAfterMs);
        continue;
      }
      progress.stop(`${ui.error(ui.GLYPHS.ERROR)} Query failed.`);
      throw error;
    }
  }
}

function renderRunningQuery(sql: string): void {
  process.stderr.write(`${ui.bold("Running:")} ${ui.code(sql)}\n`);
}

function renderPendingQueryStatus(queryRunId: string): string {
  return `${ui.bold("Query running")} ${ui.dim(`(${queryRunId})`)}`;
}

async function executeStudioQuery(
  runtime: Runtime,
  sql: string,
): Promise<{ body: ExecuteStudioQueryResponse; retryAfterMs?: number }> {
  return request<ExecuteStudioQueryResponse>(
    runtime,
    "/studio.queryRuns.execute",
    {
      method: "POST",
      body: { sql },
    },
  );
}

async function getStudioQueryRun(
  runtime: Runtime,
  id: string,
): Promise<{ body: ExecuteStudioQueryResponse; retryAfterMs?: number }> {
  return request<ExecuteStudioQueryResponse>(
    runtime,
    "/studio.queryRuns.info",
    {
      method: "GET",
      query: { id },
    },
  );
}

async function getStudioQueryResults(
  runtime: Runtime,
  id: string,
): Promise<GetStudioQueryResultsResponse> {
  const response = await request<GetStudioQueryResultsResponse>(
    runtime,
    "/studio.queryRuns.results",
    {
      method: "GET",
      query: { id },
    },
  );

  return response.body;
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

function parseResponseText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function waitForRetryAfter(retryAfterMs?: number): Promise<void> {
  const delayMs = retryAfterMs ?? DEFAULT_RETRY_AFTER_MS;
  await new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
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

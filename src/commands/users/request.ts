import { CliError, HttpError } from "../../errors.js";
import { request } from "../../http.js";
import type { RequestOptions, Runtime } from "../../types.js";

export async function requestWithMessages<T extends Record<string, unknown>>(
  runtime: Runtime,
  route: string,
  options: RequestOptions,
  messages: Record<string, string>,
): Promise<T> {
  try {
    const response = await request<T>(runtime, route, options);
    return response.body;
  } catch (error) {
    throw runtime.context.json ? error : readableError(error, messages);
  }
}

function readableError(
  error: unknown,
  messages: Record<string, string>,
): unknown {
  if (!(error instanceof HttpError)) {
    return error;
  }

  const code = (error.body as { error?: unknown } | null | undefined)?.error;
  return typeof code === "string" && Object.hasOwn(messages, code)
    ? new CliError(messages[code], error.exitCode)
    : error;
}

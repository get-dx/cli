import { CliError, HttpError } from "../../errors.js";
import { request } from "../../http.js";
import type { RequestOptions, Runtime } from "../../types.js";

export type ErrorHints = Record<string, { message: string; exitCode: number }>;

export async function requestWithHints<T extends Record<string, unknown>>(
  runtime: Runtime,
  route: string,
  options: RequestOptions,
  hints: ErrorHints,
): Promise<T> {
  try {
    const response = await request<T>(runtime, route, options);
    return response.body;
  } catch (error) {
    throw applyHint(error, hints, runtime.context.json);
  }
}

function applyHint(error: unknown, hints: ErrorHints, json: boolean): unknown {
  if (
    !(error instanceof HttpError) ||
    !error.body ||
    typeof error.body !== "object"
  ) {
    return error;
  }

  const code = (error.body as Record<string, unknown>).error;
  if (typeof code !== "string" || !Object.hasOwn(hints, code)) {
    return error;
  }

  const hint = hints[code];
  return json
    ? new HttpError(error.message, error.status, error.body, hint.exitCode)
    : new CliError(hint.message, hint.exitCode);
}

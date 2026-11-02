import os from "node:os";

import { describeFetchFailure } from "../http.js";
import { CHECK_TIMEOUT_MS, ProbeTimeoutError } from "./probes.js";

/** Replace the home directory with `~` so paths don't reveal usernames. */
export function tildify(filePath: string): string {
  const home = os.homedir();
  if (
    home &&
    (filePath === home ||
      filePath.startsWith(home + "/") ||
      filePath.startsWith(home + "\\"))
  ) {
    return "~" + filePath.slice(home.length);
  }
  return filePath;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

/** Remove credentials from a URL-like string, e.g. a proxy URL. */
export function redactUrlCredentials(value: string): string {
  return value.replace(/\/\/[^/@\s]+@/g, "//***@");
}

export function isTimeout(error: unknown): boolean {
  if (error instanceof ProbeTimeoutError) {
    return true;
  }
  let current: unknown = error;
  while (current instanceof Error) {
    if (current.name === "TimeoutError") {
      return true;
    }
    current = current.cause;
  }
  return false;
}

/** The error code (e.g. `ECONNRESET`) of an error or anything in its cause chain. */
export function errorCode(error: unknown): string | null {
  let current: unknown = error;
  while (current instanceof Error) {
    const { code } = current as NodeJS.ErrnoException;
    if (typeof code === "string") {
      return code;
    }
    current = current.cause;
  }
  return null;
}

export function describeError(error: unknown, action: string): string {
  if (isTimeout(error)) {
    const timeoutMs =
      error instanceof ProbeTimeoutError ? error.timeoutMs : CHECK_TIMEOUT_MS;
    return `${action} timed out after ${timeoutMs / 1000}s`;
  }
  return describeFetchFailure(error);
}

export async function timed<T>(
  fn: () => Promise<T>,
): Promise<{ value: T; ms: number }> {
  const start = performance.now();
  const value = await fn();
  return { value, ms: Math.round(performance.now() - start) };
}

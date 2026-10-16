export const CHECK_TIMEOUT_MS = 10_000;

/** Headers sent on doctor's requests, so they can be told apart in logs. */
export const DOCTOR_HEADER = { "X-DX-Doctor": "1" };

export class ProbeTimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`timed out after ${timeoutMs / 1000}s`);
    this.name = "ProbeTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

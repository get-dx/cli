export type CheckStatus = "ok" | "warn" | "fail" | "skip";

/** Where a reported value came from, shown as e.g. `[from config file]`. */
export type CheckSource = "env" | "config" | "default" | "keychain";

export interface Check {
  /** Stable identifier, part of the `--json` output's public API. */
  id: string;
  label: string;
  status: CheckStatus;
  message: string;
  /** What a WARN or FAIL likely means and what to try. Always null otherwise. */
  hint: string | null;
  source: CheckSource | null;
  /** Structured values, so `--json` consumers never need to parse `message`. */
  data: Record<string, unknown> | null;
}

export interface Section {
  id: string;
  title: string;
  checks: Check[];
}

export type DoctorReport = {
  ok: boolean;
  summary: Record<CheckStatus, number>;
  sections: Section[];
};

export function check(
  id: string,
  label: string,
  status: CheckStatus,
  message: string,
  options: {
    hint?: string | null;
    source?: CheckSource | null;
    data?: Record<string, unknown> | null;
  } = {},
): Check {
  return {
    id,
    label,
    status,
    message,
    hint:
      status === "warn" || status === "fail" ? (options.hint ?? null) : null,
    source: options.source ?? null,
    data: options.data ?? null,
  };
}

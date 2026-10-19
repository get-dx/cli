import dayjs from "dayjs";

import { getAuthInfo, type TokenType } from "../commands/auth.js";
import { HttpError } from "../errors.js";
import type { Runtime } from "../types.js";
import { describeError, timed } from "./format.js";
import { CHECK_TIMEOUT_MS, DOCTOR_HEADER } from "./probes.js";
import { check, type Check, type Section } from "./types.js";

const EXPIRY_WARNING_DAYS = 7;

const SECTION = { id: "auth", title: "Auth" };

export async function checkAuth(options: {
  runtime: Runtime | null;
  apiReachable: boolean;
  now: Date;
}): Promise<Section> {
  const { runtime, apiReachable, now } = options;

  if (!runtime) {
    return skipped("no token is configured");
  }
  if (!apiReachable) {
    return skipped("the API is unreachable");
  }

  const host = new URL(runtime.apiBaseUrl).host;
  let info;
  let ms;
  try {
    ({ value: info, ms } = await timed(() =>
      getAuthInfo(runtime, {
        headers: DOCTOR_HEADER,
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      }),
    ));
  } catch (error) {
    return { ...SECTION, checks: [tokenErrorCheck(error, host)] };
  }

  const { auth, account } = info;
  const checks: Check[] = [
    check(
      "token_valid",
      "Token valid",
      "ok",
      `${tokenTypeName(auth.token_type)} "${auth.token_name}" (responded in ${ms}ms)`,
      {
        data: {
          token_type: auth.token_type,
          token_name: auth.token_name,
          scopes: auth.scopes,
          created_at: auth.created_at,
          ms,
        },
      },
    ),
    check("account", "Account", "ok", account.name, {
      data: { name: account.name },
    }),
  ];

  if (auth.token_type === "personal_access_token") {
    checks.push(expiryCheck(auth.expires_at, now));
  }

  return { ...SECTION, checks };
}

function skipped(reason: string): Section {
  return {
    ...SECTION,
    checks: [
      check("token_valid", "Token valid", "skip", `skipped because ${reason}`),
    ],
  };
}

function tokenErrorCheck(error: unknown, host: string): Check {
  if (error instanceof HttpError && error.status === 401) {
    return check(
      "token_valid",
      "Token valid",
      "fail",
      `token rejected by ${host} (HTTP 401: ${error.message})`,
      {
        hint: "The token may be revoked, expired, or issued by a different DX instance. Run `dx auth login` to store a new one.",
        data: { status: 401 },
      },
    );
  }

  if (error instanceof HttpError && error.status !== undefined) {
    const { message, hint } = describeHttpFailure(
      error.status,
      error.message,
      host,
    );
    return check("token_valid", "Token valid", "fail", message, {
      hint,
      data: { status: error.status },
    });
  }

  return check(
    "token_valid",
    "Token valid",
    "fail",
    describeError(error, "auth.info request"),
    {
      hint: `The API was reachable a moment ago, but this request to ${host} failed. Try again.`,
      data: { status: null },
    },
  );
}

function describeHttpFailure(
  status: number,
  errorMessage: string,
  host: string,
): { message: string; hint: string } {
  if (status === 403) {
    return {
      message: `access denied by ${host} (HTTP 403: ${errorMessage})`,
      hint: "The token was recognized but this request was refused. An IP allowlist, proxy, or firewall may be blocking it. Check with your DX admin or network team.",
    };
  }

  if (status === 429) {
    return {
      message: `rate limited by ${host} (HTTP 429)`,
      hint: "Too many requests. Wait a minute and run `dx doctor` again.",
    };
  }

  if (status >= 500) {
    return {
      message: `HTTP ${status}: ${errorMessage}`,
      hint: "The DX API is having problems. Try again in a few minutes, and contact DX support if this persists.",
    };
  }

  return {
    message: `HTTP ${status}: ${errorMessage}`,
    hint: "The DX API could not validate the token. Try again, and contact DX support if this persists.",
  };
}

function expiryCheck(expiresAt: string | null | undefined, now: Date): Check {
  if (!expiresAt) {
    return check("expires", "Expires", "ok", "never", {
      data: { expires_at: null },
    });
  }

  const expires = dayjs(expiresAt);
  const days = expires.diff(dayjs(now), "day");
  const date = expires.format("YYYY-MM-DD");
  const data = { expires_at: expiresAt, days_remaining: days };

  if (expires.isBefore(now)) {
    return check("expires", "Expires", "fail", `expired on ${date}`, {
      hint: "Create a new personal access token and run `dx auth login`.",
      data,
    });
  }

  if (days < EXPIRY_WARNING_DAYS) {
    return check("expires", "Expires", "warn", `${date} (${days}d)`, {
      hint: "This token expires soon. Create a new one and run `dx auth login`.",
      data,
    });
  }

  return check("expires", "Expires", "ok", `${date} (${days}d)`, { data });
}

function tokenTypeName(tokenType: TokenType): string {
  switch (tokenType) {
    case "account_web_api_token":
      return "organization token";
    case "personal_access_token":
      return "personal access token";
    default:
      return String(tokenType);
  }
}

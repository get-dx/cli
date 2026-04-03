import { printHuman, printJson } from "./output.js";

export function renderAuthInfo(
  response: unknown,
  token: string | null,
  baseUrl: string,
  json: boolean,
): void {
  const payload = response as Record<string, any>;
  const account = payload.account || {};
  const auth = payload.auth || {};
  const value = {
    ok: true,
    base_url: baseUrl,
    token: maskToken(token),
    expiration: null,
    auth,
    account,
  };

  if (json) {
    printJson(value);
    return;
  }

  const useColor = supportsColor();
  const marker = useColor ? style("✓", ANSI.green) : "*";
  const accountName = stringValue(account.name);
  const maskedToken = maskToken(token) || "not configured";

  process.stdout.write(
    [
      `${marker} Logged in to ${valueText(baseUrl, useColor, true)} account ${valueText(accountName, useColor)}`,
      detailLine("Token", maskedToken, useColor),
      detailLine("Token type", stringValue(auth.token_type), useColor),
      detailLine("Token name", stringValue(auth.token_name), useColor),
      detailLine("Token scopes", formatScopes(auth.scopes), useColor),
      detailLine("Token created at", stringValue(auth.created_at), useColor),
    ].join("\n") + "\n",
  );
}

export function renderStructuredResponse(
  response: unknown,
  json: boolean,
): void {
  if (json) {
    printJson(response);
    return;
  }

  printHuman(response);
}

export function maskToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  if (token.length <= 8) {
    return "*".repeat(token.length);
  }

  return `${token.slice(0, 4)}${"*".repeat(token.length - 8)}${token.slice(-4)}`;
}

function stringValue(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function formatScopes(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    return "(none)";
  }

  return value.map((scope) => String(scope)).join(", ");
}

function detailLine(label: string, value: string, useColor: boolean): string {
  return `  - ${labelText(label, useColor)}: ${valueText(value, useColor)}`;
}

function labelText(value: string, useColor: boolean): string {
  return useColor ? style(value, ANSI.dim) : value;
}

function valueText(value: string, useColor: boolean, accent = false): string {
  if (!useColor) {
    return value;
  }

  return accent ? style(value, ANSI.bold, ANSI.cyan) : style(value, ANSI.bold);
}

function supportsColor(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
}

function style(value: string, ...codes: string[]): string {
  return `${codes.join("")}${value}${ANSI.reset}`;
}

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  green: "\u001b[32m",
  cyan: "\u001b[36m",
} as const;

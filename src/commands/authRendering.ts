import type { AuthInfoResponse, TokenType } from "./auth.js";
import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";

export function renderAuthInfo(
  authInfo: AuthInfoResponse,
  token: string,
  baseUrl: string,
) {
  const maskedToken = maskToken(token) ?? "not configured";
  renderRichText([
    ui.p(
      `${ui.success("✓")} Logged in to ${ui.link(baseUrl)} account ${ui.bold(authInfo.account.name)}`,
    ),
    ui.dl(
      [
        ui.dli("Token", ui.code(maskedToken)),
        ui.dli("Token type", tokenTypeName(authInfo.auth.token_type)),
        ui.dli("Token name", authInfo.auth.token_name),
        ui.dli(
          "Token created at",
          ui.timestampSummary(authInfo.auth.created_at),
        ),
      ],
      { termWidth: 18 },
    ),
    ui.p(ui.bold("Token scopes:"), false),
    ...scopesContent(authInfo.auth.scopes),
  ]);
}

function scopesContent(scopes: string[]): ui.BlockContent[] {
  if (scopes.length === 0) {
    return [ui.p("(none)", false)];
  } else {
    return [
      ui.p("", false),
      ui.ul(scopes.map((scope) => ui.li(ui.code(scope)))),
    ];
  }
}

function tokenTypeName(tokenType: TokenType): string {
  switch (tokenType) {
    case "account_web_api_token":
      return "Account-level web API token";
    default:
      throw new Error(`Unknown token type: ${tokenType}`);
  }
}

function maskToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  if (token.length <= 8) {
    return "*".repeat(token.length);
  }

  return `${token.slice(0, 4)}${"*".repeat(token.length - 8)}${token.slice(-4)}`;
}

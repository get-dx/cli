import type { AuthInfoResponse, TokenType } from "./auth.js";
import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";

export function renderAuthInfo(
  authInfo: AuthInfoResponse,
  token: string,
  baseUrl: string,
) {
  const maskedToken = ui.maskToken(token) ?? "not configured";
  renderRichText([
    ui.p(
      `${ui.success(ui.GLYPHS.CHECK)} Logged in to ${ui.link(baseUrl)} account ${ui.bold(authInfo.account.name)}`,
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
        ...(authInfo.auth.token_type === "personal_access_token"
          ? [
              ui.dli(
                "Token expires at",
                authInfo.auth.expires_at
                  ? ui.timestampSummary(authInfo.auth.expires_at)
                  : ui.dim("(no expiration)"),
              ),
            ]
          : []),
      ],
      { termWidth: 18 },
    ),
    ui.p(ui.bold("Token scopes:"), false),
    ...scopesContent(authInfo.auth.effective_scopes),
  ]);
}

export function renderLoggedOut(baseUrl: string) {
  renderRichText([
    ui.p(
      `${ui.success(ui.GLYPHS.CHECK)} Logged out of ${ui.link(baseUrl)} successfully`,
    ),
  ]);
}

function scopesContent(scopes: string[]): ui.Block[] {
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
    case "personal_access_token":
      return "Personal access token";
    default:
      throw new Error(`Unknown token type: ${tokenType}`);
  }
}

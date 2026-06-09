import type {
  AuthInfoResponse,
  AuthWhoamiResponse,
  TokenType,
  WhoamiUser,
} from "./auth.js";
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
    ...scopesContent(authInfo.auth.scopes),
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

export function renderAuthWhoami(response: AuthWhoamiResponse) {
  const blocks: ui.Block[] = [];

  // Auth section
  blocks.push(ui.h3("Auth"));
  blocks.push(
    ui.dl(
      [
        ui.dli("Account", response.account.name),
        ui.dli("Token type", tokenTypeName(response.auth_token_type)),
      ],
      { termWidth: 12 },
    ),
  );

  // User section
  blocks.push(ui.h3("Current user"));
  if (response.user) {
    blocks.push(
      ui.dl(
        [
          ui.dli("ID", ui.code(response.user.id)),
          ui.dli("Name", response.user.name),
          ui.dli("Email", response.user.email),
        ],
        { termWidth: 7 },
      ),
    );
  } else {
    blocks.push(ui.p(ui.dim("Not applicable for organization tokens"), false));
  }

  // Team section
  blocks.push(ui.h3("Team"));
  if (response.team) {
    blocks.push(
      ui.dl(
        [
          ui.dli("ID", ui.code(response.team.id)),
          ui.dli("Name", response.team.name),
          ui.dli("Lead", formatUser(response.team.lead)),
        ],
        { termWidth: 6 },
      ),
    );
    if (response.team.contributors.length > 0) {
      blocks.push(ui.p(ui.bold("Contributors:"), false));
      blocks.push(
        ui.ul(response.team.contributors.map((c) => ui.li(formatUser(c)))),
      );
    }
  } else {
    blocks.push(ui.p(ui.dim("Not applicable for organization tokens"), false));
  }

  renderRichText(blocks);
}

function formatUser(user: WhoamiUser): string {
  return `${user.name} ${ui.dim(`(${user.id}, ${user.email})`)}`;
}

function tokenTypeName(tokenType: TokenType): string {
  switch (tokenType) {
    case "account_web_api_token":
      return "Organization token";
    case "personal_access_token":
      return "Personal access token";
    default:
      throw new Error(`Unknown token type: ${tokenType}`);
  }
}

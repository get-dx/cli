import { Entity } from "./entities.js";
import { renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";

export function renderEntity(entity: Partial<Entity>) {
  renderRichText([
    ui.h1("Entity Information"),

    entity.identifier
      ? [ui.h2("Core attributes"), ...coreContent(entity)]
      : null,

    entity.owner_teams ? [ui.h2("Owners"), ...ownersContent(entity)] : null,

    entity.properties
      ? [ui.h2("Properties"), ...propertiesContent(entity)]
      : null,

    entity.aliases
      ? [
          ui.h2("Aliases"),
          ui.json({
            ...entity.aliases,
          }),
        ]
      : null,
  ]);
}

function coreContent(entity: Partial<Entity>): ui.Block[] {
  return [
    ui.dl(
      [
        ui.dli("Name", [ui.p(entity.name!, false)]),
        ui.dli("Identifier", [ui.p(entity.identifier!, false)]),
        ui.dli("Type", [ui.p(entity.type!)]),
        ui.dli("Description", [ui.p(entity.description!)]),
        ui.dli("Created", [
          ui.p(ui.timestampSummary(entity.created_at!), false),
        ]),
        ui.dli("Last updated", [
          ui.p(ui.timestampSummary(entity.updated_at!), false),
        ]),
      ],
      { termWidth: 14 },
    ),
  ];
}

function ownersContent(entity: Partial<Entity>): ui.Block[] {
  const results = [];

  if (entity.owner_teams && entity.owner_teams.length > 0) {
    results.push(ui.p(ui.bold("Teams:")));
    results.push(
      ui.ul([
        ...entity.owner_teams.map((team) =>
          ui.li([ui.p(`${team.name} (${team.id})`, false)]),
        ),
      ]),
    );
  }

  if (entity.owner_users && entity.owner_users.length > 0) {
    results.push(ui.p(ui.bold("Users:")));
    results.push(
      ui.ul([
        ...entity.owner_users.map((user) =>
          ui.li([ui.p(`${user.email} (${user.id})`, false)]),
        ),
      ]),
    );
  }

  return results;
}

function propertiesContent(entity: Partial<Entity>): ui.Block[] {
  const propertiesListItems = [];

  for (const [identifier, value] of Object.entries(entity.properties!)) {
    const serialized = propertyValueContent(identifier, value);
    if (typeof serialized === "string") {
      propertiesListItems.push(
        ui.li([ui.p(`${ui.bold(identifier)}: ${serialized}`, false)]),
      );
    } else {
      propertiesListItems.push(
        ui.li([ui.p(`${ui.bold(identifier)}:`, false), serialized]),
      );
    }
  }

  return [ui.ul(propertiesListItems)];
}

function propertyValueContent(
  identifier: string,
  value: unknown,
): string | ui.Block {
  // Property-specific
  if (isFileMatchingRule(value)) {
    const matchText = value.match_count === 1 ? "match" : "matches";
    return `File matching rule: ${ui.code(value.status)} (${value.match_count} ${matchText})`;
  } else if (isUrl(value)) {
    return ui.link(value);
  }

  // Primitives
  if (value === null) {
    return ui.code("null");
  } else if (typeof value === "string") {
    return value;
  } else if (typeof value === "number") {
    return value.toString();
  } else if (typeof value === "boolean") {
    return value.toString();
  }

  // General arrays
  if (isStringArray(value)) {
    return value.join(", ");
  }

  // Fallback to JSON
  return ui.json(value as Record<string, unknown>);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("http")) {
    return false;
  }

  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

type FileMatchingRule = {
  status: "FOUND_MATCHES" | "NO_MATCHES" | "FILE_NOT_FOUND";
  match_count?: number;
  matches?: unknown[];
};

function isFileMatchingRule(value: unknown): value is FileMatchingRule {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value === "object" &&
    "status" in value &&
    typeof value.status === "string" &&
    ["FOUND_MATCHES", "NO_MATCHES", "FILE_NOT_FOUND"].includes(value.status)
  );
}

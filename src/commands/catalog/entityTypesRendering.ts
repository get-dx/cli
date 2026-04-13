import type { EntityType, Property } from "./entityTypes.js";
import { renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";

export function renderEntityTypeList(
  entityTypes: Partial<EntityType>[],
  nextCursor: string | null,
) {
  const blocks = [ui.h1("Entity Types")];

  blocks.push(
    ui.p(`Displaying ${ui.bold(entityTypes.length.toString())} entity types.`),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  for (const entityType of entityTypes) {
    if (entityType.name && entityType.identifier) {
      blocks.push(
        ui.h2(`${entityType.name} (${ui.code(entityType.identifier)})`),
      );
    } else if (entityType.identifier) {
      blocks.push(ui.h2(ui.code(entityType.identifier)));
    } else {
      blocks.push(ui.h2("Entity Type"));
    }

    if (entityType.identifier) {
      blocks.push(ui.h3("Core attributes"));
      blocks.push(...coreContent(entityType));
    }

    if (entityType.properties) {
      blocks.push(ui.h3("Properties"));
      blocks.push(...propertiesContent(entityType.properties));
    }

    if (entityType.aliases) {
      blocks.push(ui.h3("Aliases"));
      blocks.push(...aliasesContent(entityType.aliases));
    }
  }

  renderRichText(blocks);
}

export function renderEntityType(
  entityType: Partial<EntityType>,
  title = "Entity Type Information",
) {
  renderRichText([
    ui.h1(title),

    entityType.identifier
      ? [ui.h2("Core attributes"), ...coreContent(entityType)]
      : null,

    entityType.properties
      ? [ui.h2("Properties"), ...propertiesContent(entityType.properties)]
      : null,

    entityType.aliases
      ? [ui.h2("Aliases"), ...aliasesContent(entityType.aliases)]
      : null,
  ]);
}

export function renderEntityTypeDeleted(entityType: EntityType) {
  renderRichText([
    ui.h1(`${ui.success("✓")} Entity type deleted`),
    ui.p(`The entity type ${ui.code(entityType.identifier)} has been deleted.`),
  ]);
}

function coreContent(entityType: Partial<EntityType>): ui.Block[] {
  return [
    ui.dl(
      [
        ui.dli("Name", [ui.p(entityType.name ?? ui.dim("(None)"), false)]),
        ui.dli("Identifier", [ui.p(ui.code(entityType.identifier!), false)]),
        ui.dli("Description", [
          ui.p(entityType.description || ui.dim("(None)"), false),
        ]),
        ui.dli("Icon", [ui.p(entityType.icon ?? ui.dim("(None)"), false)]),
        ui.dli("Ordering", [
          ui.p(entityType.ordering?.toString() ?? ui.dim("(None)"), false),
        ]),
        ui.dli("Created", [
          ui.p(ui.timestampSummary(entityType.created_at!), false),
        ]),
        ui.dli("Last updated", [
          ui.p(ui.timestampSummary(entityType.updated_at!)),
        ]),
      ],
      { termWidth: 14 },
    ),
  ];
}

function propertiesContent(properties: Property[]): ui.Block[] {
  if (properties.length === 0) {
    return [ui.p(ui.dim("(No properties defined)"))];
  }

  return [ui.ul(properties.map(propertyListItem))];
}

function propertyListItem(property: Property) {
  const badges: string[] = [];
  if (property.visibility === "hidden") badges.push(ui.dim("[hidden]"));
  if (property.is_required) badges.push(ui.bold("[required]"));

  const header = [
    ui.bold(property.name),
    `(${ui.code(property.identifier)}):`,
    ui.code(property.type),
    ...badges,
  ].join(" ");

  const lines: ui.Block[] = [ui.p(header, false)];

  if (property.description) {
    lines.push(ui.p(ui.dim(property.description), false));
  }

  lines.push(...propertyDefinitionLines(property));

  return ui.li(lines);
}

function propertyDefinitionLines(property: Property): ui.Block[] {
  const { type, definition } = property;

  if (type === "select" || type === "multi_select") {
    const options = definition.options as
      | Array<{ value: string; color: string }>
      | undefined;
    if (options && options.length > 0) {
      return [
        ui.p(`Options: ${options.map((o) => o.value).join(", ")}`, false),
      ];
    }
  }

  if (type === "computed") {
    const sql = definition.sql as string | undefined;
    const outputType = definition.output_type as string | undefined;
    const aggregation = definition.output_aggregation as string | undefined;

    const lines: ui.Block[] = [];

    if (outputType) {
      const outputLine = aggregation
        ? `Output: ${ui.code(outputType)} ${ui.dim(`(aggregation: ${aggregation})`)}`
        : `Output: ${ui.code(outputType)}`;
      lines.push(ui.p(outputLine, false));
    }

    if (sql) {
      const firstLine = sql.split("\n")[0];
      const isLong = firstLine.length > 80 || sql.includes("\n");
      const truncated =
        firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine;
      const display = isLong ? truncated + ui.dim(" …") : truncated;
      lines.push(ui.p(`SQL: ${ui.code(display)}`, false));
    }

    return lines;
  }

  if (type === "file_matching_rule") {
    const filePath = definition.file_path as string | undefined;
    const ruleType = definition.rule_type as string | undefined;
    const matchExpression = definition.match_expression as string | undefined;
    return [
      ui.p(`Rule type: ${ui.code(ruleType ?? "(none)")}`, false),
      ui.p(`File path: ${ui.code(filePath ?? "(none)")}`, false),
      ui.p(`Expression: ${ui.code(matchExpression ?? "(none)")}`, false),
    ];
  }

  if (type === "url") {
    const cta = definition.call_to_action as string | undefined;
    const ctaType = definition.call_to_action_type as string | undefined;
    if (cta) {
      return [ui.p(`CTA: ${ui.code(cta)} ${ui.dim(`(${ctaType})`)}`, false)];
    }
  }

  if (Object.keys(definition).length === 0) {
    return [];
  }

  return [ui.json(definition)];
}

function aliasesContent(aliases: Record<string, unknown[]>): ui.Block[] {
  if (Object.keys(aliases).length === 0) {
    return [ui.p(ui.dim("(No aliases defined)"))];
  } else {
    return [ui.ul(Object.keys(aliases).map((aliasKey) => ui.li(aliasKey)))];
  }
}

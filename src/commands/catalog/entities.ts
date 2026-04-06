import { Command } from "commander";

import { getContext, wrapAction } from "../../commandHelpers.js";
import { Entity, getEntity } from "../../api.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { renderStructuredResponse } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";

const ENTITY_INCLUDE_SECTIONS = [
  "core",
  "owners",
  "properties",
  "aliases",
] as const;

type EntityIncludeSection = (typeof ENTITY_INCLUDE_SECTIONS)[number];

export function entitiesCommand() {
  const entities = new Command()
    .name("entities")
    .description("Manage entities");

  entities
    .command("info")
    .argument("<identifier>", "Entity identifier")
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, owners, properties, aliases",
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await getEntity(runtime, identifier);
        const processedResponse = processIncludes(response, options);

        renderStructuredResponse(processedResponse, runtime.context.json);
      }),
    );

  return entities;
}

function processIncludes(
  response: { ok: true; entity: Entity },
  options: { include?: string },
): { ok: true; entity: Partial<Entity> } {
  const includeSections = parseIncludeSections(options.include);

  if (includeSections.length === 0) {
    return response;
  }

  for (const section of includeSections) {
    if (!ENTITY_INCLUDE_SECTIONS.includes(section)) {
      throw new CliError(
        `Invalid --include "${section}". Expected one of: ${ENTITY_INCLUDE_SECTIONS.join(", ")}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }

  const sections = uniqueSectionsInOrder(includeSections);
  const entity = redactEntityByInclude(
    response.entity as Record<string, unknown>,
    sections,
  );
  return { ok: true, entity: entity as Partial<Entity> };
}

function parseIncludeSections(include?: string): EntityIncludeSection[] {
  if (!include) {
    return [];
  }

  const results = include.split(",");
  for (const result of results) {
    if (!ENTITY_INCLUDE_SECTIONS.includes(result as EntityIncludeSection)) {
      throw new CliError(
        `Invalid --include "${result}". Expected one of: ${ENTITY_INCLUDE_SECTIONS.join(", ")}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }
  return results as EntityIncludeSection[];
}

function uniqueSectionsInOrder(
  sections: EntityIncludeSection[],
): EntityIncludeSection[] {
  const seen = new Set<EntityIncludeSection>();
  const ordered: EntityIncludeSection[] = [];
  for (const s of ENTITY_INCLUDE_SECTIONS) {
    if (sections.includes(s) && !seen.has(s)) {
      seen.add(s);
      ordered.push(s);
    }
  }
  return ordered;
}

function redactEntityByInclude(
  entity: Record<string, unknown>,
  include: EntityIncludeSection[],
): Record<string, unknown> {
  const SECTION_KEYS: Record<EntityIncludeSection, readonly string[]> = {
    core: [
      "identifier",
      "name",
      "type",
      "created_at",
      "updated_at",
      "description",
      "domain",
    ],
    owners: ["owner_teams", "owner_users"],
    properties: ["properties"],
    aliases: ["aliases"],
  };

  const sections = uniqueSectionsInOrder(include);
  const out: Record<string, unknown> = {};
  for (const section of sections) {
    for (const key of SECTION_KEYS[section]) {
      if (key in entity) {
        out[key] = entity[key];
      }
    }
  }
  return out;
}

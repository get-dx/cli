import dayjs from "dayjs";
import {
  Entity,
  ScorecardCheckResult,
  ScorecardReport,
  Task,
} from "./entities.js";
import { renderRichText } from "../../renderers.js";
import { ListItemContainer } from "../../ui/blocks.js";
import * as ui from "../../ui.js";

export function renderEntityList(
  entities: Partial<Entity>[],
  nextCursor: string | null,
) {
  const blocks = [ui.h1("Entities")];

  blocks.push(
    ui.p(`Displaying ${ui.bold(entities.length.toString())} entities.`),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  for (const entity of entities) {
    if (entity.name && entity.identifier) {
      blocks.push(ui.h2(`${entity.name} (${ui.code(entity.identifier)})`));
    } else if (entity.identifier) {
      blocks.push(ui.h2(ui.code(entity.identifier)));
    } else {
      blocks.push(ui.h2("Entity"));
    }

    if (entity.identifier) {
      blocks.push(ui.h3("Core attributes"));
      blocks.push(...coreContent(entity));
    }

    if (entity.owner_teams || entity.owner_users) {
      blocks.push(ui.h3("Owners"));
      blocks.push(...ownersContent(entity));
    }

    if (entity.properties) {
      blocks.push(ui.h3("Properties"));
      blocks.push(...propertiesContent(entity));
    }

    if (entity.aliases) {
      blocks.push(ui.h3("Aliases"));
      blocks.push(...aliasesContent(entity));
    }
  }

  renderRichText(blocks);
}

export function renderEntity(
  entity: Partial<Entity>,
  title = "Entity Information",
) {
  renderRichText([
    ui.h1(title),

    entity.identifier
      ? [ui.h2("Core attributes"), ...coreContent(entity)]
      : null,

    entity.owner_teams ? [ui.h2("Owners"), ...ownersContent(entity)] : null,

    entity.properties
      ? [ui.h2("Properties"), ...propertiesContent(entity)]
      : null,

    entity.aliases ? [ui.h2("Aliases"), ...aliasesContent(entity)] : null,
  ]);
}

export function renderEntityDeleted(entity: Entity) {
  renderRichText([
    ui.h1(`${ui.success("✓")} Entity deleted`),
    ui.p(`The entity ${ui.code(entity.identifier)} has been deleted.`),
  ]);
}

export function renderEntityScorecardList(
  scorecards: ScorecardReport[],
  nextCursor: string | null,
): void {
  const blocks = [ui.h1("Scorecards")];

  blocks.push(
    ui.p(`Displaying ${ui.bold(scorecards.length.toString())} scorecards.`),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  for (const scorecard of scorecards) {
    blocks.push(ui.h2(scorecard.name));
    blocks.push(...scorecardReportContent(scorecard));
  }

  renderRichText(blocks);
}

export function renderEntityTaskList(tasks: Task[], nextCursor: string | null) {
  const blocks = [ui.h1("Tasks")];

  blocks.push(ui.p(`Displaying ${ui.bold(tasks.length.toString())} tasks.`));

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  for (const task of tasks) {
    blocks.push(ui.h2(task.check.name));
    blocks.push(...taskContent(task));
  }

  renderRichText(blocks);
}

function scorecardReportContent(scorecard: ScorecardReport): ui.Block[] {
  const blocks: ui.Block[] = [];

  if (scorecard.type === "POINTS") {
    const total = scorecard.points_meta?.points_total ?? 0;
    const achieved = scorecard.points_meta?.points_achieved ?? 0;
    const pct = total === 0 ? 0 : Math.round((achieved / total) * 100);
    blocks.push(
      ui.p(`Points: ${ui.bold(`${achieved}/${total}`)} ${ui.dim(`(${pct}%)`)}`),
    );
  } else {
    const levelName =
      scorecard.current_level?.name ??
      scorecard.empty_level?.label ??
      "No level";
    blocks.push(ui.p(`Current level: ${ui.bold(levelName)}`));
  }

  if (scorecard.type === "LEVEL" && scorecard.levels) {
    for (const level of scorecard.levels) {
      const checksInLevel = scorecard.checks.filter(
        (check) => check.level?.id === level.id,
      );
      if (checksInLevel.length === 0) continue;

      blocks.push(ui.h3(level.name));
      blocks.push(ui.ul(checksInLevel.map(scorecardCheckListItem)));
    }
  } else if (scorecard.type === "POINTS" && scorecard.check_groups) {
    const sortedGroups = [...scorecard.check_groups].sort(
      (a, b) => a.ordering - b.ordering,
    );
    for (const group of sortedGroups) {
      const checksInGroup = scorecard.checks.filter(
        (check) => check.check_group?.id === group.id,
      );
      if (checksInGroup.length === 0) continue;

      blocks.push(ui.h3(group.name));
      blocks.push(ui.ul(checksInGroup.map(scorecardCheckListItem)));
    }
  } else if (scorecard.checks.length > 0) {
    blocks.push(ui.ul(scorecard.checks.map(scorecardCheckListItem)));
  }

  return blocks;
}

function scorecardCheckListItem(
  check: ScorecardCheckResult,
): ListItemContainer {
  let statusBadge: string;
  if (check.status === "PASS") {
    statusBadge = ui.success("✓ Passed");
  } else if (check.status === "WARN") {
    statusBadge = ui.warning("⚠ Warning");
  } else {
    statusBadge = ui.error("✗ Not passed");
  }

  const evalTime = check.executed_at
    ? ui.dim(`(${dayjs(check.executed_at).fromNow()})`)
    : "";

  const parts = [check.name, evalTime, statusBadge].filter(Boolean);
  return ui.li([ui.p(parts.join("  "), false)]);
}

function taskContent(task: Task): ui.Block[] {
  const { check, entity_check_issue, initiative, owner } = task;

  return [
    ui.h3("Check:"),
    ui.dl(
      [
        ui.dli("Name", [ui.p(check.name, false)]),
        ui.dli("ID", [ui.p(ui.code(check.id), false)]),
        ui.dli("External URL", [
          ui.p(
            check.external_url ? ui.link(check.external_url) : ui.dim("(none)"),
            false,
          ),
        ]),
        ui.dli("Description", [
          ui.p(check.description || ui.dim("(none)"), false),
        ]),
      ],
      { termWidth: 14 },
    ),

    ui.h3("Initiative:"),
    ui.dl(
      [
        ui.dli("Name", [ui.p(initiative.name, false)]),
        ui.dli("Priority", [ui.p(`P${initiative.priority}`, false)]),
        ui.dli("Owner", [
          ui.p(`${owner.name} (${ui.code(owner.email)})`, false),
        ]),
        ui.dli("Due", [ui.p(dueDateText(initiative.complete_by), false)]),
      ],
      { termWidth: 10 },
    ),

    ui.p(ui.bold("Description:")),
    ui.p(initiative.description || ui.dim("(none)")),
  ];
}

function dueDateText(completeBy: string): string {
  const now = dayjs();
  const dueDate = dayjs(completeBy);
  const formattedDate = new Date(completeBy).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  if (dueDate.isBefore(now)) {
    return ui.error(formattedDate);
  } else if (dueDate.isBefore(now.add(2, "week"))) {
    return ui.warning(formattedDate);
  } else {
    return formattedDate;
  }
}

function coreContent(entity: Partial<Entity>): ui.Block[] {
  return [
    ui.dl(
      [
        ui.dli("Name", [ui.p(entity.name ?? ui.dim("(None)"), false)]),
        ui.dli("Identifier", [ui.p(ui.code(entity.identifier!), false)]),
        ui.dli("Type", [ui.p(ui.code(entity.type!), false)]),
        ui.dli("Created", [
          ui.p(ui.timestampSummary(entity.created_at!), false),
        ]),
        ui.dli("Last updated", [ui.p(ui.timestampSummary(entity.updated_at!))]),
        ui.dli("Description", [
          ui.p(entity.description ?? ui.dim("(None)"), false),
        ]),
      ],
      { termWidth: 14 },
    ),
  ];
}

function ownersContent(entity: Partial<Entity>): ui.Block[] {
  const results = [];

  const teamCount = entity.owner_teams?.length ?? 0;
  const userCount = entity.owner_users?.length ?? 0;

  if (teamCount === 0 && userCount === 0) {
    results.push(ui.p(ui.dim("(No owners assigned)")));
  }

  if (entity.owner_teams && teamCount > 0) {
    results.push(ui.p(ui.bold("Teams:")));
    results.push(
      ui.ul([
        ...entity.owner_teams.map((team) =>
          ui.li([ui.p(`${team.name} (${team.id})`, false)]),
        ),
      ]),
    );
  }

  if (entity.owner_users && userCount > 0) {
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

function aliasesContent(entity: Partial<Entity>): ui.Block[] {
  return [ui.json({ ...entity.aliases })];
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

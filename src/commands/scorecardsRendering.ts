import type {
  Scorecard,
  ScorecardCheckDefinition,
  ScorecardCheckGroup,
} from "./scorecards.js";
import type { ScorecardIncludeSection } from "./scorecards.js";
import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";

export function renderScorecardList(
  scorecards: Scorecard[],
  nextCursor: string | null,
  includeSections: ScorecardIncludeSection[] | null,
) {
  const shouldIncludeAll = includeSections === null;
  const blocks = [ui.h1("Scorecards")];

  blocks.push(
    ui.p(`Displaying ${ui.bold(scorecards.length.toString())} scorecards.`),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  for (const scorecard of scorecards) {
    blocks.push(
      ui.h2(`${scorecard.name} (${ui.code(scorecard.id)})`),
    );

    if (shouldIncludeAll || includeSections.includes("core")) {
      blocks.push(ui.h3("Basic details"));
      blocks.push(...basicDetailsContent(scorecard));

      blocks.push(ui.h3("Entity filter"));
      blocks.push(...entityFilterContent(scorecard));

      if (scorecard.type === "LEVEL") {
        blocks.push(ui.h3("Levels"));
        blocks.push(...levelsContent(scorecard));
      } else {
        blocks.push(ui.h3("Check groups"));
        blocks.push(...checkGroupsContent(scorecard.check_groups!));
      }
    }

    if (shouldIncludeAll || includeSections.includes("owners")) {
      blocks.push(ui.h3("Owners"));
      blocks.push(...ownersContent(scorecard));
    }

    if (shouldIncludeAll || includeSections.includes("checks")) {
      blocks.push(ui.h3("Checks"));
      blocks.push(...checksContent(scorecard));
    }
  }

  renderRichText(blocks);
}

export function renderScorecard(
  scorecard: Scorecard,
  includeSections: ScorecardIncludeSection[] | null,
) {
  const shouldIncludeAll = includeSections === null;

  const blocks = [ui.h1("Scorecard Information")];

  if (shouldIncludeAll || includeSections.includes("core")) {
    blocks.push(ui.h2("Basic details"));
    blocks.push(...basicDetailsContent(scorecard));

    blocks.push(ui.h2("Entity filter"));
    blocks.push(...entityFilterContent(scorecard));

    if (scorecard.type === "LEVEL") {
      blocks.push(ui.h2("Levels"));
      blocks.push(...levelsContent(scorecard));
    } else {
      blocks.push(ui.h2("Check groups"));
      blocks.push(...checkGroupsContent(scorecard.check_groups!));
    }
  }

  if (shouldIncludeAll || includeSections.includes("owners")) {
    blocks.push(ui.h2("Owners"));
    blocks.push(...ownersContent(scorecard));
  }

  if (shouldIncludeAll || includeSections.includes("checks")) {
    blocks.push(ui.h2(`Checks`));
    blocks.push(...checksContent(scorecard));
  }

  renderRichText(blocks);
}

function basicDetailsContent(scorecard: Scorecard): ui.Block[] {
  const items = [
    ui.dli("ID", [ui.p(ui.code(scorecard.id), false)]),
    ui.dli("Name", [ui.p(scorecard.name, false)]),
    ui.dli("Description", [
      ui.p(scorecard.description || ui.dim("(None)"), false),
    ]),
    ui.dli("Type", [
      ui.p(scorecard.type ? ui.code(scorecard.type) : ui.dim("(None)"), false),
    ]),
    ui.dli("Published", [
      ui.p(
        scorecard.published ? ui.success("Yes") : ui.dim("No (draft)"),
        false,
      ),
    ]),
  ];

  if (scorecard.tags && scorecard.tags.length > 0) {
    items.push(
      ui.dli("Tags", [
        ui.p(scorecard.tags.map((t) => t.value).join(", "), false),
      ]),
    );
  }

  return [ui.dl(items, { termWidth: 14 })];
}

function entityFilterContent(scorecard: Partial<Scorecard>): ui.Block[] {
  const blocks: ui.Block[] = [];

  if (scorecard.entity_filter_type === "entity_types") {
    blocks.push(ui.p(`Filter: ${ui.code("entity_types")}`));
    if (
      scorecard.entity_filter_type_ids &&
      scorecard.entity_filter_type_ids.length > 0
    ) {
      blocks.push(
        ui.ul(
          scorecard.entity_filter_type_ids.map((id) =>
            ui.li([ui.p(ui.code(id), false)]),
          ),
        ),
      );
    } else {
      blocks.push(ui.p(ui.dim("(No entity types selected)")));
    }
  } else if (scorecard.entity_filter_type === "sql") {
    blocks.push(ui.p(`Filter: ${ui.code("sql")}`));
    if (scorecard.entity_filter_sql) {
      blocks.push(truncatedSqlBlock(scorecard.entity_filter_sql));
    } else {
      blocks.push(ui.p(ui.dim("(No SQL provided)")));
    }
  } else if (scorecard.entity_filter_type) {
    blocks.push(ui.p(`Filter: ${ui.code(scorecard.entity_filter_type)}`));
  }

  return blocks;
}

function levelsContent(scorecard: Partial<Scorecard>): ui.Block[] {
  const levels = scorecard.levels ?? [];

  if (levels.length === 0) {
    return [ui.p(ui.dim("(No levels defined)"))];
  }

  const blocks: ui.Block[] = [
    ui.ul(
      levels.map((level) =>
        ui.li([ui.p(`${ui.bold(level.name)}  ${ui.dim(level.color)}`, false)]),
      ),
    ),
  ];

  if (scorecard.empty_level_label) {
    const colorSuffix = scorecard.empty_level_color
      ? `  ${ui.dim(scorecard.empty_level_color)}`
      : "";
    blocks.push(
      ui.p(
        `Empty level: ${ui.bold(scorecard.empty_level_label)}${colorSuffix}`,
      ),
    );
  }

  return blocks;
}

function checkGroupsContent(checkGroups: ScorecardCheckGroup[]): ui.Block[] {
  if (checkGroups.length === 0) {
    return [ui.p(ui.dim("(No check groups defined)"))];
  }

  return [ui.ul(checkGroups.map((g) => ui.li([ui.p(ui.bold(g.name), false)])))];
}

function ownersContent(scorecard: Partial<Scorecard>): ui.Block[] {
  const blocks: ui.Block[] = [];
  const adminCount = scorecard.admins?.length ?? 0;
  const editorCount = scorecard.editors?.length ?? 0;

  if (adminCount === 0 && editorCount === 0) {
    return [ui.p(ui.dim("(No owners assigned)"))];
  }

  if (scorecard.admins && adminCount > 0) {
    blocks.push(ui.p(ui.bold("Admins:")));
    blocks.push(
      ui.ul(
        scorecard.admins.map((u) =>
          ui.li([ui.p(`${u.name} (${ui.code(u.email)})`, false)]),
        ),
      ),
    );
  }

  if (scorecard.editors && editorCount > 0) {
    blocks.push(ui.p(ui.bold("Editors:")));
    blocks.push(
      ui.ul(
        scorecard.editors.map((u) =>
          ui.li([ui.p(`${u.name} (${ui.code(u.email)})`, false)]),
        ),
      ),
    );
  }

  return blocks;
}

function checksContent(scorecard: Partial<Scorecard>): ui.Block[] {
  const checks = scorecard.checks ?? [];

  if (checks.length === 0) {
    return [ui.p(ui.dim("(No checks defined)"))];
  }

  const blocks: ui.Block[] = [];
  for (const check of checks) {
    blocks.push(...checkContent(check, scorecard.type));
  }
  return blocks;
}

function checkContent(
  check: ScorecardCheckDefinition,
  scorecardType?: "LEVEL" | "POINTS",
): ui.Block[] {
  const statusBadge = check.published ? "" : `  ${ui.dim("[draft]")}`;
  const blocks: ui.Block[] = [ui.h3(`${check.name}${statusBadge}`)];

  // Core fields dl
  const dlItems = [ui.dli("ID", [ui.p(ui.code(check.id), false)])];

  if (scorecardType === "LEVEL" && check.level) {
    dlItems.push(ui.dli("Level", [ui.p(check.level.name, false)]));
  }

  if (scorecardType === "POINTS") {
    if (check.check_group) {
      dlItems.push(
        ui.dli("Check group", [ui.p(check.check_group.name, false)]),
      );
    }
    if (check.points !== undefined && check.points !== null) {
      dlItems.push(ui.dli("Points", [ui.p(check.points.toString(), false)]));
    }
  }

  dlItems.push(
    ui.dli("Doc URL", [
      ui.p(
        check.external_url ? ui.link(check.external_url) : ui.dim("(none)"),
        false,
      ),
    ]),
  );

  if (check.estimated_dev_days !== null) {
    dlItems.push(
      ui.dli("Est. dev days", [
        ui.p(check.estimated_dev_days?.toString() ?? ui.dim("(none)"), false),
      ]),
    );
  }

  blocks.push(ui.dl(dlItems, { termWidth: 14 }));

  // Description
  if (check.description) {
    blocks.push(ui.p(ui.bold("Description:"), false));
    blocks.push(ui.p(check.description));
  }

  // Query
  blocks.push(ui.p(ui.bold("Query:")));
  blocks.push(truncatedSqlBlock(check.sql));

  // Output settings
  if (check.output_enabled) {
    const outputParts = [`Output: ${ui.code(check.output_type ?? "unknown")}`];
    if (check.output_aggregation) {
      outputParts.push(ui.dim(`(aggregation: ${check.output_aggregation})`));
    }
    blocks.push(ui.p(outputParts.join("  ")));
  }

  // Entity filter
  if (check.filter_sql) {
    blocks.push(ui.p(ui.bold("Entity filter:")));
    blocks.push(truncatedSqlBlock(check.filter_sql));
    if (check.filter_message) {
      blocks.push(
        ui.p(`Excluded message: ${ui.dim(check.filter_message)}`, false),
      );
    }
  }

  return blocks;
}

function truncatedSqlBlock(sql: string): ui.Block {
  const lines = sql.split("\n");
  const firstLine = lines[0];
  const isLong = firstLine.length > 80 || lines.length > 1;
  const truncated = firstLine.length > 80 ? firstLine.slice(0, 80) : firstLine;
  const display = isLong ? truncated + ui.dim(" …") : truncated;
  return ui.p(ui.code(display));
}

import type { Relation } from "./relations.js";
import { renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";

export function renderRelationList(
  relations: Relation[],
  nextCursor: string | null,
) {
  const blocks = [ui.h1("Relations")];

  blocks.push(
    ui.p(`Displaying ${ui.bold(relations.length.toString())} relations.`),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  for (const relation of relations) {
    blocks.push(ui.h2(ui.code(relation.identifier)));
    blocks.push(...relationContent(relation));
  }

  renderRichText(blocks);
}

export function renderRelation(
  relation: Relation,
  title = "Relation Information",
) {
  renderRichText([ui.h1(title), ...relationContent(relation)]);
}

export function renderRelationDeleted(relation: Relation) {
  renderRichText([
    ui.h1(`${ui.success(ui.GLYPHS.CHECK)} Relation deleted`),
    ui.p(`The relation ${ui.code(relation.identifier)} has been deleted.`),
  ]);
}

function relationContent(relation: Relation): ui.Block[] {
  return [
    ui.dl(
      [
        ui.dli("Identifier", ui.code(relation.identifier)),
        ui.dli(
          "Relation",
          `${ui.code(relation.source_entity_type_identifier)} ${relation.type} ${ui.code(relation.target_entity_type_identifier)}`,
        ),
        ui.dli("Type", relation.type),
        ui.dli("Inverse type", relation.inverse_type),
        ui.dli("Cardinality", ui.code(relation.cardinality)),
        ui.dli("Description", relation.description || ui.dim("(None)")),
        ui.dli("Created", ui.timestampSummary(relation.created_at)),
        ui.dli("Last updated", ui.timestampSummary(relation.updated_at)),
      ],
      { termWidth: 15 },
    ),
  ];
}

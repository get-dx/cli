import type {
  RelatedEntity,
  RelationEdge,
  RelationEdgesMap,
} from "./relationEdges.js";
import { renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";

export function renderRelationEdgeAdded(edge: RelationEdge) {
  renderRichText([
    ui.p(`${ui.success(ui.GLYPHS.CHECK)} Added edge ${edgeSummary(edge)}`),
  ]);
}

export function renderRelationEdgeRemoved(edge: RelationEdge) {
  renderRichText([
    ui.p(`${ui.success(ui.GLYPHS.CHECK)} Removed edge ${edgeSummary(edge)}`),
  ]);
}

export function renderRelationEdgesUpserted(
  relation: string,
  edges: RelationEdgesMap,
) {
  const count = Object.values(edges).reduce(
    (sum, targets) => sum + targets.length,
    0,
  );
  renderRichText([
    ui.p(
      `${ui.success(ui.GLYPHS.CHECK)} Upserted ${ui.bold(count.toString())} ${count === 1 ? "edge" : "edges"} for ${ui.code(relation)}`,
    ),
  ]);
}

export function renderRelationEdgeList(
  entities: RelatedEntity[],
  query: { entity: string; relation: string; direction: string },
  nextCursor: string | null,
) {
  const blocks = [ui.h1("Relation Edges")];

  blocks.push(
    ui.dl(
      [
        ui.dli("Entity", ui.code(query.entity)),
        ui.dli("Relation", ui.code(query.relation)),
        ui.dli("Direction", query.direction),
      ],
      { termWidth: 11 },
    ),
  );

  blocks.push(
    ui.p(`Displaying ${ui.bold(entities.length.toString())} related entities.`),
  );

  if (nextCursor) {
    blocks.push(ui.p(`Next cursor: ${ui.code(nextCursor)}`));
  }

  if (entities.length > 0) {
    blocks.push(
      ui.ul(
        entities.map((entity) =>
          ui.li(
            entity.name
              ? `${entity.name} (${ui.code(entity.identifier)})`
              : ui.code(entity.identifier),
          ),
        ),
      ),
    );
  }

  renderRichText(blocks);
}

function edgeSummary(edge: RelationEdge): string {
  return `${ui.code(edge.source)} -> ${ui.code(edge.target)} (${ui.code(edge.relation)})`;
}

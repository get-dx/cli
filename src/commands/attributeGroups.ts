import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import { request } from "../http.js";
import { renderJson, renderRichText } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import * as ui from "../ui.js";

export function attributeGroupsCommand(): Command {
  const attributeGroups = new Command()
    .name("attributeGroups")
    .description(
      "List attribute groups and values for filtering snapshot scores",
    );

  attributeGroups
    .command("list")
    .description("List attribute groups and their attribute values")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List attribute groups in human-readable output",
          command: "dx attributeGroups list",
        },
        {
          label: "Print raw JSON for automation",
          command: "dx --json attributeGroups list",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await listAttributeGroups(runtime);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderAttributeGroups(response.attribute_groups);
        }
      }),
    );

  return attributeGroups;
}

export type AttributeValue = {
  id: string;
  name: string;
};

export type AttributeGroup = {
  id: string;
  name: string;
  type: string;
  attribute_values: AttributeValue[];
};

export type ListAttributeGroupsResponse = {
  ok: true;
  attribute_groups: AttributeGroup[];
};

export async function listAttributeGroups(
  runtime: Runtime,
): Promise<ListAttributeGroupsResponse> {
  const response = await request<ListAttributeGroupsResponse>(
    runtime,
    "/attributeGroups.list",
    {
      method: "GET",
    },
  );

  return response.body;
}

function renderAttributeGroups(attributeGroups: AttributeGroup[]): void {
  const blocks: ui.Block[] = [ui.h1("Attribute Groups")];
  blocks.push(
    ui.p(
      `Displaying ${ui.bold(attributeGroups.length.toString())} attribute groups.`,
    ),
  );

  if (attributeGroups.length === 0) {
    blocks.push(
      ui.p(
        "No attribute groups are available for this account. Create or sync attribute groups in DX before filtering snapshot scores by attribute.",
      ),
    );
    renderRichText(blocks);
    return;
  }

  for (const attributeGroup of attributeGroups) {
    blocks.push(
      ui.h2(`${attributeGroup.name} (${ui.code(attributeGroup.id)})`),
    );
    blocks.push(
      ui.dl(
        [
          ui.dli("Type", formatAttributeGroupType(attributeGroup.type)),
          ui.dli("ID", ui.code(attributeGroup.id)),
        ],
        { termWidth: 8 },
      ),
    );

    if (attributeGroup.attribute_values.length === 0) {
      blocks.push(ui.p(`Attribute values: ${ui.dim("(None)")}`));
      continue;
    }

    blocks.push(ui.p("Attribute values:"));
    blocks.push(
      ui.ul(
        attributeGroup.attribute_values.map((attributeValue) =>
          ui.li(`${attributeValue.name} (${ui.code(attributeValue.id)})`),
        ),
      ),
    );
  }

  renderRichText(blocks);
}

function formatAttributeGroupType(type: string): string {
  switch (type) {
    case "ADMIN_MANAGED":
      return "Admin managed";
    case "SELF_REPORTED":
      return "Self reported";
    case "DX_MANAGED":
      return "DX managed";
    default:
      return type;
  }
}

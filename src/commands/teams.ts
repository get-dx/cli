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

export function teamsCommand(): Command {
  const teams = new Command().name("teams").description("Manage DX teams");

  teams
    .command("list")
    .description("List all teams in DX")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List all teams",
          command: "dx teams list",
        },
        {
          label: "List all teams as JSON",
          command: "dx --json teams list",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = buildRuntime(getContext(command));
        const response = await listTeams(runtime);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderTeams(response.teams);
        }
      }),
    );

  return teams;
}

export type Team = {
  id: string;
  name: string;
  ancestors?: string[];
  contributors?: number;
  last_changed_at?: string;
  manager_id?: string | null;
  parent?: boolean;
  parent_id?: string | null;
  reference_id?: string | null;
};

type ListTeamsResponse = {
  ok: true;
  teams: Team[];
};

async function listTeams(runtime: Runtime): Promise<ListTeamsResponse> {
  const response = await request<ListTeamsResponse>(runtime, "/teams.list", {
    method: "GET",
  });

  return response.body;
}

function renderTeams(teams: Team[]): void {
  const blocks: ui.Block[] = [ui.h1("Teams")];

  blocks.push(ui.p(`Displaying ${ui.bold(teams.length.toString())} teams.`));

  for (const team of teams) {
    blocks.push(ui.h2(`${team.name} (${ui.code(team.id)})`));
    blocks.push(
      ui.dl(
        [
          ui.dli("Reference ID", formatText(team.reference_id)),
          ui.dli("Parent ID", formatText(team.parent_id)),
          ui.dli("Manager ID", formatText(team.manager_id)),
          ui.dli(
            "Ancestors",
            team.ancestors && team.ancestors.length > 0
              ? team.ancestors.map((ancestor) => ui.code(ancestor)).join(", ")
              : ui.dim("(None)"),
          ),
          ui.dli(
            "Contributors",
            typeof team.contributors === "number"
              ? team.contributors.toString()
              : ui.dim("(Unknown)"),
          ),
          ui.dli(
            "Parent team",
            typeof team.parent === "boolean"
              ? team.parent
                ? "Yes"
                : "No"
              : ui.dim("(Unknown)"),
          ),
          ui.dli(
            "Last changed",
            team.last_changed_at
              ? ui.timestampSummary(team.last_changed_at)
              : ui.dim("(None)"),
          ),
        ],
        { termWidth: 14 },
      ),
    );
  }

  renderRichText(blocks);
}

function formatText(value: string | null | undefined): string {
  return value ? ui.code(value) : ui.dim("(None)");
}

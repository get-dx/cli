import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../commandHelpers.js";
import { CliError, EXIT_CODES, HttpError } from "../errors.js";
import { request } from "../http.js";
import { renderJson, renderRichText } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import * as ui from "../ui.js";

export function teamsCommand(): Command {
  const teams = new Command().name("teams").description("Manage DX teams");

  teams
    .command("findByMembers")
    .description("Find a team by member email addresses")
    .option(
      "--team-emails <emails>",
      "Comma-separated list of team member email addresses",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Find the team for a group of members",
          command:
            "dx teams findByMembers --team-emails person@example.com,another@example.com",
        },
        {
          label: "Find a team and return JSON",
          command:
            "dx --json teams findByMembers --team-emails person@example.com,another@example.com",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const teamEmails = parseTeamEmails(options.teamEmails);
        const runtime = buildRuntime(getContext(command));
        const response = await findTeamByMembers(runtime, teamEmails);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderTeamByMembers(response.team);
        }
      }),
    );

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

type TeamMember = {
  id: string;
  name: string;
  email: string;
};

type TeamByMembers = {
  id: string;
  name: string;
  members: TeamMember[];
  manager?: TeamMember | null;
};

type FindTeamByMembersResponse = {
  ok?: true;
  team: TeamByMembers;
};

type ListTeamsResponse = {
  ok: true;
  teams: Team[];
};

async function findTeamByMembers(
  runtime: Runtime,
  teamEmails: string,
): Promise<FindTeamByMembersResponse> {
  try {
    const response = await request<FindTeamByMembersResponse>(
      runtime,
      "/teams.findByMembers",
      {
        method: "GET",
        query: { team_emails: teamEmails },
      },
    );

    return response.body;
  } catch (error) {
    if (runtime.context.json) {
      throw error;
    }

    throw buildFindByMembersError(error, teamEmails);
  }
}

async function listTeams(runtime: Runtime): Promise<ListTeamsResponse> {
  const response = await request<ListTeamsResponse>(runtime, "/teams.list", {
    method: "GET",
  });

  return response.body;
}

function renderTeamByMembers(team: TeamByMembers): void {
  const blocks: ui.Block[] = [
    ui.h1("Team"),
    ui.h2(`${team.name} (${ui.code(team.id)})`),
    ui.dl(
      [
        ui.dli("Manager", formatTeamMember(team.manager)),
        ui.dli(
          "Members",
          team.members.length > 0
            ? [
                ui.ul(
                  team.members.map((member) => ui.li(formatTeamMember(member))),
                ),
              ]
            : ui.dim("(None)"),
        ),
      ],
      { termWidth: 8 },
    ),
  ];

  renderRichText(blocks);
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

function formatTeamMember(member: TeamMember | null | undefined): string {
  if (!member) {
    return ui.dim("(None)");
  }

  return `${member.name} <${member.email}> (${ui.code(member.id)})`;
}

function parseTeamEmails(value: unknown): string {
  if (typeof value !== "string") {
    throw new CliError("--team-emails is required", EXIT_CODES.ARGUMENT_ERROR);
  }

  const emails = value
    .split(",")
    .map((email) => email.trim())
    .filter((email) => email.length > 0);

  if (emails.length === 0) {
    throw new CliError(
      "--team-emails must include at least one email address",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  return emails.join(",");
}

function buildFindByMembersError(error: unknown, teamEmails: string): Error {
  if (!(error instanceof HttpError)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const apiError = getApiErrorCode(error.body);
  if (apiError === "no_users_found") {
    return new CliError(
      `No active DX users were found for the provided email addresses: ${teamEmails}.\n\nCheck the spelling and make sure these users exist and are active in the DX account for your API token.`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  return error;
}

function getApiErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const error = (body as Record<string, unknown>).error;
  return typeof error === "string" ? error : undefined;
}

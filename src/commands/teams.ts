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
    .command("info")
    .description("Retrieve details for an individual team")
    .option("--team-id <id>", "DX team ID")
    .option(
      "--reference-id <id>",
      "Team ID that is internal to your organization",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for a team by DX team ID",
          command: "dx teams info --team-id NTA4Nzc",
        },
        {
          label: "Fetch info for a team by your organization's reference ID",
          command:
            "dx teams info --reference-id 06BEC4E0-5A61-354E-08A6-C39D756058AB",
        },
        {
          label: "Fetch team info and return JSON",
          command: "dx --json teams info --team-id NTA4Nzc",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const lookup = parseTeamInfoLookup(options);
        const runtime = buildRuntime(getContext(command));
        const response = await getTeamInfo(runtime, lookup);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderTeamInfo(response.team);
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
  avatar?: string;
  developer?: boolean;
  github_username?: string;
  tz?: string;
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

type TeamInfo = Partial<Omit<Team, "contributors">> & {
  contributors?: TeamMember[];
  lead?: TeamMember | null;
  manager?: TeamMember | null;
};

type TeamInfoLookup = {
  team_id?: string;
  reference_id?: string;
};

type TeamInfoResponse = {
  ok: true;
  team: TeamInfo;
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

async function getTeamInfo(
  runtime: Runtime,
  lookup: TeamInfoLookup,
): Promise<TeamInfoResponse> {
  const response = await request<TeamInfoResponse>(runtime, "/teams.info", {
    method: "GET",
    query: lookup,
  });

  return response.body;
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

function renderTeamInfo(team: TeamInfo): void {
  const blocks: ui.Block[] = [ui.h1("Team Information")];
  const heading = formatTeamHeading(team);

  if (heading) {
    blocks.push(ui.h2(heading));
  }

  const details: ReturnType<typeof ui.dli>[] = [];

  pushDetail(details, "ID", formatText(team.id), team.id !== undefined);
  pushDetail(
    details,
    "Name",
    team.name ?? ui.dim("(None)"),
    team.name !== undefined,
  );
  pushDetail(
    details,
    "Reference ID",
    formatText(team.reference_id),
    team.reference_id !== undefined,
  );
  pushDetail(
    details,
    "Parent ID",
    formatText(team.parent_id),
    team.parent_id !== undefined,
  );
  pushDetail(
    details,
    "Manager ID",
    formatText(team.manager_id),
    team.manager_id !== undefined,
  );
  pushDetail(
    details,
    "Parent team",
    typeof team.parent === "boolean" ? (team.parent ? "Yes" : "No") : "",
    team.parent !== undefined,
  );
  pushDetail(
    details,
    "Last changed",
    team.last_changed_at
      ? ui.timestampSummary(team.last_changed_at)
      : ui.dim("(None)"),
    team.last_changed_at !== undefined,
  );
  pushDetail(
    details,
    "Lead",
    formatTeamMember(team.lead),
    team.lead !== undefined,
  );
  pushDetail(
    details,
    "Manager",
    formatTeamMember(team.manager),
    team.manager !== undefined,
  );

  if (details.length > 0) {
    blocks.push(ui.dl(details, { termWidth: 14 }));
  }

  blocks.push(ui.h2("Contributors"));
  blocks.push(formatTeamMemberList(team.contributors));

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

function formatTeamHeading(team: TeamInfo): string | null {
  if (team.name && team.id) {
    return `${team.name} (${ui.code(team.id)})`;
  }

  if (team.name) {
    return team.name;
  }

  if (team.id) {
    return ui.code(team.id);
  }

  if (team.reference_id) {
    return ui.code(team.reference_id);
  }

  return null;
}

function formatTeamMember(member: TeamMember | null | undefined): string {
  if (!member) {
    return ui.dim("(None)");
  }

  return `${member.name} <${member.email}> (${ui.code(member.id)})`;
}

function formatTeamMemberList(members: TeamMember[] | undefined): ui.Block {
  if (!members || members.length === 0) {
    return ui.p(ui.dim("(None)"));
  }

  return ui.ul(members.map((member) => ui.li(formatTeamMember(member))));
}

function pushDetail(
  details: ReturnType<typeof ui.dli>[],
  term: string,
  value: string,
  shouldInclude: boolean,
): void {
  if (shouldInclude) {
    details.push(ui.dli(term, value));
  }
}

function parseTeamInfoLookup(options: {
  teamId?: unknown;
  referenceId?: unknown;
}): TeamInfoLookup {
  const teamId = parseOptionalTextOption(options.teamId);
  const referenceId = parseOptionalTextOption(options.referenceId);

  if (!teamId && !referenceId) {
    throw new CliError(
      "One of --team-id or --reference-id is required",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  if (teamId && referenceId) {
    throw new CliError(
      "--team-id and --reference-id are mutually exclusive",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }

  return teamId ? { team_id: teamId } : { reference_id: referenceId };
}

function parseOptionalTextOption(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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

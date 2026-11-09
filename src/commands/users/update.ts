import { Command, Option } from "commander";

import {
  createExampleText,
  getContext,
  parseCommaSeparatedValues,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { requestWithMessages } from "../../http.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";

type UserProperties = {
  start_date?: string;
  timezone?: string;
  github_username?: string;
  additional_github_username?: string;
  gitlab_username?: string;
  ai_light_adoption_date?: string;
  ai_moderate_adoption_date?: string;
  ai_heavy_adoption_date?: string;
  sso_email?: string;
  additional_emails?: string[];
  protected?: boolean;
  exclude_from_snapshots?: boolean;
  developer?: boolean;
};

type PropertyValue = string | boolean | string[] | null;

type UpdateUserParams = { email: string } & Record<string, PropertyValue>;

type UpdateUserResponse = {
  ok: true;
  user: { email: string } & UserProperties;
};

type Property = {
  key: keyof UserProperties;
  label: string;
  valueName: string;
  description: string;
  parse: (value: string, flag: string) => PropertyValue;
};

const PROPERTIES: Property[] = [
  {
    key: "start_date",
    label: "Start date",
    valueName: "date",
    description: "Start date as YYYY-MM-DD, or null to clear it",
    parse: parseDate,
  },
  {
    key: "timezone",
    label: "Timezone",
    valueName: "timezone",
    description:
      "Timezone such as America/Chicago, or null to clear it. Rejected when Slack or Microsoft Teams provides the user's timezone",
    parse: parseText,
  },
  {
    key: "github_username",
    label: "GitHub username",
    valueName: "username",
    description: "GitHub username, or null to clear it",
    parse: parseText,
  },
  {
    key: "additional_github_username",
    label: "Additional GitHub username",
    valueName: "username",
    description: "Additional GitHub username, or null to clear it",
    parse: parseText,
  },
  {
    key: "gitlab_username",
    label: "GitLab username",
    valueName: "username",
    description: "GitLab username, or null to clear it",
    parse: parseText,
  },
  {
    key: "ai_light_adoption_date",
    label: "AI light adoption date",
    valueName: "date",
    description:
      "Date the user became a light AI adopter as YYYY-MM-DD, or null to clear it",
    parse: parseDate,
  },
  {
    key: "ai_moderate_adoption_date",
    label: "AI moderate adoption date",
    valueName: "date",
    description:
      "Date the user became a moderate AI adopter as YYYY-MM-DD, or null to clear it",
    parse: parseDate,
  },
  {
    key: "ai_heavy_adoption_date",
    label: "AI heavy adoption date",
    valueName: "date",
    description:
      "Date the user became a heavy AI adopter as YYYY-MM-DD, or null to clear it",
    parse: parseDate,
  },
  {
    key: "sso_email",
    label: "SSO email",
    valueName: "email",
    description:
      "Alternate email used to authenticate through SAML SSO, or null to clear it",
    parse: parseText,
  },
  {
    key: "additional_emails",
    label: "Additional emails",
    valueName: "emails",
    description:
      "Comma-separated additional email addresses. Replaces the existing list; null clears it",
    parse: parseEmails,
  },
  {
    key: "protected",
    label: "Protected",
    valueName: "true|false",
    description: "Whether the user's IC metrics are de-identified",
    parse: (value, flag) => parseBoolean(value, flag, false),
  },
  {
    key: "exclude_from_snapshots",
    label: "Exclude from snapshots",
    valueName: "true|false",
    description: "Whether the user is left out of snapshots",
    parse: (value, flag) => parseBoolean(value, flag, false),
  },
  {
    key: "developer",
    label: "Developer",
    valueName: "true|false|null",
    description:
      "Whether the user is a developer: true, false, or null to clear it. Clearing only works for accounts that manage developer classification manually",
    parse: (value, flag) => parseBoolean(value, flag, true),
  },
];

const ERROR_MESSAGES = {
  "User not found":
    "No active DX user has that email address. Check the spelling.",
  "Developer must be true or false":
    "Only accounts that manage developer classification manually can clear the developer flag. Pass true or false instead.",
};

export function updateCommand(): Command {
  const update = new Command()
    .name("update")
    .description("Update the properties of a DX user")
    .argument("<email>", "Email address of the user to update");

  for (const property of PROPERTIES) {
    update.addOption(
      new Option(
        `${flagFor(property)} <${property.valueName}>`,
        property.description,
      ),
    );
  }

  return update
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Set a user's start date and GitHub username",
          command:
            "dx users update ada@example.com --start-date 2024-10-07 --github-username ada-lovelace",
        },
        {
          label: "Clear a user's GitLab username",
          command: "dx users update ada@example.com --gitlab-username null",
        },
        {
          label: "Mark a user as not a developer and return JSON",
          command: "dx users update ada@example.com --developer false --json",
        },
      ]),
    )
    .action(
      wrapAction(
        async (
          email: string,
          options: Record<string, string | undefined>,
          command,
        ) => {
          const params: UpdateUserParams = { email };
          for (const property of PROPERTIES) {
            const value = options[attributeNameFor(property)];
            if (value !== undefined) {
              params[property.key] = property.parse(value, flagFor(property));
            }
          }
          if (Object.keys(params).length === 1) {
            throw new CliError(
              "Nothing to update. Pass at least one property option, such as --start-date or --developer. See --help for the full list.",
              EXIT_CODES.ARGUMENT_ERROR,
            );
          }

          const runtime = await buildRuntime(getContext(command));
          const response = await updateUser(runtime, params);

          if (runtime.context.json) {
            renderJson(response);
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Updated user ${ui.code(response.user.email)}.`,
              ),
              ui.dl(
                // The API only returns protected when the account has protected_user_ic_metrics_disabled on.
                PROPERTIES.filter(
                  ({ key }) =>
                    key !== "protected" ||
                    response.user.protected !== undefined,
                ).map(({ key, label }) =>
                  ui.dli(label, formatValue(response.user[key])),
                ),
                {
                  termWidth:
                    Math.max(...PROPERTIES.map(({ label }) => label.length)) +
                    2,
                },
              ),
            ]);
          }
        },
      ),
    );
}

function flagFor(property: Property): string {
  return `--${property.key.replace(/_/g, "-")}`;
}

function attributeNameFor(property: Property): string {
  return new Option(flagFor(property)).attributeName();
}

function formatValue(value: UserProperties[keyof UserProperties]): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "unset";
  }
  return String(value ?? "unset");
}

function parseText(value: string): string | null {
  return value === "null" ? null : value;
}

function parseDate(value: string, flag: string): string | null {
  if (value === "null") {
    return null;
  }

  // JS rolls 2024-02-30 over to March 1, so compare the round trip.
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    !date.toISOString().startsWith(value)
  ) {
    throw new CliError(
      `${flag} must be a date formatted as YYYY-MM-DD, or null`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return value;
}

function parseEmails(value: string, flag: string): string[] | null {
  if (value === "null") {
    return null;
  }

  const emails = parseCommaSeparatedValues(value);
  if (emails === undefined) {
    throw new CliError(
      `${flag} needs at least one email address, or null to clear the list`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return emails;
}

function parseBoolean(
  value: string,
  flag: string,
  allowNull: boolean,
): boolean | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  if (allowNull && normalized === "null") {
    return null;
  }

  throw new CliError(
    `${flag} must be ${allowNull ? "true, false, or null" : "true or false"}`,
    EXIT_CODES.ARGUMENT_ERROR,
  );
}

async function updateUser(
  runtime: Runtime,
  params: UpdateUserParams,
): Promise<UpdateUserResponse> {
  return requestWithMessages<UpdateUserResponse>(
    runtime,
    "/users.update",
    {
      method: "POST",
      body: params,
    },
    ERROR_MESSAGES,
  );
}

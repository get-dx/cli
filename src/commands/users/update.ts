import { Command } from "commander";

import {
  createExampleText,
  getContext,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { requestWithMessages } from "../../http.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";

type UpdateUserParams = {
  email: string;
  developer?: boolean | null;
};

type UpdateUserResponse = {
  ok: true;
  user: {
    email: string;
    developer?: boolean;
  };
};

const ERROR_MESSAGES = {
  "User not found":
    "No active DX user has that email address. Check the spelling.",
  "Developer must be true or false":
    "Only accounts that manage developer classification manually can clear the developer flag. Pass true or false instead.",
};

export function updateCommand(): Command {
  return new Command()
    .name("update")
    .description("Update the properties of a DX user")
    .argument("<email>", "Email address of the user to update")
    .option(
      "--developer <value>",
      "Whether the user is a developer: true, false, or null to clear it. Clearing only works for accounts that manage developer classification manually.",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Mark a user as a developer",
          command: "dx users update ada@example.com --developer true",
        },
        {
          label: "Mark a user as not a developer and return JSON",
          command: "dx users update ada@example.com --developer false --json",
        },
      ]),
    )
    .action(
      wrapAction(async (email: string, options, command) => {
        const params: UpdateUserParams = { email };
        if (options.developer !== undefined) {
          params.developer = parseDeveloper(options.developer);
        }
        if (Object.keys(params).length === 1) {
          throw new CliError(
            "Nothing to update. Pass --developer true, false, or null.",
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
              [ui.dli("Developer", String(response.user.developer ?? "unset"))],
              { termWidth: 13 },
            ),
          ]);
        }
      }),
    );
}

function parseDeveloper(value: string): boolean | null {
  switch (value.trim().toLowerCase()) {
    case "true":
      return true;
    case "false":
      return false;
    case "null":
      return null;
    default:
      throw new CliError(
        "--developer must be true, false, or null",
        EXIT_CODES.ARGUMENT_ERROR,
      );
  }
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

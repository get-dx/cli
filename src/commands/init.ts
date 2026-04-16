import { input, password } from "@inquirer/prompts";
import { Command } from "commander";

import { buildRuntime } from "../runtime.js";
import { getAuthInfo, type AuthInfoResponse } from "./auth.js";
import { getContext } from "../commandHelpers.js";
import { wrapAction } from "../commandHelpers.js";
import { renderRichText } from "../renderers.js";
import * as ui from "../ui.js";
import { CliError } from "../errors.js";

export function initCommand() {
  const init = new Command()
    .name("init")
    .description("Initialize the DX CLI")
    .action(
      wrapAction(async (_commandOptions, command) => {
        const runtime = buildRuntime(getContext(command));

        if (!process.stderr.isTTY) {
          throw new CliError("`dx init` must be run interactively in a TTY");
        }

        let authInfo: AuthInfoResponse | null = null;
        try {
          authInfo = await getAuthInfo(runtime);
        } catch (error) {
          // Do nothing, we don't mind if this fails
        }

        if (authInfo) {
          renderRichText([ui.p(`You are logged in!`)]);
        } else {
          renderRichText([ui.p(`You are NOT logged in!`)]);
        }

        const firstName = await input({ message: "What is your first name?" });

        renderRichText([ui.p(`Hello, ${firstName}!`)]);

        const userPassword = await password({
          message: "What is your password?",
          mask: true,
        });

        renderRichText([ui.p(`Your password is ${userPassword}!`)]);
      }),
    );

  return init;
}

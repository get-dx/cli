import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";
import { requestWithHints } from "./errorHints.js";
import type { ErrorHints } from "./errorHints.js";
import { SOURCES } from "./sources.js";

export function linkableAccountsCommand(): Command {
  const linkableAccounts = new Command()
    .name("linkableAccounts")
    .description("Search accounts that can be linked to DX users");

  linkableAccounts
    .command("list")
    .description(
      "Search the accounts DX has imported from a source, and get the account IDs to pass to `dx users links` commands",
    )
    .requiredOption("--source <source>", `Source to search (${SOURCES})`)
    .option(
      "--query <query>",
      "Case-insensitive text to find in the account's name, email, or username",
    )
    .option(
      "--external-id <id>",
      "Only return the account with this ID from the tool itself",
    )
    .option(
      "--instance-id <id>",
      "Only return accounts from this instance, organization, workspace, or connection",
    )
    .option("--linked", "Only return accounts linked to a DX user")
    .option("--unlinked", "Only return accounts not linked to a DX user")
    .option("--page <n>", "Page number to return (default is 1)", (value) =>
      parsePositiveIntOption(value, "--page"),
    )
    .option(
      "--page-size <n>",
      "Max accounts per page (default and maximum is 100)",
      (value) => parsePositiveIntOption(value, "--page-size"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Search unlinked GitHub accounts matching a name",
          command:
            "dx users linkableAccounts list --source github --query jane --unlinked",
        },
        {
          label: "Find a Jira account by its Jira ID and return JSON",
          command:
            "dx users linkableAccounts list --source jira --external-id 5b10ac8d82e05b22cc7d4ef5 --json",
        },
        {
          label: "Fetch the next page of results",
          command: "dx users linkableAccounts list --source github --page 2",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        if (options.linked && options.unlinked) {
          throw new CliError(
            "--linked and --unlinked are mutually exclusive",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = await buildRuntime(getContext(command));
        const response = await listLinkableAccounts(runtime, {
          source: options.source,
          query: options.query,
          external_id: options.externalId,
          instance_id: options.instanceId,
          linked: options.unlinked ? false : options.linked,
          page: options.page,
          page_size: options.pageSize,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderLinkableAccounts(response);
        }
      }),
    );

  return linkableAccounts;
}

export type LinkableAccount = {
  id: string;
  source: string;
  external_id: string | null;
  instance_id: string | null;
  name: string | null;
  email: string | null;
  username: string | null;
  linked_user_id: string | null;
  label: string;
};

type ListLinkableAccountsParams = {
  source: string;
  query?: string;
  external_id?: string;
  instance_id?: string;
  linked?: boolean;
  page?: number;
  page_size?: number;
};

type ListLinkableAccountsResponse = {
  ok: true;
  accounts: LinkableAccount[];
  next_page: number | null;
  total: number;
  total_pages: number;
};

const ERROR_HINTS: ErrorHints = {
  query_timeout: {
    message:
      "The search timed out. Narrow it with --instance-id, --external-id, or a longer --query, then try again.",
    exitCode: EXIT_CODES.RETRY_RECOMMENDED,
  },
};

async function listLinkableAccounts(
  runtime: Runtime,
  params: ListLinkableAccountsParams,
): Promise<ListLinkableAccountsResponse> {
  return requestWithHints<ListLinkableAccountsResponse>(
    runtime,
    "/users.linkableAccounts.list",
    {
      method: "GET",
      query: params,
    },
    ERROR_HINTS,
  );
}

function renderLinkableAccounts(response: ListLinkableAccountsResponse): void {
  const blocks: ui.Block[] = [ui.h1("Linkable Accounts")];

  blocks.push(
    ui.p(
      `Displaying ${ui.bold(response.accounts.length.toString())} of ${ui.bold(response.total.toString())} accounts.`,
    ),
  );

  if (response.next_page) {
    blocks.push(ui.p(`Next page: ${ui.code(response.next_page.toString())}`));
  }

  for (const account of response.accounts) {
    blocks.push(ui.h2(`${account.label} (${ui.code(account.id)})`));
    blocks.push(
      ui.dl(
        [
          ...accountDetailItems(account),
          ui.dli(
            "Linked user",
            account.linked_user_id
              ? ui.code(account.linked_user_id)
              : ui.dim("(Not linked)"),
          ),
        ],
        { termWidth: 13 },
      ),
    );
  }

  renderRichText(blocks);
}

export function accountDetailItems(account: LinkableAccount) {
  return [
    ui.dli("Source", account.source),
    ui.dli("External ID", formatCode(account.external_id)),
    ui.dli("Instance ID", formatCode(account.instance_id)),
    ui.dli("Name", account.name ?? ui.dim("(None)")),
    ui.dli("Email", account.email ?? ui.dim("(None)")),
    ui.dli("Username", account.username ?? ui.dim("(None)")),
  ];
}

function formatCode(value: string | null): string {
  return value ? ui.code(value) : ui.dim("(None)");
}

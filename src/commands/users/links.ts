import { Command } from "commander";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../../commandHelpers.js";
import { EXIT_CODES } from "../../errors.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";
import { requestWithHints } from "./errorHints.js";
import type { ErrorHints } from "./errorHints.js";
import { accountDetailItems } from "./linkableAccounts.js";
import type { LinkableAccount } from "./linkableAccounts.js";
import { SOURCES } from "./sources.js";

export function linksCommand(): Command {
  const links = new Command()
    .name("links")
    .description("Manage the accounts linked to DX users");

  links
    .command("create")
    .description(
      "Link one account to a user, keeping the user's other linked accounts for that source",
    )
    .argument("<user-id>", "DX user ID")
    .requiredOption(
      "--source <source>",
      `Source the account comes from (${SOURCES})`,
    )
    .requiredOption(
      "--account-id <id>",
      "Account ID to link, as returned by `dx users linkableAccounts list`",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Link a GitHub account to a user",
          command:
            "dx users links create NTEyMDUw --source github --account-id 4812",
        },
        {
          label: "Link an account and return JSON",
          command:
            "dx users links create NTEyMDUw --source github --account-id 4812 --json",
        },
      ]),
    )
    .action(
      wrapAction(async (userId: string, options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await createLink(runtime, {
          user_id: userId,
          source: options.source,
          account_id: options.accountId,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRichText([
            ui.p(
              `${ui.success(ui.GLYPHS.CHECK)} Linked ${options.source} account ${ui.code(options.accountId)} to user ${ui.code(userId)}.`,
            ),
          ]);
        }
      }),
    );

  links
    .command("delete")
    .description(
      "Unlink one account from a user, keeping the user's other linked accounts for that source",
    )
    .argument("<user-id>", "DX user ID")
    .requiredOption(
      "--source <source>",
      `Source the account comes from (${SOURCES})`,
    )
    .requiredOption("--account-id <id>", "Account ID to unlink")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Unlink a GitHub account from a user",
          command:
            "dx users links delete NTEyMDUw --source github --account-id 4812",
        },
        {
          label: "Unlink an account and return JSON",
          command:
            "dx users links delete NTEyMDUw --source github --account-id 4812 --json",
        },
      ]),
    )
    .action(
      wrapAction(async (userId: string, options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await deleteLink(runtime, {
          user_id: userId,
          source: options.source,
          account_id: options.accountId,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRichText([
            ui.p(
              `${ui.success(ui.GLYPHS.CHECK)} Unlinked ${options.source} account ${ui.code(options.accountId)} from user ${ui.code(userId)}.`,
            ),
          ]);
        }
      }),
    );

  links
    .command("list")
    .description("List the accounts linked to a user")
    .argument("<user-id>", "DX user ID")
    .option(
      "--source <source>",
      `Only return accounts from this source (${SOURCES})`,
    )
    .option("--page <n>", "Page number to return (default is 1)", (value) =>
      parsePositiveIntOption(value, "--page"),
    )
    .option(
      "--page-size <n>",
      "Max links per page (default and maximum is 100)",
      (value) => parsePositiveIntOption(value, "--page-size"),
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List every account linked to a user",
          command: "dx users links list NTEyMDUw",
        },
        {
          label: "List a user's GitHub accounts and return JSON",
          command: "dx users links list NTEyMDUw --source github --json",
        },
        {
          label: "Fetch the next page of links",
          command: "dx users links list NTEyMDUw --page 2",
        },
      ]),
    )
    .action(
      wrapAction(async (userId: string, options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await listLinks(runtime, {
          user_id: userId,
          source: options.source,
          page: options.page,
          page_size: options.pageSize,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderLinks(userId, response);
        }
      }),
    );

  links
    .command("set")
    .description(
      "Replace every account linked to a user for one source. Accounts not in the list are unlinked.",
    )
    .argument("<user-id>", "DX user ID")
    .requiredOption(
      "--source <source>",
      `Source the accounts come from (${SOURCES})`,
    )
    .requiredOption(
      "--account-ids <ids>",
      'Comma-separated account IDs to link, up to 100. Pass "" to unlink every account for the source.',
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Link exactly these two GitHub accounts to a user",
          command:
            "dx users links set NTEyMDUw --source github --account-ids 4812,4813",
        },
        {
          label: "Unlink every GitHub account from a user",
          command:
            'dx users links set NTEyMDUw --source github --account-ids ""',
        },
        {
          label: "Replace a user's Jira accounts and return JSON",
          command:
            "dx users links set NTEyMDUw --source jira --account-ids 991 --json",
        },
      ]),
    )
    .action(
      wrapAction(async (userId: string, options, command) => {
        const accountIds = (options.accountIds as string)
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0);
        const runtime = await buildRuntime(getContext(command));
        const response = await setLinks(runtime, {
          user_id: userId,
          source: options.source,
          account_ids: accountIds,
        });

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderRichText([
            ui.p(
              accountIds.length > 0
                ? `${ui.success(ui.GLYPHS.CHECK)} Set the ${options.source} accounts linked to user ${ui.code(userId)} to ${accountIds.map((id) => ui.code(id)).join(", ")}.`
                : `${ui.success(ui.GLYPHS.CHECK)} Unlinked every ${options.source} account from user ${ui.code(userId)}.`,
            ),
          ]);
        }
      }),
    );

  return links;
}

export type UserLink = {
  user_id: string;
  source: string;
  account_id: string;
  account: LinkableAccount | null;
};

type ListLinksParams = {
  user_id: string;
  source?: string;
  page?: number;
  page_size?: number;
};

type ListLinksResponse = {
  ok: true;
  links: UserLink[];
  next_page: number | null;
  total: number;
  total_pages: number;
};

type LinkParams = {
  user_id: string;
  source: string;
  account_id: string;
};

type SetLinksParams = {
  user_id: string;
  source: string;
  account_ids: string[];
};

type LinkMutationResponse = {
  ok: true;
};

const USER_NOT_SYNCED_HINT = {
  message:
    "This user hasn't synced to Data Cloud yet. Try again once their next sync finishes.",
  exitCode: EXIT_CODES.RETRY_RECOMMENDED,
};

const ERROR_HINTS: ErrorHints = {
  datacloud_unavailable: {
    message: "Data Cloud didn't accept the change. Try again.",
    exitCode: EXIT_CODES.RETRY_RECOMMENDED,
  },
  link_update_in_progress: {
    message:
      "Another link update for this user and source is still running. Try again in a few seconds.",
    exitCode: EXIT_CODES.RETRY_RECOMMENDED,
  },
  manual_link_conflict: {
    message:
      "An account is manually linked to another user. Remove that link before linking it to this user.",
    exitCode: EXIT_CODES.ARGUMENT_ERROR,
  },
  not_found: {
    message:
      "The user or account wasn't found. Check the user ID, and look up account IDs with `dx users linkableAccounts list`.",
    exitCode: EXIT_CODES.ARGUMENT_ERROR,
  },
  query_timeout: {
    message: "Data Cloud didn't respond in time. Try again.",
    exitCode: EXIT_CODES.RETRY_RECOMMENDED,
  },
  user_not_in_datacloud: USER_NOT_SYNCED_HINT,
  // users.links.set passes Data Cloud's own error string through instead of a code.
  "User not found in datacloud": USER_NOT_SYNCED_HINT,
};

async function createLink(
  runtime: Runtime,
  params: LinkParams,
): Promise<LinkMutationResponse> {
  return requestWithHints<LinkMutationResponse>(
    runtime,
    "/users.links.create",
    {
      method: "POST",
      body: params,
    },
    ERROR_HINTS,
  );
}

async function deleteLink(
  runtime: Runtime,
  params: LinkParams,
): Promise<LinkMutationResponse> {
  return requestWithHints<LinkMutationResponse>(
    runtime,
    "/users.links.delete",
    {
      method: "POST",
      body: params,
    },
    ERROR_HINTS,
  );
}

async function listLinks(
  runtime: Runtime,
  params: ListLinksParams,
): Promise<ListLinksResponse> {
  return requestWithHints<ListLinksResponse>(
    runtime,
    "/users.links.list",
    {
      method: "GET",
      query: params,
    },
    ERROR_HINTS,
  );
}

async function setLinks(
  runtime: Runtime,
  params: SetLinksParams,
): Promise<LinkMutationResponse> {
  return requestWithHints<LinkMutationResponse>(
    runtime,
    "/users.links.set",
    {
      method: "POST",
      body: params,
    },
    ERROR_HINTS,
  );
}

function renderLinks(userId: string, response: ListLinksResponse): void {
  const blocks: ui.Block[] = [ui.h1("Linked Accounts")];

  blocks.push(
    ui.p(
      `Displaying ${ui.bold(response.links.length.toString())} of ${ui.bold(response.total.toString())} links for user ${ui.code(userId)}.`,
    ),
  );

  if (response.next_page) {
    blocks.push(ui.p(`Next page: ${ui.code(response.next_page.toString())}`));
  }

  for (const link of response.links) {
    blocks.push(
      ui.h2(
        link.account
          ? `${link.account.label} (${ui.code(link.account_id)})`
          : `${link.source} account (${ui.code(link.account_id)})`,
      ),
    );
    blocks.push(
      ui.dl(
        link.account
          ? accountDetailItems(link.account)
          : [ui.dli("Source", link.source)],
        { termWidth: 13 },
      ),
    );
  }

  renderRichText(blocks);
}

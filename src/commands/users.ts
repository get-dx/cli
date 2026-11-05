import { Command } from "commander";

import { linkableAccountsCommand } from "./users/linkableAccounts.js";
import { linksCommand } from "./users/links.js";
import { updateCommand } from "./users/update.js";

export function usersCommand(): Command {
  const users = new Command().name("users").description("Manage DX users");

  users.addCommand(linkableAccountsCommand());
  users.addCommand(linksCommand());
  users.addCommand(updateCommand());

  return users;
}

import { Runtime } from "../../types.js";
import { WorkflowParameter } from "../workflows.js";
import { input, select, confirm, search } from "@inquirer/prompts";
import { listTeams } from "../teams.js";
import { CliError, EXIT_CODES } from "../../errors.js";
import { renderRichText } from "../../renderers.js";
import * as ui from "../../ui.js";

export async function promptForParameterValue(
  runtime: Runtime,
  param: WorkflowParameter,
): Promise<unknown> {
  const message = param.description
    ? `${param.name}: ${param.description}`
    : param.name;

  switch (param.type) {
    case "STRING": {
      const rawValue = await input({
        message,
        default: param.default_value
          ? (param.default_value as string)
          : undefined,
        validate: (value) => {
          if (value === "" && !param.is_required) {
            return true;
          } else if (value === "") {
            return "Value is required";
          }
          return true;
        },
      });

      return rawValue === "" ? undefined : rawValue;
    }
    case "INTEGER": {
      const rawValue = await input({
        message,
        default: param.default_value
          ? (param.default_value as string)
          : undefined,
        validate: (value) => {
          if (value === "" && !param.is_required) {
            return true;
          } else if (value === "") {
            return "Value is required";
          }

          const num = Number(value);
          if (isNaN(num)) {
            return "Value must be a number";
          } else if (num % 1 !== 0) {
            return "Value must be an integer";
          } else {
            return true;
          }
        },
      });

      return rawValue === "" ? undefined : Number(rawValue);
    }
    case "FLOAT": {
      const rawValue = await input({
        message,
        default: param.default_value
          ? (param.default_value as string)
          : undefined,
        validate: (value) => {
          if (value === "" && !param.is_required) {
            return true;
          } else if (value === "") {
            return "Value is required";
          }

          const num = Number(value);
          if (isNaN(num)) {
            return "Value must be a number";
          } else {
            return true;
          }
        },
      });

      return rawValue === "" ? undefined : Number(rawValue);
    }
    case "BOOLEAN":
      return await confirm({
        message,
        default: false,
      });
    case "SELECT": {
      return await select({
        message,
        default: param.default_value
          ? (param.default_value as string)
          : undefined,
        choices: param.definition!.options.map((option) => ({
          name: option,
          value: option,
        })),
      });
    }
    case "USER":
      throw new CliError(
        "User-based parameters are not yet supported in the CLI",
        EXIT_CODES.ARGUMENT_ERROR,
      );
    case "TEAM": {
      renderRichText([ui.p("Fetching teams...")]);
      const teamsResponse = await listTeams(runtime);
      const teams = teamsResponse.teams;

      const teamId = await search({
        message,
        source: (term: string | undefined) =>
          teams
            .filter(
              (team) =>
                term === undefined ||
                team.name.toLowerCase().includes(term.toLowerCase()),
            )
            .map((team) => ({
              name: team.name,
              value: team.id,
            })),
      });

      // TODO: change the trigger endpoint to accept encoded IDs too
      const decodedTeamId = decodeBase64(teamId);

      return decodedTeamId;
    }
    case "EMAIL": {
      const rawValue = await input({
        message,
        default: param.default_value
          ? (param.default_value as string)
          : undefined,
        validate: (value) => {
          if (value === "" && !param.is_required) {
            return true;
          } else if (value === "") {
            return "Value is required";
          } else if (!isValidEmail(value)) {
            return "Value must be a valid email address";
          }
          return true;
        },
      });

      return rawValue === "" ? undefined : rawValue;
    }
    default:
      throw new CliError(
        `Unknown parameter type: ${param.type}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
  }
}

function decodeBase64(value: string): string {
  return Buffer.from(value, "base64").toString("utf-8");
}

function isValidEmail(value: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
}

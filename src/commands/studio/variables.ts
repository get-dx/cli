import fs from "fs";

import { Command } from "commander";
import { stringify as stringifyYaml } from "yaml";

import {
  createExampleText,
  createNoteText,
  getContext,
  wrapAction,
} from "../../commandHelpers.js";
import { CliError, EXIT_CODES, HttpError } from "../../errors.js";
import { request } from "../../http.js";
import { renderJson, renderRichText } from "../../renderers.js";
import { buildRuntime } from "../../runtime.js";
import type { Runtime } from "../../types.js";
import * as ui from "../../ui.js";
import {
  readYamlFile,
  readYamlStdin,
  parseYamlObject,
} from "../../utils/yaml.js";

const CREATE_NOTE_TEXT = [
  "Variables must have a unique 'name' field. Names for built-in variables ($service_ids, $team_ids, $tag_ids, $user_ids, $repo_ids, $start_date, $end_date) cannot be used.",
];

const UPDATE_NOTE_TEXT = [
  "Variables that are currently shared can only be un-shared if they are also not currently enabled on any reports owned by other users.",
];

const DELETE_NOTE_TEXT = [
  "Custom variables can be deleted only if they are not currently enabled on any reports. Built-in variables cannot be deleted.",
];

export function variablesCommand() {
  const variables = new Command()
    .name("variables")
    .description("Manage Data Studio variables");

  variables
    .command("create")
    .description("Create a custom Data Studio variable")
    .option(
      "--from-file <path>",
      "Read a YAML or JSON file and create a variable from its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML or JSON from stdin and create a variable from its contents",
    )
    .addHelpText("afterAll", createNoteText(CREATE_NOTE_TEXT))
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Create a studio variable from a YAML file",
          command: "dx studio variables create --from-file ./my-variable.yaml",
        },
        {
          label: "Create a studio variable from stdin",
          command:
            "cat ./my-variable.yaml | dx studio variables create --from-stdin",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const modeCount = [options.fromFile, options.fromStdin].filter(
          Boolean,
        ).length;
        if (modeCount === 0) {
          throw new CliError(
            "One of --from-file or --from-stdin is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (modeCount > 1) {
          throw new CliError(
            "--from-file and --from-stdin are mutually exclusive",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = await buildRuntime(getContext(command));
        const raw = options.fromFile
          ? readYamlFile(options.fromFile as string)
          : await readYamlStdin();
        const payload = parseYamlObject(raw) as StudioVariablePayload;
        const response = await createStudioVariable(runtime, payload);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioVariableProcessed(response.variable, "created");
        }
      }),
    );

  variables
    .command("info")
    .description("Retrieve details for an individual Data Studio variable")
    .argument("<identifier>", "Variable ID or name (e.g. $my_variable_name)")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for a studio variable",
          command: "dx studio variables info my_variable_name",
        },
        {
          label: "Fetch studio variable info as JSON",
          command: "dx --json studio variables info my_variable_name",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, _options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await getStudioVariableInfo(runtime, identifier);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioVariableInfo(response.variable);
        }
      }),
    );

  variables
    .command("init")
    .description(
      "Write a Data Studio variable YAML file, either from an existing variable or as a blank template",
    )
    .argument("<path>", "File path to write the YAML to")
    .option(
      "--from <identifier>",
      "Fetch an existing variable and use it as the template",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Write a blank studio variable template",
          command: "dx studio variables init ./my-variable.yaml",
        },
        {
          label: "Initialize from an existing studio variable",
          command:
            "dx studio variables init ./my-variable.yaml --from my_variable_name",
        },
        {
          label: "Create a studio variable from the template",
          command: "dx studio variables create --from-file ./my-variable.yaml",
        },
      ]),
    )
    .action(
      wrapAction(async (path, options, command) => {
        const runtime = await buildRuntime(getContext(command));

        if (options.from) {
          const identifier = options.from as string;
          let variableResponse;
          try {
            variableResponse = await getStudioVariableInfo(runtime, identifier);
          } catch (err) {
            const exitCode =
              err instanceof HttpError &&
              err.status !== undefined &&
              err.status < 500
                ? EXIT_CODES.ARGUMENT_ERROR
                : EXIT_CODES.RETRY_RECOMMENDED;
            throw new CliError(
              `Failed to fetch studio variable "${identifier}": ${err instanceof Error ? err.message : String(err)}`,
              exitCode,
            );
          }

          fs.writeFileSync(
            path,
            studioVariableToYaml(variableResponse.variable),
            "utf8",
          );
          if (runtime.context.json) {
            renderJson({ ok: true, identifier, path });
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Template from existing variable "${identifier}" written to ${ui.code(path)}.`,
              ),
              ui.p(
                `Edit the file, then run: ${ui.code(`dx studio variables create --from-file ${path}`)}`,
              ),
            ]);
          }
        } else {
          fs.writeFileSync(path, STUDIO_VARIABLE_BLANK_TEMPLATE_YAML, "utf8");
          if (runtime.context.json) {
            renderJson({ ok: true, path });
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Blank template written to ${ui.code(path)}.`,
              ),
              ui.p(
                `Edit the file, then run: ${ui.code(`dx studio variables create --from-file ${path}`)}`,
              ),
            ]);
          }
        }
      }),
    );

  variables
    .command("list")
    .description("List available Data Studio variables")
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List studio variables",
          command: "dx studio variables list",
        },
        {
          label: "List studio variables as JSON",
          command: "dx --json studio variables list",
        },
      ]),
    )
    .action(
      wrapAction(async (_options, command) => {
        const runtime = await buildRuntime(getContext(command));
        const response = await listStudioVariables(runtime);

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioVariablesList(response);
        }
      }),
    );

  variables
    .command("update")
    .description(
      "Update a Data Studio variable from a YAML file or stdin. The `init` command can be used to initialize the variable file.",
    )
    .argument("<identifier>", "Variable ID or name (e.g. $my_variable_name)")
    .option(
      "--from-file <path>",
      "Read a YAML file and update the variable with its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML from stdin and update the variable with its contents",
    )
    .addHelpText("afterAll", createNoteText(UPDATE_NOTE_TEXT))
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Initialize a file first",
          command:
            "dx studio variables init ./my-variable.yaml --from my_variable_name",
        },
        {
          label: "Update a studio variable from a YAML file",
          command:
            "dx studio variables update my_variable_name --from-file ./my-variable.yaml",
        },
        {
          label: "Update a studio variable from stdin",
          command:
            "cat ./my-variable.yaml | dx studio variables update my_variable_name --from-stdin",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, options, command) => {
        const modeCount = [options.fromFile, options.fromStdin].filter(
          Boolean,
        ).length;
        if (modeCount === 0) {
          throw new CliError(
            "One of --from-file or --from-stdin is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (modeCount > 1) {
          throw new CliError(
            "--from-file and --from-stdin are mutually exclusive",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = await buildRuntime(getContext(command));
        const raw = options.fromFile
          ? readYamlFile(options.fromFile as string)
          : await readYamlStdin();
        const payload = parseYamlObject(raw) as StudioVariablePayload;
        const response = await updateStudioVariable(
          runtime,
          identifier,
          payload,
        );

        if (runtime.context.json) {
          renderJson(response);
        } else {
          renderStudioVariableProcessed(response.variable, "updated");
        }
      }),
    );

  variables
    .command("delete")
    .description("Delete a Data Studio variable.")
    .argument("<identifier>", "Variable ID or name (e.g. $my_variable_name)")
    .addHelpText("afterAll", createNoteText(DELETE_NOTE_TEXT))
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Delete an unused custom studio variable",
          command: "dx studio variables delete my_variable_name",
        },
      ]),
    )
    .action(
      wrapAction(async (identifier, _options, command) => {
        const runtime = await buildRuntime(getContext(command));

        await deleteStudioVariable(runtime, identifier);

        if (runtime.context.json) {
          renderJson({ ok: true });
        } else {
          renderStudioReportDeleted(identifier);
        }
      }),
    );

  return variables;
}

type BuiltInStudioVariableListItem = {
  name: string;
  label: string;
};

type CustomStudioVariableListItem = {
  id: string;
  name: string;
  label: string;
  creator_name: string | null;
  creator_email: string | null;
};

type StudioVariableInfo = {
  id: string;
  name: string;
  label: string;
  custom: boolean;
  variable_type: "select" | "text";
  single_select: boolean | null;
  source_sql: string | null;
  quote_values: boolean;
  public: boolean;
  creator_id: string | null;
  creator_name: string | null;
  creator_email: string | null;
  can_be_modified: boolean;
  can_be_deleted: boolean;
  can_be_made_private: boolean;
};

type StudioVariablePayload =
  | StudioSelectVariablePayload
  | StudioTextVariablePayload;

type StudioVariableBasePayload = {
  name: string;
  label: string;
  quote_values?: boolean;
  public?: boolean;
};

type StudioSelectVariablePayload = StudioVariableBasePayload & {
  variable_type: "select";
  source_sql: string;
  single_select: boolean;
};

type StudioTextVariablePayload = StudioVariableBasePayload & {
  variable_type: "text";
};

type ListStudioVariablesResponse = {
  ok: true;
  variables: {
    built_in: BuiltInStudioVariableListItem[];
    custom: CustomStudioVariableListItem[];
  };
};

type GetStudioVariableInfoResponse = {
  ok: true;
  variable: StudioVariableInfo;
};

type ProcessedStudioVariableResponse = {
  ok: true;
  variable: StudioVariableInfo;
};

async function createStudioVariable(
  runtime: Runtime,
  payload: StudioVariablePayload,
): Promise<ProcessedStudioVariableResponse> {
  const response = await request<ProcessedStudioVariableResponse>(
    runtime,
    "/studio.variables.create",
    {
      method: "POST",
      body: payload,
    },
  );

  return response.body;
}

async function updateStudioVariable(
  runtime: Runtime,
  identifier: string,
  payload: StudioVariablePayload,
): Promise<ProcessedStudioVariableResponse> {
  const response = await request<ProcessedStudioVariableResponse>(
    runtime,
    "/studio.variables.update",
    {
      method: "POST",
      body: { ...payload, identifier },
    },
  );

  return response.body;
}

async function deleteStudioVariable(
  runtime: Runtime,
  identifier: string,
): Promise<boolean> {
  await request(runtime, "/studio.variables.delete", {
    method: "POST",
    body: { identifier },
  });

  return true;
}

async function getStudioVariableInfo(
  runtime: Runtime,
  identifier: string,
): Promise<GetStudioVariableInfoResponse> {
  const response = await request<GetStudioVariableInfoResponse>(
    runtime,
    "/studio.variables.info",
    {
      method: "GET",
      query: { identifier },
    },
  );

  return response.body;
}

async function listStudioVariables(
  runtime: Runtime,
): Promise<ListStudioVariablesResponse> {
  const response = await request<ListStudioVariablesResponse>(
    runtime,
    "/studio.variables.list",
    {
      method: "GET",
    },
  );

  return response.body;
}

function renderStudioVariableProcessed(
  variable: StudioVariableInfo,
  verb: string,
): void {
  renderRichText([
    ui.p(`${ui.success(ui.GLYPHS.CHECK)} Studio variable ${verb}`),
    studioVariableInfoBlocks(variable),
  ]);
}

function renderStudioVariableInfo(variable: StudioVariableInfo): void {
  renderRichText([
    ui.h1("Studio Variable Info"),
    ...studioVariableInfoBlocks(variable),
  ]);
}

function studioVariableInfoBlocks(variable: StudioVariableInfo): ui.Block[] {
  return [
    ui.h2(`${variable.label} (${ui.code(`$${variable.name}`)})`),
    ui.dl(
      [
        ui.dli("ID", ui.code(variable.id)),
        ui.dli("Custom", variable.custom ? "Yes" : "No"),
        ...(variable.custom
          ? [
              ui.dli(
                "Creator",
                formatCreator(variable.creator_name, variable.creator_email),
              ),
            ]
          : []),
        ui.dli("Type", formatType(variable.variable_type)),
        ...(variable.variable_type === "select"
          ? [
              ui.dli(
                "Selection",
                variable.single_select ? "Single-select" : "Multi-select",
              ),
              ui.dli("SQL", formatSql(variable.source_sql)),
            ]
          : []),
        ui.dli("Shared", variable.public ? "Yes" : "No"),
        ui.dli(
          "Values in SQL",
          variable.quote_values
            ? "Adds quotes around values"
            : "Inserts values directly",
        ),
        ui.dli("Can modify?", variable.can_be_modified ? "Yes" : "No"),
        ui.dli("Can delete?", variable.can_be_deleted ? "Yes" : "No"),
        ...(variable.public
          ? [
              ui.dli(
                "Can un-share?",
                variable.can_be_made_private ? "Yes" : "No",
              ),
            ]
          : []),
      ],
      { termWidth: 15 },
    ),
  ];
}

function renderStudioVariablesList(
  response: ListStudioVariablesResponse,
): void {
  const blocks: ui.Block[] = [ui.h1("Studio Variables")];

  blocks.push(
    ui.p(
      `Displaying ${ui.bold((response.variables.built_in.length + response.variables.custom.length).toString())} variables.`,
    ),
  );

  blocks.push(ui.h2("Built-in Variables"));

  if (response.variables.built_in.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
  } else {
    blocks.push(
      ui.dl(
        response.variables.built_in.map((variable) => {
          return ui.dli(variable.label, ui.code(`$${variable.name}`));
        }),
        { termWidth: 13 },
      ),
    );
  }

  blocks.push(ui.h2("Custom Variables"));

  if (response.variables.custom.length === 0) {
    blocks.push(ui.p(ui.dim("(None)")));
  }

  for (const variable of response.variables.custom) {
    blocks.push(
      ui.h3(`${variable.label} (${ui.code(`$${variable.name}`)})`),
      ui.dl(
        [
          ui.dli("ID", variable.id),
          ui.dli(
            "Creator",
            formatCreator(variable.creator_name, variable.creator_email),
          ),
        ],
        { termWidth: 9 },
      ),
    );
  }

  renderRichText(blocks);
}

function renderStudioReportDeleted(identifier: string): void {
  renderRichText([
    ui.p(
      `${ui.success(ui.GLYPHS.CHECK)} Studio variable "${identifier}" deleted`,
    ),
  ]);
}

const STUDIO_VARIABLE_BLANK_TEMPLATE_YAML = fs.readFileSync(
  new URL("./variable-blank-template.yaml", import.meta.url),
  "utf8",
);

function studioVariableToYaml(variable: StudioVariableInfo): string {
  if (variable.variable_type === "select") {
    const payload: StudioSelectVariablePayload = {
      name: variable.name,
      label: variable.label,
      variable_type: "select",
      single_select:
        variable.single_select === null ? false : variable.single_select,
      source_sql: variable.source_sql ?? "",
      quote_values: variable.quote_values,
      public: variable.public,
    };

    return stringifyYaml(payload, { blockQuote: "literal" });
  } else if (variable.variable_type === "text") {
    const payload: StudioTextVariablePayload = {
      name: variable.name,
      label: variable.label,
      variable_type: "text",
      quote_values: variable.quote_values,
      public: variable.public,
    };

    return stringifyYaml(payload, { blockQuote: "literal" });
  } else {
    throw new CliError(
      `Unknown variable type "${variable.variable_type}"`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
}

function formatCreator(
  creatorName: string | null,
  creatorEmail: string | null,
): string {
  if (!creatorName) return ui.dim("(None)");
  return `${creatorName} (${creatorEmail})`;
}

function formatType(variableType: string): string {
  if (variableType === "select") {
    return `Dropdown menu (${ui.code("select")})`;
  } else if (variableType === "text") {
    return `Text field (${ui.code("text")})`;
  }

  return "Unknown"; // shouldn't happen but /shrug
}

function formatSql(sql: string | null): string {
  if (!sql) return "";

  // truncate for display purposes
  const maxLength = 40;

  if (sql.length <= maxLength) {
    return `"${sql}"`;
  } else {
    return `"${sql.slice(0, maxLength)}..."`;
  }
}

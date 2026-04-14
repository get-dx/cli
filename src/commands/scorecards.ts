import fs from "fs";

import { Command } from "commander";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import {
  createExampleText,
  getContext,
  parsePositiveIntOption,
  wrapAction,
} from "../commandHelpers.js";
import { CliError, EXIT_CODES } from "../errors.js";
import { request } from "../http.js";
import { renderJson, renderRichText } from "../renderers.js";
import { buildRuntime } from "../runtime.js";
import type { Runtime } from "../types.js";
import * as ui from "../ui.js";
import { renderScorecard, renderScorecardList } from "./scorecardsRendering.js";

export function scorecardsCommand() {
  const scorecards = new Command()
    .name("scorecards")
    .description("Manage scorecards");

  scorecards
    .command("info")
    .description(
      "Retrieve details about a specific scorecard, including its defined levels and checks",
    )
    .argument("<id>", "The unique ID of the scorecard")
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, owners, checks",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Fetch info for a scorecard",
          command: "dx scorecards info qjfj1a6cmit4",
        },
        {
          label: "Fetch scorecard info and return as JSON",
          command: "dx scorecards info qjfj1a6cmit4 --json",
        },
        {
          label: "Fetch only the core fields and checks",
          command: "dx scorecards info qjfj1a6cmit4 --include core,checks",
        },
      ]),
    )
    .action(
      wrapAction(async (id, options, command) => {
        const includeSections = parseScorecardIncludeSections(options.include);

        const runtime = buildRuntime(getContext(command));
        const response = await getScorecard(runtime, id);

        if (runtime.context.json) {
          const processedScorecard = processScorecardIncludes(
            response.scorecard,
            includeSections,
          );
          renderJson({ ok: true, scorecard: processedScorecard });
        } else {
          renderScorecard(response.scorecard, includeSections);
        }
      }),
    );

  scorecards
    .command("list")
    .description("List scorecards")
    .option("--cursor <cursor>", "Cursor for the next page of results")
    .option("--limit <n>", "Max scorecards per page (default is 50)", (value) =>
      parsePositiveIntOption(value, "--limit"),
    )
    .option(
      "--include-unpublished",
      "Include draft scorecards in addition to published ones",
    )
    .option(
      "--include <include>",
      "Show only these comma-separated sections: core, owners, checks",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "List all published scorecards",
          command: "dx scorecards list",
        },
        {
          label: "List scorecards including drafts",
          command: "dx scorecards list --include-unpublished",
        },
        {
          label: "List with a limit and return JSON",
          command: "dx scorecards list --limit 10 --json",
        },
        {
          label: "Fetch the next page using a cursor from the prior response",
          command: "dx scorecards list --cursor xuvkgfq9t0ty",
        },
        {
          label: "List scorecards showing only core fields",
          command: "dx scorecards list --include core",
        },
      ]),
    )
    .action(
      wrapAction(async (options, command) => {
        const includeSections = parseScorecardIncludeSections(options.include);

        const runtime = buildRuntime(getContext(command));
        const response = await listScorecards(runtime, {
          cursor: options.cursor,
          limit: options.limit,
          include_unpublished: options.includeUnpublished,
        });

        if (runtime.context.json) {
          const processedScorecards = response.scorecards.map((sc) =>
            processScorecardIncludes(sc, includeSections),
          );
          renderJson({ ...response, scorecards: processedScorecards });
        } else {
          renderScorecardList(
            response.scorecards,
            response.response_metadata?.next_cursor ?? null,
            includeSections,
          );
        }
      }),
    );

  scorecards
    .command("update")
    .description("Update an existing scorecard from a YAML file or stdin")
    .argument("<id>", "The unique ID of the scorecard")
    .option(
      "--init-file <path>",
      "Fetch the scorecard's current state and write it as YAML to this path",
    )
    .option(
      "--from-file <path>",
      "Read a YAML file and update the scorecard with its contents",
    )
    .option(
      "--from-stdin",
      "Read YAML from stdin and update the scorecard with its contents",
    )
    .addHelpText(
      "afterAll",
      createExampleText([
        {
          label: "Initialize a YAML file from the scorecard's current state",
          command:
            "dx scorecards update qjfj1a6cmit4 --init-file ./my-scorecard.yaml",
        },
        {
          label: "Update a scorecard from a YAML file",
          command:
            "dx scorecards update qjfj1a6cmit4 --from-file ./my-scorecard.yaml",
        },
        {
          label: "Update a scorecard from stdin",
          command:
            "cat ./my-scorecard.yaml | dx scorecards update qjfj1a6cmit4 --from-stdin",
        },
      ]),
    )
    .action(
      wrapAction(async (id, options, command) => {
        const modeCount = [
          options.initFile,
          options.fromFile,
          options.fromStdin,
        ].filter(Boolean).length;
        if (modeCount === 0) {
          throw new CliError(
            "One of --init-file, --from-file, or --from-stdin is required",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }
        if (modeCount > 1) {
          throw new CliError(
            "--init-file, --from-file, and --from-stdin are mutually exclusive",
            EXIT_CODES.ARGUMENT_ERROR,
          );
        }

        const runtime = buildRuntime(getContext(command));

        if (options.initFile) {
          const { scorecard } = await getScorecard(runtime, id);
          const yaml = scorecardToYaml(scorecard);
          fs.writeFileSync(options.initFile as string, yaml, "utf8");
          if (runtime.context.json) {
            renderJson({ ok: true, path: options.initFile as string });
          } else {
            renderRichText([
              ui.p(
                `${ui.success(ui.GLYPHS.CHECK)} Scorecard written to ${ui.code(options.initFile as string)}.`,
              ),
              ui.p(
                `Edit the file, then run: ${ui.code(`dx scorecards update ${id} --from-file ${options.initFile as string}`)}`,
              ),
            ]);
          }
          return;
        }

        let raw: unknown;
        if (options.fromFile) {
          raw = readYamlFile(options.fromFile as string);
        } else {
          raw = await readYamlStdin();
        }

        const payload = buildUpdatePayload(id, raw);
        const response = await updateScorecard(runtime, payload);

        if (runtime.context.json) {
          renderJson({ ok: true, scorecard: response.scorecard });
        } else {
          renderScorecard(
            response.scorecard,
            null,
            `${ui.success(ui.GLYPHS.CHECK)} Scorecard updated`,
          );
        }
      }),
    );

  return scorecards;
}

// --- Types ---

export type Scorecard = {
  id: string;
  name: string;
  description: string;
  type: "LEVEL" | "POINTS";
  published: boolean;
  entity_filter_type: string;
  entity_filter_sql: string | null;
  entity_filter_type_ids: string[];
  tags: ScorecardTag[];
  editors: ScorecardUser[];
  admins: ScorecardUser[];
  sql_errors: unknown[];
  max_entity_points?: number;
  evaluation_frequency_hours?: number;
  checks: ScorecardCheckDefinition[];
  // LEVEL-type scorecard fields
  levels?: ScorecardLevel[];
  empty_level_label?: string;
  empty_level_color?: string;
  // POINTS-type scorecard fields
  check_groups?: ScorecardCheckGroup[];
};

export type ScorecardLevel = {
  id: string;
  name: string;
  color: string;
  rank?: number;
};

export type ScorecardTag = {
  value: string;
  color: string;
};

export type ScorecardUser = {
  id: number;
  email: string;
  name: string;
  avatar: string;
  created_at: string;
};

export type ScorecardCheckGroup = {
  id: string;
  name: string;
  ordering: number;
};

export type ScorecardCheckDefinition = {
  id: string;
  ordering: number;
  name: string;
  description: string;
  sql: string;
  filter_sql: string | null;
  filter_message: string | null;
  output_enabled: boolean;
  output_type: string | null;
  output_custom_options: Record<string, unknown> | null;
  output_aggregation: string | null;
  external_url: string | null;
  estimated_dev_days: number | null;
  published: boolean;
  // LEVEL-type scorecards
  level?: { id: string; name: string };
  // POINTS-type scorecards
  points?: number;
  check_group?: { id: string; name: string };
};

export type UpdateScorecardPayload = {
  id: string;
  name?: string;
  description?: string;
  type?: "LEVEL" | "POINTS";
  published?: boolean;
  entity_filter_type?: string;
  entity_filter_sql?: string | null;
  entity_filter_type_ids?: string[];
  tags?: ScorecardTag[];
  editors?: ScorecardUser[];
  admins?: ScorecardUser[];
  checks?: ScorecardCheckDefinitionPayload[];
  // LEVEL-type scorecard fields
  levels?: ScorecardLevelPayload[];
  empty_level_label?: string;
  empty_level_color?: string;
  // POINTS-type scorecard fields
  check_groups?: ScorecardCheckGroupPayload[];
};

type ScorecardLevelPayload = ScorecardLevel & {
  key: string;
};

type ScorecardCheckGroupPayload = ScorecardCheckGroup & {
  key: string;
};

type ScorecardCheckDefinitionPayload = Omit<
  ScorecardCheckDefinition,
  "type" | "check_group"
> & {
  scorecard_level_key?: string;
  scorecard_check_group_key?: string;
};

// --- API ---

type GetScorecardResponse = {
  ok: true;
  scorecard: Scorecard;
};

type UpdateScorecardResponse = {
  ok: true;
  scorecard: Scorecard;
};

function requestOptions(runtime: Runtime) {
  return {
    token: runtime.token,
    agent: runtime.context.agent,
    agentSessionId: runtime.context.agentSessionId,
    userAgent: `dx-cli/${runtime.version}`,
  };
}

export async function getScorecard(
  runtime: Runtime,
  id: string,
): Promise<GetScorecardResponse> {
  const response = await request(runtime.baseUrl, "/scorecards.info", {
    ...requestOptions(runtime),
    method: "GET",
    query: { id },
  });

  return response as GetScorecardResponse;
}

type ListScorecardsParams = {
  cursor?: string;
  limit?: number;
  include_unpublished?: boolean;
};

type ListScorecardsResponse = {
  ok: true;
  scorecards: Scorecard[];
  response_metadata?: { next_cursor?: string | null };
};

export async function listScorecards(
  runtime: Runtime,
  params: ListScorecardsParams,
): Promise<ListScorecardsResponse> {
  const query: Record<string, string | number | boolean | undefined> = {};
  if (params.cursor !== undefined) query.cursor = params.cursor;
  if (params.limit !== undefined) query.limit = params.limit;
  if (params.include_unpublished) query.include_unpublished = true;

  const response = await request(runtime.baseUrl, "/scorecards.list", {
    ...requestOptions(runtime),
    method: "GET",
    query,
  });

  return response as ListScorecardsResponse;
}

export async function updateScorecard(
  runtime: Runtime,
  payload: UpdateScorecardPayload,
): Promise<UpdateScorecardResponse> {
  const response = await request(runtime.baseUrl, "/scorecards.update", {
    ...requestOptions(runtime),
    method: "POST",
    body: payload,
  });

  return response as unknown as UpdateScorecardResponse;
}

// --- YAML helpers ---

/**
 * These keys are ignored when initializing a file to update
 */
const SCORECARD_IGNORED_KEYS: ReadonlyArray<keyof Scorecard> = [
  // Deprecated fields
  "evaluation_frequency_hours",
  "entity_filter_type_ids",
  // Reporting on state
  "sql_errors",
  "max_entity_points",
];

const SCORECARD_TRANSFORM_KEYS: Partial<
  Record<keyof Scorecard, (value: unknown) => unknown>
> = {
  admins: (value) => (value as ScorecardUser[]).map((admin) => admin.id),
  editors: (value) => (value as ScorecardUser[]).map((editor) => editor.id),
  tags: (value) =>
    (value as ScorecardTag[]).map((tag) => ({ value: tag.value })),
  levels: (value) => {
    if (!Array.isArray(value)) {
      return value;
    } else {
      return value.map((level) => {
        return {
          ...level,
          key: toSnakeCase(level.name),
        };
      });
    }
  },
  check_groups: (value) => {
    if (!Array.isArray(value)) {
      return value;
    } else {
      return value.map((checkGroup) => {
        return {
          ...checkGroup,
          key: toSnakeCase(checkGroup.name),
        };
      });
    }
  },
  checks: (value) => {
    return (value as ScorecardCheckDefinition[]).map((check) => {
      const { level, check_group, ...rest } = check;
      const payload: ScorecardCheckDefinitionPayload = rest;
      if (level) {
        payload.scorecard_level_key = toSnakeCase(level.name);
      } else if (check_group) {
        payload.scorecard_check_group_key = toSnakeCase(check_group.name);
      }
      return payload;
    });
  },
};

function scorecardToYaml(scorecard: Scorecard): string {
  const obj: Partial<Scorecard> = { ...scorecard };
  for (const key of SCORECARD_IGNORED_KEYS) {
    delete obj[key];
  }
  const objLoose = obj as Record<string, unknown>;
  for (const key of Object.keys(SCORECARD_TRANSFORM_KEYS)) {
    const transformFn = SCORECARD_TRANSFORM_KEYS[key as keyof Scorecard];
    if (transformFn) {
      objLoose[key] = transformFn(objLoose[key]);
    }
  }
  return stringifyYaml(obj, { blockQuote: "literal" });
}

function readYamlFile(filePath: string): unknown {
  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf8");
  } catch (err) {
    throw new CliError(
      `Could not read file "${filePath}": ${(err as Error).message}`,
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return parseYaml(content);
}

async function readYamlStdin(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => {
      const content = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(parseYaml(content));
      } catch (err) {
        reject(
          new CliError(
            `Failed to parse YAML from stdin: ${(err as Error).message}`,
            EXIT_CODES.ARGUMENT_ERROR,
          ),
        );
      }
    });
    process.stdin.on("error", (err) => {
      reject(
        new CliError(
          `Failed to read from stdin: ${err.message}`,
          EXIT_CODES.ARGUMENT_ERROR,
        ),
      );
    });
  });
}

function buildUpdatePayload(id: string, raw: unknown): UpdateScorecardPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new CliError(
      "YAML content must be an object",
      EXIT_CODES.ARGUMENT_ERROR,
    );
  }
  return { ...(raw as Record<string, unknown>), id };
}

function toSnakeCase(str: string): string {
  return (
    str
      // First, handle camelCase/PascalCase transitions
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      // Then convert to lowercase
      .toLowerCase()
      // Replace sequences of non-alphanumeric characters with single underscore
      .replace(/[^a-z0-9]+/g, "_")
      // Remove leading and trailing underscores
      .replace(/^_+|_+$/g, "")
  );
}

// --- Include helpers ---

const SCORECARD_INCLUDE_SECTIONS = ["core", "owners", "checks"] as const;

export type ScorecardIncludeSection =
  (typeof SCORECARD_INCLUDE_SECTIONS)[number];

const SCORECARD_SECTION_KEYS: Record<
  ScorecardIncludeSection,
  readonly (keyof Scorecard)[]
> = {
  core: [
    "id",
    "name",
    "description",
    "type",
    "published",
    "entity_filter_type",
    "entity_filter_sql",
    "entity_filter_type_ids",
    "tags",
    "sql_errors",
    "levels",
    "empty_level_label",
    "empty_level_color",
    "check_groups",
  ],
  owners: ["admins", "editors"],
  checks: ["checks"],
};

function assignScorecardKey<K extends keyof Scorecard>(
  out: Partial<Scorecard>,
  src: Scorecard,
  key: K,
): void {
  out[key] = src[key];
}

function processScorecardIncludes(
  scorecard: Scorecard,
  includeSections: ScorecardIncludeSection[] | null,
): Partial<Scorecard> {
  if (includeSections === null) {
    return scorecard;
  }

  const out: Partial<Scorecard> = {};
  for (const section of includeSections) {
    for (const key of SCORECARD_SECTION_KEYS[section]) {
      if (key in scorecard) {
        assignScorecardKey(out, scorecard, key);
      }
    }
  }
  return out;
}

function parseScorecardIncludeSections(
  include?: string,
): ScorecardIncludeSection[] | null {
  if (!include) {
    return null;
  }

  const results = include.split(",");
  for (const result of results) {
    if (
      !SCORECARD_INCLUDE_SECTIONS.includes(result as ScorecardIncludeSection)
    ) {
      throw new CliError(
        `Invalid --include "${result}". Expected one of: ${SCORECARD_INCLUDE_SECTIONS.join(", ")}`,
        EXIT_CODES.ARGUMENT_ERROR,
      );
    }
  }
  return results as ScorecardIncludeSection[];
}

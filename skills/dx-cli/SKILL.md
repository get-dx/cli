---
name: dx-cli
description: Interact with the DX (getdx.com) APIs to manage the Software Catalog and Scorecards, analyze Snapshot survey results and engineering productivity, and query Data Studio. Also answers DX product questions from DX documentation and Data Cloud schema questions about table relationships, joins, identities, unified tables, and source predicates.
user-invocable: false
compatibility: Requires access to the internet
allowed-tools: Bash(dx:*)
---

# DX CLI

Use the `dx` CLI to manage your organization's Software Catalog, Scorecards, and Engineering data from the command line. All commands communicate with the DX web API and require authentication.

## Getting Help

Run `dx --help` to see all top-level commands. Run `dx <subcommand> --help` to see usage for any command:

```
dx --help
dx attributeGroups --help
dx auth --help
dx catalog --help
dx catalog entities --help
dx catalog entityTypes --help
dx scorecards --help
dx studio --help
```

All commands accept `--json` to return machine-readable JSON instead of human-readable output.

## Authentication

Before using a `dx` subcommand for the first time, verify that you are authenticated:

```
dx auth status
```

If this returns an error or shows that you are not logged in, stop and ask the user to login interactively with `dx init`, or non-interactively with `dx auth login`.

If you need information about the currently authenticated user and their team to include in a query, run:

```
dx auth whoami
```

This calls the `/auth.whoami` endpoint and displays the account name, token type, and (for personal access tokens) the user's name, email, and team with its lead and contributors. Organization tokens return `null` for `user` and `team`.

## Answering DX Product Questions

Use this for any question about DX itself rather than the user's own data: product concepts ("what's the difference between a Scorecard and an Initiative?"), setup/admin procedures ("how do I set up Okta SSO?", "how do I backfill GitHub history?"), connector configuration ("how do I connect GitHub?"), or troubleshooting/FAQ ("why doesn't DX support X?"). Do not use it for questions about the user's own data (their entities, checks, scores, tasks) — use the `dx` CLI commands in this skill for those instead.

1. Fetch `https://docs.getdx.com/llms.txt` for the index of documentation pages and their Markdown URLs.
2. Fetch the relevant page's `.md` URL directly, not the HTML page, e.g. `https://docs.getdx.com/onboarding/github-backfill.md`.
3. Answer from the fetched Markdown, not from memory. If the page contains a numbered or sequential procedure, follow those steps in the given order — don't skip ahead, reorder, or paraphrase a step away, whether you're relaying them to the user or executing them yourself.

## Answering Data Cloud Schema Questions

Use this for questions about Data Cloud tables, relationships, SQL joins, identity attribution, unified tables, source predicates, and API endpoint tables. Static schema guidance comes from the public DX software CDN and does not require DX authentication or the `datacloud:query` scope.

The mutable manifest URL is:

`https://software.getdx.net/datacloud/schema/v1/latest.json`

For each question:

1. Fetch `latest.json` first. Read its `base_url` and `entrypoint`, then use that immutable `base_url` for every other reference fetched for the question. Do not switch versions midway through an answer.
2. Fetch the manifest's entrypoint at `base_url + entrypoint`.
3. Follow the entrypoint's routing instructions. Fetch only the relevant source reference and any cross-cutting references needed for the question; one or two source files should be sufficient for most questions. Do not fetch every source file.
4. Construct every reference URL relative to `base_url`. For example, fetch the GitHub reference from `base_url + "references/github.md"`.
5. Answer only from the fetched references. Do not answer joins from memory or infer joins from column names.

If the manifest or a required reference cannot be fetched, say that verified schema guidance is unavailable. Do not invent a join or silently fall back to GitHub raw URLs. If a table is missing from the published references, describe it as absent from the published snapshot, not as proof that the table does not exist.

When the question is broad or depends on which tables contain data in the user's account, check `dx auth status --json`. Only if the available token has the `datacloud:query` scope, narrow the guidance with:

```bash
dx studio query "SELECT relname, n_live_tup FROM pg_stat_user_tables"
```

Use that result to distinguish available, populated tables from published schema possibilities. If the scope is unavailable, do not run the live check; continue with the static CDN guidance and note that it was not narrowed to the account. Do not ask the user to authenticate merely to access the static guidance.

Always preserve these caveats when relevant:

- Unified tables such as `issues`, `pull_requests`, `pull_request_reviews`, and `repos` require the documented `source` predicate when joining through polymorphic `source_table_id` values. Fetch `references/source-predicate.md` and use its literal; never guess it from the vendor name.
- For identity attribution, fetch `references/identities.md` and check whether the activity table has its own `dx_user_id` before using `identities`. A direct `dx_user_id` join can be the correct route; adding `identities` can drop or multiply rows. Never infer the identity route or `identities.source` literal from table names.

## Glossary

### Software Catalog terms

**Entity** — A record in the Software Catalog representing a service, team, library, or any other thing tracked by your organization. Each entity has an `identifier` (a unique slug), a `type`, optional `name`, `description`, `owner_teams`, `owner_users`, and a map of typed `properties`.

**Entity Type** — The schema for a category of entities (e.g. `service`, `library`). An entity type defines which `properties` and `aliases` entities of that type carry.

**Property** — A typed field defined on an entity type. Properties have identifiers and types such as `text`, `number`, `boolean`, `select`, `multi_select`, `url`, `date`, `user`, `list`, `json`, and others. When setting properties with `--property`, use `key=value` syntax; for `multi_select` and `list` types, values are comma-separated.

**Alias** — An alternative identifier that maps external system references (e.g. a GitHub repo slug) to an entity.

### Scorecards terms

**Scorecard** — A health-tracking framework that evaluates entities against a set of checks. Scorecards are either `LEVEL`-based (entities are ranked across named levels like Bronze/Silver/Gold) or `POINTS`-based (entities accumulate points from checks). To see how a specific entity is currently performing across all scorecards, use `dx catalog entities scorecards <identifier>`.

**Check** — A single SQL-based rule inside a scorecard. The SQL query returns a `status` column (`PASS`, `WARN`, or `FAIL`) for each entity.

**Initiative** — A time-boxed project that groups failing scorecard checks into actionable tasks for teams. Tasks for a given entity can be fetched with `dx catalog entities tasks <identifier>`.

**Exemption** — A time-bound approved pass on a failing check for a specific entity. A check result with a non-null `exemption_expires_at` is exempted: it may still be failing, but is not counted against the entity until the exemption expires.

### Snapshot terms

**Attribute group** — A user attribute used to segment snapshot reporting, such as location, tenure band, or coding activity level. Groups are either DX managed (maintained by DX, such as tenure band and coding activity level), admin managed (imported from the users CSV), or self-reported (custom questions answered during a snapshot). Use `dx attributeGroups list` to retrieve attribute group IDs and the attribute value IDs nested inside them. `position` is display order only, and most attribute groups have none; attribute groups and values without a position sort last. Hidden and privileged attribute groups are flagged in the output.

**Attribute value** — A selectable value within an attribute group, such as "5+ years" within tenure band. Attribute value IDs feed the `attribute_ids` filter when querying snapshot scores by attribute.

### Data Studio terms

**Report** — A saved collection of tiles (see `dx studio reports`), organized on a dedicated page for dashboards and sharing.

**Tile** — A single saved query and chart configuration within a report. Each tile's SQL can reference report variables.

**Variable** — A named, `$`-prefixed placeholder (e.g. `$team_ids`) that a report's tile SQL can reference for interactive filtering. **Built-in variables** (`$service_ids`, `$team_ids`, `$tag_ids`, `$user_ids`, `$repo_ids`, `$start_date`, `$end_date`) are provided out of the box and just need to be toggled on. **Custom variables** are account-defined dropdown filters backed by a SQL query that returns `value` and `label` columns. Variables cannot be managed through the CLI/API — enabling/disabling built-ins and adding/updating/deleting custom variables must be done in the Data Studio UI — but once enabled on a report, any tile's SQL (including tiles set via `dx studio reports create`/`update`) can reference them.

## Reference Docs

- [Catalog management](./references/catalog-management.md) — Entities and entity types: listing, inspecting, creating, updating, and deleting.
- [Report creation](./references/report-creation.md) — Studio reports: initializing YAML, creating reports, and updating existing reports.
- [Scorecards management](./references/scorecards-management.md) — Scorecards and checks: listing, inspecting, creating, updating, and deleting via YAML.
- [Failing checks](./references/failing-checks.md) — Review and resolve an entity's failing scorecard checks: triage, diagnosis, fixes, and re-evaluation.
- [Snapshot analysis](./references/snapshot-analysis.md) — Analyze snapshot scores, teams, workflow scores, driver comments, and CSAT comments.

## Snapshot teams

Use `dx snapshots snapshotTeams list --id <snapshot_id>` to list the teams captured in a snapshot.

- `id` is the Snapshot Team ID. It is only valid within that snapshot and is what DX score endpoints expect in the `snapshot_team_ids` filter.
- `team_id` is the stable DX team ID. It can be used with `dx teams info --team-id <team_id>` to inspect the current DX team record.
- Use `--json` to return the raw API response unchanged.

## Snapshot workflow scores

Use `dx snapshots workflowScores list --id <snapshot_id>` to list workflow scores (e.g. build time, review wait time) with benchmarks and response distributions.

- Filter with comma-separated `--team-ids`, `--snapshot-team-ids`, `--group-ids`, `--branch-ids`, and `--attribute-ids`.
- Workflows with `hidden: true` are below the reporting threshold; their `score` is `null`.
- The printed web link carries the same filters, except where the web app can't represent them (attributes, groups with snapshot teams, or multiple branches); the output notes which were omitted. Use `--json` to return the raw API response unchanged.

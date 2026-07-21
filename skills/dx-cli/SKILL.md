---
name: dx-cli
description: Interact with the DX (getdx.com) APIs to get and manage information about the Software Catalog, manage Scorecards to track system health, analyze Snapshot survey results, and perform data analysis on Engineering productivity. Also answers questions about DX itself — product concepts, setup/admin procedures (SSO, connectors, backfills), and troubleshooting — by fetching DX's own documentation.
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

### Data Studio terms

**Report** — A saved collection of tiles (see `dx studio reports`), organized on a dedicated page for dashboards and sharing.

**Tile** — A single saved query and chart configuration within a report. Each tile's SQL can reference report variables.

**Variable** — A named, `$`-prefixed placeholder (e.g. `$team_ids`) that a report's tile SQL can reference for interactive filtering. **Built-in variables** (`$service_ids`, `$team_ids`, `$tag_ids`, `$user_ids`, `$repo_ids`, `$start_date`, `$end_date`) are provided out of the box and just need to be toggled on. **Custom variables** are account-defined dropdown filters backed by a SQL query that returns `value` and `label` columns. Variables cannot be managed through the CLI/API — enabling/disabling built-ins and adding/updating/deleting custom variables must be done in the Data Studio UI — but once enabled on a report, any tile's SQL (including tiles set via `dx studio reports create`/`update`) can reference them.

## Reference Docs

- [Catalog management](./references/catalog-management.md) — Entities and entity types: listing, inspecting, creating, updating, and deleting.
- [Report creation](./references/report-creation.md) — Studio reports: initializing YAML, creating reports, and updating existing reports.
- [Scorecards management](./references/scorecards-management.md) — Scorecards and checks: listing, inspecting, creating, updating, and deleting via YAML.
- [Failing checks](./references/failing-checks.md) — Review and resolve an entity's failing scorecard checks: triage, diagnosis, fixes, and re-evaluation.
- [Snapshot analysis](./references/snapshot-analysis.md) — Analyze snapshot scores, driver comments, and CSAT comments.

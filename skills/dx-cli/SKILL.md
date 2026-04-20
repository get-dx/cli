---
name: dx-cli
description: Interact with the DX (getdx.com) APIs to get and manage information about services and other entities in the Software Catalog, manage Scorecards to track system health, and perform data analysis on Engineering productivity.
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

## Reference Docs

- [Catalog management](./references/catalog-management.md) — Entities and entity types: listing, inspecting, creating, updating, and deleting.
- [Scorecards management](./references/scorecards-management.md) — Scorecards and checks: listing, inspecting, creating, updating, and deleting via YAML.

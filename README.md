# DX CLI

AI-Native CLI for interacting with DX.

<img width="800" height="423" alt="cli-demo" src="https://github.com/user-attachments/assets/a89f7d53-2617-413e-84df-07293149e9c8" />

## Install

```bash
npm install -g @get-dx/cli
```

## Commands

Global flags available on any command: `--json`.

| Area       | Command                                                              | Description                                                                         |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Auth       | `dx auth login --token <token>`                                      | Validate an account web API token and store it for the current DX base URL.         |
| Auth       | `dx auth logout`                                                     | Remove the stored token for the current DX base URL.                                |
| Auth       | `dx auth status`                                                     | Show the current authentication status and token metadata.                          |
| Catalog    | `dx catalog entities create --type <type> --identifier <identifier>` | Create a new entity in the software catalog.                                        |
| Catalog    | `dx catalog entities delete <identifier>`                            | Delete an entity from the software catalog.                                         |
| Catalog    | `dx catalog entities info <identifier>`                              | Show entity details, with optional section filtering via `--include`.               |
| Catalog    | `dx catalog entities list`                                           | List catalog entities with pagination, filtering, and search options.               |
| Catalog    | `dx catalog entities scorecards <identifier>`                        | Get the current scorecard report for an entity.                                     |
| Catalog    | `dx catalog entities tasks <identifier>`                             | Get outstanding initiative tasks for an entity.                                     |
| Catalog    | `dx catalog entities update <identifier>`                            | Update an existing entity in the software catalog.                                  |
| Catalog    | `dx catalog entities upsert --type <type> --identifier <identifier>` | Create an entity if it does not exist, or update it if it does.                     |
| Catalog    | `dx catalog entityTypes create`                                      | Create an entity type from YAML provided by `--from-file <path>` or `--from-stdin`. |
| Catalog    | `dx catalog entityTypes delete <identifier>`                         | Delete an entity type from the software catalog.                                    |
| Catalog    | `dx catalog entityTypes info <identifier>`                           | Show entity type details, with optional section filtering via `--include`.          |
| Catalog    | `dx catalog entityTypes init <path>`                                 | Write a blank entity type YAML template or seed one from an existing entity type.   |
| Catalog    | `dx catalog entityTypes list`                                        | List catalog entity types with pagination support.                                  |
| Catalog    | `dx catalog entityTypes update <identifier>`                         | Update an entity type from YAML provided by `--from-file <path>` or `--from-stdin`. |
| Scorecards | `dx scorecards create`                                               | Create a scorecard from YAML provided by `--from-file <path>` or `--from-stdin`.    |
| Scorecards | `dx scorecards delete <id>`                                          | Delete a scorecard.                                                                 |
| Scorecards | `dx scorecards info <id>`                                            | Show scorecard details, including levels and checks.                                |
| Scorecards | `dx scorecards init <path>`                                          | Write a blank scorecard YAML template or seed one from an existing scorecard.       |
| Scorecards | `dx scorecards list`                                                 | List scorecards, with support for pagination and including drafts.                  |
| Scorecards | `dx scorecards update <id>`                                          | Update a scorecard from YAML provided by `--from-file <path>` or `--from-stdin`.    |
| Studio     | `dx studio query <sql>`                                              | Execute a Data Studio SQL query and optionally save the full results as CSV.        |

Run `dx <command> --help` for command-specific arguments, examples, and option details.

## Logging

Set `DX_LOG_LEVEL` to one of `debug`, `info`, `warn`, or `error` to enable CLI logs.

Logs are always written to `stderr`. They are human-readable by default, and switch to JSON when `--json` is present or `stderr` is not a TTY.

## Developing the CLI

See [CONTRIBUTING.md](./CONTRIBUTING.md).

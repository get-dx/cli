# AGENTS.md — dx-cli

A standalone TypeScript CLI (`dx`) for DX web API endpoints, authenticated via API token.

## Setup

```bash
pnpm install    # install dependencies
make            # install + build + link globally (default target)
```

## Key Commands

| Task          | Command             |
| ------------- | ------------------- |
| Install deps  | `pnpm install`      |
| Build         | `pnpm build`        |
| Test          | `pnpm test`         |
| Typecheck     | `pnpm typecheck`    |
| Lint          | `pnpm lint`         |
| Format        | `pnpm format`       |
| Check format  | `pnpm format:check` |
| Full CI check | `make verify`       |

`make verify` runs `format-check`, `typecheck`, `lint`, and `test` — run this before committing.

After making changes, run `make format` to auto-format code before verifying or committing.

## Conventions

- Commands within a file should be defined in alphabetical order (e.g. `create`, `delete`, `info`, `list`, `update`).

## Source Layout

- `src/commands/` — one file per top-level command group (e.g. `auth.ts`, `catalog.ts`); subcommands live in a same-named subdirectory (e.g. `catalog/entities.ts`)
- `src/commandHelpers.ts`, `src/http.ts`, `src/renderers.ts` — shared utilities used by all commands
- `src/runtime.ts`, `src/config.ts`, `src/secrets.ts` — auth and environment resolution
- `src/types.ts`, `src/errors.ts` — shared types and error handling

## Testing

Tests use **Vitest**. Run with `pnpm test`. Test files live alongside source files as `*.test.ts`.

## Authentication

- Store a token: `dx auth login --token <token>`
- Or set `DX_API_TOKEN` in the environment.
- Tokens are keyed per base URL (supports multiple DX instances).

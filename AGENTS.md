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
- `src/commandHelpers.ts`, `src/http.ts` — shared utilities used by all commands
- `src/ui.ts` + `src/ui/` — rich text building blocks (headings, paragraphs, lists, description lists, inline styles); use these to build output for `renderRichText`
- `src/renderers.ts` — terminal output: `renderRichText(blocks)` for human-readable output, `renderJson(value)` for `--json` mode
- `src/runtime.ts`, `src/config.ts`, `src/secrets.ts` — auth and environment resolution
- `src/types.ts`, `src/errors.ts` — shared types and error handling

## Testing

Tests use **Vitest**. Run with `pnpm test`. Test files live alongside source files as `*.test.ts`.

**Important:** Always call `await import("../cli.js")` _before_ setting up `vi.spyOn(fs, "readFileSync")` mocks. Some command modules (e.g. `scorecards.ts`) read asset files via `fs.readFileSync` at module load time. If the mock is installed first, it also intercepts Node's internal CJS module loader reading its own dependency files, causing a `SyntaxError: Unexpected token ':'` that breaks every test in the file.

## Authentication

- Store a token: `dx auth login --token <token>`
- Or set `DX_API_TOKEN` in the environment.
- Tokens are keyed per base URL (supports multiple DX instances).

---
name: create-cli-command-from-api-method
description: Adds a dx-cli subcommand from a DX Web API method docs page—fetch docs, stub Commander hierarchy, implement request/options, verify with make and --help. Use when the user provides or wants a https://docs.getdx.com/webapi/methods/ URL, asks to scaffold or implement a CLI command for a Web API method, or says "create command from API".
---

# Create CLI command from Web API method

End-to-end workflow for wiring a new `dx` subcommand to a documented Web API method in the **dx-cli** repo.

## Step 1: Get the docs page

1. **Require a docs URL from the user.** It must start with `https://docs.getdx.com/webapi/methods/`. If they did not give one (or it does not match), ask for a valid URL and stop until you have it.
2. **Fetch the page HTML or rendered content** (for example `curl` with `Accept: text/html`, or another reliable fetch). Parse the **Facts** table (HTTP method, path), **Arguments** (required vs optional, types, descriptions), **Example request/response**, and **Errors** from the body.

**Naming note:** The URL path uses an all-lowercase method slug (e.g. `catalog.entitytypes.list`). The docs **title** and the real API method name use camelCase in each segment after the first (e.g. `catalog.entityTypes.list`). Use the **canonical method spelling from the docs title/Facts** for HTTP paths and CLI segment names, not only the URL slug.

**HTTP route string:** The path passed to `request()` must match the **Facts** table exactly (e.g. `/catalog.entities.list`, `/catalog.entityTypes.list`). When the documented path is all lowercase, use that literal string—do not invent camelCase inside the path unless the docs show it.

## Step 2: Map method name → CLI hierarchy and files

Split the method name on `.` (e.g. `catalog.entityTypes.list` → `["catalog", "entityTypes", "list"]`).

- The **first** segment is the top-level command group (e.g. `catalog`). It is registered from `src/cli.ts` via `src/commands/<first>.ts` (e.g. `catalog.ts`).
- Each **middle** segment is a nested `Command` (e.g. `entities`, `entityTypes`). Prefer one module per middle group under `src/commands/<first>/` (e.g. `src/commands/catalog/entities.ts` exporting `entitiesCommand()`).
- The **last** segment is the leaf subcommand (e.g. `info`, `list`).

**CLI invocation shape:** `dx <segment1> <segment2> … <leaf> [args] [options]`
Example: `catalog.entityTypes.list` → `dx catalog entityTypes list`.

**Where to edit:**

- Add or extend the parent command module (e.g. `src/commands/catalog/entityTypes.ts`) and **wire it** from `src/commands/catalog.ts` with `addCommand(...)` if the parent group is new.
- Define the leaf with `.command("<leaf>")`, `.description(...)`, and help text.

**Verify before Step 3:**

```bash
make
dx <segment1> <segment2> … <leaf> --help
```

If `--help` does not show the expected description or `afterAll` examples (once added), fix registration or Commander options until it does.

**If `make` fails:** `make` may run `pnpm install` (use `CI=true make` when there is no TTY) and `pnpm link --global` (can fail without write access to the pnpm home directory). You can still verify the implementation with `pnpm exec tsc -p tsconfig.json` (or `pnpm build`) and `node dist/index.js <segment1> … --help` from the repo root.

## Step 3: Implement the command

### Arguments vs options

- Use the docs **Arguments** section: optional API parameters → Commander **options** (`.option(...)`). Use names and descriptions aligned with the docs.
- If there is a single **critical** required parameter such as `id` or `identifier` (or the docs clearly treat one value as the primary resource key), expose it as a required **argument** (`.argument("<name>", "...")`), not as `--name`.
- **List/get methods with no resource key:** If every API parameter is optional (e.g. pagination and filters only), the leaf command has **no** `.argument(...)`. The action signature is `wrapAction(async (options, command) => { … })`—there is no leading positional parameter before `options`.
- **API query names vs CLI flags:** Query string keys sent to `request()` must use the API’s spelling (often `snake_case`, e.g. `search_term`). Commander long options are usually `kebab-case` (e.g. `--search-term`). Commander maps those to **camelCase** properties on the options object (e.g. `searchTerm`). Map explicitly in the handler: `search_term: options.searchTerm` (and omit keys when the value is `undefined` so server defaults still apply).
- **Integer options:** For counts and limits, use a value parser on `.option(...)` that returns a number and throws **`CliError`** with **`EXIT_CODES.ARGUMENT_ERROR`** when the value is not a valid positive integer (see **`parsePositiveIntOption`** in `src/commands/catalog/entities.ts`).

### HTTP and API layer

- Add a small typed (or pragmatically typed) function in `src/api.ts` that calls `request()` from `src/http.js` with the correct **method**, **path**, **query**, and **body** as in the docs **Facts** / **Example request**.
- Path shape matches the API: leading slash + method name with dots, e.g. `/catalog.entities.info`, `/catalog.entityTypes.list` (match the documented path; preserve camelCase as in the official method name when the docs show it).
- Build the `query` object in the API helper: only set keys the caller provided; leave omitted keys out of the query object so optional parameters default on the server (e.g. do not send `limit` unless the user passed `--limit`).

### Action handler

- Use **`buildRuntime`** and **`getContext(command)`** from existing commands (see `src/commands/catalog/entities.ts`).
- Wrap the async action with **`wrapAction`** from `src/commandHelpers.js` so errors are handled consistently.
- Render success with **`renderStructuredResponse`** from `src/renderers.js` (or a dedicated renderer if the existing pattern does).

### Examples in help

- Add **2–3** examples via **`.addHelpText("afterAll", createExampleText([...]))`** from `src/commandHelpers.js`, following **`catalog entities`** commands in `src/commands/catalog/entities.ts` (`label` + full `dx ...` command line including `--json` where useful). For list/pagination methods, include an example that shows **`--cursor`** (or the doc’s pagination param) using a placeholder value from the docs example response if available.

### Types and validation

- Reuse **`CliError`** / **`EXIT_CODES`** from `src/errors.ts` for invalid user input (e.g. bad enum, missing combinations).
- Follow existing import style: **`commander`** `Command`, `.js` extensions on local imports.

## Checklist

- [ ] Docs URL validated and content fetched.
- [ ] Method name casing correct (title/API, not only URL slug); HTTP path matches **Facts** table.
- [ ] Parent subcommands exist and are wired in `src/commands/<top>.ts`.
- [ ] Build succeeds and `dx … --help` shows description and examples (`make`, or `pnpm build` / `tsc` + `node dist/index.js` if `make` fails on link/install).
- [ ] API call matches docs; action uses `wrapAction` and `renderStructuredResponse` (or equivalent).
- [ ] Required resource key is a positional argument when appropriate; other params are options; snake_case query params map correctly from Commander options.

# dx-cli

Standalone DX CLI for existing token-authenticated DX web API endpoints.

## Commands

- `dx auth login --token <account-web-api-token>`
- `dx auth logout`
- `dx auth status`
- `dx catalog entities info <identifier>`

## Agent Provenance

The CLI can automatically attach agent metadata from:

- `DX_AGENT_NAME`
- `DX_AGENT_SESSION_ID`

Explicit `--agent` and `--agent-session-id` flags take precedence over the environment.

Deferred in this repo version:

- `dx init`
- `dx scorecards list|get|create|update`
- `dx catalog entities list|create|update`
- `dx workflows list`
- `dx workflows trigger`
- `dx studio query`

## Development

```bash
make
pnpm install
pnpm build
pnpm test
```

`make` runs the local reinstall flow: `pnpm install`, `pnpm build`, and `pnpm link --global`.

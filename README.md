# dx-cli

Standalone DX CLI for existing token-authenticated DX web API endpoints.

## Install

```bash
npm install --global @get-dx/cli
```

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

## Logging

Set `DX_LOG_LEVEL` to one of `debug`, `info`, `warn`, or `error` to enable CLI logs.

Logs are always written to `stderr`. They are human-readable by default, and switch to JSON when `--json` is present or `stderr` is not a TTY.

Deferred in this repo version:

- `dx init`
- `dx scorecards list|get|create|update`
- `dx catalog entities list|create|update`
- `dx workflows list`
- `dx workflows trigger`
- `dx studio query`

## Developing the CLI

See [CONTRIBUTING.md](./CONTRIBUTING.md).

# DX CLI

AI-Native CLI for interacting with DX.

<img width="800" height="423" alt="cli-demo" src="https://github.com/user-attachments/assets/a89f7d53-2617-413e-84df-07293149e9c8" />

## Install

```shell
npm install -g @get-dx/cli
```

## Getting started

Interactively login and install the AI agent skill:

```shell
dx init
```

The CLI defaults to `app.getdx.com` (DX Cloud). Press Enter to accept the default and then paste your API token.

### Dedicated or managed deployments

If your organization is on a dedicated or managed DX deployment, pass your custom hostname at init time:

```shell
# Flag (dedicated instance at mycompany.getdx.io)
dx init --host mycompany.getdx.io

# Env var — useful for CI or scripted setups
DX_HOST=mycompany.getdx.io dx init
```

The `DX_HOST` and `--host` values accept:

- `app.getdx.com` — DX Cloud (default)
- `<account>.getdx.io` — DX dedicated (derives `https://api.<account>.getdx.io` automatically)
- Any custom domain — you will be prompted for the separate API base URL

Show help text:

```shell
dx --help
dx <subcommand> --help
```

## Logging

Set `DX_LOG_LEVEL` to one of `debug`, `info`, `warn`, or `error` to enable CLI logs.

Logs are always written to `stderr`. They are human-readable by default, and switch to JSON when `--json` is present or `stderr` is not a TTY.

## Developing the CLI

See [CONTRIBUTING.md](./CONTRIBUTING.md).

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

For CI, Docker/dev containers, or other headless environments, pass the token
through the environment instead of storing it in the OS credential store:

```shell
DX_API_TOKEN="$DX_TOKEN" dx auth status
```

Show help text:

```shell
dx --help
dx <subcommand> --help
```

### Customizing base URLs

The CLI requires two base URLs to be configured. The default values are used for DX **cloud** deployments. Users of **dedicated** and **managed** deployments will need to specify these values explicitly when logging in.

| Value            | How it is used                               | Env var           | Default value           |
| ---------------- | -------------------------------------------- | ----------------- | ----------------------- |
| **Web base URL** | Browser-based login and displaying web links | `DX_WEB_BASE_URL` | `https://app.getdx.com` |
| **API base URL** | Making each API request to DX                | `DX_API_BASE_URL` | `https://api.getdx.com` |

#### For dedicated deployments

Set the env vars once when initializing:

```shell
# Interactive login
DX_WEB_BASE_URL="https://mycompany.getdx.io" DX_API_BASE_URL="https://api.mycompany.getdx.io" dx init

# Non-interactive use for CI, containers, or remote agents
DX_WEB_BASE_URL="https://mycompany.getdx.io" DX_API_BASE_URL="https://api.mycompany.getdx.io" DX_API_TOKEN="$DX_TOKEN" dx auth status
```

#### For managed deployments

Set the env vars once when initializing:

```shell
# Interactive login
DX_WEB_BASE_URL="https://dx.some-example-subdomain.example.com" DX_API_BASE_URL="https://api.dx.some-example-subdomain.example.com" dx init

# Non-interactive use for CI, containers, or remote agents
DX_WEB_BASE_URL="https://dx.some-example-subdomain.example.com" DX_API_BASE_URL="https://api.dx.some-example-subdomain.example.com" DX_API_TOKEN="$DX_TOKEN" dx auth status
```

## Logging

Set `DX_LOG_LEVEL` to one of `debug`, `info`, `warn`, or `error` to enable CLI logs.

Logs are always written to `stderr`. They are human-readable by default, and switch to JSON when `--json` is present or `stderr` is not a TTY.

## Developing the CLI

See [CONTRIBUTING.md](./CONTRIBUTING.md).

hello world

# DX CLI

AI-Native CLI for interacting with DX.

<img width="800" height="423" alt="cli-demo" src="https://github.com/user-attachments/assets/a89f7d53-2617-413e-84df-07293149e9c8" />

## Install

```bash
npm install -g @get-dx/cli
```

## Logging

Set `DX_LOG_LEVEL` to one of `debug`, `info`, `warn`, or `error` to enable CLI logs.

Logs are always written to `stderr`. They are human-readable by default, and switch to JSON when `--json` is present or `stderr` is not a TTY.

## Developing the CLI

See [CONTRIBUTING.md](./CONTRIBUTING.md).

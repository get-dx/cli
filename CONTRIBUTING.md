# Contributing

Thank you for being interested in contributing to the DX CLI!

## Local development

All routine dev/test/build commands for the dx-cli are orchestrated through the `Makefile`.

The most important commands for development are:

- `make`: runs the local reinstall flow: `pnpm install`, `pnpm build`, and `pnpm link --global`.
- `make dev`: watches the `src/` directory and calls `make` to reinstall whenever changes are detected. Requires [`watchexec`](https://github.com/watchexec/watchexec).
- `make verify`: runs all of the CI checks: format check, typecheck, lint, and unit tests.

## Agent skills

The CLI defines a `dx-cli` skill, intended for CLI users to install. It also has agent skills intended for use during development of the CLI itself. These are stored in the `.agents-internal-dev/skills/` directory rather than a canonical location like `.agents/skills/`, to avoid getting picked up by the [`skills`](https://www.npmjs.com/package/skills) binary and recommended to CLI users. To install these skills, run the following:

```shell
ln -s .agents-internal-dev .agents
```

## Recommended agent setup

A git worktree setup script should install and login:

```shell
make

# Generate an account-level token or personal access token
DX_BASE_URL="https://api.getdx.com" dx auth login --token "TOKEN_GOES_HERE"
```

Make sure that calls to the `dx` binary run outside of your agent client's sandbox, so network requests can succeed.

## Publishing (for maintainers)

TODO: add details

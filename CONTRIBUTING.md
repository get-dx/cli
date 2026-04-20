# Contributing

Thank you for being interested in contributing to the DX CLI!

## Local development

All routine dev/test/build commands for the DX CLI are orchestrated through the
`Makefile` and the shared `bin/build` script used by both `make` and
`package.json`.

The most important commands for development are:

- `make`: runs the local reinstall flow: `pnpm install`, `pnpm build`, and `pnpm link --global`.
- `make build`: runs the shared `bin/build` script to clean `dist`, compile TypeScript, and copy the YAML template assets used at runtime.
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

- Edit the version number in `package.json`:

  ```diff
   {
     "name": "@get-dx/cli",
  -  "version": "0.1.0",
  +  "version": "0.1.1"
   ...
   }
  ```

Release publishing is tag-based and uses npm Trusted Publisher through GitHub
Actions.

1. Submit a PR with the version bump and merge it to `main`.
2. Create and push a version tag that matches the package version, for example:

   ```shell
   git tag v0.1.1
   git push origin v0.1.1
   ```

3. GitHub Actions will run the
   [publish workflow](https://github.com/get-dx/cli/actions/workflows/publish.yml)
   for tags matching `v*`.
4. If the `Publish` GitHub environment requires approval, approve the pending
   deployment in GitHub so the workflow can proceed.
5. Once the workflow completes, confirm the new version appears on the
   [package versions page](https://www.npmjs.com/package/@get-dx/cli?activeTab=versions).

Notes:

- The workflow publishes with npm Trusted Publisher and OIDC. There is no npm
  publish token in the workflow.
- The trusted publisher configuration on npmjs.com must point at the
  `.github/workflows/publish.yml` workflow file.

# Contributing

Thank you for being interested in contributing to the DX CLI!

## Local development

All routine dev/test/build commands for the dx-cli are orchestrated through the `Makefile`.

The most important commands for development are:

- `make`: runs the local reinstall flow: `pnpm install`, `pnpm build`, and `pnpm link --global`.
- `make dev`: watches the `src/` directory and calls `make` to reinstall whenever changes are detected. Requires [`watchexec`](https://github.com/watchexec/watchexec).
- `make verify`: runs all of the CI checks: format check, typecheck, lint, and unit tests.

## Recommended agent setup

A git worktree setup script should install and login:

```shell
make

# Generate an account-level token or personal access token
DX_BASE_URL="https://api.getdx.com" dx auth login --token "TOKEN_GOES_HERE"
```

Make sure that calls to the `dx` binary run outside of your agent client's sandbox, so network requests can succeed.

## Publishing (for maintainers)

- Update [CHANGELOG.md](./CHANGELOG.md) with release notes.

- Edit the version number in `package.json`:

  ```diff
   {
     "name": "@get-dx/backstage-plugin",
  -  "version": "1.0.0",
  +  "version": "1.1.0", (Insert whatever version is appropriate according to semver)
   ...
   }
  ```

  - Submit a PR and merge the changes to the `main` branch.

  - The [Publish Package action](https://github.com/get-dx/cli/actions/workflows/publish.yaml) will run based off of the new commit on the `main` branch, but the workflow will be in a pending state until approved.

  - Reach out to the team's Tech Lead to approve the deployment in GitHub.
    This will cause the workflow to fully run and publish the new version to NPM.
    Once the workflow is complete, the new version will be visible in the
    [package's versions tab](https://www.npmjs.com/package/@get-dx/cli?activeTab=versions).

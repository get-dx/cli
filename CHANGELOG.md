# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- Replace the boring green welcome banner in `dx init` with an awesome welcome animation! Set `DX_DISABLE_WELCOME_ANIMATION="true"` to disable.

### Fixed

- Fix the `dx auth login` and `dx init` commands so the process exits promptly after a completed browser login.
- Improved error messages and docs for headless systems without secret stores.

## 0.3.1 - 2026-05-01

### Added

- `dx snapshots csatComments list`: Add support for listing CSAT comments for a snapshot.
- `dx snapshots info --id`: Add support for retrieving results for a single snapshot.
- `dx snapshots list`: Add support for listing DX snapshots.
- `dx snapshots driverComments list`: Add support for listing driver comments for a snapshot.

New Skill! A new snapshot-analysis skill is available.

## 0.3.0 - 2026-05-01

### Changed

- Now persisting and loading configuration for two base URLs instead of one: `DX_API_BASE_URL` and `DX_WEB_BASE_URL`. This enables support for web links and fixes edge cases around logging in to managed deployments. Users of previous versions will need to log out and reauthenticate in order to update their configuration files. See the readme for more details.
  - BREAKING for users of managed DX deployments on custom domains: these users will need to logout and log back in so the web base URL can be saved. Users that log into DX through `app.getdx.com` or `customer-name.getdx.io` are not affected.

### Added

- Add web links for entities, entity types, and scorecards.

## 0.2.1 - 2026-04-29

### Added

- `dx workflows list`: Add support for listing Self-service workflow definitions.
- `dx catalog entities create/update/upsert`: These commands now support a `--alias` flag to set aliases for an entity.

## 0.2.0 - 2026-04-27

### Added

- Added ability to log in via browser from both the `dx init` and `dx auth login` commands

## 0.1.7 - 2026-04-24

### Added

- `dx teams info`: Add support for retrieving details for an individual team.

### Improved

- `dx init`: Initialization no longer prompts all users to to provide hostname when majority have a default app.getdx.com.

## 0.1.6 - 2026-04-24

### Added

- `dx teams findByMembers`: Add support for finding a team by member email addresses.

## 0.1.5 - 2026-04-23

### Added

- `dx teams list`: Add support for listing DX teams.

## 0.1.4 - 2026-04-21

### Added

- `dx studio query`: Add support for variables through the repeatable `--variable key=value` flag
- Expand supported Node.js versions to include the current LTS majors and run CI verification on Node 20, 22, and 24.

### Fixed

- Remove false positive "skill installed" message if the agent skill was cancelled.
- Clean up skill file instructions for if the user is not authenticated.
- Fix missing subcommand help output (e.g. running `dx catalog`)

## 0.1.3 - 2026-04-20

### Added

- `dx init` command

## 0.1.2 - 2026-04-17

Fix the repo associations in package.json so publishing works.

## 0.1.1 - 2026-04-17

Initial entry in `CHANGELOG.md`.

Releasing the DX CLI!

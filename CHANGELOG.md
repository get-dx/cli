# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- `dx snapshots csatComments list`: Add support for listing CSAT comments for a snapshot.
- `dx snapshots info --id`: Add support for retrieving results for a single snapshot.
- `dx snapshots list`: Add support for listing DX snapshots.
- `dx snapshots driverComments list`: Add support for listing driver comments for a snapshot.

New Skill! A new snapshot-analysis skill is available.

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

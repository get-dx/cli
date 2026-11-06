# Snapshot settings

Use these commands to discover and mutate **account snapshot survey settings** through the public Web API (`snapshots.settings.*`). Do not invent routes or mutate settings via the database/console.

Requires a token with the **`snapshots:admin`** scope. Writes return `409 snapshot_live` while a snapshot is collecting.

Prefer `--json` for agents. Write payloads with `--from-file` or `--from-stdin` (YAML or JSON objects matching the public API docs).

## Discover

```bash
dx --json snapshots settings branches list
dx --json snapshots settings library get
dx --json snapshots settings configuration get
dx --json snapshots settings manifest get
dx snapshots settings manifest get --locale es --output manifest-es.csv
```

1. Call `branches list` first. If `branching_enabled` is `false`, omit `branch_id` on selection (and usually on create). If `true`, selection requires an encoded `branch_id` from that response.
2. Use encoded ids from `library` / `branches` responses only.
3. Re-fetch `library` (and optionally `manifest`) after writes to verify.

## Mutate

Selection endpoints replace membership with the **complete** desired set (not a diff).

```bash
# Drivers
dx --json snapshots settings drivers create --from-file driver.json
dx --json snapshots settings drivers update --from-file driver-update.json
dx --json snapshots settings driverSelection update --from-file drivers-selection.json

# Workflows
dx --json snapshots settings workflows create --from-file workflow.json
dx --json snapshots settings workflows update --from-file workflow-update.json
dx --json snapshots settings workflowSelection update --from-file workflows-selection.json

# CSAT
dx --json snapshots settings csatItems create --from-file csat.json
dx --json snapshots settings csatItems update --from-file csat-update.json
dx --json snapshots settings csatSelection update --from-file csat-selection.json
```

Payload field contracts match the app public API docs (`docs/api/snapshots.settings.*.md` in get-dx/app).

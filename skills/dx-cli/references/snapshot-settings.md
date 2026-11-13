# Snapshot settings

Use `dx --json snapshots settings …` with a `snapshots:admin` token. The token determines the account; keep it in `DX_API_TOKEN`. Requires Snapshots access and, for PATs, settings-view permission.

## Discover before editing

```bash
dx --json snapshots settings branches list
dx --json snapshots settings library get
dx --json snapshots settings configuration get
```

Use encoded IDs from these responses. Check `configuration.settings_locked`: reads work while locked, but writes return `409 snapshot_live`. Stop on that error.

The library contains definitions and current selections. Selected items include `id`, `name` and effective `prompt`. Use IDs when writing selections.

## Create and update

Writes accept one JSON/YAML object through exactly one of `--from-file` or `--from-stdin`.

```bash
printf '%s\n' '{"name":"AI Upskilling","prompt":"I have support to learn AI tools.","ranking_item":"Learning AI tools","target_role":"dev"}' \
  | dx --json snapshots settings drivers create --from-stdin
dx --json snapshots settings drivers update --from-file driver-update.json
dx --json snapshots settings csatItems create --from-file csat.json
dx --json snapshots settings csatItems update --from-file csat-update.json
```

Creates leave items unselected. Updates require `driver_id` or `csat_id`; omitted fields are preserved. Only custom definitions can be edited. For workflow creation or edits, contact DX staff to use their staff UI.

CSAT creation requires `name`, `prompt` and `audience_filters`. Configured audience reads return named `teams` and `attributes`; writes use `team_ids` and `attribute_ids`. See the [CSAT payload contract](https://github.com/get-dx/app/blob/master/docs/api/snapshots.settings.csatItems.md) for filter formats.

## Select and unselect

Selection writes replace the **complete selected ID set**. Re-read the library before writing and preserve every existing selection the user wants to keep. To unselect an item, omit its ID.

When `branching_enabled` is true, include a `branch_id` from `branches list`; otherwise omit `branch_id`.

```json
{
  "branch_id": "<encoded_branch_id>",
  "driver_ids": ["<encoded_driver_id>", "<another_encoded_driver_id>"]
}
```

```bash
dx --json snapshots settings driverSelection set --from-file drivers-selection.json
dx --json snapshots settings workflowSelection set --from-file workflows-selection.json
dx --json snapshots settings csatSelection set --from-file csat-selection.json
```

Use `workflow_ids` or `csat_ids` for those selections. Respect returned `minimum_drivers` / `maximum_drivers` and server validation errors. Unless the account allows optional workflows, preserve "PR merge frequency" and "Change fail percentage" for non-branching accounts and software engineering branches.

## Order CSAT items

```bash
dx --json snapshots settings csatOrder set --from-file csat-order.json
```

Supply `csat_ids`, `group_ids`, or both. Each supplied array must contain every ID in that library collection, including unselected items, in the desired order. Ordering is account-wide; omit `branch_id`.

## Limits

Correct `422 validation_error` payloads using `error_details`. After an ambiguous create failure, check the library before retrying to avoid duplicates. Verify intended changes by reading the library again.

These commands do not edit configuration, branches or groups, delete items, or override built-in wording. Do not substitute private UI endpoints or database writes.

Detailed payloads: [Snapshot settings API contracts](https://github.com/get-dx/app/tree/master/docs/api) (`snapshots.settings.*.md`). Use `--help` for command options.

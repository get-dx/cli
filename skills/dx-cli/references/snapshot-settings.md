# Snapshot settings

Requires `snapshots:admin`. Start with discovery; use `--help` for commands and options:

```bash
dx --json snapshots settings branches list
dx --json snapshots settings library get
dx --json snapshots settings configuration get
```

Use returned IDs. If `configuration.settings_locked` is true or a write returns `409 snapshot_live`, stop editing.

## Write payloads

Pass one JSON/YAML object with `--from-file` or `--from-stdin`. Creates leave items unselected; updates require `driver_id` or `csat_id` and preserve omitted fields.

```bash
printf '%s\n' '{"name":"AI Upskilling","prompt":"I have support to learn AI tools.","ranking_item":"Learning AI tools","target_role":"dev"}' \
  | dx --json snapshots settings drivers create --from-stdin
```

Driver `target_role` accepts `dev`, `nondev` or `all`. Only custom definitions can be edited. For workflow creation or edits, contact DX staff to use their staff UI.

CSAT creation requires `name`, `prompt` and `audience_filters`, for example:

```json
{
  "name": "Developer portal",
  "prompt": "How satisfied are you with the developer portal?",
  "audience_filters": {
    "type": "configured",
    "configured": { "target_role": "dev", "team_ids": [], "attribute_ids": [] },
    "custom": null,
    "active_users": null
  }
}
```

To reapply filters, update with `csat_id` and `audience_filters`. Supplying filters replaces the whole configuration; omitting them preserves it. Include all four filter keys shown above, with only the object matching `type` populated:

| Type           | Write fields                                                                                              |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `configured`   | `target_role`, `team_ids`, `attribute_ids`. Convert returned `teams` / `attributes` objects to ID arrays. |
| `custom`       | `identifier_type: "user_id"`, `identifiers`: IDs from returned `custom.users`.                            |
| `active_users` | `project_id`, `lookback_months` (1, 3 or 6).                                                              |

Configured filters match role AND any selected team (including descendants) AND any selected attribute. Empty team/attribute arrays impose no restriction.

## Selection and ordering

- Selection `set` commands replace the **complete selected ID set** (`driver_ids`, `workflow_ids` or `csat_ids`). Re-read the library before writing and preserve selections the user wants to keep. Omitting an ID unselects it.
- Include `branch_id` for selections only when `branching_enabled` is true; otherwise omit it.
- `csatOrder set` accepts `csat_ids`, `group_ids` or both. Each supplied array must contain every ID in that library collection, including unselected items, in the desired order. Ordering is account-wide; omit `branch_id`.

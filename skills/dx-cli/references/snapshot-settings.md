# Snapshot settings

Manage current account survey settings through `dx --json snapshots settings …`.
Use only public `snapshots.settings.*` APIs. Requires `snapshots:admin`, Snapshots product access, and settings-view permission for PATs. The token determines the account. Keep tokens in environment variables; never put them in payload files or logs.

## Agent workflow

1. Read `branches list`, `library get`, and `configuration get` before planning changes.
2. Check `configuration.settings_locked`. Locked accounts allow GETs but every write returns `409 snapshot_live`: stop, do not retry or bypass the lock.
3. Use encoded IDs from API responses. Never invent IDs or use the synthetic `single` branch.
4. State the exact endpoint and JSON body. Execute when the user has authorized that change; otherwise request approval.
5. Re-read library/configuration immediately before complete-set writes to preserve unrelated changes. There is no compare-and-swap protection; avoid concurrent editors.
6. After writes, re-read library to verify the affected resource/selection. Do not blindly retry creates after ambiguous network failures; discover whether creation already succeeded.

All writes accept one JSON or YAML object via exactly one of `--from-file path` or `--from-stdin`. Prefer `--json`: stdout contains the API response; errors retain status/body and use a nonzero exit code. The CLI passes payloads through; server validation is authoritative. Omitted fields and explicit `null` are distinct.

## Endpoint coverage

Commands below follow `dx --json snapshots settings`. Every write uses POST.

| Command                 | API suffix              | Result                              |
| ----------------------- | ----------------------- | ----------------------------------- |
| `branches list`         | `branches` (GET)        | `{ok, branching_enabled, branches}` |
| `library get`           | `library` (GET)         | `{ok, drivers, workflows, csat}`    |
| `configuration get`     | `configuration` (GET)   | `{ok, configuration}`               |
| `drivers create`        | `drivers.create`        | `{ok, driver}`                      |
| `drivers update`        | `drivers.update`        | `{ok, driver}`                      |
| `driverSelection set`   | `driverSelection.set`   | `{ok, selection}`                   |
| `workflowSelection set` | `workflowSelection.set` | `{ok, selection}`                   |
| `csatItems create`      | `csatItems.create`      | `{ok, csat}`                        |
| `csatItems update`      | `csatItems.update`      | `{ok, csat}`                        |
| `csatSelection set`     | `csatSelection.set`     | `{ok, selection}`                   |
| `csatOrder set`         | `csatOrder.set`         | `{ok, csat_ids, group_ids}`         |

Internal workflow authoring adds `workflows create` and `workflows update` (POST `workflows.create` / `workflows.update`). See [internal workflow contract](https://github.com/get-dx/app/blob/master/docs/internal/api/snapshots.settings.workflows.md); these are not customer authoring APIs. Workflow selection is public.

## Discovery and response interpretation

```bash
dx --json snapshots settings branches list
dx --json snapshots settings library get > library.json
dx --json snapshots settings configuration get
```

Non-branching accounts return `branches: []` and selections with `branch_id: null`. Branching accounts return encoded IDs, name, respondent prompt, audience, position, main and translations.

Each library section has `library` definitions and `selections`. Selected drivers, workflows and CSAT items all use `{id, name, prompt}`. The prompt is effective branch wording; a library definition uses account wording. Selection writes still accept `driver_ids`, `workflow_ids` or `csat_ids`, not the returned objects. Workflow responses omit `required`; the API rejects selections that omit required core workflows. CSAT includes ordered `groups`: null means grouping unavailable, [] means enabled but empty. Existing publishing behavior yields no CSAT items when grouping is enabled without any groups.

Configuration includes `settings_locked`, `eligible_participant_count`, `fallback_timezone`, nullable `live_snapshot`/`next_snapshot`, `languages`, `lifecycle_messages`, and `scheduled_nudges`. `scheduled_for` and respondent `launch_date` differ. Lifecycle messages expose source text, format and the shared sender. Nudges expose reference context, business-day dates, effective messages, ordered sender rules and estimated audiences; estimates are not guaranteed sends. Targeted-only nudges retain a disabled default sender with count zero. Reads do not send messages.

## Create and partially update

Creation always leaves resources unselected and rejects `branch_id`. On branching accounts, unassigned definitions appear in the UI's Add existing picker, not the branch's selected list. Select separately. No delete/archive endpoints exist.

```bash
printf '%s\n' '{"name":"AI Upskilling","prompt":"I have support to learn AI tools.","ranking_item":"Learning AI tools","target_role":"dev"}' \
  | dx --json snapshots settings drivers create --from-stdin
printf '%s\n' '{"driver_id":"<encoded_driver_id>","prompt":"I have practical training and time to learn AI tools.","ranking_item":null}' \
  | dx --json snapshots settings drivers update --from-stdin
```

Driver creation requires nonblank name, prompt and ranking_item, plus target_role (`dev`, `nondev`, `all`). Updates preserve omitted fields. Built-in resources are not editable through these commands. `custom`, IDs and `scale_points` are read-only.

`translations` is always an object: `{}` when multilingual is disabled, otherwise only stored translations for enabled translation locales. This applies to definitions, branches, groups and workflow options.

Question translations merge by locale/field, explicit translated-field null clears, and base-text changes preserve existing stale-translation cleanup. Only account-enabled locales are writable; multilingual support must be available. Drivers support name/prompt/ranking_item; workflows and CSAT support name/prompt. Unsupported fields/types are rejected, not discarded.

## Select and unselect

Payloads contain the **complete desired selected ID set**, not a diff or a list of `{id, enabled}` objects. Always preserve desired existing IDs. Omission unselects an item. On branching accounts require an account-owned branch_id; on non-branching accounts omit it entirely. Creates and account-wide ordering never accept branch_id.

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

Use `workflow_ids` / `csat_ids` respectively. Preserve every required core workflow. Empty sets are allowed only when domain constraints permit. Duplicates/invalid references reject atomically. Selection order does not set display order; other branches are unaffected.

Respect returned minimum_drivers/maximum_drivers. An already-over-limit selection may retain or reduce its count, but cannot increase again above the maximum after reduction. Do not promise exact restoration of an over-limit baseline after deselection; use equal-size swaps when demonstrating changes.

## CSAT audience filters and grouping

Create requires name, prompt, and audience_filters. All three filter keys are present; exactly one is populated, matching type:

```json
{
  "name": "AI learning resources",
  "prompt": "How satisfied are you with AI learning resources?",
  "audience_filters": {
    "type": "configured",
    "configured": { "target_role": "dev", "team_ids": [], "attribute_ids": [] },
    "custom": null,
    "active_users": null
  },
  "exclude_na_responders": false,
  "group_id": null
}
```

```bash
dx --json snapshots settings csatItems create --from-file csat.json
dx --json snapshots settings csatItems update --from-file csat-update.json
```

Updates identify `csat_id`; omitted filters/grouping are preserved. A supplied audience_filters replaces the complete filter configuration. `group_id` assigns an existing group; only explicit null clears it. Blank strings, booleans, arrays, objects and numbers are rejected without changes. Group writes require grouping availability.

- Configured reads return `{target_role, teams: [{id, name}], attributes: [{id, name}]}`; writes use `team_ids` and `attribute_ids`. An unavailable reference can have a null name. Role AND any chosen team/descendant AND any chosen attribute. Empty categories impose no restriction. Nudge attributes instead match AND across attribute groups, OR within each group.
- Custom writes: `{"type":"custom","configured":null,"custom":{"identifier_type":"email","identifiers":["person@example.com"]},"active_users":null}`. Use identifier_type `user_id` for encoded user IDs. Every identifier must resolve within the account or the entire request rejects. Reads return `custom.users: [{id,email}]` with current emails.
- Active users: `{"type":"active_users","configured":null,"custom":null,"active_users":{"project_id":"<encoded_project_id>","lookback_months":3}}`. Supported lookbacks: 1, 3, 6 months.

## CSAT ordering

```json
{
  "csat_ids": ["<every_visible_item_in_desired_order>"],
  "group_ids": ["<every_visible_group_in_desired_order>"]
}
```

```bash
dx --json snapshots settings csatOrder set --from-file csat-order.json
```

Supply at least one array. Each supplied array must be a permutation of its entire public library collection, including unselected items. Omission preserves that collection's order. Ordering is account-wide; it does not alter selection or group assignment. Invalid, incomplete or duplicate lists reject atomically.

## Boundaries and errors

`422 validation_error` includes error_details; correct the payload before retrying. `404 not_found` identifies unknown target resources. Preserve authentication/authorization errors and stop on `409 snapshot_live`. Do not treat JSON examples' placeholder IDs as real IDs.

No public writes exist for branch CRUD, schedule/configuration/lifecycle/nudges, group CRUD, built-in wording overrides, or deleting/archiving drivers/workflows/CSAT. Do not substitute private UI controllers or database writes.

Canonical contracts: get-dx/app `docs/api/snapshots.settings.*.md`; internal workflow authoring: `docs/internal/api/snapshots.settings.workflows.md` (merged in app PR #19463).

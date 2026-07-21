# Report Creation

Use `dx studio reports` to list, inspect, create, and update Data Studio reports. Report create and update payloads can be large because they include access settings, report metadata, SQL, chart types, and chart configuration, so prefer the YAML-file workflow instead of trying to pass large payloads through shell flags.

Changes to Studio report configurations are managed via temporary YAML files. The typical workflow is: **init -> edit -> create or update**.

---

## Listing and Inspecting Reports

### List all reports

```
dx studio reports list
dx studio reports list --limit 10 --json
dx studio reports list --cursor <next_cursor>
dx studio reports list --search-term deploy
```

Pagination: when there are more results, the response includes a `next_cursor`. Pass it as `--cursor` to fetch the next page.

### Get details about a report

```
dx studio reports info <id>
dx studio reports info s4525phi3dud --json
```

Use `dx studio reports list --json` to discover report IDs.

---

## Creating and Updating Reports

### Generate a YAML template

Start from a blank template when creating a new report:

```
dx studio reports init ./my-report.yaml
```

Or export an existing report to a file for editing:

```
dx studio reports init ./my-report.yaml --id <report_id>
```

### Create a report

```
dx studio reports create --from-file ./my-report.yaml
```

On success, the CLI prints the new report's ID.

### Update an existing report

```
dx studio reports update <report_id> --from-file ./my-report.yaml
```

The CLI argument ID is authoritative even if the YAML contains an `id` field. Use `dx studio reports init ./my-report.yaml --id <report_id>` first to export the current state before editing.

### Use stdin

Use `--from-stdin` only when the YAML is being generated dynamically or piped from another command:

```
cat ./my-report.yaml | dx studio reports create --from-stdin
cat ./my-report.yaml | dx studio reports update <report_id> --from-stdin
```

---

## YAML Format

A report YAML file should use these top-level fields:

```yaml
name: "My report"
owner_email: "owner@example.com"
description: ""
markdown_notes: ""
view_access_type: owner_and_direct_url_only
viewer_emails: []
edit_access_type: read_only
editor_emails: []
tiles:
  - title: "Table"
    sql: |-
      SELECT 1 AS value
    chart_type: table
    chart_config: {}
```

### Access settings

Supported `view_access_type` values:

- `owner_and_direct_url_only` — visible via direct URL
- `specific_users` — visible to specific users
- `everyone` — visible to everyone

Provide `viewer_emails` only when `view_access_type` is `specific_users`.

Supported `edit_access_type` values:

- `everyone` — editable by everyone
- `specific_users` — editable by specific users
- `owner_only` — editable by owner only
- `read_only` — editable by owner only

Provide `editor_emails` only when `edit_access_type` is `specific_users`.

### Tiles

Supported tile `chart_type` values are `line`, `pie`, `stacked_bar`, `scatter`, and `table`.

`line`, `stacked_bar`, and `scatter` chart configs require `xAxis` and `yAxes`; `pie` chart configs require `labelColumn` and `valueColumn`; `table` chart configs can be `{}`.

---

## Variables

Tile `sql` can reference report variables to make a report interactive: place `$variable_name` anywhere in the query, and the selected value(s) are substituted in when the report runs.

### Built-in variables

- `$service_ids` — filter by specific services
- `$team_ids` — filter by team assignments
- `$tag_ids` — filter by attributes
- `$user_ids` — filter by individual users
- `$repo_ids` — filter by specific repositories
- `$start_date` and `$end_date` — filter by date range

### Custom variables

Custom variables are account-defined dropdown filters backed by a SQL query. Each has a title, a variable name (used as `$variable_name` in tile SQL), a description, and a SQL statement that must return exactly two columns: `value` (used in the substitution) and `label` (shown to users in the dropdown).

### Limitation: no CLI/API management

Variables cannot be created, updated, enabled, or disabled through this CLI or the API. There is no field for them in the report YAML.

- Built-in variables are toggled on/off per report in the Data Studio UI.
- Custom variables are added, edited, and deleted per account in the Data Studio UI.

Once a variable is enabled on a report (via the UI), any tile's `sql` — including tiles created or updated via `dx studio reports create`/`update` — can reference it as `$variable_name`.

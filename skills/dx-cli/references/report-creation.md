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

The CLI argument ID is authoritative even if the YAML contains an `id` field. **Always** scaffold with `dx studio reports init ./my-report.yaml --id <report_id>` first and edit that file — see "How updates preserve layout" below.

### Use stdin

Use `--from-stdin` only when the YAML is being generated dynamically or piped from another command:

```
cat ./my-report.yaml | dx studio reports create --from-stdin
cat ./my-report.yaml | dx studio reports update <report_id> --from-stdin
```

### How updates preserve layout

Tiles are matched by `id` on update:

- A payload tile whose `id` matches an existing tile updates it **in place**. Optional fields (`description`, `section`, `width`, `height`, `drilldown_sql`) that are omitted keep their current values, so a scaffolded file that never mentions sizing cannot wipe it.
- A payload tile **without** an `id` is created as a new tile — default size, no section, no drilldown.
- Any existing tile **not referenced** by id in the payload is deleted.

So regenerating the tiles list from scratch (instead of editing an `init --id` scaffold) silently deletes and recreates every tile, losing sizes, sections, and drilldowns. The CLI prints a warning before an update that would do this. Tile order in the YAML is the display order and is always applied.

`sections` and `variables` are also declarative when present: entries omitted from the list are removed from the report (section deletion moves its tiles out of the section; it never deletes tiles). Omit the `sections`/`variables` keys entirely to leave them untouched.

Note: `init --id` writes `owner_email: ""`, so a round-trip does not transfer ownership; ownership can only be set on create.

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
date_range_variables_enabled: true
default_date_range_period: l4w
variables:
  - name: team_ids
    default_values: []
sections:
  - name: "Delivery"
    description: "Shipping speed"
tiles:
  - title: "Deployments per week"
    sql: |-
      SELECT CURRENT_DATE AS week_start, 1 AS value
    chart_type: line
    chart_config:
      xAxis: week_start
      yAxes:
        - value
    section: "Delivery"
    width: 2/3
    height: 1/3
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

### Sections

Sections group tiles on the dashboard. Each section has a `name` (required) and optional `description`. On update, sections are matched by the `id` scaffolded from `init --id`; sections without an id are created, and existing sections omitted from the list are deleted (their tiles move to the unsectioned area).

Tiles join a section via their `section` field, which is the section **name** — so a tile can reference a section created in the same request. If two sections share a name, rename one first (or pass the raw `section_name`/`section_id` API fields). Setting `section: null` moves a tile out of all sections. New sections are appended below the unsectioned tile area; reordering sections is not supported via the CLI — do it in the Data Studio UI.

### Tiles

Supported tile `chart_type` values are `line`, `pie`, `stacked_bar`, `stacked_area`, `scatter`, and `table`.

- `line`, `stacked_bar`, `stacked_area`, and `scatter` chart configs require `xAxis` and `yAxes` (a list of numeric columns; more than one renders multiple series). `line` and `stacked_area` require the `xAxis` column to be a date.
- `pie` chart configs require `labelColumn` and `valueColumn`.
- `table` chart configs can be `{}`.
- **Big-number KPI tile**: use `chart_type: table` with SQL returning exactly one row and one column — it renders as a large single value.
- A **horizontal bar chart** is `chart_type: stacked_bar` with `orientation: horizontal` in `chart_config`.

Optional tile fields (all preserved when omitted on an id-matched update):

| Field | Meaning |
|---|---|
| `description` | Shown in the tile's info tooltip |
| `section` | Section name the tile belongs to |
| `width` / `height` | `1/4`, `1/3`, `1/2`, `2/3`, `3/4`, or `full` |
| `drilldown_sql` | Query run in a modal when a chart element is clicked (see Drilldowns) |

#### Optional `chart_config` keys

| Key | Applies to | Values / meaning |
|---|---|---|
| `groupByColumn` | line, stacked_bar, stacked_area | Split each series by a string column |
| `groupingMode` | stacked_bar | `stacked` (default) or `clustered` |
| `orientation` | stacked_bar | `vertical` (default) or `horizontal` |
| `showLegend` | line, stacked_bar, stacked_area | Show the series legend |
| `showDataLabels` | stacked_bar | Print the value at the end of each bar |
| `showTrendLine` | line, stacked_bar, stacked_area | Linear-regression trend line |
| `showLineOverlay` | stacked_bar | Per-category total line (vertical bars only) |
| `goalLines` | line, stacked_bar, stacked_area | Subset of `yAxes` rendered as dashed goal lines |
| `xAxisLabel`, `yAxisLabel` | line, stacked_bar, stacked_area, scatter | Axis titles |
| `xAxisFormat` | line, stacked_bar, stacked_area | Date format: `Jan`, `Jan 2024`, `Jan 1`, `Jan 1, 2024`, `01/01`, `2024-01-01`, or `none` |
| `yAxisMinValue`, `yAxisMaxValue` | line, stacked_bar, stacked_area, scatter | Clip the y axis |
| `hideXAxisTickMarks` | stacked_bar | Hide category-axis value labels |
| `overrideColors` | line, stacked_bar, stacked_area, pie | Map of series key (or pie label) to hex color, e.g. `{value: "#60a5fa"}` |

Sorting, row limits, and number formatting are not chart options — express them in the SQL.

### Drilldowns

Set `drilldown_sql` on a tile to run a second query in a modal when the user clicks a chart element. Supported for `line`, `stacked_bar`, `stacked_area`, and `scatter` (requires `xAxis`+`yAxes`) and `pie` (requires `labelColumn`); not supported for `table`.

The clicked element's values are injected as `$drilldown_<column>` variables (column name lowercased, non-word characters become `_`):

- line/stacked_bar/stacked_area: `$drilldown_<xAxis column>`; plus `$drilldown_<groupByColumn>` when grouping; plus `$drilldown_series_column` when there are multiple `yAxes`
- scatter: `$drilldown_<xAxis column>` and `$drilldown_<first yAxes column>`
- pie: `$drilldown_<labelColumn>`

Example: a line chart with `xAxis: week_start` can use `drilldown_sql: SELECT * FROM deployments WHERE date_trunc('week', deployed_at) = $drilldown_week_start`.

---

## Variables

Tile `sql` can reference report variables to make a report interactive: place `$variable_name` anywhere in the query, and the selected value(s) are substituted in when the report runs.

### Enabling variables on a report

The report YAML's `variables` list controls which variables are enabled and their default values, in display order:

```yaml
variables:
  - name: team_ids
  - name: environment
    default_values: ["prod"]
```

The list is declarative — variables omitted from it are disabled on update (omit the `variables` key entirely to leave them untouched).

### Built-in variables

Enable by name: `user_ids`, `team_ids`, `tag_ids`, `repo_ids`, `repo_group_ids`, `service_ids`. Reference in SQL as `$user_ids`, `$team_ids`, etc.

The **date range picker** (`$start_date` / `$end_date` in SQL) is not a variables entry — it is controlled by the report-level fields `date_range_variables_enabled` and `default_date_range_period` (one of `l7d`, `l14d`, `l2w`, `l4w`, `l4w_complete`, `l3m`, `l6m`, `l12m`, `wtd`, `mtd`, `qtd`, `ytd`, `last_week`, `last_month`, `last_quarter`, `last_year`).

### Custom variables

Custom variables are account-defined dropdown filters backed by a SQL query returning exactly two columns: `value` (substituted into tile SQL) and `label` (shown in the dropdown). They can be **enabled on a report and given defaults** via the YAML `variables` list, but they must already exist in the account: creating, editing, and deleting custom variable definitions still happens in the Data Studio UI. Private custom variables can only be attached when authenticating as the report owner.

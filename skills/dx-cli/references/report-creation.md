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
sections:
  - name: "Top section"
    description: "An optional description for the section"
tiles:
  - title: "Table"
    sql: |-
      SELECT 1 AS value
    chart_type: table
    chart_config: {}
    section_name: "Top section"
    width: full
    height: "1/2"
variables:
  - name: "team_ids"
    default_values:
      - "1"
      - "2"
    show_in_header: true
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

A report can be split into multiple sections, listed in the report's `sections` field. Each section should have a unique `name` field, and can have an optional `description`. Tiles can be assigned to a section that has yet to be created by setting the tile's `section_name` field to the `name` of the section, or they may be assigned to an existing section by setting the tile's `section_id` field to the `id` of the section.

---

## Tile configuration

Supported tile `chart_type` values are `line`, `pie`, `stacked_bar`, `scatter`, `table`, and `breakdown_table`.

Tiles `width` and `height` fields may be set to one of the following values: "1/4", "1/3", "1/2", "2/3", "3/4", or "full".

### Chart config

`line`, `stacked_bar`, and `scatter` chart configs require `xAxis` and `yAxes`; `pie` chart configs require `labelColumn` and `valueColumn`; `table` chart configs can be `{}`.

`chart_config` contains various settings for chart and tile display. Fields in `chart_config` remain unless explicitly cleared, so updating a report with a template that does not include a previously set setting will not inadvertently erase it.

### Breakdown tables

A `breakdown_table` type allows a tile to display a table with automatically aggregated results along teams, attributes, and groups. In order to use a breakdown table, the `sql` must return either `user_id` or `team_id` (if user-level data is unavailable), matching the `breakdownJoin` field in its `chart_config`. Additionally, the chart config should contain one or more `breakdownColumns`, each corresponding to a column in the displayed table. For example:

```yaml
breakdownColumns:
  - id: column_1
    label: Average PR size
    source: pr_size
    precision: 1
    calculation: mean
```

will have the table display a single column calculated based on the average value (rounded to a 1 decimal precision) of the tile query's `pr_size` column (`source`) within each aggregated team, attribute, or group. Valid `calculation` settings are `count`, `total`, `mean`, `median`, `p10`, `p25`, `p75`, and `p90`.

### Drilldowns

Tiles may optionally provide a Drilldown configuration, which allows report users to click on a data point on a chart or cell on a table to view another table with additional details based on where they clicked. To set up Drilldowns, a tile requires a `drilldown_sql` field to be provided with a separate SQL query that will be used to populate the table. This query will be provided access to several unique variables, prefixed with `$drilldown_` depending on the chart configuration and the columns returned in the tile's SQL.

To assist with constructing the `drilldown_sql`, existing tiles that are able to support adding a drilldown will return a `drilldown_variables_info` field, listing most of the variables available for use in the drilldown SQL. For example, a bar chart that has `xAxis` set to a `'date'` column, will return a value like:

```yaml
drilldown_variables_info:
  - column: date
    type: xaxis
    label: X-axis value
    param: drilldown_date
```

indicating on the `param` field, that `$drilldown_date` will be set to the value of the original query's `date` column corresponding to the bar on the chart that the user clicked on.

In addition, `table` and `breakdown_table` tiles will pass in drilldown variables for each column of the original query, that will each be set to their respective column's value for the row containing the cell that the user clicked on. For example, a table with sql returning `team_id` and `team_name` columns will pass the row values via `$drilldown_team_id` and `$drilldown_team_name`. Tiles with table chart types also support overriding the `drilldown_sql` when clicking on cells in specific columns, by setting the tile's `drilldown_column_sql` field to an object using the column names (or labels for breakdown tables) as keys and the overriding SQL as values. For example:

```yaml
drilldown_column_sql:
  pr_size: |-
    SELECT title, additions, deletions FROM pull_requests WHERE repo_id = $drilldown_repo_id
```

Note: Drilldown SQL for `breakdown_table` tiles must return the same `user_id` or `team_id` (`breakdownJoin`) column as the original tile's query.

### Other display options

Listed below are other optional fields supported in `chart_config`, depending on chart type.

**All tiles**

- `descriptionPlacement` — where the tile's `description` is shown: `below`, `above`, or `tooltip`.

**Line, stacked bar, and scatter charts**

- `groupByColumn` — a column whose distinct values split the data into separate series (`line` and `stacked_bar`).
- `xAxisLabel`, `yAxisLabel` — axis titles.
- `xAxisFormat` — display format for a date x-axis: `Jan`, `Jan 2024`, `Jan 1`, `Jan 1, 2024`, `01/01`, or `2024-01-01`. Defaults to a format based on the column type.
- `yAxisMinValue`, `yAxisMaxValue` — fixed y-axis bounds. The axis is sized automatically when unset.
- `showLegend`, `showTrendLine` — display toggles (`line`, `stacked_bar`).
- `valuePrefix`, `valueSuffix` — text shown before or after values, e.g. `"$"` or `"%"` (`line`, `stacked_bar`).
- `seriesLabels` — object mapping a `yAxes` column name to the display name for that series.
- `goalLines` — array of `yAxes` column names to draw as goal lines instead of regular series (`line`, `stacked_bar`).
- `annotations` — array of markers on a date x-axis, each with `date`, `label`, and `description`. `date` is an ISO date (`YYYY-MM-DD`) and must be unique; entries with a missing, invalid, or duplicate date are dropped. Not shown on horizontal bar charts.

**Stacked bar charts only**

- `groupingMode` — `stacked` (default) or `clustered`.
- `orientation` — `vertical` (default) or `horizontal`.
- `showDataLabels` — show values on the bars.
- `showLineOverlay` — overlay a line of the total across bars. Applies when bars are stacked (or there is a single series) and the chart is vertical.
- `hideXAxisTickMarks` — hide the x-axis tick labels.

**Colors (line, stacked bar, and pie charts)**

- `overrideColors` — object mapping a series name (or pie label) to a color, e.g. `{"Bug": "#e5484d"}`.

**Tables and breakdown tables**

- `conditionalFormats` — array of highlighting rules, each with `column`, `operator`, `value`, `value2` (optional), and `color`. A `null` `column` applies the rule to all columns; `value2` is only used with `between` operator. Supported `operator` values:
  - Text: `contains`, `not_contains`, `equals`, `starts_with`, `ends_with`, `is_empty`, `is_not_empty`
  - Number: `gt`, `gte`, `lt`, `lte`, `eq`, `neq`, `between`

Example:

```yaml
chart_type: stacked_bar
chart_config:
  xAxis: week
  yAxes: [merged, opened]
  groupingMode: clustered
  showLegend: true
  yAxisLabel: Pull requests
  seriesLabels:
    merged: Merged PRs
  overrideColors:
    merged: "#30a46c"
```

## Variables

Tile `sql` can reference built-in and custom studio variables to make a report interactive: place `$variable_name` anywhere in the query, and the selected value(s) are substituted in when the report runs.

A list of variables available for use in reports may be retrieved using `dx studio variables list`, and account-defined custom variables may be managed using the other `dx studio variables` commands. (See "Studio Variables Management")

In order to use variables in SQL for a report, they must be enabled and configured using the report's `variables` field. An enabled variable's `name` field is their unique name that will be used to reference the variable result in SQL. For example, `name: "team_ids"` will enable the built-in Teams dropdown and can be referenced with `$team_ids` in tile SQL. An enabled `select` variable may optionally have `default_values` set to an array of string values which will be automatically selected when a user views the report for the first time. If a default is not set, a `select` variable will initially select either all available options if `single_select` is false, or the first option if `single_select` is true.

### Tile filters

By default, all variable values are controlled by a single dropdown or text field for each variable, located on the report's header. Optionally, tiles may display their own individual filter controls for variables by setting a field `tileFilters` within `chart_config` to an array of variable names. Because fields in `chart_config` remain unless explicitly cleared, to clear this setting, `tileFilters` must be set to an empty array.

For example, a tile with the configuration

```yaml
tiles:
  - title: "Table"
    sql: |-
      SELECT 1 AS value
    chart_type: table
    chart_config:
      tileFilters:
        - team_ids
        - tag_ids
```

will show a Teams and an Attributes dropdown next to itself, in addition to the controls on the report header.

If a variable should only be controlled on each tile, the `show_in_header` field on the report's variable may also be set to false to hide that variable's controls on the report header.

### Built-in variables

- `$service_ids` — filter by specific services
- `$team_ids` — filter by team assignments
- `$tag_ids` — filter by attributes
- `$user_ids` — filter by individual users
- `$repo_ids` — filter by specific repositories
- `$start_date` and `$end_date` — filter by date range

Note: `$start_date` and `$end_date` are controlled by a single dropdown filter, and they must either both be added to `variables` or neither added.

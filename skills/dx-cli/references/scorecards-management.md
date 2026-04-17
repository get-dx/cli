# Scorecards Management

Scorecards evaluate entities against a set of SQL-based checks that are run on a single-tenant data lake product called Data Cloud. Each scorecard is either **LEVEL**-based (entities progress along named levels like Bronze/Silver/Gold) or **POINTS**-based (entities accumulate points from individual checks).

Changes to Scorecard configurations are managed via temporary YAML files. The typical workflow is: **init → edit → create or update**.

---

## Listing and Inspecting Scorecards

### List all scorecards

```
dx scorecards list
dx scorecards list --include-unpublished      # include draft scorecards
dx scorecards list --limit 10 --json
dx scorecards list --cursor <next_cursor>     # fetch the next page
dx scorecards list --include core             # show only core fields
```

`--include` narrows output to one or more sections: `core`, `owners`, `checks`.

### Get details about a scorecard

```
dx scorecards info <id>
dx scorecards info qjfj1a6cmit4 --json
dx scorecards info qjfj1a6cmit4 --include core,checks
```

The `<id>` is the scorecard's unique ID (e.g. `qjfj1a6cmit4`). Use `dx scorecards list --json` to discover IDs.

The response includes:

- Core fields: `name`, `description`, `type`, `published`, `entity_filter_type`, `entity_filter_sql`, `tags`, `levels` (LEVEL type), `check_groups` (POINTS type)
- Owners: `admins`, `editors`
- Checks: each check's `name`, `description`, `sql`, `filter_sql`, `level`, `points`, and other configuration

---

## Creating and Updating Scorecards

### Generate a YAML template

Start from a blank template when creating a new scorecard:

```
dx scorecards init ./my-scorecard.yaml
```

Or export an existing scorecard to a file for editing:

```
dx scorecards init ./my-scorecard.yaml --id qjfj1a6cmit4
```

### Create a scorecard

```
dx scorecards create --from-file ./my-scorecard.yaml
```

On success, the CLI prints the new scorecard's ID.

### Update an existing scorecard

```
dx scorecards update <id> --from-file ./my-scorecard.yaml
```

The YAML file will fully replace the scorecard's configuration, including each check definition. Use `dx scorecards init ./my-scorecard.yaml --id <id>` first to export the current state before editing.

---

## Deleting a Scorecard

```
dx scorecards delete <id>
dx scorecards delete qjfj1a6cmit4 --json
```

---

## Common Workflows

### Get information for a scorecard by name

```bash
# List all scorecards to find the one you need
dx scorecards list --json

# Inspect a specific scorecard including its checks
dx scorecards info qjfj1a6cmit4 --include core,checks --json
```

### Check how a specific entity is performing on scorecards

```bash
# View all scorecard results for an entity (uses the catalog entities command)
dx catalog entities scorecards my-service --json
```

### Create a new scorecard

```bash
# 1. Generate a blank template.
dx scorecards init ./new-scorecard.yaml

# 2. Edit the YAML file to define name, type, entity filter, levels/check_groups, and checks. Iterate on check queries until they are producing expected results.

# 3. Create the scorecard.
dx scorecards create --from-file ./new-scorecard.yaml
```

---

## Writing and Iterating on Check Queries

Each check contains a SQL query that runs against the organization's DX Data Cloud (DXDC) instance for every entity the scorecard covers. The query is executed once per entity, with entity-specific variables interpolated at run time.

### Query result columns

#### `status` (required)

The check engine reads the `status` column from the first returned row to determine whether the entity passes or fails. Always name the column explicitly. Valid values:

- `'PASS'` — entity passed
- `'WARN'` — entity is at risk; treated as passing but surfaced as a warning
- `'FAIL'` — entity failed

If the query returns zero rows, the check is treated as a query error (effectively a failure with an error message shown to service owners). Always ensure exactly one row is returned, even in "no data" cases.

#### `output` (optional)

A string or numeric value surfaced in the DX UI alongside the check result. Useful for displaying the actual measured value (e.g. uptime percentage, open bug count). Must only be included when the check has `output_enabled=true`.

#### `message` (optional)

A dynamic string (Markdown supported) shown to service owners alongside task information. Useful for tailoring failure messages per entity.

#### `related_properties` (optional)

A property identifier (or comma-separated list) that lets service owners quickly update the relevant catalog property directly from the failed check UI. Example: `'service-tier'`.

### Query variables

These are interpolated into the SQL for each entity at evaluation time:

- `$entity_identifier` — the entity's machine-readable slug (always available)
- `$entity_github_repo_ids` / `$entity_github_repo_names` — available when the entity has GitHub repo aliases (and similarly for other alias types)

### Query examples

#### Entity has an owner

```sql
SELECT CASE
    WHEN count(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM dx_catalog_entities e
  JOIN dx_catalog_entity_owners o ON e.id = o.entity_id
WHERE e.identifier = $entity_identifier;
```

#### A catalog property is set

```sql
SELECT CASE
    WHEN count(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM dx_catalog_entities e
  JOIN dx_catalog_entity_properties ep ON e.id = ep.entity_id
  JOIN dx_catalog_properties p ON p.id = ep.property_id
WHERE e.identifier = $entity_identifier
  AND p.identifier = 'service-tier';
```

#### SLO passes a threshold (with `output` column and WARN level)

```sql
WITH entity_slo AS (
  SELECT value AS uptime
  FROM custom.standard_slos
  WHERE entity_identifier = $entity_identifier
    AND type = 'uptime'
),
check_data AS (
  SELECT COALESCE((SELECT uptime FROM entity_slo), 0) AS uptime
)
SELECT
  CASE
    WHEN uptime >= 99.99 THEN 'PASS'
    WHEN uptime >= 99.9  THEN 'WARN'
    ELSE 'FAIL'
  END AS status,
  uptime AS output
FROM check_data;
```

This example relies on the DXDC instance to have defined a `standard_slos` table in the `custom` namespace.

### Iterating on a query with `dx studio query`

Use `dx studio query` to run arbitrary SQL against the DXDC instance and inspect results before committing a query to a scorecard. This avoids waiting for the full scorecard evaluation cycle and makes it easy to catch mistakes.

The iteration loop for developing or fixing a check query:

```bash
# 1. Run the candidate SQL directly, substituting a real entity identifier for the variable
dx studio query "
  SELECT CASE
      WHEN count(*) > 0 THEN 'PASS'
      ELSE 'FAIL'
    END AS status
  FROM dx_catalog_entities e
    JOIN dx_catalog_entity_owners o ON e.id = o.entity_id
  WHERE e.identifier = 'my-service'
"

# 2. Inspect the returned table. Adjust the query and repeat until the results look correct.

# 3. Once the query is correct, replace the hardcoded identifier with the $entity_identifier variable
#    and paste it into the `sql` field of the relevant check in the scorecard YAML.

# 4. Export the current scorecard to a file (skip if creating a new scorecard)
dx scorecards init ./my-scorecard.yaml --id qjfj1a6cmit4

# 5. Edit the `sql` field on the relevant check in the YAML. IMPORTANT: leave any unrelated YAML contents unchanged, since the `update` command will fully replace the scorecard's configuration with the contents of the file.

# 6. Push the update
dx scorecards update qjfj1a6cmit4 --from-file ./my-scorecard.yaml
```

`dx studio query` also accepts `--json` to return results as JSON, or `--output <file>` to save the full result set as CSV — useful when inspecting large result sets.

> **Tip:** When exploring available tables and columns, run `dx studio query 'SELECT * FROM github_pulls LIMIT 5'` or similar to familiarize yourself with the schema before writing check logic.

---

## Resources

The following pages from the DX docs site provide more information and best practices. Note that they are both visible only for authenticated users.

- [Writing scorecard checks](https://docs.getdx.com/scorecards/writing-checks/)
- [Example scorecards](https://docs.getdx.com/scorecards/examples/)

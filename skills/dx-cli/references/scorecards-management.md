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

### Edit a check's SQL query

TODO: turn this into a full h2 section

```bash
# 1. Export the current scorecard to a file
dx scorecards init ./my-scorecard.yaml --id qjfj1a6cmit4

# 2. Edit the `sql` field on the relevant check in the YAML

# 3. Push the update
dx scorecards update qjfj1a6cmit4 --from-file ./my-scorecard.yaml
```

---

## Resources

The following pages from the DX docs site provide more information and best practices. Note that they are both visible only for authenticated users.

- [Writing scorecard checks](https://docs.getdx.com/scorecards/writing-checks/)
- [Example scorecards](https://docs.getdx.com/scorecards/examples/)

# Studio Variables Management

Use `dx studio variables` to list, inspect, create, and update Data Studio variables available to use in reports. Variable payloads can be large because they include SQL so prefer the YAML-file workflow instead of trying to pass large payloads through shell flags.

Changes to Studio variable configurations are managed via temporary YAML files. The typical workflow is: **init -> edit -> create or update**.

## Listing and Inspecting Variables

### List all variables

```
dx studio variables list
```

Will return a list of built-in variables and account-defined custom variables. Built-in variables are available to use in reports, but cannot otherwise be inspected or modified.

Example output:
```
### Example Custom Variable ($variable_name)

ID:      EXAMPLE_ID
Creator: Test User (testuser@example.com)
```

### Get details about a custom variable

```
dx studio variables info <identifier>
dx studio variables info variable_name --json
dx studio variables info EXAMPLE_ID --json
```

Either the custom variable's ID or its name (e.g. `$variable_name`) may be used as an identifier in commands.

---

## Creating and Updating Custom Variables

### Generate a YAML template

Start from a blank template when creating a new variable:

```
dx studio variables init ./my-variable.yaml
```

Or export an existing custom variable to a file for editing:

```
dx studio variables init ./my-variable.yaml --from <identifier>
```

### Create a custom variable

```
dx studio variables create --from-file ./my-variable.yaml
```

On success, the CLI prints the new variable's information.

### Update an existing custom variable

```
dx studio variables update <identifier> --from-file ./my-variable.yaml
```

Use `dx studio variables init ./my-variable.yaml --from <identifier>` first to export the current state before editing.

### Delete an unused custom variable

```
dx studio variables delete <identifier>
```

Variables can only be deleted if they are not enabled on any reports.

### Use stdin

Use `--from-stdin` only when the YAML is being generated dynamically or piped from another command:

```
cat ./my-variable.yaml | dx studio variables create --from-stdin
cat ./my-variable.yaml | dx studio variables update <identifier> --from-stdin
```


---

## YAML Format

A variable's YAML file should use this format to configure the variable:

```yaml
# name: a unique name used to reference the variable in SQL
name: ""
# label: a readable label to display in the UI
label: ""

# variable_type: "select" or "text"
#   "select": (Dropdown menu) Provides a dropdown with options populated from a SQL query
#   "text": (Text field) Provides a freeform text input
variable_type: "select"

# single_select: If true, limits users to selecting only a single option from the dropdown
#   otherwise, multiple selections are passed to the SQL as a comma-separated list
#   (Only applicable when variable_type is "select")
single_select: false

# source_sql: The SQL query used to populate options for the dropdown
#   Query is expected to return a "label" and a "value" column,
#   where the "label" is displayed for each option in the dropdown, and the "value" is passed to the tile SQL.
#   (Only applicable when variable_type is "select")
source_sql: |-
  SELECT 'One' AS label, 1 AS value

# quote_values: Whether quotes will be included around values when passing to the tile SQL.
#   Optional. If not initially provided, a value will be automatically determined based on the source_sql.
quote_values: true

# public: Whether the variable is shared to be available for other users to add to reports. (Defaults to true)
public: true
```
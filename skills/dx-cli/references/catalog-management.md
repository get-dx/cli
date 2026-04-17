# Catalog Management

The Software Catalog is organized around **entities** (individual records like services or libraries) and **entity types** (the schemas that define what fields entities carry).

---

## Entities (`dx catalog entities`)

### Look up a specific entity

```
dx catalog entities info <identifier>
dx catalog entities info my-service --json
dx catalog entities info my-service --include core,owners
```

`--include` narrows output to one or more sections: `core`, `owners`, `properties`, `aliases`.

### List entities

```
dx catalog entities list
dx catalog entities list --type service
dx catalog entities list --search-term payment
dx catalog entities list --limit 25 --json
dx catalog entities list --cursor <next_cursor>
```

Pagination: when there are more results, the response includes a `next_cursor`. Pass it as `--cursor` to fetch the next page.

### Create an entity

```
dx catalog entities create --type service --identifier my-service
dx catalog entities create --type service --identifier my-service --name "My Service" --description "Handles payments"
dx catalog entities create --type service --identifier my-service --owner-team-ids MzI1NTA,MzI1NTk
dx catalog entities create --type service --identifier my-service --property tier=Tier-1 --property "languages=Ruby,TypeScript"
```

`--type` and `--identifier` are required. Properties are passed as `key=value` pairs; repeat `--property` for multiple. For `multi_select` and `list` types, separate values with commas.

### Update an entity

```
dx catalog entities update my-service --name "My Service"
dx catalog entities update my-service --owner-team-ids MzI1NTA,MzI1NTk --json
dx catalog entities update my-service --property tier=Tier-1 --property "languages=Ruby,TypeScript"
dx catalog entities update my-service --property tier=null   # removes the property value
```

Only the fields you pass are changed; omitted fields are left untouched.

### Upsert an entity (create or update)

```
dx catalog entities upsert --type service --identifier my-service --name "My Service"
dx catalog entities upsert --type service --identifier my-service --owner-team-ids MzI1NTA,MzI1NTk --json
```

Creates the entity if it does not exist, or updates it if it does. `--type` and `--identifier` are required. JSON output includes a `result` field: `"created_new_entity"` or `"updated_existing_entity"`.

### Delete an entity

```
dx catalog entities delete my-service
dx catalog entities delete my-service --json
```

### Get scorecard reports for an entity

```
dx catalog entities scorecards my-service
dx catalog entities scorecards my-service --json
dx catalog entities scorecards my-service --cursor <next_cursor>
```

Returns each scorecard's current evaluation result for this entity, including pass/fail status per check and the entity's current level (for LEVEL-type scorecards) or points (for POINTS-type scorecards).

### Get initiative tasks for an entity

```
dx catalog entities tasks my-service
dx catalog entities tasks my-service --json
dx catalog entities tasks my-service --cursor <next_cursor>
```

Returns the outstanding tasks (failing scorecard checks) assigned to this entity through active Initiatives.

---

## Entity Types (`dx catalog entityTypes`)

Entity types are managed via temporary YAML files. The typical workflow is: **init → edit → create or update**.

### Look up a specific entity type

```
dx catalog entityTypes info service
dx catalog entityTypes info service --json
dx catalog entityTypes info service --include core,properties
```

`--include` narrows output to one or more sections: `core`, `properties`, `aliases`.

### List all entity types

```
dx catalog entityTypes list
dx catalog entityTypes list --limit 10 --json
dx catalog entityTypes list --cursor <next_cursor>
dx catalog entityTypes list --include core
```

### Generate a YAML template

Start from a blank template:

```
dx catalog entityTypes init ./my-entity-type.yaml
```

Or export an existing entity type to a file for editing:

```
dx catalog entityTypes init ./my-entity-type.yaml --identifier service
```

After editing the YAML, create or update using the commands below.

### Create an entity type from YAML

```
dx catalog entityTypes create --from-file ./my-entity-type.yaml
```

### Update an entity type from YAML

```
dx catalog entityTypes update service --from-file ./my-entity-type.yaml
```

The `<identifier>` argument must match the entity type being updated. The YAML replaces all editable fields.

### Delete an entity type

```
dx catalog entityTypes delete service
dx catalog entityTypes delete service --json
```

---

## Working with Properties

Properties are typed fields defined on an entity type. When creating or updating entities, pass property values with `--property property-identifier=value`. The CLI validates property keys against the entity type definition and coerces values to the correct type.

| Property type                         | CLI value format          | Example                                  |
| ------------------------------------- | ------------------------- | ---------------------------------------- |
| `text`, `url`, `date`, `select`, etc. | Plain string              | `--property tier=Tier-1`                 |
| `number`                              | Numeric string            | `--property score=42`                    |
| `boolean`                             | `true` or `false`         | `--property active=true`                 |
| `multi_select`, `list`                | Comma-separated values    | `--property "languages=Ruby,TypeScript"` |
| `json`, `openapi`                     | JSON string               | `--property meta='{"key":"val"}'`        |
| `computed`, `file_matching_rule`      | Read-only — cannot be set | —                                        |

To remove a property value, pass `null` as the value: `--property tier=null`.

For exhaustive documentation on Properties, see the following pages on the DX docs site:

- [Properties](https://docs.getdx.com/webapi/types/property/): Lists each available property type and its `definition` schema.
- [Entity Properties](https://docs.getdx.com/webapi/types/properties/): Describes valid **values** an entity can contain for each property type.

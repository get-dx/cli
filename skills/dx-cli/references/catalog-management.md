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
dx catalog entities create --type service --identifier my-service --alias github_repo=12345
dx catalog entities create --type service --identifier my-service --alias "type=github_repo,identifier=12345,instance_identifier=789"
```

`--type` and `--identifier` are required. Properties and aliases are passed as `key=value` pairs; repeat `--property` or `--alias` for multiple. For `multi_select` and `list` property types, separate values with commas. Alias values must be the external/source identifier, not the human-readable name.

`--alias` supports two forms:

- **Short form**: `key=value` — e.g. `--alias github_repo=12345`. Use this when the alias type has only one instance (most cases).
- **Long form**: `type=<alias_type>,identifier=<id>[,instance_identifier=<instance_id>]` — e.g. `--alias "type=github_repo,identifier=11223344,instance_identifier=789"`. Use this when the alias type can exist across multiple system instances. `instance_identifier` identifies the specific deployment of the system in which the alias lives — for example, a self-hosted Jira server or a specific GitHub Enterprise instance. Omit it when there is only one global instance of that system.

### Update an entity

```
dx catalog entities update my-service --name "My Service"
dx catalog entities update my-service --owner-team-ids MzI1NTA,MzI1NTk --json
dx catalog entities update my-service --property tier=Tier-1 --property "languages=Ruby,TypeScript"
dx catalog entities update my-service --property tier=null   # removes the property value
dx catalog entities update my-service --alias github_repo=12345
dx catalog entities update my-service --alias "type=github_repo,identifier=12345,instance_identifier=789"
dx catalog entities update my-service --alias github_repo=null   # removes the alias
```

Only the fields you pass are changed; omitted fields are left untouched. Both short and long form aliases are supported (see the create section above).

### Upsert an entity (create or update)

```
dx catalog entities upsert --type service --identifier my-service --name "My Service"
dx catalog entities upsert --type service --identifier my-service --owner-team-ids MzI1NTA,MzI1NTk --json
dx catalog entities upsert --type service --identifier my-service --alias github_repo=12345
dx catalog entities upsert --type service --identifier my-service --alias "type=github_repo,identifier=12345,instance_identifier=789"
```

Creates the entity if it does not exist, or updates it if it does. `--type` and `--identifier` are required. JSON output includes a `result` field: `"created_new_entity"` or `"updated_existing_entity"`. Omitted fields, properties, and aliases are left untouched when updating an existing entity. Both short and long form aliases are supported (see the create section above).

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

---

## Working with Aliases

An entity alias links a DX catalog entity to an external system entity, such as a GitHub repository, PagerDuty service, Datadog service, or Jira project.

Important: the value after `=` must be the alias entry `identifier` / external source ID. Do not use the external object's display name, repo slug, or path. For GitHub repository aliases, use the repository source ID, not a repo name like `get-dx/cli`.

Alias keys are configured per entity type. To discover which alias keys are available, inspect entity types:

```
dx catalog entityTypes list --json
dx catalog entityTypes info service --include aliases --json
```

The JSON output includes an `aliases` field for each entity type. Use one of those alias type keys when creating, updating, or upserting an entity:

```
dx catalog entities create --type service --identifier my-service --alias github_repo=12345
dx catalog entities update my-service --alias github_repo=12345
dx catalog entities upsert --type service --identifier my-service --alias pagerduty_service=P12345
```

Repeat `--alias` to set multiple alias types or multiple identifiers for the same alias type in one command. The CLI validates alias keys against the entity type definition and sends each value as an alias entry identifier. This means `--alias github_repo=12345` is correct when `12345` is the source identifier; `--alias github_repo=get-dx/cli` is not correct because `get-dx/cli` is a name/path. Pass `null` to remove all aliases for that alias type:

```
dx catalog entities update my-service --alias github_repo=null
```

For exhaustive documentation on alias request and response shapes, see [Aliases](https://docs.getdx.com/webapi/types/aliases/).

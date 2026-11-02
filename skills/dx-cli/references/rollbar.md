# Rollbar tables

3 tables. Every join below is stated with the SQL to write.

## rollbar_environments

Details of the Rollbar environments.

`source` · `entity` · Rollbar

### Joins out — this table holds the key

- **rollbar_projects** — column not in the published schema · confidence: medium
  project_id is an integer, but rollbar_projects publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN rollbar_projects
    ON rollbar_projects.id = rollbar_environments.project_id
  ```

### Joined from — these point here, one-to-many

- **rollbar_items** — column not in the published schema · confidence: medium
  environment_id is an integer, but rollbar_environments publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN rollbar_environments
    ON rollbar_environments.id = rollbar_items.environment_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## rollbar_items

Details of the Rollbar items.

`source` · `entity` · Rollbar

### Joins out — this table holds the key

- **rollbar_projects** — column not in the published schema · confidence: medium
  project_id is an integer, but rollbar_projects publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN rollbar_projects
    ON rollbar_projects.id = rollbar_items.project_id
  ```
- **rollbar_environments** — column not in the published schema · confidence: medium
  environment_id is an integer, but rollbar_environments publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN rollbar_environments
    ON rollbar_environments.id = rollbar_items.environment_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## rollbar_projects

Details of the Rollbar projects.

`source` · `entity` · Rollbar

### Joined from — these point here, one-to-many

- **rollbar_environments** — column not in the published schema · confidence: medium
  project_id is an integer, but rollbar_projects publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN rollbar_projects
    ON rollbar_projects.id = rollbar_environments.project_id
  ```
- **rollbar_items** — column not in the published schema · confidence: medium
  project_id is an integer, but rollbar_projects publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN rollbar_projects
    ON rollbar_projects.id = rollbar_items.project_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

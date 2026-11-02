# Harness Pipelines tables

2 tables. Every join below is stated with the SQL to write.

## harness_organizations

Details about Harness organizations.

`source` · `lookup` · Harness Pipelines

### Joined from — these point here, one-to-many

- **harness_projects**
  ```sql
  JOIN harness_organizations
    ON harness_organizations.id = harness_projects.organization_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## harness_projects

Details about Harness projects.

`source` · `entity` · Harness Pipelines

### Joins out — this table holds the key

- **harness_organizations**
  ```sql
  JOIN harness_organizations
    ON harness_organizations.id = harness_projects.organization_id
  ```

### Joined from — these point here, one-to-many

- **pipeline_runs**
  ```sql
  JOIN harness_projects
    ON harness_projects.id = pipeline_runs.harness_project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

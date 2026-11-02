# Sentry tables

4 tables. Every join below is stated with the SQL to write.

## sentry_issue_environments

Details of the environments associated with Sentry issues.

`source` · `entity` · Sentry

### Joins out — this table holds the key

- **sentry_issues**
  ```sql
  JOIN sentry_issues
    ON sentry_issues.source_id = sentry_issue_environments.issue_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## sentry_issues

Details of the Sentry issues.

`source` · `entity` · Sentry

### Joins out — this table holds the key

- **sentry_projects**
  ```sql
  JOIN sentry_projects
    ON sentry_projects.source_id = sentry_issues.project_id
  ```

### Joined from — these point here, one-to-many

- **sentry_issue_environments**
  ```sql
  JOIN sentry_issues
    ON sentry_issues.source_id = sentry_issue_environments.issue_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sentry_organizations

Details of the Sentry organizations.

`source` · `lookup` · Sentry

### Joined from — these point here, one-to-many

- **sentry_projects**
  ```sql
  JOIN sentry_organizations
    ON sentry_organizations.source_id = sentry_projects.organization_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sentry_projects

Details of the Sentry projects.

`source` · `entity` · Sentry

### Joins out — this table holds the key

- **sentry_organizations**
  ```sql
  JOIN sentry_organizations
    ON sentry_organizations.source_id = sentry_projects.organization_id
  ```

### Joined from — these point here, one-to-many

- **sentry_issues**
  ```sql
  JOIN sentry_projects
    ON sentry_projects.source_id = sentry_issues.project_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

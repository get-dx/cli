# Bugsnag tables

3 tables. Every join below is stated with the SQL to write.

## bugsnag_errors

An Error is a grouping of events of the same crash/exception reported to Bugsnag.

`source` · `entity` · Bugsnag

### Joins out — this table holds the key

- **bugsnag_projects** — column not in the published schema · confidence: medium
  project_id is an integer, but bugsnag_projects publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN bugsnag_projects
    ON bugsnag_projects.id = bugsnag_errors.project_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## bugsnag_organizations

An Organization is a collection of Bugsnag projects.

`source` · `entity` · Bugsnag

### Joined from — these point here, one-to-many

- **bugsnag_projects** — column not in the published schema · confidence: medium
  organization_id is an integer, but bugsnag_organizations publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN bugsnag_organizations
    ON bugsnag_organizations.id = bugsnag_projects.organization_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## bugsnag_projects

A Project is used to record errors from an individual application that are reported.

`source` · `entity` · Bugsnag

### Joins out — this table holds the key

- **bugsnag_organizations** — column not in the published schema · confidence: medium
  organization_id is an integer, but bugsnag_organizations publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN bugsnag_organizations
    ON bugsnag_organizations.id = bugsnag_projects.organization_id
  ```

### Joined from — these point here, one-to-many

- **bugsnag_errors** — column not in the published schema · confidence: medium
  project_id is an integer, but bugsnag_projects publishes only a string source_id. The target of this join is an integer id column that is queryable but not part of the published schema.
  ```sql
  JOIN bugsnag_projects
    ON bugsnag_projects.id = bugsnag_errors.project_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

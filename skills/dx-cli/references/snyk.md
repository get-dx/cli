# Snyk tables

6 tables. Every join below is stated with the SQL to write.

## snyk_exploit_maturity_levels

Exploit maturity level information for Snyk issues.

`source` · `entity` · Snyk

### Joins out — this table holds the key

- **snyk_issues**
  ```sql
  JOIN snyk_issues
    ON snyk_issues.id = snyk_exploit_maturity_levels.issue_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## snyk_issue_packages

Package information related to Snyk issues.

`source` · `entity` · Snyk

### Joins out — this table holds the key

- **snyk_issues**
  ```sql
  JOIN snyk_issues
    ON snyk_issues.id = snyk_issue_packages.issue_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## snyk_issue_severities

Severity scores for Snyk issues from various sources.

`source` · `entity` · Snyk

### Joins out — this table holds the key

- **snyk_issues**
  ```sql
  JOIN snyk_issues
    ON snyk_issues.id = snyk_issue_severities.issue_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## snyk_issues

Details about Snyk issues.

`source` · `entity` · Snyk

### Joins out — this table holds the key

- **snyk_projects**
  ```sql
  JOIN snyk_projects
    ON snyk_projects.id = snyk_issues.project_id
  ```

### Joined from — these point here, one-to-many

- **snyk_exploit_maturity_levels**
  ```sql
  JOIN snyk_issues
    ON snyk_issues.id = snyk_exploit_maturity_levels.issue_id
  ```
- **snyk_issue_severities**
  ```sql
  JOIN snyk_issues
    ON snyk_issues.id = snyk_issue_severities.issue_id
  ```
- **snyk_issue_packages**
  ```sql
  JOIN snyk_issues
    ON snyk_issues.id = snyk_issue_packages.issue_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## snyk_organizations

Details about Snyk organizations.

`source` · `lookup` · Snyk

### Joined from — these point here, one-to-many

- **snyk_projects**
  ```sql
  JOIN snyk_organizations
    ON snyk_organizations.id = snyk_projects.organization_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Snyk id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## snyk_projects

Details about Snyk projects.

`source` · `entity` · Snyk

### Joins out — this table holds the key

- **snyk_organizations**
  ```sql
  JOIN snyk_organizations
    ON snyk_organizations.id = snyk_projects.organization_id
  ```

### Joined from — these point here, one-to-many

- **snyk_issues**
  ```sql
  JOIN snyk_projects
    ON snyk_projects.id = snyk_issues.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

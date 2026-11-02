# SonarCloud tables

9 tables. Every join below is stated with the SQL to write.

## sonarcloud_issue_tags

Join table between SonarCloud issues and tags.

`source` · `bridge` · SonarCloud

### Joins out — this table holds the key

- **sonarcloud_issues**
  ```sql
  JOIN sonarcloud_issues
    ON sonarcloud_issues.id = sonarcloud_issue_tags.issue_id
  ```
- **sonarcloud_tags**
  ```sql
  JOIN sonarcloud_tags
    ON sonarcloud_tags.id = sonarcloud_issue_tags.tag_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## sonarcloud_issues

Details about SonarCloud issues.

`source` · `entity` · SonarCloud

### Joins out — this table holds the key

- **sonarcloud_projects**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_issues.project_id
  ```

### Bridges — join through, never to

- **sonarcloud_issue_tags**
  ```sql
  JOIN sonarcloud_issues
    ON sonarcloud_issues.id = sonarcloud_issue_tags.issue_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarcloud_metrics

Details about SonarCloud metrics.

`source` · `lookup` · SonarCloud

### Joined from — these point here, one-to-many

- **sonarcloud_project_metrics**
  ```sql
  JOIN sonarcloud_metrics
    ON sonarcloud_metrics.id = sonarcloud_project_metrics.metric_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarcloud_organizations

Details about SonarCloud organizations.

`source` · `lookup` · SonarCloud

### Joined from — these point here, one-to-many

- **sonarcloud_projects**
  ```sql
  JOIN sonarcloud_organizations
    ON sonarcloud_organizations.id = sonarcloud_projects.organization_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarcloud_project_metrics

Details about metrics associated with SonarCloud projects.

`source` · `entity` · SonarCloud

### Joins out — this table holds the key

- **sonarcloud_projects**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_project_metrics.project_id
  ```
- **sonarcloud_metrics**
  ```sql
  JOIN sonarcloud_metrics
    ON sonarcloud_metrics.id = sonarcloud_project_metrics.metric_id
  ```

## sonarcloud_project_pull_requests

Pull requests associated with SonarCloud projects.

`source` · `entity` · SonarCloud

### Joins out — this table holds the key

- **sonarcloud_projects**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_project_pull_requests.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarcloud_projects

Details about SonarCloud projects.

`source` · `entity` · SonarCloud

### Joins out — this table holds the key

- **sonarcloud_organizations**
  ```sql
  JOIN sonarcloud_organizations
    ON sonarcloud_organizations.id = sonarcloud_projects.organization_id
  ```

### Joined from — these point here, one-to-many

- **sonarcloud_project_pull_requests**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_project_pull_requests.project_id
  ```
- **sonarcloud_issues**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_issues.project_id
  ```
- **sonarcloud_security_hotspots**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_security_hotspots.project_id
  ```
- **sonarcloud_project_metrics**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_project_metrics.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarcloud_security_hotspots

Details about SonarCloud security hotspots.

`source` · `entity` · SonarCloud

### Joins out — this table holds the key

- **sonarcloud_projects**
  ```sql
  JOIN sonarcloud_projects
    ON sonarcloud_projects.id = sonarcloud_security_hotspots.project_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarcloud_tags

Details about SonarCloud tags.

`source` · `lookup` · SonarCloud

### Bridges — join through, never to

- **sonarcloud_issue_tags**
  ```sql
  JOIN sonarcloud_tags
    ON sonarcloud_tags.id = sonarcloud_issue_tags.tag_id
  ```

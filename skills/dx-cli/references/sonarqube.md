# SonarQube Server tables

7 tables. Every join below is stated with the SQL to write.

## sonarqube_issue_tags

Join table between SonarQube issues and tags.

`source` · `bridge` · SonarQube Server

### Joins out — this table holds the key

- **sonarqube_issues**
  ```sql
  JOIN sonarqube_issues
    ON sonarqube_issues.id = sonarqube_issue_tags.issue_id
  ```
- **sonarqube_tags**
  ```sql
  JOIN sonarqube_tags
    ON sonarqube_tags.id = sonarqube_issue_tags.tag_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## sonarqube_issues

Details about SonarQube issues.

`source` · `entity` · SonarQube Server

### Joins out — this table holds the key

- **sonarqube_projects**
  ```sql
  JOIN sonarqube_projects
    ON sonarqube_projects.id = sonarqube_issues.project_id
  ```

### Bridges — join through, never to

- **sonarqube_issue_tags**
  ```sql
  JOIN sonarqube_issues
    ON sonarqube_issues.id = sonarqube_issue_tags.issue_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarqube_metrics

Details about SonarQube metrics.

`source` · `lookup` · SonarQube Server

### Joined from — these point here, one-to-many

- **sonarqube_project_metrics**
  ```sql
  JOIN sonarqube_metrics
    ON sonarqube_metrics.id = sonarqube_project_metrics.metric_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarqube_project_metrics

Details about metrics associated with SonarQube projects.

`source` · `entity` · SonarQube Server

### Joins out — this table holds the key

- **sonarqube_projects**
  ```sql
  JOIN sonarqube_projects
    ON sonarqube_projects.id = sonarqube_project_metrics.project_id
  ```
- **sonarqube_metrics**
  ```sql
  JOIN sonarqube_metrics
    ON sonarqube_metrics.id = sonarqube_project_metrics.metric_id
  ```

## sonarqube_projects

Details about SonarQube projects.

`source` · `lookup` · SonarQube Server

### Joined from — these point here, one-to-many

- **sonarqube_issues**
  ```sql
  JOIN sonarqube_projects
    ON sonarqube_projects.id = sonarqube_issues.project_id
  ```
- **sonarqube_security_hotspots**
  ```sql
  JOIN sonarqube_projects
    ON sonarqube_projects.id = sonarqube_security_hotspots.project_id
  ```
- **sonarqube_project_metrics**
  ```sql
  JOIN sonarqube_projects
    ON sonarqube_projects.id = sonarqube_project_metrics.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarqube_security_hotspots

Details about SonarQube security hotspots.

`source` · `entity` · SonarQube Server

### Joins out — this table holds the key

- **sonarqube_projects**
  ```sql
  JOIN sonarqube_projects
    ON sonarqube_projects.id = sonarqube_security_hotspots.project_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## sonarqube_tags

Details about SonarQube tags.

`source` · `lookup` · SonarQube Server

### Bridges — join through, never to

- **sonarqube_issue_tags**
  ```sql
  JOIN sonarqube_tags
    ON sonarqube_tags.id = sonarqube_issue_tags.tag_id
  ```

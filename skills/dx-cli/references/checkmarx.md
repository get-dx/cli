# Checkmarx tables

4 tables. Every join below is stated with the SQL to write.

## checkmarx_projects

Records of Checkmarx projects.

`source` · `lookup` · Checkmarx

### Joined from — these point here, one-to-many

- **checkmarx_tags**
  ```sql
  JOIN checkmarx_projects
    ON checkmarx_projects.id = checkmarx_tags.project_id
  ```
- **checkmarx_scans**
  ```sql
  JOIN checkmarx_projects
    ON checkmarx_projects.id = checkmarx_scans.project_id
  ```
- **checkmarx_results**
  ```sql
  JOIN checkmarx_projects
    ON checkmarx_projects.id = checkmarx_results.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## checkmarx_results

Records of Checkmarx scan results.

`source` · `entity` · Checkmarx

### Joins out — this table holds the key

- **checkmarx_scans**
  ```sql
  JOIN checkmarx_scans
    ON checkmarx_scans.id = checkmarx_results.scan_id
  ```
- **checkmarx_projects**
  ```sql
  JOIN checkmarx_projects
    ON checkmarx_projects.id = checkmarx_results.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## checkmarx_scans

Records of Checkmarx scans.

`source` · `entity` · Checkmarx

### Joins out — this table holds the key

- **checkmarx_projects**
  ```sql
  JOIN checkmarx_projects
    ON checkmarx_projects.id = checkmarx_scans.project_id
  ```

### Joined from — these point here, one-to-many

- **checkmarx_results**
  ```sql
  JOIN checkmarx_scans
    ON checkmarx_scans.id = checkmarx_results.scan_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## checkmarx_tags

Tags associated with Checkmarx projects.

`source` · `entity` · Checkmarx

### Joins out — this table holds the key

- **checkmarx_projects**
  ```sql
  JOIN checkmarx_projects
    ON checkmarx_projects.id = checkmarx_tags.project_id
  ```

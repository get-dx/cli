# Vercel Deployments tables

3 tables. Every join below is stated with the SQL to write.

## vercel_deployment_events

Raw Vercel deployments. Successful deployments to a production (or allowlisted) environment are promoted into unified deployments records.

`source` · `entity` · Vercel Deployments

### Joins out — this table holds the key

- **vercel_projects**
  ```sql
  JOIN vercel_projects
    ON vercel_projects.id = vercel_deployment_events.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## vercel_projects

Vercel projects, each of which deploys a single git repository.

`source` · `entity` · Vercel Deployments

### Joins out — this table holds the key

- **vercel_teams**
  ```sql
  JOIN vercel_teams
    ON vercel_teams.id = vercel_projects.team_id
  ```

### Joined from — these point here, one-to-many

- **vercel_deployment_events**
  ```sql
  JOIN vercel_projects
    ON vercel_projects.id = vercel_deployment_events.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## vercel_teams

Vercel teams the connected API token can access.

`source` · `lookup` · Vercel Deployments

### Joined from — these point here, one-to-many

- **vercel_projects**
  ```sql
  JOIN vercel_teams
    ON vercel_teams.id = vercel_projects.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

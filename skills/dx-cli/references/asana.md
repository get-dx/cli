# Asana tables

11 tables. Every join below is stated with the SQL to write.

## asana_custom_fields

Details of custom fields in Asana.

`source` · `entity` · Asana

### Joins out — this table holds the key

- **asana_workspaces**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_custom_fields.workspace_id
  ```

### Bridges — join through, never to

- **asana_task_custom_field_values**
  ```sql
  JOIN asana_custom_fields
    ON asana_custom_fields.id = asana_task_custom_field_values.custom_field_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## asana_project_tasks

Details of the association between tasks and projects in Asana.

`source` · `bridge` · Asana

### Joins out — this table holds the key

- **asana_tasks**
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = asana_project_tasks.task_id
  ```
- **asana_projects**
  ```sql
  JOIN asana_projects
    ON asana_projects.id = asana_project_tasks.project_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## asana_projects

Details of Asana projects.

`source` · `bridge` · Asana

### Joins out — this table holds the key

- **asana_workspaces**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_projects.workspace_id
  ```
- **asana_teams**
  ```sql
  JOIN asana_teams
    ON asana_teams.id = asana_projects.team_id
  ```

### Joined from — these point here, one-to-many

- **asana_sections**
  ```sql
  JOIN asana_projects
    ON asana_projects.id = asana_sections.project_id
  ```

### Bridges — join through, never to

- **asana_project_tasks**
  ```sql
  JOIN asana_projects
    ON asana_projects.id = asana_project_tasks.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## asana_sections

Details of sections in Asana.

`source` · `entity` · Asana

### Joins out — this table holds the key

- **asana_projects**
  ```sql
  JOIN asana_projects
    ON asana_projects.id = asana_sections.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## asana_task_custom_field_values

Details of custom field values associated with tasks in Asana.

`source` · `bridge` · Asana

### Joins out — this table holds the key

- **asana_tasks**
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = asana_task_custom_field_values.task_id
  ```
- **asana_custom_fields**
  ```sql
  JOIN asana_custom_fields
    ON asana_custom_fields.id = asana_task_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## asana_task_section_changes

A record of when tasks changed between sections.

`source` · `entity` · Asana

### Joins out — this table holds the key

- **asana_tasks**
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = asana_task_section_changes.task_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## asana_tasks

Details of Asana tasks.

`source` · `entity` · Asana

### Joins out — this table holds the key

- **asana_workspaces**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_tasks.workspace_id
  ```
- **asana_users**
  ```sql
  JOIN asana_users
    ON asana_users.id = asana_tasks.assignee_id
  ```
- **asana_users**
  ```sql
  JOIN asana_users
    ON asana_users.id = asana_tasks.creator_id
  ```

### Joined from — these point here, one-to-many

- **asana_task_section_changes**
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = asana_task_section_changes.task_id
  ```
- **issues** — Asana task · **requires `source = 'asana'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = issues.source_table_id
   AND issues.source = 'asana'
  ```

### Bridges — join through, never to

- **asana_project_tasks**
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = asana_project_tasks.task_id
  ```
- **asana_task_custom_field_values**
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = asana_task_custom_field_values.task_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins asana_users 2 different ways** — assignee_id, creator_id. These are separate columns that frequently hold different values, so joining asana_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## asana_team_memberships

Details of the association between users and teams in Asana.

`source` · `bridge` · Asana

### Joins out — this table holds the key

- **asana_teams**
  ```sql
  JOIN asana_teams
    ON asana_teams.id = asana_team_memberships.team_id
  ```
- **asana_users**
  ```sql
  JOIN asana_users
    ON asana_users.id = asana_team_memberships.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## asana_teams

Details of Asana teams.

`source` · `entity` · Asana

### Joins out — this table holds the key

- **asana_workspaces**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_teams.workspace_id
  ```

### Bridges — join through, never to

- **asana_projects**
  ```sql
  JOIN asana_teams
    ON asana_teams.id = asana_projects.team_id
  ```
- **asana_team_memberships**
  ```sql
  JOIN asana_teams
    ON asana_teams.id = asana_team_memberships.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## asana_users

Details of Asana users.

`source` · `lookup` · Asana

### Joined from — these point here, one-to-many

- **asana_tasks**
  ```sql
  JOIN asana_users
    ON asana_users.id = asana_tasks.assignee_id
  ```
- **asana_tasks**
  ```sql
  JOIN asana_users
    ON asana_users.id = asana_tasks.creator_id
  ```
- **identities** — asana identity · **requires `source = 'asana' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  asana_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = asana_users.id
   AND identities.source = 'asana'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **asana_team_memberships**
  ```sql
  JOIN asana_users
    ON asana_users.id = asana_team_memberships.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## asana_workspaces

Details of Asana workspaces.

`source` · `lookup` · Asana

### Joined from — these point here, one-to-many

- **asana_teams**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_teams.workspace_id
  ```
- **asana_tasks**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_tasks.workspace_id
  ```
- **asana_custom_fields**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_custom_fields.workspace_id
  ```

### Bridges — join through, never to

- **asana_projects**
  ```sql
  JOIN asana_workspaces
    ON asana_workspaces.id = asana_projects.workspace_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

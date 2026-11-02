# ClickUp tables

7 tables. Every join below is stated with the SQL to write.

## clickup_folders

Records of ClickUp folders

`source` · `entity` · ClickUp

### Joins out — this table holds the key

- **clickup_spaces**
  ```sql
  JOIN clickup_spaces
    ON clickup_spaces.id = clickup_folders.space_id
  ```

### Joined from — these point here, one-to-many

- **clickup_lists**
  ```sql
  JOIN clickup_folders
    ON clickup_folders.id = clickup_lists.folder_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## clickup_lists

Records of ClickUp lists

`source` · `entity` · ClickUp

### Joins out — this table holds the key

- **clickup_folders**
  ```sql
  JOIN clickup_folders
    ON clickup_folders.id = clickup_lists.folder_id
  ```

### Joined from — these point here, one-to-many

- **clickup_tasks**
  ```sql
  JOIN clickup_lists
    ON clickup_lists.id = clickup_tasks.list_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## clickup_spaces

Records of ClickUp spaces

`source` · `entity` · ClickUp

### Joins out — this table holds the key

- **clickup_teams**
  ```sql
  JOIN clickup_teams
    ON clickup_teams.id = clickup_spaces.team_id
  ```

### Joined from — these point here, one-to-many

- **clickup_folders**
  ```sql
  JOIN clickup_spaces
    ON clickup_spaces.id = clickup_folders.space_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## clickup_task_assignees

Join table between tasks and users

`source` · `bridge` · ClickUp

### Joins out — this table holds the key

- **clickup_tasks**
  ```sql
  JOIN clickup_tasks
    ON clickup_tasks.id = clickup_task_assignees.task_id
  ```
- **clickup_users**
  ```sql
  JOIN clickup_users
    ON clickup_users.id = clickup_task_assignees.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## clickup_tasks

Details about ClickUp tasks

`source` · `entity` · ClickUp

### Joins out — this table holds the key

- **clickup_lists**
  ```sql
  JOIN clickup_lists
    ON clickup_lists.id = clickup_tasks.list_id
  ```
- **clickup_users**
  ```sql
  JOIN clickup_users
    ON clickup_users.id = clickup_tasks.creator_id
  ```

### Joined from — these point here, one-to-many

- **issues** — ClickUp task · **requires `source = 'clickup'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN clickup_tasks
    ON clickup_tasks.id = issues.source_table_id
   AND issues.source = 'clickup'
  ```

### Bridges — join through, never to

- **clickup_task_assignees**
  ```sql
  JOIN clickup_tasks
    ON clickup_tasks.id = clickup_task_assignees.task_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## clickup_teams

Records of ClickUp teams

`source` · `lookup` · ClickUp

### Joined from — these point here, one-to-many

- **clickup_spaces**
  ```sql
  JOIN clickup_teams
    ON clickup_teams.id = clickup_spaces.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## clickup_users

Records of ClickUp users

`source` · `lookup` · ClickUp

### Joined from — these point here, one-to-many

- **clickup_tasks**
  ```sql
  JOIN clickup_users
    ON clickup_users.id = clickup_tasks.creator_id
  ```
- **identities** — clickup identity · **requires `source = 'clickup' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  clickup_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = clickup_users.id
   AND identities.source = 'clickup'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **clickup_task_assignees**
  ```sql
  JOIN clickup_users
    ON clickup_users.id = clickup_task_assignees.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

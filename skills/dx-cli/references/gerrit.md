# Gerrit tables

9 tables. Every join below is stated with the SQL to write.

## gerrit_change_comments

Details about comments on Gerrit changes.

`source` · `bridge` · Gerrit

### Joins out — this table holds the key

- **gerrit_changes**
  ```sql
  JOIN gerrit_changes
    ON gerrit_changes.id = gerrit_change_comments.change_id
  ```
- **gerrit_users**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_change_comments.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## gerrit_change_deployments

Join table between deployments and Gerrit changes with details.

`source` · `entity` · Gerrit

### Joins out — this table holds the key

- **gerrit_changes**
  ```sql
  JOIN gerrit_changes
    ON gerrit_changes.id = gerrit_change_deployments.change_id
  ```
- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = gerrit_change_deployments.deployment_id
  ```

## gerrit_changes

Details about Gerrit changes (pull requests).

`source` · `entity` · Gerrit

### Joins out — this table holds the key

- **gerrit_projects**
  ```sql
  JOIN gerrit_projects
    ON gerrit_projects.id = gerrit_changes.project_id
  ```
- **gerrit_users**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_changes.user_id
  ```
- **gerrit_users**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_changes.merged_by_user_id
  ```
- **gerrit_instances**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_changes.gerrit_instance_id
  ```

### Joined from — these point here, one-to-many

- **gerrit_reviews**
  ```sql
  JOIN gerrit_changes
    ON gerrit_changes.id = gerrit_reviews.change_id
  ```
- **gerrit_change_deployments**
  ```sql
  JOIN gerrit_changes
    ON gerrit_changes.id = gerrit_change_deployments.change_id
  ```

### Bridges — join through, never to

- **gerrit_change_comments**
  ```sql
  JOIN gerrit_changes
    ON gerrit_changes.id = gerrit_change_comments.change_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins gerrit_users 2 different ways** — user_id, merged_by_user_id. These are separate columns that frequently hold different values, so joining gerrit_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## gerrit_groups

Details about Gerrit groups.

`source` · `entity` · Gerrit

### Joins out — this table holds the key

- **gerrit_instances**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_groups.gerrit_instance_id
  ```

### Bridges — join through, never to

- **gerrit_user_group_memberships**
  ```sql
  JOIN gerrit_groups
    ON gerrit_groups.id = gerrit_user_group_memberships.group_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Gerrit id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gerrit_instances

Gerrit hosts, keyed by normalized instance URL, shared across connections.

`source` · `lookup` · Gerrit

### Joined from — these point here, one-to-many

- **gerrit_projects**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_projects.gerrit_instance_id
  ```
- **gerrit_groups**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_groups.gerrit_instance_id
  ```
- **gerrit_users**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_users.gerrit_instance_id
  ```
- **gerrit_changes**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_changes.gerrit_instance_id
  ```

## gerrit_projects

Details about Gerrit projects.

`source` · `entity` · Gerrit

### Joins out — this table holds the key

- **gerrit_instances**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_projects.gerrit_instance_id
  ```

### Joined from — these point here, one-to-many

- **gerrit_changes**
  ```sql
  JOIN gerrit_projects
    ON gerrit_projects.id = gerrit_changes.project_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Gerrit id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gerrit_reviews

Details about reviews on Gerrit changes.

`source` · `entity` · Gerrit

### Joins out — this table holds the key

- **gerrit_changes**
  ```sql
  JOIN gerrit_changes
    ON gerrit_changes.id = gerrit_reviews.change_id
  ```
- **gerrit_users**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_reviews.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gerrit_user_group_memberships

Join table representing the Gerrit groups to which each Gerrit user directly belongs.

`source` · `bridge` · Gerrit

### Joins out — this table holds the key

- **gerrit_users**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_user_group_memberships.user_id
  ```
- **gerrit_groups**
  ```sql
  JOIN gerrit_groups
    ON gerrit_groups.id = gerrit_user_group_memberships.group_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## gerrit_users

Details about Gerrit users.

`source` · `entity` · Gerrit

### Joins out — this table holds the key

- **gerrit_instances**
  ```sql
  JOIN gerrit_instances
    ON gerrit_instances.id = gerrit_users.gerrit_instance_id
  ```

### Joined from — these point here, one-to-many

- **gerrit_changes**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_changes.user_id
  ```
- **gerrit_changes**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_changes.merged_by_user_id
  ```
- **gerrit_reviews**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_reviews.user_id
  ```
- **identities** — gerrit identity · **requires `source = 'gerrit' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  gerrit_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = gerrit_users.id
   AND identities.source = 'gerrit'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **gerrit_user_group_memberships**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_user_group_memberships.user_id
  ```
- **gerrit_change_comments**
  ```sql
  JOIN gerrit_users
    ON gerrit_users.id = gerrit_change_comments.user_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Gerrit id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

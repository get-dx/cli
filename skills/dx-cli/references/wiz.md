# Wiz tables

8 tables. Every join below is stated with the SQL to write.

## wiz_cloud_resources

Details about cloud resources tracked by Wiz.

`source` · `lookup` · Wiz

### Joined from — these point here, one-to-many

- **wiz_resource_tags**
  ```sql
  JOIN wiz_cloud_resources
    ON wiz_cloud_resources.id = wiz_resource_tags.cloud_resource_id
  ```
- **wiz_configuration_findings**
  ```sql
  JOIN wiz_cloud_resources
    ON wiz_cloud_resources.id = wiz_configuration_findings.cloud_resource_id
  ```

### Bridges — join through, never to

- **wiz_resource_projects**
  ```sql
  JOIN wiz_cloud_resources
    ON wiz_cloud_resources.id = wiz_resource_projects.cloud_resource_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Wiz id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## wiz_configuration_findings

Security configuration findings (misconfigurations) detected by Wiz.

`source` · `entity` · Wiz

### Joins out — this table holds the key

- **wiz_cloud_resources**
  ```sql
  JOIN wiz_cloud_resources
    ON wiz_cloud_resources.id = wiz_configuration_findings.cloud_resource_id
  ```
- **wiz_rules**
  ```sql
  JOIN wiz_rules
    ON wiz_rules.id = wiz_configuration_findings.rule_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Wiz id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## wiz_projects

Details about Wiz security projects and folders.

`source` · `lookup` · Wiz

### Bridges — join through, never to

- **wiz_user_projects**
  ```sql
  JOIN wiz_projects
    ON wiz_projects.id = wiz_user_projects.project_id
  ```
- **wiz_resource_projects**
  ```sql
  JOIN wiz_projects
    ON wiz_projects.id = wiz_resource_projects.project_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Wiz id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## wiz_resource_projects

Join table between cloud resources and projects.

`source` · `bridge` · Wiz

### Joins out — this table holds the key

- **wiz_cloud_resources**
  ```sql
  JOIN wiz_cloud_resources
    ON wiz_cloud_resources.id = wiz_resource_projects.cloud_resource_id
  ```
- **wiz_projects**
  ```sql
  JOIN wiz_projects
    ON wiz_projects.id = wiz_resource_projects.project_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## wiz_resource_tags

Tags associated with cloud resources in Wiz.

`source` · `entity` · Wiz

### Joins out — this table holds the key

- **wiz_cloud_resources**
  ```sql
  JOIN wiz_cloud_resources
    ON wiz_cloud_resources.id = wiz_resource_tags.cloud_resource_id
  ```

## wiz_rules

Wiz configuration rules referenced by configuration findings.

`source` · `lookup` · Wiz

### Joined from — these point here, one-to-many

- **wiz_configuration_findings**
  ```sql
  JOIN wiz_rules
    ON wiz_rules.id = wiz_configuration_findings.rule_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Wiz id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## wiz_user_projects

Join table between Wiz users and their assigned projects.

`source` · `bridge` · Wiz

### Joins out — this table holds the key

- **wiz_users**
  ```sql
  JOIN wiz_users
    ON wiz_users.id = wiz_user_projects.user_id
  ```
- **wiz_projects**
  ```sql
  JOIN wiz_projects
    ON wiz_projects.id = wiz_user_projects.project_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## wiz_users

Details about Wiz users.

`source` · `lookup` · Wiz

### Joined from — these point here, one-to-many

- **identities** — wiz identity · **requires `source = 'wiz' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  wiz_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = wiz_users.id
   AND identities.source = 'wiz'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **wiz_user_projects**
  ```sql
  JOIN wiz_users
    ON wiz_users.id = wiz_user_projects.user_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Wiz id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

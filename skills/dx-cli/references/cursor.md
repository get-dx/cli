# Cursor tables

19 tables. Every join below is stated with the SQL to write.

## cursor_agent_edits

Daily agent edit metrics per user from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_agent_edits.daily_user_metric_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_agent_usages

Daily agent usage by mode and model from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_agent_usages.daily_user_metric_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_code_change_files

File-level changes linked to code change metrics from Cursor.

`source` · `entity` · Cursor

No documented relationships.

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## cursor_code_changes

Individual code change metrics by source (TAB or COMPOSER) from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_users** — author · case-insensitive match · confidence: medium
  Cursor's code-change tables identify a person by email rather than by a foreign key into cursor_users.
  ```sql
  JOIN cursor_users
    ON lower(cursor_users.email) = lower(cursor_code_changes.user_email)
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_command_usages

Daily command usage per user from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_command_usages.daily_user_metric_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_commits

Commit-level metrics with AI code breakdown from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_users** — author · case-insensitive match · confidence: medium
  Same email-only identification as cursor_code_changes, on the commit table.
  ```sql
  JOIN cursor_users
    ON lower(cursor_users.email) = lower(cursor_commits.user_email)
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_cost_breakdowns

Individual usage events with cost and token details from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_cost_breakdowns.daily_user_metric_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_daily_user_metrics

Daily User Metrics from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_teams**
  ```sql
  JOIN cursor_teams
    ON cursor_teams.source_id = cursor_daily_user_metrics.cursor_team_id
  ```
- **cursor_users**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_daily_user_metrics.cursor_user_id
  ```

### Joined from — these point here, one-to-many

- **cursor_cost_breakdowns**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_cost_breakdowns.daily_user_metric_id
  ```
- **cursor_agent_edits**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_agent_edits.daily_user_metric_id
  ```
- **cursor_model_breakdowns**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_model_breakdowns.daily_user_metric_id
  ```
- **cursor_agent_usages**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_agent_usages.daily_user_metric_id
  ```
- **cursor_mcp_usages**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_mcp_usages.daily_user_metric_id
  ```
- **cursor_command_usages**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_command_usages.daily_user_metric_id
  ```
- **cursor_skill_usages**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_skill_usages.daily_user_metric_id
  ```
- **ai_tool_daily_metrics** — crosses vendors · column not in the published schema · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for cursor>'
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## cursor_mcp_usages

Daily MCP tool usage per user from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_mcp_usages.daily_user_metric_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_model_breakdowns

Per-model message counts per user per day from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_model_breakdowns.daily_user_metric_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_origin_installations

Details about the Cursor Origin app installations for your connection.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_origin_namespaces**
  ```sql
  JOIN cursor_origin_namespaces
    ON cursor_origin_namespaces.id = cursor_origin_installations.namespace_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Cursor id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## cursor_origin_namespaces

Details about the Cursor Origin namespaces (users or organizations) your app is installed into.

`source` · `lookup` · Cursor

### Joined from — these point here, one-to-many

- **cursor_origin_installations**
  ```sql
  JOIN cursor_origin_namespaces
    ON cursor_origin_namespaces.id = cursor_origin_installations.namespace_id
  ```
- **cursor_origin_repositories**
  ```sql
  JOIN cursor_origin_namespaces
    ON cursor_origin_namespaces.id = cursor_origin_repositories.namespace_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Cursor id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## cursor_origin_pulls

Details about the pull requests in your Cursor Origin repositories.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_origin_repositories**
  ```sql
  JOIN cursor_origin_repositories
    ON cursor_origin_repositories.id = cursor_origin_pulls.repository_id
  ```
- **cursor_users**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_origin_pulls.user_id
  ```

### Joined from — these point here, one-to-many

- **cursor_origin_reviews**
  ```sql
  JOIN cursor_origin_pulls
    ON cursor_origin_pulls.id = cursor_origin_reviews.pull_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## cursor_origin_repositories

Details about the Cursor Origin repositories in your namespaces.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_origin_namespaces**
  ```sql
  JOIN cursor_origin_namespaces
    ON cursor_origin_namespaces.id = cursor_origin_repositories.namespace_id
  ```

### Joined from — these point here, one-to-many

- **cursor_origin_pulls**
  ```sql
  JOIN cursor_origin_repositories
    ON cursor_origin_repositories.id = cursor_origin_pulls.repository_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## cursor_origin_reviews

Details about the reviews on your Cursor Origin pull requests.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_origin_pulls**
  ```sql
  JOIN cursor_origin_pulls
    ON cursor_origin_pulls.id = cursor_origin_reviews.pull_id
  ```
- **cursor_users**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_origin_reviews.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## cursor_skill_usages

Daily skill usage per user from Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.date = cursor_skill_usages.daily_user_metric_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Nothing here joins on a key** — Every way into this table matches on an email or a name rather than an id, so a row that changes its email loses its history and two people sharing one address merge into one. Compare lower-cased on both sides, and go through identities and dx_users if you need a person that stays the same over time.

## cursor_team_member_spends

Metrics for each team member's spend and usage in Cursor.

`source` · `entity` · Cursor

### Joins out — this table holds the key

- **cursor_users**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_team_member_spends.cursor_user_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## cursor_teams

Cursor teams discovered from connected API credentials.

`source` · `lookup` · Cursor

### Joined from — these point here, one-to-many

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_teams
    ON cursor_teams.source_id = cursor_daily_user_metrics.cursor_team_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## cursor_users

Details of the users within Cursor.

`source` · `lookup` · Cursor

### Joined from — these point here, one-to-many

- **cursor_daily_user_metrics**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_daily_user_metrics.cursor_user_id
  ```
- **cursor_team_member_spends**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_team_member_spends.cursor_user_id
  ```
- **cursor_origin_pulls**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_origin_pulls.user_id
  ```
- **cursor_origin_reviews**
  ```sql
  JOIN cursor_users
    ON cursor_users.source_id = cursor_origin_reviews.user_id
  ```
- **cursor_code_changes** — author · case-insensitive match · confidence: medium
  Cursor's code-change tables identify a person by email rather than by a foreign key into cursor_users.
  ```sql
  JOIN cursor_users
    ON lower(cursor_users.email) = lower(cursor_code_changes.user_email)
  ```
- **cursor_commits** — author · case-insensitive match · confidence: medium
  Same email-only identification as cursor_code_changes, on the commit table.
  ```sql
  JOIN cursor_users
    ON lower(cursor_users.email) = lower(cursor_commits.user_email)
  ```
- **identities** — cursor identity · **requires `source = 'cursor'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'cursor' matches a row in cursor_users.
  ```sql
  JOIN identities
    ON identities.source_id = cursor_users.id
   AND identities.source = 'cursor'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

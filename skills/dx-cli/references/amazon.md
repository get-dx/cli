# Amazon Kiro tables

6 tables. Every join below is stated with the SQL to write.

## amazon_kiro_daily_user_metrics

Daily metrics for Amazon Kiro users.

`source` · `entity` · Amazon Kiro

### Joins out — this table holds the key

- **amazon_kiro_users**
  ```sql
  JOIN amazon_kiro_users
    ON amazon_kiro_users.id = amazon_kiro_daily_user_metrics.user_id
  ```

### Joined from — these point here, one-to-many

- **amazon_kiro_metrics_breakdowns**
  ```sql
  JOIN amazon_kiro_daily_user_metrics
    ON amazon_kiro_daily_user_metrics.id = amazon_kiro_metrics_breakdowns.daily_user_metric_id
  ```
- **ai_tool_daily_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN amazon_kiro_daily_user_metrics
    ON amazon_kiro_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for amazon>'
  ```

## amazon_kiro_metrics_breakdowns

Per-client metric breakdown for a Kiro daily user metric row.

`source` · `entity` · Amazon Kiro

### Joins out — this table holds the key

- **amazon_kiro_daily_user_metrics**
  ```sql
  JOIN amazon_kiro_daily_user_metrics
    ON amazon_kiro_daily_user_metrics.id = amazon_kiro_metrics_breakdowns.daily_user_metric_id
  ```

### Joined from — these point here, one-to-many

- **amazon_kiro_model_breakdowns**
  ```sql
  JOIN amazon_kiro_metrics_breakdowns
    ON amazon_kiro_metrics_breakdowns.id = amazon_kiro_model_breakdowns.metrics_breakdown_id
  ```

## amazon_kiro_model_breakdowns

Per-model message counts for a Kiro metrics breakdown row.

`source` · `entity` · Amazon Kiro

### Joins out — this table holds the key

- **amazon_kiro_metrics_breakdowns**
  ```sql
  JOIN amazon_kiro_metrics_breakdowns
    ON amazon_kiro_metrics_breakdowns.id = amazon_kiro_model_breakdowns.metrics_breakdown_id
  ```

## amazon_kiro_users

Details of Amazon Kiro users.

`source` · `lookup` · Amazon Kiro

### Joined from — these point here, one-to-many

- **amazon_kiro_daily_user_metrics**
  ```sql
  JOIN amazon_kiro_users
    ON amazon_kiro_users.id = amazon_kiro_daily_user_metrics.user_id
  ```
- **identities** — amazon_kiro identity · **requires `source = 'amazon_kiro' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  amazon_kiro_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = amazon_kiro_users.id
   AND identities.source = 'amazon_kiro'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## amazon_q_daily_user_metrics

Daily metrics for Amazon Q users.

`source` · `entity` · Amazon Q

### Joins out — this table holds the key

- **amazon_q_users**
  ```sql
  JOIN amazon_q_users
    ON amazon_q_users.id = amazon_q_daily_user_metrics.user_id
  ```

### Joined from — these point here, one-to-many

- **ai_tool_daily_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN amazon_q_daily_user_metrics
    ON amazon_q_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for amazon>'
  ```

## amazon_q_users

Details of Amazon Q users.

`source` · `lookup` · Amazon Q

### Joined from — these point here, one-to-many

- **amazon_q_daily_user_metrics**
  ```sql
  JOIN amazon_q_users
    ON amazon_q_users.id = amazon_q_daily_user_metrics.user_id
  ```
- **identities** — amazon_q identity · **requires `source = 'amazon_q' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  amazon_q_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = amazon_q_users.id
   AND identities.source = 'amazon_q'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

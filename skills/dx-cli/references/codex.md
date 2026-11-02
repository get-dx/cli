# OpenAI Codex (OTEL) tables

4 tables. Every join below is stated with the SQL to write.

## codex_client_usage_breakdowns

Daily Codex usage metrics per user broken down by client application.

`source` · `entity` · OpenAI Codex (Enterprise), OpenAI Codex (OTEL)

### Joins out — this table holds the key

- **codex_daily_usages**
  ```sql
  JOIN codex_daily_usages
    ON codex_daily_usages.id = codex_client_usage_breakdowns.daily_usage_id
  ```

## codex_daily_usages

Daily Codex usage metrics per user

`source` · `entity` · OpenAI Codex (Enterprise), OpenAI Codex (OTEL)

### Joins out — this table holds the key

- **codex_users**
  ```sql
  JOIN codex_users
    ON codex_users.id = codex_daily_usages.user_id
  ```

### Joined from — these point here, one-to-many

- **codex_client_usage_breakdowns**
  ```sql
  JOIN codex_daily_usages
    ON codex_daily_usages.id = codex_client_usage_breakdowns.daily_usage_id
  ```
- **codex_model_usage_breakdowns**
  ```sql
  JOIN codex_daily_usages
    ON codex_daily_usages.id = codex_model_usage_breakdowns.daily_usage_id
  ```
- **ai_tool_daily_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN codex_daily_usages
    ON codex_daily_usages.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for codex>'
  ```

## codex_model_usage_breakdowns

Daily Codex usage metrics per user broken down by model and speed.

`source` · `entity` · OpenAI Codex (Enterprise), OpenAI Codex (OTEL)

### Joins out — this table holds the key

- **codex_daily_usages**
  ```sql
  JOIN codex_daily_usages
    ON codex_daily_usages.id = codex_model_usage_breakdowns.daily_usage_id
  ```

## codex_users

Users from OpenAI Codex AI coding tool

`source` · `lookup` · OpenAI Codex (Enterprise), OpenAI Codex (OTEL)

### Joined from — these point here, one-to-many

- **codex_daily_usages**
  ```sql
  JOIN codex_users
    ON codex_users.id = codex_daily_usages.user_id
  ```
- **identities** — codex identity · **requires `source = 'codex' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  codex_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = codex_users.id
   AND identities.source = 'codex'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

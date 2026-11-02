# Gemini CLI (OTEL) tables

4 tables. Every join below is stated with the SQL to write.

## gemini_daily_user_metrics

Daily usage metrics for Gemini CLI AI coding assistant users

`source` · `entity` · Gemini CLI (OTEL)

### Joins out — this table holds the key

- **gemini_users** — metrics for user · confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN gemini_users
    ON gemini_users.id = gemini_daily_user_metrics.user_id
  ```

### Joined from — these point here, one-to-many

- **gemini_daily_user_metrics_breakdowns** — detail for day · confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN gemini_daily_user_metrics
    ON gemini_daily_user_metrics.id = gemini_daily_user_metrics_breakdowns.daily_user_metric_id
  ```
- **ai_tool_daily_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN gemini_daily_user_metrics
    ON gemini_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for gemini>'
  ```

## gemini_daily_user_metrics_breakdowns

Detailed daily usage metrics breakdown for Gemini CLI AI coding assistant users.

`source` · `entity` · Gemini CLI (OTEL)

### Joins out — this table holds the key

- **gemini_daily_user_metrics** — detail for day · confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN gemini_daily_user_metrics
    ON gemini_daily_user_metrics.id = gemini_daily_user_metrics_breakdowns.daily_user_metric_id
  ```

### Joined from — these point here, one-to-many

- **gemini_model_breakdowns** — models for day · confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN gemini_daily_user_metrics_breakdowns
    ON gemini_daily_user_metrics_breakdowns.id = gemini_model_breakdowns.daily_user_metrics_breakdown_id
  ```

### Caveats

- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## gemini_model_breakdowns

Model-level token usage breakdown for Gemini CLI daily user metrics.

`source` · `entity` · Gemini CLI (OTEL)

### Joins out — this table holds the key

- **gemini_daily_user_metrics_breakdowns** — models for day · confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN gemini_daily_user_metrics_breakdowns
    ON gemini_daily_user_metrics_breakdowns.id = gemini_model_breakdowns.daily_user_metrics_breakdown_id
  ```

### Caveats

- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## gemini_users

Users from the Gemini CLI AI coding assistant

`source` · `entity` · Gemini CLI (OTEL)

### Joined from — these point here, one-to-many

- **gemini_daily_user_metrics** — metrics for user · confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN gemini_users
    ON gemini_users.id = gemini_daily_user_metrics.user_id
  ```
- **identities** — gemini identity · **requires `source = 'gemini' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  gemini_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = gemini_users.id
   AND identities.source = 'gemini'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

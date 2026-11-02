# Devin AI tables

1 tables. Every join below is stated with the SQL to write.

## devin_daily_user_metrics

Daily consumption metrics for Devin AI users.

`source` · `entity` · Devin AI

### Joined from — these point here, one-to-many

- **ai_tool_daily_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN devin_daily_user_metrics
    ON devin_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for devin>'
  ```

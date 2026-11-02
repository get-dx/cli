# CodeRabbit tables

3 tables. Every join below is stated with the SQL to write.

## coderabbit_daily_user_metrics

Daily activity metrics for a CodeRabbit user.

`source` · `entity` · CodeRabbit

### Joins out — this table holds the key

- **coderabbit_users**
  ```sql
  JOIN coderabbit_users
    ON coderabbit_users.source_id = coderabbit_daily_user_metrics.user_id
  ```

### Joined from — these point here, one-to-many

- **ai_tool_daily_metrics** — crosses vendors · column not in the published schema · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN coderabbit_daily_user_metrics
    ON coderabbit_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for coderabbit>'
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## coderabbit_pr_reviews

Per-PR CodeRabbit review metrics returned by the Metrics Data API.

`source` · `entity` · CodeRabbit

### Joins out — this table holds the key

- **coderabbit_users**
  ```sql
  JOIN coderabbit_users
    ON coderabbit_users.source_id = coderabbit_pr_reviews.user_id
  ```
- **pull_requests**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = coderabbit_pr_reviews.pull_request_id
  ```
- **repos**
  ```sql
  JOIN repos
    ON repos.id = coderabbit_pr_reviews.repo_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## coderabbit_users

Users from CodeRabbit identified by their Git provider author.

`source` · `lookup` · CodeRabbit

### Joined from — these point here, one-to-many

- **coderabbit_daily_user_metrics**
  ```sql
  JOIN coderabbit_users
    ON coderabbit_users.source_id = coderabbit_daily_user_metrics.user_id
  ```
- **coderabbit_pr_reviews**
  ```sql
  JOIN coderabbit_users
    ON coderabbit_users.source_id = coderabbit_pr_reviews.user_id
  ```
- **identities** — coderabbit identity · **requires `source = 'coderabbit' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  coderabbit_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = coderabbit_users.id
   AND identities.source = 'coderabbit'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

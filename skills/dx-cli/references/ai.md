# AI Code Metrics tables

14 tables. Every join below is stated with the SQL to write.

## ai_code_commit_file_sessions

Join table linking each commit file to the AI sessions that contributed to it. Keyed by session external_id (UUID from daemon) so rows can exist before the corresponding ai_sessions row is upserted.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_code_commit_files**
  ```sql
  JOIN ai_code_commit_files
    ON ai_code_commit_files.id = ai_code_commit_file_sessions.ai_code_commit_file_id
  ```

## ai_code_commit_files

File-level AI code metrics for each commit.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_code_commits**
  ```sql
  JOIN ai_code_commits
    ON ai_code_commits.id = ai_code_commit_files.ai_code_commit_id
  ```

### Joined from — these point here, one-to-many

- **ai_code_commit_file_sessions**
  ```sql
  JOIN ai_code_commit_files
    ON ai_code_commit_files.id = ai_code_commit_file_sessions.ai_code_commit_file_id
  ```

## ai_code_commit_users

Mapping table linking email addresses to DX users for AI code commit attribution.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = ai_code_commit_users.dx_user_id
  ```

## ai_code_commits

AI code commits with metrics about AI-generated code retention and modification.

`source` · `lookup` · AI Code Metrics

### Joined from — these point here, one-to-many

- **ai_code_commit_files**
  ```sql
  JOIN ai_code_commits
    ON ai_code_commits.id = ai_code_commit_files.ai_code_commit_id
  ```

## ai_code_daemon_installations

Current state of each daemon installation. One row per (git_email, machine_name, daemon_os) combination.

`source` · `entity` · AI Code Metrics

No documented relationships.

### Caveats

- **No documented relationships** — Nothing in the schema points at this table and it points at nothing, so there is no verified way to join it. Treat any link you infer from column names as a guess until you have checked it against the data.

## ai_session_evaluation_responses

Individual dimension ratings and comments within an AI session evaluation.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_session_evaluations**
  ```sql
  JOIN ai_session_evaluations
    ON ai_session_evaluations.id = ai_session_evaluation_responses.ai_session_evaluation_id
  ```

## ai_session_evaluations

Agent evaluation of AI sessions.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_sessions**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_evaluations.ai_session_id
  ```

### Joined from — these point here, one-to-many

- **ai_session_evaluation_responses**
  ```sql
  JOIN ai_session_evaluations
    ON ai_session_evaluations.id = ai_session_evaluation_responses.ai_session_evaluation_id
  ```

## ai_session_messages

Individual messages within an AI session.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_sessions**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_messages.ai_session_id
  ```

## ai_session_tool_usage_targets

Semantic identities reported for AI session tool invocations. Metadata only; arguments, results, commands, descriptions, and paths are never captured.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_session_tool_usages**
  ```sql
  JOIN ai_session_tool_usages
    ON ai_session_tool_usages.id = ai_session_tool_usage_targets.ai_session_tool_usage_id
  ```

## ai_session_tool_usages

Individual tool invocations within an AI session. Metadata only; tool arguments and results are never captured.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_sessions**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_tool_usages.ai_session_id
  ```

### Joined from — these point here, one-to-many

- **ai_session_tool_usage_targets**
  ```sql
  JOIN ai_session_tool_usages
    ON ai_session_tool_usages.id = ai_session_tool_usage_targets.ai_session_tool_usage_id
  ```

## ai_session_work_type_assignments

Assignments of work types to AI sessions.

`source` · `bridge` · AI Code Metrics

### Joins out — this table holds the key

- **ai_sessions**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_work_type_assignments.ai_session_id
  ```
- **ai_session_work_types**
  ```sql
  JOIN ai_session_work_types
    ON ai_session_work_types.id = ai_session_work_type_assignments.ai_session_work_type_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## ai_session_work_type_categories

Categories of work types for AI sessions.

`source` · `lookup` · AI Code Metrics

### Joined from — these point here, one-to-many

- **ai_session_work_types**
  ```sql
  JOIN ai_session_work_type_categories
    ON ai_session_work_type_categories.id = ai_session_work_types.ai_session_work_type_category_id
  ```

## ai_session_work_types

Types of work for AI sessions.

`source` · `entity` · AI Code Metrics

### Joins out — this table holds the key

- **ai_session_work_type_categories**
  ```sql
  JOIN ai_session_work_type_categories
    ON ai_session_work_type_categories.id = ai_session_work_types.ai_session_work_type_category_id
  ```

### Bridges — join through, never to

- **ai_session_work_type_assignments**
  ```sql
  JOIN ai_session_work_types
    ON ai_session_work_types.id = ai_session_work_type_assignments.ai_session_work_type_id
  ```

## ai_sessions

AI coding threads recorded by the daemon, including subagents. Filter parent_session_external_id IS NULL for top-level session reporting; counters describe only each thread's own records.

`source` · `lookup` · AI Code Metrics

### Joined from — these point here, one-to-many

- **ai_session_messages**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_messages.ai_session_id
  ```
- **ai_session_tool_usages**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_tool_usages.ai_session_id
  ```
- **ai_session_evaluations**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_evaluations.ai_session_id
  ```

### Bridges — join through, never to

- **ai_session_work_type_assignments**
  ```sql
  JOIN ai_sessions
    ON ai_sessions.id = ai_session_work_type_assignments.ai_session_id
  ```

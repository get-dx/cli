# Unified tables

26 tables. Every join below is stated with the SQL to write.

## ai_tool_credit_rates

Effective-dated credit pricing for credit-billed AI tools. Each row sets the rate that applies from its effective_at date until the next row's effective_at, so historical spend is not repriced when the rate changes.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **ai_tools**
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_credit_rates.ai_tool_id
  ```

## ai_tool_daily_metrics

Daily metrics for all AI tool usage.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = ai_tool_daily_metrics.dx_user_id
  ```
- **ai_tools**
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  ```
- **claude_code_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN claude_code_daily_user_metrics
    ON claude_code_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for claude>'
  ```
- **cursor_daily_user_metrics** — crosses vendors · column not in the published schema · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN cursor_daily_user_metrics
    ON cursor_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for cursor>'
  ```
- **windsurf_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN windsurf_daily_user_metrics
    ON windsurf_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for windsurf>'
  ```
- **gemini_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN gemini_daily_user_metrics
    ON gemini_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for gemini>'
  ```
- **augment_code_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN augment_code_daily_user_metrics
    ON augment_code_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for augment>'
  ```
- **coder_ai_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN coder_ai_daily_user_metrics
    ON coder_ai_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for coder>'
  ```
- **sourcegraph_amp_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN sourcegraph_amp_daily_user_metrics
    ON sourcegraph_amp_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for sourcegraph>'
  ```
- **coderabbit_daily_user_metrics** — crosses vendors · column not in the published schema · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN coderabbit_daily_user_metrics
    ON coderabbit_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for coderabbit>'
  ```
- **devin_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN devin_daily_user_metrics
    ON devin_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for devin>'
  ```
- **firebender_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN firebender_daily_user_metrics
    ON firebender_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for firebender>'
  ```
- **amazon_kiro_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN amazon_kiro_daily_user_metrics
    ON amazon_kiro_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for amazon>'
  ```
- **amazon_q_daily_user_metrics** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN amazon_q_daily_user_metrics
    ON amazon_q_daily_user_metrics.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for amazon>'
  ```
- **codex_daily_usages** — crosses vendors · confidence: medium
  source_table_id is polymorphic: it holds the primary key of whichever vendor table the row was derived from, and ai_tools.built_in_key says which table that is. The column documents this in prose but declares no reference, so the link between the unified AI numbers and each vendor's own tables is invisible to the schema.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  JOIN codex_daily_usages
    ON codex_daily_usages.id = ai_tool_daily_metrics.source_table_id
   AND ai_tools.built_in_key = '<the key for codex>'
  ```
- **bespoke_ai_tool_daily_metrics** — bespoke tool usage · confidence: high
  bespoke_ai_tool_daily_metrics keys its rows by a string id rather than an integer, which is why ai_tool_daily_metrics carries source_table_uuid alongside source_table_id. The uuid column is the one that applies to any source table with a UUID primary key, bespoke tools being the main case.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
   AND ai_tools.bespoke
  JOIN bespoke_ai_tool_daily_metrics
    ON bespoke_ai_tool_daily_metrics.id = ai_tool_daily_metrics.source_table_uuid
  ```

### Caveats

- **source_table_id is polymorphic** — It points at 13 different tables (claude_code_daily_user_metrics, cursor_daily_user_metrics, windsurf_daily_user_metrics, gemini_daily_user_metrics, augment_code_daily_user_metrics, coder_ai_daily_user_metrics, sourcegraph_amp_daily_user_metrics, coderabbit_daily_user_metrics, devin_daily_user_metrics, firebender_daily_user_metrics, amazon_kiro_daily_user_metrics, amazon_q_daily_user_metrics, codex_daily_usages) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.

## ai_tool_discount_rates

Effective-dated negotiated discounts for dollar-billed AI tools. Each row sets the percentage that applies from its effective_at date until the next row's effective_at, so historical spend retains the discount negotiated for that period.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **ai_tools**
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_discount_rates.ai_tool_id
  ```

## ai_tools

Types of AI tools for organizing daily metrics.

`unified` · `lookup` · Unified

### Joined from — these point here, one-to-many

- **ai_tool_credit_rates**
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_credit_rates.ai_tool_id
  ```
- **ai_tool_discount_rates**
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_discount_rates.ai_tool_id
  ```
- **ai_tool_daily_metrics**
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
  ```

## bespoke_ai_tool_daily_metrics

Daily metrics for bespoke AI tool usage, supporting multiple tools per user per date.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_users** — user · crosses vendors · case-insensitive match · confidence: medium
  Bespoke metrics arrive with an email and no dx_user_id, so attributing them to a person means matching on email where every other AI table has a resolved foreign key.
  ```sql
  JOIN dx_users
    ON lower(dx_users.email) = lower(bespoke_ai_tool_daily_metrics.email)
   AND dx_users.deleted_at IS NULL
  ```

### Joined from — these point here, one-to-many

- **ai_tool_daily_metrics** — bespoke tool usage · confidence: high
  bespoke_ai_tool_daily_metrics keys its rows by a string id rather than an integer, which is why ai_tool_daily_metrics carries source_table_uuid alongside source_table_id. The uuid column is the one that applies to any source table with a UUID primary key, bespoke tools being the main case.
  ```sql
  JOIN ai_tools
    ON ai_tools.id = ai_tool_daily_metrics.ai_tool_id
   AND ai_tools.bespoke
  JOIN bespoke_ai_tool_daily_metrics
    ON bespoke_ai_tool_daily_metrics.id = ai_tool_daily_metrics.source_table_uuid
  ```

### Caveats

- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## deployment_inference_rules

Record of all deployment inference rules.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **pipeline_sources**
  ```sql
  JOIN pipeline_sources
    ON pipeline_sources.id = deployment_inference_rules.pipeline_source_id
  ```

### Joined from — these point here, one-to-many

- **deployments**
  ```sql
  JOIN deployment_inference_rules
    ON deployment_inference_rules.id = deployments.deployment_inference_rule_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.

## deployment_metadata

Metadata sent with deployments api requests.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = deployment_metadata.deployment_id
  ```

## deployment_service_memberships

Join table associating deployments with deployment services. A deployment can belong to multiple services.

`unified` · `bridge` · Unified

### Joins out — this table holds the key

- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = deployment_service_memberships.deployment_id
  ```
- **deployment_services**
  ```sql
  JOIN deployment_services
    ON deployment_services.id = deployment_service_memberships.deployment_service_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## deployment_services

Record of all services that have been tracked with the deployments API.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = deployment_services.latest_deployment_id
  ```

### Joined from — these point here, one-to-many

- **deployments**
  ```sql
  JOIN deployment_services
    ON deployment_services.id = deployments.deployment_service_id
  ```
- **pull_request_services**
  ```sql
  JOIN deployment_services
    ON deployment_services.id = pull_request_services.deployment_service_id
  ```

### Bridges — join through, never to

- **deployment_service_memberships**
  ```sql
  JOIN deployment_services
    ON deployment_services.id = deployment_service_memberships.deployment_service_id
  ```

## deployments

Record of all deployments that have been tracked.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **deployment_inference_rules**
  ```sql
  JOIN deployment_inference_rules
    ON deployment_inference_rules.id = deployments.deployment_inference_rule_id
  ```
- **deployment_services**
  ```sql
  JOIN deployment_services
    ON deployment_services.id = deployments.deployment_service_id
  ```

### Joined from — these point here, one-to-many

- **ado_pull_deployments**
  ```sql
  JOIN deployments
    ON deployments.id = ado_pull_deployments.deployment_id
  ```
- **bitbucket_pull_deployments**
  ```sql
  JOIN deployments
    ON deployments.id = bitbucket_pull_deployments.deployment_id
  ```
- **bitbucket_server_pull_deployments**
  ```sql
  JOIN deployments
    ON deployments.id = bitbucket_server_pull_deployments.deployment_id
  ```
- **gerrit_change_deployments**
  ```sql
  JOIN deployments
    ON deployments.id = gerrit_change_deployments.deployment_id
  ```
- **github_pull_deployments**
  ```sql
  JOIN deployments
    ON deployments.id = github_pull_deployments.deployment_id
  ```
- **gitlab_merge_request_deployments**
  ```sql
  JOIN deployments
    ON deployments.id = gitlab_merge_request_deployments.deployment_id
  ```
- **deployment_metadata**
  ```sql
  JOIN deployments
    ON deployments.id = deployment_metadata.deployment_id
  ```
- **deployment_services**
  ```sql
  JOIN deployments
    ON deployments.id = deployment_services.latest_deployment_id
  ```
- **pull_request_deployments**
  ```sql
  JOIN deployments
    ON deployments.id = pull_request_deployments.deployment_id
  ```

### Bridges — join through, never to

- **deployment_service_memberships**
  ```sql
  JOIN deployments
    ON deployments.id = deployment_service_memberships.deployment_id
  ```

## identities

Mapping table of DX users to external systems.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
  ```
- **jira_users** — jira identity · crosses vendors · confidence: high
  identities is the polymorphic bridge from a DX user to their account on any source system. The join is only valid when the discriminator column says jira.
  ```sql
  JOIN identities
    ON identities.source_id = jira_users.id
   AND identities.source = 'jira'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
  ```
- **ado_users** — ado identity · **requires `source = 'ado' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  ado_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = ado_users.id
   AND identities.source = 'ado'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **amazon_kiro_users** — amazon_kiro identity · **requires `source = 'amazon_kiro' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  amazon_kiro_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = amazon_kiro_users.id
   AND identities.source = 'amazon_kiro'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **amazon_q_users** — amazon_q identity · **requires `source = 'amazon_q' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  amazon_q_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = amazon_q_users.id
   AND identities.source = 'amazon_q'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **asana_users** — asana identity · **requires `source = 'asana' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  asana_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = asana_users.id
   AND identities.source = 'asana'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **augment_code_users** — augment_code identity · **requires `source = 'augment_code' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  augment_code_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = augment_code_users.id
   AND identities.source = 'augment_code'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **bitbucket_users** — bitbucket identity · **requires `source = 'bitbucket' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  bitbucket_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = bitbucket_users.id
   AND identities.source = 'bitbucket'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **bitbucket_server_users** — bitbucket_server identity · **requires `source = 'bitbucket_server' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  bitbucket_server_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = bitbucket_server_users.id
   AND identities.source = 'bitbucket_server'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **claude_code_users** — claude_code identity · **requires `source = 'claude_code' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  claude_code_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = claude_code_users.id
   AND identities.source = 'claude_code'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **clickup_users** — clickup identity · **requires `source = 'clickup' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  clickup_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = clickup_users.id
   AND identities.source = 'clickup'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **coder_ai_users** — coder_ai identity · **requires `source = 'coder_ai' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  coder_ai_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = coder_ai_users.id
   AND identities.source = 'coder_ai'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **coderabbit_users** — coderabbit identity · **requires `source = 'coderabbit' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  coderabbit_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = coderabbit_users.id
   AND identities.source = 'coderabbit'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **codex_users** — codex identity · **requires `source = 'codex' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  codex_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = codex_users.id
   AND identities.source = 'codex'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **confluence_users** — confluence identity · **requires `source = 'confluence' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  confluence_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = confluence_users.id
   AND identities.source = 'confluence'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **cursor_users** — cursor identity · **requires `source = 'cursor'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'cursor' matches a row in cursor_users.
  ```sql
  JOIN identities
    ON identities.source_id = cursor_users.id
   AND identities.source = 'cursor'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **datadog_users** — datadog identity · **requires `source = 'datadog' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  datadog_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = datadog_users.id
   AND identities.source = 'datadog'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **firehydrant_users** — firehydrant identity · **requires `source = 'firehydrant' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  firehydrant_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = firehydrant_users.id
   AND identities.source = 'firehydrant'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **gemini_users** — gemini identity · **requires `source = 'gemini' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  gemini_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = gemini_users.id
   AND identities.source = 'gemini'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **gerrit_users** — gerrit identity · **requires `source = 'gerrit' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  gerrit_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = gerrit_users.id
   AND identities.source = 'gerrit'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **github_users** — github identity · **requires `source = 'github'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'github' matches a row in github_users.
  ```sql
  JOIN identities
    ON identities.source_id = github_users.id
   AND identities.source = 'github'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **github_organization_users** — github_organization identity · **requires `source = 'github_organization' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  github_organization_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = github_organization_users.id
   AND identities.source = 'github_organization'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **gitlab_users** — gitlab identity · **requires `source = 'gitlab' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  gitlab_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = gitlab_users.id
   AND identities.source = 'gitlab'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **incident_io_users** — incident_io identity · **requires `source = 'incident_io' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  incident_io_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = incident_io_users.id
   AND identities.source = 'incident_io'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **incident_io_on_call_users** — incident_io_on_call identity · **requires `source = 'incident_io_on_call' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  incident_io_on_call_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = incident_io_on_call_users.id
   AND identities.source = 'incident_io_on_call'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **jira_users** — jira identity · **requires `source = 'jira'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'jira' matches a row in jira_users.
  ```sql
  JOIN identities
    ON identities.source_id = jira_users.id
   AND identities.source = 'jira'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **jsm_users** — jsm identity · **requires `source = 'jira_service_management'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'jira_service_management' matches a row in jsm_users.
  ```sql
  JOIN identities
    ON identities.source_id = jsm_users.id
   AND identities.source = 'jira_service_management'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **launchdarkly_users** — launchdarkly identity · **requires `source = 'launchdarkly' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  launchdarkly_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = launchdarkly_users.id
   AND identities.source = 'launchdarkly'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **linear_users** — linear identity · **requires `source = 'linear' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  linear_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = linear_users.id
   AND identities.source = 'linear'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **opsgenie_users** — opsgenie identity · **requires `source = 'opsgenie' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  opsgenie_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = opsgenie_users.id
   AND identities.source = 'opsgenie'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **pagerduty_team_users** — pagerduty_team identity · **requires `source = 'pagerduty_team' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  pagerduty_team_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = pagerduty_team_users.id
   AND identities.source = 'pagerduty_team'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **pagerduty_users** — pagerduty identity · **requires `source = 'pagerduty' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  pagerduty_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = pagerduty_users.id
   AND identities.source = 'pagerduty'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **pagerduty_on_call_users** — pagerduty_on_call identity · **requires `source = 'pagerduty_on_call' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  pagerduty_on_call_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = pagerduty_on_call_users.id
   AND identities.source = 'pagerduty_on_call'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **perforce_users** — perforce identity · **requires `source = 'perforce' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  perforce_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = perforce_users.id
   AND identities.source = 'perforce'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **rootly_users** — rootly identity · **requires `source = 'rootly' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  rootly_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = rootly_users.id
   AND identities.source = 'rootly'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **servicenow_users** — servicenow identity · **requires `source = 'servicenow'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'servicenow' matches a row in servicenow_users.
  ```sql
  JOIN identities
    ON identities.source_id = servicenow_users.id
   AND identities.source = 'servicenow'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **shortcut_users** — shortcut identity · **requires `source = 'shortcut' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  shortcut_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = shortcut_users.id
   AND identities.source = 'shortcut'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **sourcegraph_amp_users** — sourcegraph_amp identity · **requires `source = 'sourcegraph_amp' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  sourcegraph_amp_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = sourcegraph_amp_users.id
   AND identities.source = 'sourcegraph_amp'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **statsig_users** — statsig identity · **requires `source = 'statsig' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  statsig_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = statsig_users.id
   AND identities.source = 'statsig'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **windsurf_users** — windsurf identity · **requires `source = 'windsurf' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  windsurf_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = windsurf_users.id
   AND identities.source = 'windsurf'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```
- **wiz_users** — wiz identity · **requires `source = 'wiz' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  wiz_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = wiz_users.id
   AND identities.source = 'wiz'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## incident_metadata

Metadata for incidents, storing key-value pairs for each incident.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **incidents** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN incidents
    ON incidents.id = incident_metadata.incident_id
  ```

### Caveats

- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## incident_services

Details of the association between service value sent and the incident.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **incidents**
  ```sql
  JOIN incidents
    ON incidents.id = incident_services.incident_id
  ```

## incidents

A unified table of your incident data from various sources. (i.e. PagerDuty, OpsGenie)

`unified` · `lookup` · Unified

### Joined from — these point here, one-to-many

- **dx_catalog_entity_incidents**
  ```sql
  JOIN incidents
    ON incidents.id = dx_catalog_entity_incidents.incident_id
  ```
- **incident_services**
  ```sql
  JOIN incidents
    ON incidents.id = incident_services.incident_id
  ```
- **incident_metadata** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN incidents
    ON incidents.id = incident_metadata.incident_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## issue_collection_issues

Issues collected in an issue collection.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **issues** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN issues
    ON issues.id = issue_collection_issues.issue_id
  ```
- **issue_collections** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN issue_collections
    ON issue_collections.id = issue_collection_issues.issue_collection_id
  ```

### Caveats

- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## issue_collections

Collection of issues.

`unified` · `entity` · Unified

### Joined from — these point here, one-to-many

- **issue_collection_issues** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN issue_collections
    ON issue_collections.id = issue_collection_issues.issue_collection_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **None of these joins are in the published schema** — The relationships are real and the joins work, but the schema does not list any of them, so nothing will announce it if one changes. They are drawn as dashed edges.

## issue_types

Unique types of issues.

`unified` · `lookup` · Unified

### Joined from — these point here, one-to-many

- **issues**
  ```sql
  JOIN issue_types
    ON issue_types.id = issues.issue_type_id
  ```

## issues

A unified table of your issue data from various sources.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = issues.dx_user_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = issues.creator_id
  ```
- **issue_types**
  ```sql
  JOIN issue_types
    ON issue_types.id = issues.issue_type_id
  ```
- **jira_issues** — Jira issue · **requires `source = 'jira'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN jira_issues
    ON jira_issues.id = issues.source_table_id
   AND issues.source = 'jira'
  ```
- **linear_issues** — Linear issue · **requires `source = 'linear'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN linear_issues
    ON linear_issues.id = issues.source_table_id
   AND issues.source = 'linear'
  ```
- **github_issues** — GitHub issue · **requires `source = 'github'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN github_issues
    ON github_issues.id = issues.source_table_id
   AND issues.source = 'github'
  ```
- **ado_work_items** — ADO work item · **requires `source = 'ado_boards'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = issues.source_table_id
   AND issues.source = 'ado_boards'
  ```
- **asana_tasks** — Asana task · **requires `source = 'asana'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN asana_tasks
    ON asana_tasks.id = issues.source_table_id
   AND issues.source = 'asana'
  ```
- **shortcut_stories** — Shortcut story · **requires `source = 'shortcut'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN shortcut_stories
    ON shortcut_stories.id = issues.source_table_id
   AND issues.source = 'shortcut'
  ```
- **clickup_tasks** — ClickUp task · **requires `source = 'clickup'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN clickup_tasks
    ON clickup_tasks.id = issues.source_table_id
   AND issues.source = 'clickup'
  ```

### Joined from — these point here, one-to-many

- **issue_collection_issues** — confidence: high
  A plain foreign key that the published schema never declares as one. The column name names its target and that target publishes an integer primary key, so the join is unambiguous.
  ```sql
  JOIN issues
    ON issues.id = issue_collection_issues.issue_id
  ```

### Bridges — join through, never to

- **pull_request_issues**
  ```sql
  JOIN issues
    ON issues.id = pull_request_issues.issue_id
  ```

### Self-join

- **issues**
  ```sql
  JOIN issues
    ON issues.id = issues.parent_issue_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins dx_users 2 different ways** — dx_user_id, creator_id. These are separate columns that frequently hold different values, so joining dx_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **source_table_id is polymorphic** — It points at 7 different tables (jira_issues, linear_issues, github_issues, ado_work_items, asana_tasks, shortcut_stories, clickup_tasks) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.

## pull_request_commits

Details about commits in pull requests from various source control systems

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_request_commits.dx_user_id
  ```
- **pull_requests**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_commits.pull_request_id
  ```
- **repos**
  ```sql
  JOIN repos
    ON repos.id = pull_request_commits.repo_id
  ```
- **github_pull_commits** — **requires `source = 'github'`**
  ```sql
  JOIN github_pull_commits
    ON github_pull_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'github'
  ```
- **gitlab_merge_request_commits** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_request_commits
    ON gitlab_merge_request_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'gitlab'
  ```
- **bitbucket_pull_commits** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pull_commits
    ON bitbucket_pull_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'bitbucket'
  ```
- **ado_pull_commits** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pull_commits
    ON ado_pull_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'ado'
  ```
- **github_pulls** — **requires `source = 'github'`**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'github'
  ```
- **gitlab_merge_requests** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'gitlab'
  ```
- **bitbucket_pulls** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'bitbucket'
  ```
- **ado_pulls** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'ado'
  ```
- **github_repositories** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'github'
  ```
- **gitlab_projects** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'gitlab'
  ```
- **bitbucket_repositories** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'bitbucket'
  ```
- **ado_repositories** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'ado'
  ```

### Caveats

- **source_table_id is polymorphic** — It points at 4 different tables (github_pull_commits, gitlab_merge_request_commits, bitbucket_pull_commits, ado_pull_commits) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.
- **source_table_pull_id is polymorphic** — It points at 4 different tables (github_pulls, gitlab_merge_requests, bitbucket_pulls, ado_pulls) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.
- **source_table_repo_id is polymorphic** — It points at 4 different tables (github_repositories, gitlab_projects, bitbucket_repositories, ado_repositories) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.

## pull_request_deployments

Mapping of pull requests to deployments, including deployment timing and environment.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = pull_request_deployments.deployment_id
  ```
- **pull_requests**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_deployments.pull_request_id
  ```

## pull_request_issues

Mapping of pull requests to issues.

`unified` · `bridge` · Unified

### Joins out — this table holds the key

- **pull_requests**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_issues.pull_request_id
  ```
- **issues**
  ```sql
  JOIN issues
    ON issues.id = pull_request_issues.issue_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## pull_request_reviews

A unified table of pull request reviews from various source control systems.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_request_reviews.dx_user_id
  ```
- **pull_requests**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_reviews.pull_request_id
  ```
- **repos**
  ```sql
  JOIN repos
    ON repos.id = pull_request_reviews.repo_id
  ```
- **github_reviews** — **requires `source = 'github'`**
  ```sql
  JOIN github_reviews
    ON github_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'github'
  ```
- **gitlab_reviews** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_reviews
    ON gitlab_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'gitlab'
  ```
- **bitbucket_reviews** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_reviews
    ON bitbucket_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'bitbucket'
  ```
- **bitbucket_server_reviews** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_reviews
    ON bitbucket_server_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'bitbucket_server'
  ```
- **ado_reviews** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_reviews
    ON ado_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'ado'
  ```
- **github_pulls** — **requires `source = 'github'`**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'github'
  ```
- **gitlab_merge_requests** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'gitlab'
  ```
- **bitbucket_pulls** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'bitbucket'
  ```
- **bitbucket_server_pulls** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'bitbucket_server'
  ```
- **ado_pulls** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'ado'
  ```
- **github_repositories** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'github'
  ```
- **gitlab_projects** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'gitlab'
  ```
- **bitbucket_repositories** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'bitbucket'
  ```
- **bitbucket_server_repositories** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'bitbucket_server'
  ```
- **ado_repositories** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'ado'
  ```

### Caveats

- **source_table_id is polymorphic** — It points at 5 different tables (github_reviews, gitlab_reviews, bitbucket_reviews, bitbucket_server_reviews, ado_reviews) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.
- **source_table_pull_id is polymorphic** — It points at 5 different tables (github_pulls, gitlab_merge_requests, bitbucket_pulls, bitbucket_server_pulls, ado_pulls) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.
- **source_table_repo_id is polymorphic** — It points at 5 different tables (github_repositories, gitlab_projects, bitbucket_repositories, bitbucket_server_repositories, ado_repositories) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.

## pull_request_services

Services affected by a pull request, merge request, or change across supported SCMs.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **pull_requests**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_services.pull_request_id
  ```
- **deployment_services**
  ```sql
  JOIN deployment_services
    ON deployment_services.id = pull_request_services.deployment_service_id
  ```

## pull_requests

A unified table of your pull request data from various source control systems.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_versioned_team_members**
  ```sql
  JOIN dx_versioned_team_members
    ON dx_versioned_team_members.source_id = pull_requests.dx_versioned_team_member_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_requests.dx_user_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = pull_requests.merged_by_user_id
  ```
- **repos**
  ```sql
  JOIN repos
    ON repos.id = pull_requests.repo_id
  ```
- **github_pulls** — **requires `source = 'github'`**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'github'
  ```
- **gitlab_merge_requests** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = pull_requests.source_table_id
   AND pull_requests.source = 'gitlab'
  ```
- **bitbucket_pulls** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'bitbucket'
  ```
- **bitbucket_server_pulls** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'bitbucket_server'
  ```
- **ado_pulls** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'ado'
  ```
- **github_repositories** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'github'
  ```
- **gitlab_projects** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'gitlab'
  ```
- **bitbucket_repositories** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'bitbucket'
  ```
- **bitbucket_server_repositories** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'bitbucket_server'
  ```
- **ado_repositories** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'ado'
  ```

### Joined from — these point here, one-to-many

- **coderabbit_pr_reviews**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = coderabbit_pr_reviews.pull_request_id
  ```
- **pull_request_deployments**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_deployments.pull_request_id
  ```
- **pull_request_reviews**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_reviews.pull_request_id
  ```
- **pull_request_commits**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_commits.pull_request_id
  ```
- **pull_request_services**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_services.pull_request_id
  ```

### Bridges — join through, never to

- **pull_request_issues**
  ```sql
  JOIN pull_requests
    ON pull_requests.id = pull_request_issues.pull_request_id
  ```

### Caveats

- **Joins dx_users 2 different ways** — dx_user_id, merged_by_user_id. These are separate columns that frequently hold different values, so joining dx_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **source_table_id is polymorphic** — It points at 5 different tables (github_pulls, gitlab_merge_requests, bitbucket_pulls, bitbucket_server_pulls, ado_pulls) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.
- **source_table_repo_id is polymorphic** — It points at 5 different tables (github_repositories, gitlab_projects, bitbucket_repositories, bitbucket_server_repositories, ado_repositories) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.

## repos

A unified table of repositories from various source control systems.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **github_repositories** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = repos.source_table_id
   AND repos.source = 'github'
  ```
- **gitlab_projects** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = repos.source_table_id
   AND repos.source = 'gitlab'
  ```
- **bitbucket_repositories** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = repos.source_table_id
   AND repos.source = 'bitbucket'
  ```
- **bitbucket_server_repositories** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = repos.source_table_id
   AND repos.source = 'bitbucket_server'
  ```
- **ado_repositories** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = repos.source_table_id
   AND repos.source = 'ado'
  ```
- **repo_groups**
  ```sql
  JOIN repo_groups
    ON repo_groups.id = repos.repo_group_id
  ```

### Joined from — these point here, one-to-many

- **coderabbit_pr_reviews**
  ```sql
  JOIN repos
    ON repos.id = coderabbit_pr_reviews.repo_id
  ```
- **pull_requests**
  ```sql
  JOIN repos
    ON repos.id = pull_requests.repo_id
  ```
- **pull_request_reviews**
  ```sql
  JOIN repos
    ON repos.id = pull_request_reviews.repo_id
  ```
- **pull_request_commits**
  ```sql
  JOIN repos
    ON repos.id = pull_request_commits.repo_id
  ```

### Caveats

- **source_table_id is polymorphic** — It points at 5 different tables (github_repositories, gitlab_projects, bitbucket_repositories, bitbucket_server_repositories, ado_repositories) depending on the row. Joining it without also constraining the source column will match ids that merely collide numerically across providers, which inflates every count that depends on it.

## user_link_decisions

Explicit manual account link and unlink decisions, referencing local DX and connector user IDs.

`unified` · `entity` · Unified

### Joins out — this table holds the key

- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = user_link_decisions.dx_user_id
  ```

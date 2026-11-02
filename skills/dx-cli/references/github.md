# GitHub tables

44 tables. Every join below is stated with the SQL to write.

## github_app_installations

App installations for GitHub organizations.

`source` · `bridge` · GitHub

### Joins out — this table holds the key

- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_app_installations.organization_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_check_runs

Check runs associated with GitHub commits and pull requests.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_check_runs.repository_id
  ```
- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_check_runs.pull_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_code_quality_findings

Current and historical GitHub Code Quality findings reported for repositories.

`source` · `entity` · GitHub Security

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_code_quality_findings.repository_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## github_code_scanning_alerts

Table for storing GitHub Code Scanning alert data.

`source` · `entity` · GitHub Security

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_code_scanning_alerts.repository_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## github_commit_statuses

Commit statuses associated with GitHub commits and pull requests.

`source` · `entity` · GitHub Commits

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_commit_statuses.repository_id
  ```
- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_commit_statuses.pull_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_copilot_billing_usages

Usage-based billing for GitHub Copilot per organization or enterprise per day, broken down by SKU.

`source` · `entity` · GitHub Copilot Billing

### Joins out — this table holds the key

- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_copilot_billing_usages.organization_id
  ```

## github_copilot_daily_usages

Daily usage details for GitHub Copilot licensees.

`source` · `lookup` · GitHub Copilot Metrics

### Joined from — these point here, one-to-many

- **github_copilot_user_metric_by_ides**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_ides.github_copilot_daily_usage_id
  ```
- **github_copilot_user_metric_by_features**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_features.github_copilot_daily_usage_id
  ```
- **github_copilot_user_metric_by_language_features**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_language_features.github_copilot_daily_usage_id
  ```
- **github_copilot_user_metric_by_language_models**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_language_models.github_copilot_daily_usage_id
  ```
- **github_copilot_user_metric_by_model_features**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_model_features.github_copilot_daily_usage_id
  ```
- **github_copilot_user_metric_by_clis**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_clis.github_copilot_daily_usage_id
  ```

## github_copilot_premium_request_usages

Premium request billing usage for GitHub Copilot per organization per day, broken down by model and SKU.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_copilot_premium_request_usages.organization_id
  ```

## github_copilot_user_metric_by_clis

CLI usage metrics for GitHub Copilot per user per day.

`source` · `entity` · GitHub Copilot Metrics

### Joins out — this table holds the key

- **github_copilot_daily_usages**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_clis.github_copilot_daily_usage_id
  ```

## github_copilot_user_metric_by_features

Breakdown of GitHub Copilot user metrics by feature.

`source` · `entity` · GitHub Copilot Metrics

### Joins out — this table holds the key

- **github_copilot_daily_usages**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_features.github_copilot_daily_usage_id
  ```

## github_copilot_user_metric_by_ides

Breakdown of GitHub Copilot user metrics by IDE.

`source` · `entity` · GitHub Copilot Metrics

### Joins out — this table holds the key

- **github_copilot_daily_usages**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_ides.github_copilot_daily_usage_id
  ```

## github_copilot_user_metric_by_language_features

Breakdown of GitHub Copilot user metrics by language and feature.

`source` · `entity` · GitHub Copilot Metrics

### Joins out — this table holds the key

- **github_copilot_daily_usages**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_language_features.github_copilot_daily_usage_id
  ```

## github_copilot_user_metric_by_language_models

Breakdown of GitHub Copilot user metrics by language and model.

`source` · `entity` · GitHub Copilot Metrics

### Joins out — this table holds the key

- **github_copilot_daily_usages**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_language_models.github_copilot_daily_usage_id
  ```

## github_copilot_user_metric_by_model_features

Breakdown of GitHub Copilot user metrics by model and feature.

`source` · `entity` · GitHub Copilot Metrics

### Joins out — this table holds the key

- **github_copilot_daily_usages**
  ```sql
  JOIN github_copilot_daily_usages
    ON github_copilot_daily_usages.id = github_copilot_user_metric_by_model_features.github_copilot_daily_usage_id
  ```

## github_dependabot_alerts

Table for storing GitHub Dependabot alert data.

`source` · `entity` · GitHub Security

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_dependabot_alerts.repository_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## github_deployment_environments

GitHub deployment environments associated with repositories.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_deployment_environments.repository_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_deployment_events

Events related to GitHub deployments.

`source` · `entity` · GitHub Deployments

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_deployment_events.repository_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_instances

Unique hostnames for GitHub instances, used to provide uniqueness constraints for top level entities

`source` · `lookup` · GitHub

### Joined from — these point here, one-to-many

- **github_organizations**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_organizations.github_instance_id
  ```
- **github_users**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_users.github_instance_id
  ```
- **github_teams**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_teams.github_instance_id
  ```
- **github_issues**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_issues.github_instance_id
  ```

## github_issue_assignees

Association between GitHub issues and assignees.

`source` · `bridge` · GitHub

### Joins out — this table holds the key

- **github_issues**
  ```sql
  JOIN github_issues
    ON github_issues.id = github_issue_assignees.issue_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_issue_assignees.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_issue_labels

Association between GitHub issues and labels.

`source` · `bridge` · GitHub

### Joins out — this table holds the key

- **github_issues**
  ```sql
  JOIN github_issues
    ON github_issues.id = github_issue_labels.issue_id
  ```
- **github_labels**
  ```sql
  JOIN github_labels
    ON github_labels.id = github_issue_labels.label_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_issue_projects

Association between GitHub issues and projects.

`source` · `bridge` · GitHub Projects

### Joins out — this table holds the key

- **github_issues**
  ```sql
  JOIN github_issues
    ON github_issues.id = github_issue_projects.issue_id
  ```
- **github_projects**
  ```sql
  JOIN github_projects
    ON github_projects.id = github_issue_projects.project_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_issues

Details about GitHub issues.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_issues.repository_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_issues.creator_id
  ```
- **github_instances**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_issues.github_instance_id
  ```

### Joined from — these point here, one-to-many

- **issues** — GitHub issue · **requires `source = 'github'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN github_issues
    ON github_issues.id = issues.source_table_id
   AND issues.source = 'github'
  ```

### Bridges — join through, never to

- **github_issue_projects**
  ```sql
  JOIN github_issues
    ON github_issues.id = github_issue_projects.issue_id
  ```
- **github_issue_assignees**
  ```sql
  JOIN github_issues
    ON github_issues.id = github_issue_assignees.issue_id
  ```
- **github_issue_labels**
  ```sql
  JOIN github_issues
    ON github_issues.id = github_issue_labels.issue_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_labels

Details about GitHub labels.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_labels.repository_id
  ```

### Bridges — join through, never to

- **github_pull_labels**
  ```sql
  JOIN github_labels
    ON github_labels.id = github_pull_labels.label_id
  ```
- **github_issue_labels**
  ```sql
  JOIN github_labels
    ON github_labels.id = github_issue_labels.label_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_organization_users

Join table between github_organizations and github_users.

`source` · `bridge` · GitHub

### Joins out — this table holds the key

- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_organization_users.github_user_id
  ```
- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_organization_users.github_organization_id
  ```

### Joined from — these point here, one-to-many

- **identities** — github_organization identity · **requires `source = 'github_organization' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  github_organization_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = github_organization_users.id
   AND identities.source = 'github_organization'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_organizations

Details about your GitHub organizations.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_instances**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_organizations.github_instance_id
  ```

### Joined from — these point here, one-to-many

- **github_repositories**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_repositories.organization_id
  ```
- **github_users**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_users.organization_id
  ```
- **github_teams**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_teams.organization_id
  ```
- **github_projects**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_projects.organization_id
  ```
- **github_copilot_billing_usages**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_copilot_billing_usages.organization_id
  ```
- **github_copilot_premium_request_usages**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_copilot_premium_request_usages.organization_id
  ```

### Bridges — join through, never to

- **github_organization_users**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_organization_users.github_organization_id
  ```
- **github_app_installations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_app_installations.organization_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_projects

Details about GitHub projects.

`source` · `entity` · GitHub Projects

### Joins out — this table holds the key

- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_projects.organization_id
  ```

### Bridges — join through, never to

- **github_issue_projects**
  ```sql
  JOIN github_projects
    ON github_projects.id = github_issue_projects.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_pull_assignees

Association between GitHub pull requests and assignees.

`source` · `bridge` · GitHub

### Joins out — this table holds the key

- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_assignees.pull_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_pull_assignees.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_pull_commits

Details about commits in GitHub pull requests.

`source` · `entity` · GitHub, GitHub Commits

### Joins out — this table holds the key

- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_pull_commits.author_id
  ```
- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_commits.pull_id
  ```

### Joined from — these point here, one-to-many

- **pull_request_commits** — **requires `source = 'github'`**
  ```sql
  JOIN github_pull_commits
    ON github_pull_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'github'
  ```

## github_pull_deployments

Mapping of GitHub pull requests to deployments, including deployment timing and environment.

`source` · `entity` · GitHub Deployments

### Joins out — this table holds the key

- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_deployments.pull_id
  ```
- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = github_pull_deployments.deployment_id
  ```

## github_pull_files

Details about files changed in GitHub pull requests.

`source` · `entity` · GitHub Pull Request Files

### Joins out — this table holds the key

- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_files.pull_id
  ```

## github_pull_labels

Join table between pull requests and labels.

`source` · `bridge` · GitHub

### Joins out — this table holds the key

- **github_labels**
  ```sql
  JOIN github_labels
    ON github_labels.id = github_pull_labels.label_id
  ```
- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_labels.pull_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_pull_services

Services that pull requests are merged into.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_services.pull_id
  ```

## github_pulls

Detailed information and metrics about GitHub pull requests.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_pulls.repository_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_pulls.user_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_pulls.merged_by_user_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_pulls.closed_by_user_id
  ```
- **jira_issues** — linked pull requests · crosses vendors · column not in the published schema · confidence: high
  The single direct link between delivery and planning data, and a plain indexed bigint pointing at jira_issues.id, so the join is exact. It is absent from the published schema, which is why neither the schema page nor the generated graph knows about it. The column is also only added when the Jira integration is on, so it will not exist at all on an instance without Jira.
  ```sql
  JOIN github_pulls
    ON github_pulls.jira_issue_id = jira_issues.id
  ```

### Joined from — these point here, one-to-many

- **github_pull_commits**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_commits.pull_id
  ```
- **github_pull_files**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_files.pull_id
  ```
- **github_reviews**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_reviews.pull_id
  ```
- **github_review_requests**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_review_requests.pull_id
  ```
- **github_pull_services**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_services.pull_id
  ```
- **github_check_runs**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_check_runs.pull_id
  ```
- **github_commit_statuses**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_commit_statuses.pull_id
  ```
- **github_pull_deployments**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_deployments.pull_id
  ```
- **pull_requests** — **requires `source = 'github'`**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'github'
  ```
- **pull_request_reviews** — **requires `source = 'github'`**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'github'
  ```
- **pull_request_commits** — **requires `source = 'github'`**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'github'
  ```

### Bridges — join through, never to

- **github_pull_assignees**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_assignees.pull_id
  ```
- **github_pull_labels**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_pull_labels.pull_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins github_users 3 different ways** — user_id, merged_by_user_id, closed_by_user_id. These are separate columns that frequently hold different values, so joining github_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## github_releases

GitHub releases published for repositories.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_releases.repository_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_repositories

Details about the GitHub repositories in your organization.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_repositories.organization_id
  ```

### Joined from — these point here, one-to-many

- **github_pulls**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_pulls.repository_id
  ```
- **github_repository_default_branch_commits**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_repository_default_branch_commits.repository_id
  ```
- **github_reviews**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_reviews.repository_id
  ```
- **github_labels**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_labels.repository_id
  ```
- **github_dependabot_alerts**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_dependabot_alerts.repository_id
  ```
- **github_code_scanning_alerts**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_code_scanning_alerts.repository_id
  ```
- **github_secret_scanning_alerts**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_secret_scanning_alerts.repository_id
  ```
- **github_code_quality_findings**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_code_quality_findings.repository_id
  ```
- **github_issues**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_issues.repository_id
  ```
- **github_repository_files**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_repository_files.repository_id
  ```
- **github_repository_properties**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_repository_properties.repository_id
  ```
- **github_deployment_events**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_deployment_events.repository_id
  ```
- **github_deployment_environments**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_deployment_environments.repository_id
  ```
- **github_releases**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_releases.repository_id
  ```
- **github_check_runs**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_check_runs.repository_id
  ```
- **github_commit_statuses**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_commit_statuses.repository_id
  ```
- **pull_requests** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'github'
  ```
- **pull_request_reviews** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'github'
  ```
- **pull_request_commits** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'github'
  ```
- **repos** — **requires `source = 'github'`**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = repos.source_table_id
   AND repos.source = 'github'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_repository_default_branch_commits

Details about commits in default repository branch.

`source` · `entity` · GitHub Commits (Default branch)

### Joins out — this table holds the key

- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_repository_default_branch_commits.author_id
  ```
- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_repository_default_branch_commits.repository_id
  ```

## github_repository_files

Files present in a GitHub repository's default branch.

`source` · `entity` · GitHub Repository Files

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_repository_files.repository_id
  ```

## github_repository_properties

Properties associated with GitHub repositories.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_repository_properties.repository_id
  ```

## github_review_requests

Detailed information and metrics about GitHub review requests.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_review_requests.pull_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_review_requests.requester_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_review_requests.requested_reviewer_id
  ```
- **github_teams**
  ```sql
  JOIN github_teams
    ON github_teams.id = github_review_requests.requested_team_id
  ```
- **github_reviews**
  ```sql
  JOIN github_reviews
    ON github_reviews.id = github_review_requests.review_id
  ```

### Joined from — these point here, one-to-many

- **github_reviews**
  ```sql
  JOIN github_review_requests
    ON github_review_requests.id = github_reviews.review_request_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins github_users 2 different ways** — requester_id, requested_reviewer_id. These are separate columns that frequently hold different values, so joining github_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## github_reviews

Detailed information and metrics about GitHub reviews.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_pulls**
  ```sql
  JOIN github_pulls
    ON github_pulls.id = github_reviews.pull_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_reviews.user_id
  ```
- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_reviews.repository_id
  ```
- **github_review_requests**
  ```sql
  JOIN github_review_requests
    ON github_review_requests.id = github_reviews.review_request_id
  ```

### Joined from — these point here, one-to-many

- **github_review_requests**
  ```sql
  JOIN github_reviews
    ON github_reviews.id = github_review_requests.review_id
  ```
- **pull_request_reviews** — **requires `source = 'github'`**
  ```sql
  JOIN github_reviews
    ON github_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'github'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_secret_scanning_alerts

Table for storing GitHub Secret Scanning alert data.

`source` · `entity` · GitHub Security

### Joins out — this table holds the key

- **github_repositories**
  ```sql
  JOIN github_repositories
    ON github_repositories.id = github_secret_scanning_alerts.repository_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## github_team_memberships

Join table between github_users and github_teams.

`source` · `bridge` · GitHub

### Joins out — this table holds the key

- **github_teams**
  ```sql
  JOIN github_teams
    ON github_teams.id = github_team_memberships.team_id
  ```
- **github_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_team_memberships.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## github_teams

Details about GitHub teams.

`source` · `entity` · GitHub

### Joins out — this table holds the key

- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_teams.organization_id
  ```
- **github_instances**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_teams.github_instance_id
  ```

### Joined from — these point here, one-to-many

- **github_review_requests**
  ```sql
  JOIN github_teams
    ON github_teams.id = github_review_requests.requested_team_id
  ```

### Bridges — join through, never to

- **github_team_memberships**
  ```sql
  JOIN github_teams
    ON github_teams.id = github_team_memberships.team_id
  ```

### Self-join

- **github_teams**
  ```sql
  JOIN github_teams
    ON github_teams.id = github_teams.github_parent_team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## github_users

Details about GitHub users.

`source` · `entity` · GitHub, GitHub Copilot Metrics

### Joins out — this table holds the key

- **github_organizations**
  ```sql
  JOIN github_organizations
    ON github_organizations.id = github_users.organization_id
  ```
- **github_instances**
  ```sql
  JOIN github_instances
    ON github_instances.id = github_users.github_instance_id
  ```

### Joined from — these point here, one-to-many

- **github_pulls**
  ```sql
  JOIN github_users
    ON github_users.id = github_pulls.user_id
  ```
- **github_pulls**
  ```sql
  JOIN github_users
    ON github_users.id = github_pulls.merged_by_user_id
  ```
- **github_pulls**
  ```sql
  JOIN github_users
    ON github_users.id = github_pulls.closed_by_user_id
  ```
- **github_pull_commits**
  ```sql
  JOIN github_users
    ON github_users.id = github_pull_commits.author_id
  ```
- **github_repository_default_branch_commits**
  ```sql
  JOIN github_users
    ON github_users.id = github_repository_default_branch_commits.author_id
  ```
- **github_reviews**
  ```sql
  JOIN github_users
    ON github_users.id = github_reviews.user_id
  ```
- **github_review_requests**
  ```sql
  JOIN github_users
    ON github_users.id = github_review_requests.requester_id
  ```
- **github_review_requests**
  ```sql
  JOIN github_users
    ON github_users.id = github_review_requests.requested_reviewer_id
  ```
- **github_issues**
  ```sql
  JOIN github_users
    ON github_users.id = github_issues.creator_id
  ```
- **identities** — github identity · **requires `source = 'github'`** · crosses vendors · confidence: high
  Confirmed against live data: every identity row with source = 'github' matches a row in github_users.
  ```sql
  JOIN identities
    ON identities.source_id = github_users.id
   AND identities.source = 'github'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **github_pull_assignees**
  ```sql
  JOIN github_users
    ON github_users.id = github_pull_assignees.user_id
  ```
- **github_organization_users**
  ```sql
  JOIN github_users
    ON github_users.id = github_organization_users.github_user_id
  ```
- **github_team_memberships**
  ```sql
  JOIN github_users
    ON github_users.id = github_team_memberships.user_id
  ```
- **github_issue_assignees**
  ```sql
  JOIN github_users
    ON github_users.id = github_issue_assignees.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

# ADO Server Repos tables

26 tables. Every join below is stated with the SQL to write.

## ado_allocation_rules

Details about ADO allocation rules

`source` · `lookup` · Azure DevOps Boards, ADO Server Boards

### Bridges — join through, never to

- **ado_work_item_allocation_category_values**
  ```sql
  JOIN ado_allocation_rules
    ON ado_allocation_rules.id = ado_work_item_allocation_category_values.rule_id
  ```

## ado_area_paths

Area paths of work items for projects.

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_area_paths.project_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_items**
  ```sql
  JOIN ado_area_paths
    ON ado_area_paths.id = ado_work_items.area_path_id
  ```

## ado_custom_fields

Custom field definitions for ADO work items

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_custom_fields.project_id
  ```

### Bridges — join through, never to

- **ado_work_item_custom_field_values**
  ```sql
  JOIN ado_custom_fields
    ON ado_custom_fields.id = ado_work_item_custom_field_values.custom_field_id
  ```

## ado_iteration_paths

Iteration paths of work items for projects.

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_iteration_paths.project_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_item_iteration_paths**
  ```sql
  JOIN ado_iteration_paths
    ON ado_iteration_paths.id = ado_work_item_iteration_paths.iteration_path_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_iteration_paths
    ON ado_iteration_paths.id = ado_work_items.iteration_path_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## ado_organizations

Details about Azure DevOps organizations.

`source` · `lookup` · Azure DevOps Boards, Azure DevOps Pipelines, Azure DevOps Repos, ADO Server Boards, ADO Server Pipelines, ADO Server Repos

### Joined from — these point here, one-to-many

- **ado_projects**
  ```sql
  JOIN ado_organizations
    ON ado_organizations.id = ado_projects.organization_id
  ```
- **ado_teams**
  ```sql
  JOIN ado_organizations
    ON ado_organizations.id = ado_teams.organization_id
  ```
- **ado_users**
  ```sql
  JOIN ado_organizations
    ON ado_organizations.id = ado_users.organization_id
  ```

## ado_projects

Details about Azure DevOps projects.

`source` · `entity` · Azure DevOps Boards, Azure DevOps Pipelines, Azure DevOps Repos, ADO Server Boards, ADO Server Pipelines, ADO Server Repos

### Joins out — this table holds the key

- **ado_organizations**
  ```sql
  JOIN ado_organizations
    ON ado_organizations.id = ado_projects.organization_id
  ```

### Joined from — these point here, one-to-many

- **ado_teams**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_teams.project_id
  ```
- **ado_work_item_type_categories**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_type_categories.project_id
  ```
- **ado_work_item_type_states**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_type_states.project_id
  ```
- **ado_work_item_types**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_types.project_id
  ```
- **ado_area_paths**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_area_paths.project_id
  ```
- **ado_iteration_paths**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_iteration_paths.project_id
  ```
- **ado_work_item_iteration_paths**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_iteration_paths.project_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_items.project_id
  ```
- **ado_custom_fields**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_custom_fields.project_id
  ```
- **ado_repositories**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_repositories.project_id
  ```
- **ado_pulls**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_pulls.project_id
  ```
- **ado_repository_default_branch_commits**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_repository_default_branch_commits.project_id
  ```
- **pipeline_runs**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = pipeline_runs.ado_project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## ado_pull_commits

Details about commits in Azure DevOps pull requests.

`source` · `entity` · Azure DevOps Pull Commits, ADO Server Pull Commits

### Joins out — this table holds the key

- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_pull_commits.author_id
  ```
- **ado_pulls**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = ado_pull_commits.pull_id
  ```

### Joined from — these point here, one-to-many

- **pull_request_commits** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pull_commits
    ON ado_pull_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'ado'
  ```

## ado_pull_deployments

Join table between deployments and pull requests with details.

`source` · `entity` · Azure DevOps Pipelines, Azure DevOps Repos, ADO Server Pipelines, ADO Server Repos

### Joins out — this table holds the key

- **ado_pulls**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = ado_pull_deployments.pull_id
  ```
- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = ado_pull_deployments.deployment_id
  ```

## ado_pulls

Details about pull requests in Azure DevOps.

`source` · `entity` · Azure DevOps Repos, ADO Server Repos

### Joins out — this table holds the key

- **ado_repositories**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = ado_pulls.repository_id
  ```
- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_pulls.project_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_pulls.user_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_pulls.merged_by_user_id
  ```

### Joined from — these point here, one-to-many

- **ado_pull_deployments**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = ado_pull_deployments.pull_id
  ```
- **ado_pull_commits**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = ado_pull_commits.pull_id
  ```
- **ado_reviews**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = ado_reviews.pull_id
  ```
- **pull_requests** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'ado'
  ```
- **pull_request_reviews** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'ado'
  ```
- **pull_request_commits** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'ado'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins ado_users 2 different ways** — user_id, merged_by_user_id. These are separate columns that frequently hold different values, so joining ado_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## ado_repositories

Details about repositories in Azure DevOps.

`source` · `entity` · Azure DevOps Repos, ADO Server Repos

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_repositories.project_id
  ```

### Joined from — these point here, one-to-many

- **ado_pulls**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = ado_pulls.repository_id
  ```
- **ado_reviews**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = ado_reviews.repository_id
  ```
- **ado_repository_default_branch_commits**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = ado_repository_default_branch_commits.repository_id
  ```
- **pipeline_runs**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pipeline_runs.ado_repository_id
  ```
- **pull_requests** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'ado'
  ```
- **pull_request_reviews** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'ado'
  ```
- **pull_request_commits** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'ado'
  ```
- **repos** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = repos.source_table_id
   AND repos.source = 'ado'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## ado_repository_default_branch_commits

Commits on a repository's default branch in Azure DevOps.

`source` · `entity` · Azure DevOps Commits (Default branch), ADO Server Commits (Default branch)

### Joins out — this table holds the key

- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_repository_default_branch_commits.author_id
  ```
- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_repository_default_branch_commits.project_id
  ```
- **ado_repositories**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = ado_repository_default_branch_commits.repository_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## ado_reviews

Details about reviews of pull requests.

`source` · `entity` · Azure DevOps Repos, ADO Server Repos

### Joins out — this table holds the key

- **ado_pulls**
  ```sql
  JOIN ado_pulls
    ON ado_pulls.id = ado_reviews.pull_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_reviews.user_id
  ```
- **ado_repositories**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = ado_reviews.repository_id
  ```

### Joined from — these point here, one-to-many

- **pull_request_reviews** — **requires `source = 'ado'`**
  ```sql
  JOIN ado_reviews
    ON ado_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'ado'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## ado_team_memberships

Membership of users to their Azure DevOps team.

`source` · `bridge` · Azure DevOps Boards, Azure DevOps Pipelines, Azure DevOps Repos, ADO Server Boards, ADO Server Pipelines, ADO Server Repos

### Joins out — this table holds the key

- **ado_teams**
  ```sql
  JOIN ado_teams
    ON ado_teams.id = ado_team_memberships.team_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_team_memberships.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## ado_teams

Details about Azure DevOps teams.

`source` · `entity` · Azure DevOps Boards, Azure DevOps Pipelines, Azure DevOps Repos, ADO Server Boards, ADO Server Pipelines, ADO Server Repos

### Joins out — this table holds the key

- **ado_organizations**
  ```sql
  JOIN ado_organizations
    ON ado_organizations.id = ado_teams.organization_id
  ```
- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_teams.project_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_items**
  ```sql
  JOIN ado_teams
    ON ado_teams.id = ado_work_items.team_id
  ```

### Bridges — join through, never to

- **ado_team_memberships**
  ```sql
  JOIN ado_teams
    ON ado_teams.id = ado_team_memberships.team_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## ado_users

Details about Azure DevOps users.

`source` · `entity` · Azure DevOps Boards, Azure DevOps Pipelines, Azure DevOps Repos, ADO Server Boards, ADO Server Pipelines, ADO Server Repos

### Joins out — this table holds the key

- **ado_organizations**
  ```sql
  JOIN ado_organizations
    ON ado_organizations.id = ado_users.organization_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_items**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_items.created_by_user_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_items.assigned_to_user_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_items.closed_by_user_id
  ```
- **ado_work_item_allocations**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_item_allocations.user_id
  ```
- **ado_pulls**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_pulls.user_id
  ```
- **ado_pulls**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_pulls.merged_by_user_id
  ```
- **ado_pull_commits**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_pull_commits.author_id
  ```
- **ado_reviews**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_reviews.user_id
  ```
- **ado_repository_default_branch_commits**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_repository_default_branch_commits.author_id
  ```
- **pipeline_runs**
  ```sql
  JOIN ado_users
    ON ado_users.id = pipeline_runs.ado_user_id
  ```
- **identities** — ado identity · **requires `source = 'ado' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  ado_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = ado_users.id
   AND identities.source = 'ado'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **ado_team_memberships**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_team_memberships.user_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## ado_work_item_allocation_category_values

Details about ADO work item allocation category values

`source` · `bridge` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_allocation_rules**
  ```sql
  JOIN ado_allocation_rules
    ON ado_allocation_rules.id = ado_work_item_allocation_category_values.rule_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_allocation_category_values.ado_work_item_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## ado_work_item_allocations

Time allocation for work items

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_allocations.work_item_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_item_allocations.user_id
  ```

## ado_work_item_custom_field_values

Custom field values for work items.

`source` · `bridge` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_custom_field_values.work_item_id
  ```
- **ado_custom_fields**
  ```sql
  JOIN ado_custom_fields
    ON ado_custom_fields.id = ado_work_item_custom_field_values.custom_field_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## ado_work_item_iteration_paths

Record of iteration paths applied to work items in Azure DevOps

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_iteration_paths.project_id
  ```
- **ado_iteration_paths**
  ```sql
  JOIN ado_iteration_paths
    ON ado_iteration_paths.id = ado_work_item_iteration_paths.iteration_path_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_iteration_paths.work_item_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.

## ado_work_item_relationships

Flattened hierarchical relationships between ADO work items.

`source` · `bridge` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_relationships.ancestor_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_relationships.descendant_id
  ```

### Caveats

- **Joins ado_work_items 2 different ways** — ancestor_id, descendant_id. These are separate columns that frequently hold different values, so joining ado_work_items once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## ado_work_item_state_changes

Details about when a work item changes state. Changes to a work item not involving state are not stored.

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_state_changes.work_item_id
  ```
- **ado_work_item_type_states**
  ```sql
  JOIN ado_work_item_type_states
    ON ado_work_item_type_states.id = ado_work_item_state_changes.from_state_id
  ```
- **ado_work_item_type_states**
  ```sql
  JOIN ado_work_item_type_states
    ON ado_work_item_type_states.id = ado_work_item_state_changes.to_state_id
  ```

### Caveats

- **Joins ado_work_item_type_states 2 different ways** — from_state_id, to_state_id. These are separate columns that frequently hold different values, so joining ado_work_item_type_states once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## ado_work_item_tags

Tags for work items.

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_work_items**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_tags.work_item_id
  ```

## ado_work_item_type_categories

Categories for work items.

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_type_categories.project_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_item_types**
  ```sql
  JOIN ado_work_item_type_categories
    ON ado_work_item_type_categories.id = ado_work_item_types.work_item_type_category_id
  ```

## ado_work_item_type_states

States for work item types.

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_type_states.project_id
  ```
- **ado_work_item_types**
  ```sql
  JOIN ado_work_item_types
    ON ado_work_item_types.id = ado_work_item_type_states.work_item_type_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_items**
  ```sql
  JOIN ado_work_item_type_states
    ON ado_work_item_type_states.id = ado_work_items.work_item_type_state_id
  ```
- **ado_work_item_state_changes**
  ```sql
  JOIN ado_work_item_type_states
    ON ado_work_item_type_states.id = ado_work_item_state_changes.from_state_id
  ```
- **ado_work_item_state_changes**
  ```sql
  JOIN ado_work_item_type_states
    ON ado_work_item_type_states.id = ado_work_item_state_changes.to_state_id
  ```

## ado_work_item_types

Details about work item types.

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_item_types.project_id
  ```
- **ado_work_item_type_categories**
  ```sql
  JOIN ado_work_item_type_categories
    ON ado_work_item_type_categories.id = ado_work_item_types.work_item_type_category_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_item_type_states**
  ```sql
  JOIN ado_work_item_types
    ON ado_work_item_types.id = ado_work_item_type_states.work_item_type_id
  ```
- **ado_work_items**
  ```sql
  JOIN ado_work_item_types
    ON ado_work_item_types.id = ado_work_items.work_item_type_id
  ```

## ado_work_items

Details about work items

`source` · `entity` · Azure DevOps Boards, ADO Server Boards

### Joins out — this table holds the key

- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = ado_work_items.project_id
  ```
- **ado_area_paths**
  ```sql
  JOIN ado_area_paths
    ON ado_area_paths.id = ado_work_items.area_path_id
  ```
- **ado_iteration_paths**
  ```sql
  JOIN ado_iteration_paths
    ON ado_iteration_paths.id = ado_work_items.iteration_path_id
  ```
- **ado_work_item_types**
  ```sql
  JOIN ado_work_item_types
    ON ado_work_item_types.id = ado_work_items.work_item_type_id
  ```
- **ado_teams**
  ```sql
  JOIN ado_teams
    ON ado_teams.id = ado_work_items.team_id
  ```
- **ado_work_item_type_states**
  ```sql
  JOIN ado_work_item_type_states
    ON ado_work_item_type_states.id = ado_work_items.work_item_type_state_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_items.created_by_user_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_items.assigned_to_user_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = ado_work_items.closed_by_user_id
  ```

### Joined from — these point here, one-to-many

- **ado_work_item_iteration_paths**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_iteration_paths.work_item_id
  ```
- **ado_work_item_state_changes**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_state_changes.work_item_id
  ```
- **ado_work_item_tags**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_tags.work_item_id
  ```
- **ado_work_item_allocations**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_allocations.work_item_id
  ```
- **issues** — ADO work item · **requires `source = 'ado_boards'`** · crosses vendors · confidence: high
  issues.source_table_id holds the primary key of whichever tracker the row came from, and issues.source says which tracker that is. The pair is the table's unique index, so the join is exact. The column simply declares no target, unlike its equivalent on pull_requests, which lists all of its targets.
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = issues.source_table_id
   AND issues.source = 'ado_boards'
  ```

### Bridges — join through, never to

- **ado_work_item_relationships**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_relationships.ancestor_id
  ```
- **ado_work_item_relationships**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_relationships.descendant_id
  ```
- **ado_work_item_custom_field_values**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_custom_field_values.work_item_id
  ```
- **ado_work_item_allocation_category_values**
  ```sql
  JOIN ado_work_items
    ON ado_work_items.id = ado_work_item_allocation_category_values.ado_work_item_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins ado_users 3 different ways** — created_by_user_id, assigned_to_user_id, closed_by_user_id. These are separate columns that frequently hold different values, so joining ado_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

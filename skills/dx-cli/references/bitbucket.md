# Bitbucket Cloud tables

18 tables. Every join below is stated with the SQL to write.

## bitbucket_pull_commits

Details about commits in Bitbucket Cloud pull requests.

`source` · `entity` · Bitbucket Pull Commits

### Joins out — this table holds the key

- **bitbucket_users**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_pull_commits.author_id
  ```
- **bitbucket_pulls**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = bitbucket_pull_commits.pull_id
  ```

### Joined from — these point here, one-to-many

- **pull_request_commits** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pull_commits
    ON bitbucket_pull_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'bitbucket'
  ```

## bitbucket_pull_deployments

Mapping of Bitbucket pull requests to deployments, including deployment timing and environment.

`source` · `entity` · Bitbucket Cloud

### Joins out — this table holds the key

- **bitbucket_pulls**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = bitbucket_pull_deployments.pull_id
  ```
- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = bitbucket_pull_deployments.deployment_id
  ```

## bitbucket_pulls

Details about Bitbucket pull requests

`source` · `entity` · Bitbucket Cloud

### Joins out — this table holds the key

- **bitbucket_repositories**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = bitbucket_pulls.repository_id
  ```
- **bitbucket_users**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_pulls.user_id
  ```
- **bitbucket_users**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_pulls.merged_by_user_id
  ```

### Joined from — these point here, one-to-many

- **bitbucket_reviews**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = bitbucket_reviews.pull_id
  ```
- **bitbucket_pull_deployments**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = bitbucket_pull_deployments.pull_id
  ```
- **bitbucket_pull_commits**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = bitbucket_pull_commits.pull_id
  ```
- **pull_requests** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'bitbucket'
  ```
- **pull_request_reviews** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'bitbucket'
  ```
- **pull_request_commits** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'bitbucket'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins bitbucket_users 2 different ways** — user_id, merged_by_user_id. These are separate columns that frequently hold different values, so joining bitbucket_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## bitbucket_repositories

Details about Bitbucket repositories.

`source` · `entity` · Bitbucket Cloud

### Joins out — this table holds the key

- **bitbucket_workspaces**
  ```sql
  JOIN bitbucket_workspaces
    ON bitbucket_workspaces.id = bitbucket_repositories.workspace_id
  ```

### Joined from — these point here, one-to-many

- **bitbucket_pulls**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = bitbucket_pulls.repository_id
  ```
- **bitbucket_repository_default_branch_commits**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = bitbucket_repository_default_branch_commits.repository_id
  ```
- **pipeline_runs**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pipeline_runs.bitbucket_repository_id
  ```
- **pull_requests** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'bitbucket'
  ```
- **pull_request_reviews** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'bitbucket'
  ```
- **pull_request_commits** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'bitbucket'
  ```
- **repos** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = repos.source_table_id
   AND repos.source = 'bitbucket'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## bitbucket_repository_default_branch_commits

Details about commits in the default branch of Bitbucket repositories.

`source` · `entity` · Bitbucket Commits (Default branch)

### Joins out — this table holds the key

- **bitbucket_users**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_repository_default_branch_commits.author_id
  ```
- **bitbucket_repositories**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = bitbucket_repository_default_branch_commits.repository_id
  ```

## bitbucket_reviews

Details about Bitbucket reviews.

`source` · `entity` · Bitbucket Cloud

### Joins out — this table holds the key

- **bitbucket_pulls**
  ```sql
  JOIN bitbucket_pulls
    ON bitbucket_pulls.id = bitbucket_reviews.pull_id
  ```
- **bitbucket_users**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_reviews.user_id
  ```

### Joined from — these point here, one-to-many

- **pull_request_reviews** — **requires `source = 'bitbucket'`**
  ```sql
  JOIN bitbucket_reviews
    ON bitbucket_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'bitbucket'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## bitbucket_server_commits

Details about commits in Bitbucket Data Center repositories.

`source` · `entity` · Bitbucket Cloud

### Joins out — this table holds the key

- **bitbucket_server_users**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_commits.author_id
  ```
- **bitbucket_server_repositories**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = bitbucket_server_commits.repository_id
  ```

## bitbucket_server_instances

Bitbucket Data Center instances identified by their normalized base URL.

`source` · `lookup` · Bitbucket Data Center

### Joined from — these point here, one-to-many

- **bitbucket_server_projects**
  ```sql
  JOIN bitbucket_server_instances
    ON bitbucket_server_instances.id = bitbucket_server_projects.bitbucket_server_instance_id
  ```
- **bitbucket_server_users**
  ```sql
  JOIN bitbucket_server_instances
    ON bitbucket_server_instances.id = bitbucket_server_users.bitbucket_server_instance_id
  ```

## bitbucket_server_projects

Details about Bitbucket Data Center projects.

`source` · `entity` · Bitbucket Data Center

### Joins out — this table holds the key

- **bitbucket_server_instances**
  ```sql
  JOIN bitbucket_server_instances
    ON bitbucket_server_instances.id = bitbucket_server_projects.bitbucket_server_instance_id
  ```

### Joined from — these point here, one-to-many

- **bitbucket_server_repositories**
  ```sql
  JOIN bitbucket_server_projects
    ON bitbucket_server_projects.id = bitbucket_server_repositories.project_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Bitbucket Data Center id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## bitbucket_server_pull_commits

Details about commits in Bitbucket Data Center pull requests.

`source` · `entity` · Bitbucket Data Center Pull Commits

### Joins out — this table holds the key

- **bitbucket_server_users**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_pull_commits.author_id
  ```
- **bitbucket_server_pulls**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = bitbucket_server_pull_commits.pull_id
  ```

## bitbucket_server_pull_deployments

Mapping of Bitbucket Data Center pull requests to deployments, including deployment timing and environment.

`source` · `entity` · Bitbucket Data Center

### Joins out — this table holds the key

- **bitbucket_server_pulls**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = bitbucket_server_pull_deployments.pull_id
  ```
- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = bitbucket_server_pull_deployments.deployment_id
  ```

## bitbucket_server_pulls

Details about Bitbucket Data Center pull requests.

`source` · `entity` · Bitbucket Data Center

### Joins out — this table holds the key

- **bitbucket_server_repositories**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = bitbucket_server_pulls.repository_id
  ```
- **bitbucket_server_users**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_pulls.user_id
  ```
- **bitbucket_server_users**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_pulls.merged_by_user_id
  ```

### Joined from — these point here, one-to-many

- **bitbucket_server_pull_commits**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = bitbucket_server_pull_commits.pull_id
  ```
- **bitbucket_server_pull_deployments**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = bitbucket_server_pull_deployments.pull_id
  ```
- **bitbucket_server_reviews**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = bitbucket_server_reviews.pull_id
  ```
- **pull_requests** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = pull_requests.source_table_id
   AND pull_requests.source = 'bitbucket_server'
  ```
- **pull_request_reviews** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'bitbucket_server'
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins bitbucket_server_users 2 different ways** — user_id, merged_by_user_id. These are separate columns that frequently hold different values, so joining bitbucket_server_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## bitbucket_server_repositories

Details about Bitbucket Data Center repositories.

`source` · `entity` · Bitbucket Data Center

### Joins out — this table holds the key

- **bitbucket_server_projects**
  ```sql
  JOIN bitbucket_server_projects
    ON bitbucket_server_projects.id = bitbucket_server_repositories.project_id
  ```

### Joined from — these point here, one-to-many

- **bitbucket_server_pulls**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = bitbucket_server_pulls.repository_id
  ```
- **bitbucket_server_commits**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = bitbucket_server_commits.repository_id
  ```
- **bitbucket_server_repository_default_branch_commits**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = bitbucket_server_repository_default_branch_commits.repository_id
  ```
- **pull_requests** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'bitbucket_server'
  ```
- **pull_request_reviews** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'bitbucket_server'
  ```
- **repos** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = repos.source_table_id
   AND repos.source = 'bitbucket_server'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## bitbucket_server_repository_default_branch_commits

Details about commits in the default branch of Bitbucket Data Center repositories.

`source` · `entity` · Bitbucket Data Center Commits (Default branch)

### Joins out — this table holds the key

- **bitbucket_server_users**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_repository_default_branch_commits.author_id
  ```
- **bitbucket_server_repositories**
  ```sql
  JOIN bitbucket_server_repositories
    ON bitbucket_server_repositories.id = bitbucket_server_repository_default_branch_commits.repository_id
  ```

## bitbucket_server_reviews

Details of the reviews given on a pull request.

`source` · `entity` · Bitbucket Data Center

### Joins out — this table holds the key

- **bitbucket_server_pulls**
  ```sql
  JOIN bitbucket_server_pulls
    ON bitbucket_server_pulls.id = bitbucket_server_reviews.pull_id
  ```
- **bitbucket_server_users**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_reviews.user_id
  ```

### Joined from — these point here, one-to-many

- **pull_request_reviews** — **requires `source = 'bitbucket_server'`**
  ```sql
  JOIN bitbucket_server_reviews
    ON bitbucket_server_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'bitbucket_server'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## bitbucket_server_users

Details about Bitbucket Data Center users.

`source` · `entity` · Bitbucket Data Center

### Joins out — this table holds the key

- **bitbucket_server_instances**
  ```sql
  JOIN bitbucket_server_instances
    ON bitbucket_server_instances.id = bitbucket_server_users.bitbucket_server_instance_id
  ```

### Joined from — these point here, one-to-many

- **bitbucket_server_pulls**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_pulls.user_id
  ```
- **bitbucket_server_pulls**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_pulls.merged_by_user_id
  ```
- **bitbucket_server_pull_commits**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_pull_commits.author_id
  ```
- **bitbucket_server_reviews**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_reviews.user_id
  ```
- **bitbucket_server_commits**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_commits.author_id
  ```
- **bitbucket_server_repository_default_branch_commits**
  ```sql
  JOIN bitbucket_server_users
    ON bitbucket_server_users.id = bitbucket_server_repository_default_branch_commits.author_id
  ```
- **identities** — bitbucket_server identity · **requires `source = 'bitbucket_server' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  bitbucket_server_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = bitbucket_server_users.id
   AND identities.source = 'bitbucket_server'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the Bitbucket Data Center id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## bitbucket_users

Details about the Bitbucket users in a workspace.

`source` · `entity` · Bitbucket Cloud

### Joins out — this table holds the key

- **bitbucket_workspaces**
  ```sql
  JOIN bitbucket_workspaces
    ON bitbucket_workspaces.id = bitbucket_users.workspace_id
  ```

### Joined from — these point here, one-to-many

- **bitbucket_reviews**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_reviews.user_id
  ```
- **bitbucket_pulls**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_pulls.user_id
  ```
- **bitbucket_pulls**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_pulls.merged_by_user_id
  ```
- **bitbucket_repository_default_branch_commits**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_repository_default_branch_commits.author_id
  ```
- **bitbucket_pull_commits**
  ```sql
  JOIN bitbucket_users
    ON bitbucket_users.id = bitbucket_pull_commits.author_id
  ```
- **identities** — bitbucket identity · **requires `source = 'bitbucket' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  bitbucket_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = bitbucket_users.id
   AND identities.source = 'bitbucket'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## bitbucket_workspaces

Details of the distinct Bitbucket workspaces for your account.

`source` · `lookup` · Bitbucket Cloud

### Joined from — these point here, one-to-many

- **bitbucket_repositories**
  ```sql
  JOIN bitbucket_workspaces
    ON bitbucket_workspaces.id = bitbucket_repositories.workspace_id
  ```
- **bitbucket_users**
  ```sql
  JOIN bitbucket_workspaces
    ON bitbucket_workspaces.id = bitbucket_users.workspace_id
  ```

# GitLab tables

15 tables. Every join below is stated with the SQL to write.

## gitlab_connection_groups

Association between GitLab groups and connections

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_groups**
  ```sql
  JOIN gitlab_groups
    ON gitlab_groups.id = gitlab_connection_groups.group_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## gitlab_deployment_events

Details about GitLab deployment events.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_projects**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_deployment_events.project_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gitlab_groups

Details about GitLab groups.

`source` · `lookup` · GitLab

### Joined from — these point here, one-to-many

- **gitlab_projects**
  ```sql
  JOIN gitlab_groups
    ON gitlab_groups.id = gitlab_projects.group_id
  ```
- **gitlab_users**
  ```sql
  JOIN gitlab_groups
    ON gitlab_groups.id = gitlab_users.group_id
  ```
- **gitlab_connection_groups**
  ```sql
  JOIN gitlab_groups
    ON gitlab_groups.id = gitlab_connection_groups.group_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the GitLab id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gitlab_labels

Details of the GitLab labels

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_projects**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_labels.project_id
  ```

### Bridges — join through, never to

- **gitlab_merge_request_labels**
  ```sql
  JOIN gitlab_labels
    ON gitlab_labels.source_id = gitlab_merge_request_labels.label_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gitlab_merge_request_assignees

Association between GitLab merge requests and assignees.

`source` · `bridge` · GitLab

### Joins out — this table holds the key

- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_assignees.merge_request_id
  ```
- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_request_assignees.user_id
  ```

### Caveats

- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## gitlab_merge_request_commits

Details about commits in GitLab merge requests.

`source` · `entity` · GitLab Merge Request Commits

### Joins out — this table holds the key

- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_request_commits.author_id
  ```
- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_commits.merge_request_id
  ```

### Joined from — these point here, one-to-many

- **pull_request_commits** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_request_commits
    ON gitlab_merge_request_commits.id = pull_request_commits.source_table_id
   AND pull_request_commits.source = 'gitlab'
  ```

## gitlab_merge_request_deployments

Join table between merge requests and deployments.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_deployments.merge_request_id
  ```
- **deployments**
  ```sql
  JOIN deployments
    ON deployments.id = gitlab_merge_request_deployments.deployment_id
  ```

## gitlab_merge_request_labels

Association between GitLab merge requests and labels

`source` · `bridge` · GitLab

### Joins out — this table holds the key

- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_labels.merge_request_id
  ```
- **gitlab_labels**
  ```sql
  JOIN gitlab_labels
    ON gitlab_labels.source_id = gitlab_merge_request_labels.label_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.
- **Join through it, not to it** — This is a link table. It exists to connect the two tables on either side, so the useful query joins straight through it in one step rather than selecting from it.

## gitlab_merge_requests

Details about GitLab merge requests.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_projects**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_merge_requests.project_id
  ```
- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_requests.user_id
  ```
- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_requests.merged_by_user_id
  ```

### Joined from — these point here, one-to-many

- **gitlab_merge_request_deployments**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_deployments.merge_request_id
  ```
- **gitlab_merge_request_commits**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_commits.merge_request_id
  ```
- **gitlab_review_requests**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_review_requests.merge_request_id
  ```
- **gitlab_reviews**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_reviews.merge_request_id
  ```
- **pull_requests** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = pull_requests.source_table_id
   AND pull_requests.source = 'gitlab'
  ```
- **pull_request_reviews** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = pull_request_reviews.source_table_pull_id
   AND pull_request_reviews.source = 'gitlab'
  ```
- **pull_request_commits** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = pull_request_commits.source_table_pull_id
   AND pull_request_commits.source = 'gitlab'
  ```

### Bridges — join through, never to

- **gitlab_merge_request_assignees**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_assignees.merge_request_id
  ```
- **gitlab_merge_request_labels**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_merge_request_labels.merge_request_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.
- **Joins gitlab_users 2 different ways** — user_id, merged_by_user_id. These are separate columns that frequently hold different values, so joining gitlab_users once will silently answer a different question than you asked. Join it once per column, with a distinct alias each time.

## gitlab_projects

Details about GitLab projects.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_groups**
  ```sql
  JOIN gitlab_groups
    ON gitlab_groups.id = gitlab_projects.group_id
  ```
- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_projects.user_id
  ```

### Joined from — these point here, one-to-many

- **gitlab_vulnerabilities**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_vulnerabilities.project_id
  ```
- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_merge_requests.project_id
  ```
- **gitlab_repository_default_branch_commits**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_repository_default_branch_commits.project_id
  ```
- **gitlab_labels**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_labels.project_id
  ```
- **gitlab_deployment_events**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_deployment_events.project_id
  ```
- **pipeline_runs**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pipeline_runs.gitlab_project_id
  ```
- **pull_requests** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pull_requests.source_table_repo_id
   AND pull_requests.source = 'gitlab'
  ```
- **pull_request_reviews** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pull_request_reviews.source_table_repo_id
   AND pull_request_reviews.source = 'gitlab'
  ```
- **pull_request_commits** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pull_request_commits.source_table_repo_id
   AND pull_request_commits.source = 'gitlab'
  ```
- **repos** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = repos.source_table_id
   AND repos.source = 'gitlab'
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the GitLab id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gitlab_repository_default_branch_commits

Commits on a project's default branch.

`source` · `entity` · GitLab Commits (Default branch)

### Joins out — this table holds the key

- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_repository_default_branch_commits.author_id
  ```
- **gitlab_projects**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_repository_default_branch_commits.project_id
  ```

### Caveats

- **No published primary key** — The schema declares no primary key for this table, so there is no documented column to join to from the other side. Anything pointing here is relying on an id that exists in the database but not in the schema.

## gitlab_review_requests

Details about GitLab review requests, tracking when reviewers were requested and the turnaround time to review.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_review_requests.merge_request_id
  ```
- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_review_requests.requested_reviewer_id
  ```
- **gitlab_reviews**
  ```sql
  JOIN gitlab_reviews
    ON gitlab_reviews.id = gitlab_review_requests.review_id
  ```

## gitlab_reviews

Details about GitLab reviews.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_merge_requests
    ON gitlab_merge_requests.id = gitlab_reviews.merge_request_id
  ```
- **gitlab_users**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_reviews.user_id
  ```

### Joined from — these point here, one-to-many

- **gitlab_review_requests**
  ```sql
  JOIN gitlab_reviews
    ON gitlab_reviews.id = gitlab_review_requests.review_id
  ```
- **pull_request_reviews** — **requires `source = 'gitlab'`**
  ```sql
  JOIN gitlab_reviews
    ON gitlab_reviews.id = pull_request_reviews.source_table_id
   AND pull_request_reviews.source = 'gitlab'
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gitlab_users

Details of the GitLab users.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_groups**
  ```sql
  JOIN gitlab_groups
    ON gitlab_groups.id = gitlab_users.group_id
  ```

### Joined from — these point here, one-to-many

- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_requests.user_id
  ```
- **gitlab_merge_requests**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_requests.merged_by_user_id
  ```
- **gitlab_projects**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_projects.user_id
  ```
- **gitlab_repository_default_branch_commits**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_repository_default_branch_commits.author_id
  ```
- **gitlab_merge_request_commits**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_request_commits.author_id
  ```
- **gitlab_review_requests**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_review_requests.requested_reviewer_id
  ```
- **gitlab_reviews**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_reviews.user_id
  ```
- **identities** — gitlab identity · **requires `source = 'gitlab' (unverified — confirm against the instance)`** · crosses vendors · confidence: medium
  gitlab_users is a vendor user table, so identities maps it to dx_users. The source literal is inferred from the table name and has not been confirmed, because this account writes no identities for it.
  ```sql
  JOIN identities
    ON identities.source_id = gitlab_users.id
   AND identities.source = 'gitlab'
  JOIN dx_users
    ON dx_users.id = identities.dx_user_id
   AND dx_users.deleted_at IS NULL
  ```

### Bridges — join through, never to

- **gitlab_merge_request_assignees**
  ```sql
  JOIN gitlab_users
    ON gitlab_users.id = gitlab_merge_request_assignees.user_id
  ```

### Caveats

- **source_id needs connection_id, id does not** — `id` is DX's own key and is unique across the table, so joining on it or on a foreign key pointing at it is already unambiguous. `source_id` is the GitLab id and is only unique within a connection, so pair it with connection_id whenever you match on it. The same goes for other vendor-side values such as keys, names and emails.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## gitlab_vulnerabilities

Canonical vulnerabilities shown on GitLab project Security Dashboards. Detected and confirmed rows represent open security posture; deleted_at marks rows no longer returned by a complete scan.

`source` · `entity` · GitLab

### Joins out — this table holds the key

- **gitlab_projects**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = gitlab_vulnerabilities.project_id
  ```

### Caveats

- **Filter deleted rows** — This table soft-deletes. Rows stay behind with deleted_at set, so add `deleted_at IS NULL` unless you specifically want the history.
- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

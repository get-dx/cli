# Pipeline tables

4 tables. Every join below is stated with the SQL to write.

## pipeline_jobs

Individual jobs that ran as part of a pipeline run. Used for Github Actions.

`source` · `entity` · Bitrise, Buildkite, GitHub Actions, Harness Pipelines

### Joins out — this table holds the key

- **pipeline_runs**
  ```sql
  JOIN pipeline_runs
    ON pipeline_runs.id = pipeline_jobs.pipeline_run_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## pipeline_runs

Instances of pipeline runs

`source` · `entity` · Azure DevOps Pipelines, ADO Server Pipelines, Bitbucket Pipelines, Bitrise, Buildkite, CircleCI, GitHub Actions, GitLab Pipelines, Harness Pipelines

### Joins out — this table holds the key

- **pipeline_sources**
  ```sql
  JOIN pipeline_sources
    ON pipeline_sources.id = pipeline_runs.pipeline_source_id
  ```
- **dx_users**
  ```sql
  JOIN dx_users
    ON dx_users.id = pipeline_runs.dx_user_id
  ```
- **gitlab_projects**
  ```sql
  JOIN gitlab_projects
    ON gitlab_projects.id = pipeline_runs.gitlab_project_id
  ```
- **bitbucket_repositories**
  ```sql
  JOIN bitbucket_repositories
    ON bitbucket_repositories.id = pipeline_runs.bitbucket_repository_id
  ```
- **ado_repositories**
  ```sql
  JOIN ado_repositories
    ON ado_repositories.id = pipeline_runs.ado_repository_id
  ```
- **ado_projects**
  ```sql
  JOIN ado_projects
    ON ado_projects.id = pipeline_runs.ado_project_id
  ```
- **ado_users**
  ```sql
  JOIN ado_users
    ON ado_users.id = pipeline_runs.ado_user_id
  ```
- **harness_projects**
  ```sql
  JOIN harness_projects
    ON harness_projects.id = pipeline_runs.harness_project_id
  ```

### Joined from — these point here, one-to-many

- **pipeline_jobs**
  ```sql
  JOIN pipeline_runs
    ON pipeline_runs.id = pipeline_jobs.pipeline_run_id
  ```

### Caveats

- **source_id is the vendor's id, not a join key** — source_id is the identifier the upstream tool uses, kept for tracing a row back to its origin. It is not a foreign key, and it is only unique per connection. Join on the surrogate id instead.

## pipeline_sources

Stores the different sources an instance is connected to

`source` · `lookup` · Azure DevOps Pipelines, ADO Server Pipelines, Bitbucket Pipelines, Bitrise, Buildkite, GitHub Actions, GitLab Pipelines, Harness Pipelines

### Joined from — these point here, one-to-many

- **pipeline_runs**
  ```sql
  JOIN pipeline_sources
    ON pipeline_sources.id = pipeline_runs.pipeline_source_id
  ```
- **pipeline_stage_names**
  ```sql
  JOIN pipeline_sources
    ON pipeline_sources.id = pipeline_stage_names.pipeline_source_id
  ```
- **deployment_inference_rules**
  ```sql
  JOIN pipeline_sources
    ON pipeline_sources.id = deployment_inference_rules.pipeline_source_id
  ```

## pipeline_stage_names

Names of pipeline stages that have been run. Used for Gitlab and Azure DevOps.

`source` · `entity` · Azure DevOps Pipelines, ADO Server Pipelines, Bitrise, Buildkite, GitLab Pipelines, Harness Pipelines

### Joins out — this table holds the key

- **pipeline_sources**
  ```sql
  JOIN pipeline_sources
    ON pipeline_sources.id = pipeline_stage_names.pipeline_source_id
  ```
